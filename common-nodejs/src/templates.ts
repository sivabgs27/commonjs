import async = require('async');
import moment = require('moment');
import CircuitBreaker = require('circuit-breaker-js');

import {GuardConfig, serviceInfo} from "./service-info";
import {GenericRequest, GenericResponse, ErrorDetails, HttpMethod} from "./messages";
import {Bus, MessageDestination, MessageDestinationType} from "./bus";
import {
    objectClone, objectAddEachProperty, objectForEachProperty, setOAUTHCredentials,
    objectCloneSimple
} from "./utils";
import {Logger, MetricLogger, AlarmLogger, log, AlarmSeverity} from "./logger";
import {diagnostics, ProbeScan, ProbeType, ProbeScanSeverity} from "./diagnostics";
import {isUndefined} from "./collections";
import {JsonAction} from "./json-invoker";
import {JsonClientEncoding} from "./json-client";
import {createContextLoggers} from "./context-logger";


export interface ContextCallback {
    (context: InvocationContext);
}

export interface Middleware {
    (req: any, res: any);
}

export interface Invoker {
    invokerName?: string;
    invoke(context: InvocationContext, callback: ContextCallback);
    getTargetSystem(): string;
    getServiceCall(): string;
}

export interface InvokerWrapper {
    invoke(invoker: Invoker, context: InvocationContext, callback: ContextCallback);
}

export enum TransportType {
    http, bus, internal
}

export interface TransportInfo {
    type: TransportType;
}

export class InvocationContext {
    state: any = {};
    input: GenericRequest;
    output: GenericResponse;
    invokerName: string;
    invokerIndex: number;
    invoker: Invoker;
    invokerInput: any = {};
    invokerOutput: any = {};
    transport: TransportInfo;

    debug: Logger;
    info: Logger;
    warn: Logger;
    error: Logger;
    metric: MetricLogger;
    alarm: AlarmLogger;

    constructor(input: GenericRequest) {
        this.input = input;
        this.output = new GenericResponse();

        createContextLoggers(this);
        this.info('Received request');
    }

    clone(): InvocationContext {
        let c2 = this.cloneCleanState();
        c2.state = objectClone(this.state);
        return c2;
    }

    cloneCleanState(): InvocationContext {
        let c2 = new InvocationContext(this.input);
        c2.output = this.output;
        c2.invokerName = this.invokerName;
        c2.invokerIndex = this.invokerIndex;
        c2.invoker = this.invoker;
        c2.invokerInput = this.invokerInput;
        c2.invokerOutput = this.invokerOutput;
        c2.transport = { type: TransportType.internal };
        c2.state = {};
        return c2;
    }

    isValid(): boolean {
        return this.output.code < 300;
    }

    addError(errorCode: number, errorMessage: string, errorField?: string): InvocationContext {
        (this.output.errors = this.output.errors || []).push(new ErrorDetails(errorCode, errorMessage, errorField));
        return this;
    }

    setCode(code: number): InvocationContext {
        this.output.code = code;
        this.output.status = code;
        return this;
    }

    setResult(data: any): InvocationContext {
        this.output.data = data;
        return this;
    }

    contructLogPayload(): any {
        let decoratedPayload = {};

        if (this.input.correlationId) {
            decoratedPayload['correlation_id'] = this.input.correlationId;
        } else if (this.output.correlationId) {
            decoratedPayload['correlation_id'] = this.output.correlationId;
        }

        if (this.input.requestId) {
            decoratedPayload['request_id'] = this.input.requestId;
        }

        if (this.input.sourceSystem) {
            decoratedPayload['source_system'] = this.input.sourceSystem;
        }

        if (this.isValid()) {
            decoratedPayload['result_status'] = 'SUCCESS';
        } else {
            decoratedPayload['result_status'] = 'EXCEPTION';
        }

        return decoratedPayload;
    }
}

export class GuardedInvoker implements InvokerWrapper {
    config: GuardConfig;
    concurrency = 0;
    breaker;
    concurrencyHighWaterMark = 0;
    countConcurrencyExceeded = 0;
    countBreakerError = 0;
    targetSystem: string;

    constructor(config: GuardConfig, targetSystem: string) {
        this.config = objectCloneSimple(config);
        this.targetSystem = targetSystem;

        let shortName = 'vm';
        let nodeName = serviceInfo.hostName;
        if (nodeName && nodeName.indexOf('.') !== -1) {
            shortName = nodeName.substring(0, nodeName.indexOf('.'));
        }
        if (this.config.useCircuitBreaker) {
            (<any>this.config).onCircuitOpen = (metrics) => {
                log.alarm({
                    id: '200002',
                    category: 'Circuit Breaker',
                    message: 'Circuit breaker is open for downstream ' + targetSystem,
                    targetSystem: targetSystem,
                    severity: AlarmSeverity.MAJOR,
                    shortText: 'Circuit breaker is open for downstream ' + targetSystem,
                    longText: 'Circuit breaker is open for downstream ' + targetSystem
                });
                log.warn('Circuit breaker is open', { metrics: metrics });
            };
            (<any>this.config).onCircuitClose = (metrics) => {
                log.alarm({
                    id: '200002',
                    category: 'Circuit Breaker',
                    message: 'Circuit breaker is closed for downstream ' + targetSystem,
                    targetSystem: targetSystem,
                    severity: AlarmSeverity.CLEARING,
                    shortText: 'Circuit breaker is closed for downstream ' + targetSystem,
                    longText: 'Circuit breaker is closed for downstream ' + targetSystem
                });
                log.warn('Circuit breaker is closed', { metrics: metrics });
            };
            this.breaker = new CircuitBreaker(this.config);
        }
        diagnostics.registerProbe(() => { return this.runProbe() });
    }

    invoke(guarded: Invoker, context: InvocationContext, callback: ContextCallback) {
        if (this.config.concurrency === 0 || this.config.concurrency > this.concurrency) {
            this.concurrency++;
            if (this.concurrency > this.concurrencyHighWaterMark) {
                this.concurrencyHighWaterMark = this.concurrency;
            }
            if (this.breaker) {
                this.breaker.run(
                    (success, failed) => {
                        // run command
                        guarded.invoke(context, () => {
                            this.concurrency--;
                            if (context.isValid()) {
                                success();
                            } else {
                                failed();
                            }
                            callback(context);
                        });
                    },
                    () => {
                        // service is down
                        context.setCode(503).addError(2, 'Downstream service is down');
                        callback(context);
                    });
            } else {
                guarded.invoke(context, () => {
                    this.concurrency--;
                    callback(context);
                });
            }
        } else {
            this.countConcurrencyExceeded++;
            log.warn('Concurrency threshold reached: ' + this.config.concurrency);
            context.setCode(503).addError(1, 'Concurrency threshold reached: ' + this.config.concurrency);
            callback(context);
        }
    }

    runProbe() {
        let probeScan: ProbeScan = new ProbeScan();

        probeScan.startTimer();
        probeScan.type = ProbeType.GUARD;
        probeScan.name = 'GuardedInvoker';
        probeScan.description = 'Details on the state of the GuardedInvoker and historical data on its performance.';
        probeScan.healthy = true;
        probeScan.severity = ProbeScanSeverity.INFO;
        probeScan.details = {
            'concurrency high water mark': this.concurrencyHighWaterMark,
            'transaction rejected because concurrency exceeded': this.countConcurrencyExceeded,
            'breaker status': this.breaker
        };
        if (this.breaker) {
            probeScan.details['breaker isOpen'] = this.breaker.isOpen;
            probeScan.details['breaker isHalfOpen'] = this.breaker.isHalfOpen;
            probeScan.details['breaker isClosed'] = this.breaker.isClosed;
        }
        probeScan.finaliseTimer();

        return probeScan;
    }

    getTargetSystem(): string {
        return this.targetSystem;
    }
}

export class MockInvoker implements Invoker {
    result: any;
    targetSystem: string;

    constructor(result?: any, targetSystem?: string) {
        this.result = result;
        this.targetSystem = targetSystem;
    }

    invoke(context: InvocationContext, callback: ContextCallback) {
        context.invokerOutput = typeof (this.result) == 'function' ? this.result(context) : this.result;
        callback(context);
    }

    getTargetSystem(): string {
        return this.targetSystem;
    }

    getServiceCall(): string {
        return;
    }
}

export class DelayingInvoker implements Invoker {
    delayed: Invoker;
    delay: number;
    targetSystem: string;

    constructor(delayed: Invoker, delay: number = 5000, targetSystem?: string) {
        this.delayed = delayed;
        this.delay = delay;
        this.targetSystem = targetSystem;
    }

    invoke(context: InvocationContext, callback: ContextCallback) {
        setTimeout(() => {
            this.delayed.invoke(context, callback);
        }, this.delay);
    }

    getTargetSystem(): string {
        return this.targetSystem;
    }

    getServiceCall(): string {
        return;
    }
}

export function createHttpEntryPoint(server, method: HttpMethod, path: string, requestHandler: { (request: GenericRequest, transport?) }) {
    if (server) {
        // create HTTP endpoint
        var httpHandler = (req, res) => {
            var request = new GenericRequest(path, req.method);
            if (req.params) {
                request.setParams(req.params);
            }

            //TODO - lookup based on list?
            if (req.header) {
                if (req.header('ds-correlation-id')) {
                    request.correlationId = req.header('ds-correlation-id');
                }

                if (req.header('ds-source-system')) {
                    request.sourceSystem = req.header('ds-source-system');
                }
            }

            objectAddEachProperty(req.body, request);

            var transport = {
                type: TransportType.http,
                request: req,
                response: res
            };

            requestHandler(request, transport);
        };

        switch (method) {
            case HttpMethod.GET:
                server.get(path, httpHandler);
                break;
            case HttpMethod.POST:
                server.post(path, httpHandler);
                break;
            case HttpMethod.PUT:
                server.put(path, httpHandler);
                break;
            case HttpMethod.DELETE:
                server.del(path, httpHandler);
                break;
            case HttpMethod.PATCH:
                server.patch(path, httpHandler);
                break;
        }
    }
}

export class BaseTemplate {
    static globalGuard: InvokerWrapper;

    invoker: Invoker;
    guardInvoker: InvokerWrapper;
    sendResultViaBus: boolean = true;

    constructor(invoker: Invoker, guardInvoker?: InvokerWrapper) {
        this.invoker = invoker;
        if (guardInvoker) {
            this.guardInvoker = guardInvoker;
        } else {
            if (!BaseTemplate.globalGuard) {
                BaseTemplate.globalGuard = new GuardedInvoker(serviceInfo.guard, "NO_DOWNSTREAM_INFO_PROVIDED");
            }
            this.guardInvoker = BaseTemplate.globalGuard;
        }
    }

    disableResultViaBus(): BaseTemplate {
        this.sendResultViaBus = false;
        return this;
    }

    prepareInput(context: InvocationContext) {
    }

    prepareOutput(context: InvocationContext) {
    }

    handleError(context: InvocationContext) {
    }

    run(context: InvocationContext, callback?: ContextCallback) {
        this.prepareInput(context);
        if (context.isValid()) {
            this.guardInvoker.invoke(this.invoker, context, (context2) => {
                if (context.isValid()) {
                    this.prepareOutput(context2);
                    if (callback) {
                        callback(context2);
                    }
                    if (context2.transport.type != TransportType.internal) {
                        this.sendResult(context2);
                    }
                } else {
                    this.handleError(context2);
                    if (callback) {
                        callback(context2);
                    }
                    if (context2.transport.type != TransportType.internal) {
                        this.sendResult(context2);
                    }
                }
            })
        } else {
            this.handleError(context);
            if (callback) {
                callback(context);
            }
            if (context.transport.type != TransportType.internal) {
                this.sendResult(context);
            }
        }
    }

    createEntryPoint(server, messageBus: Bus, method: HttpMethod, path: string = '/') {
        this.createHttpEntryPoint(server, method, path);
        this.createBusEntryPoint(messageBus, method, path);
    }

    createHttpEntryPoint(server, method: HttpMethod, path: string = '/') {
        var template = this;
        createHttpEntryPoint(server, method, path, (request, transport) => {
            request.setCorrelationId(request.correlationId || request.requestId);
            var context = new InvocationContext(request);
            context.transport = transport;
            this.run(context);
        });
    }

    createBusEntryPoint(messageBus: Bus, method: HttpMethod, path: string = '/') {
        if (messageBus && !serviceInfo.busDisabled) {
            var template = this;
            var dest = new MessageDestination(MessageDestinationType.Process)
                .setPath(path)
                .setMethod(method);

            var messageHandler = (message: GenericRequest) => {
                let request = new GenericRequest(path, HttpMethod[method]);
                request.setCorrelationId(request.correlationId || request.requestId);
                var context = new InvocationContext(request);
                objectAddEachProperty(message, context.input);

                context.transport = <any>{
                    type: TransportType.bus,
                    message: message,
                    respondTo: message.respondTo,
                    destination: dest,
                    method: method,
                    bus: messageBus
                };

                this.run(context);
            };

            messageBus.listenForRequest(dest, messageHandler);
        }
    }

    createBusMonitorEntryPoint(messageBus: Bus, path: string) {
        messageBus.subscribe(path, busMessage => {
            let content = busMessage.content.toString();
            let message: any = {};
            try {
                message = JSON.parse(content);
            } catch (e) { }

            let request = new GenericRequest(path, HttpMethod[HttpMethod.GET]);
            request.setCorrelationId(request.correlationId || request.requestId);
            var context = new InvocationContext(request);
            objectAddEachProperty(message, context.input);

            context.transport = <any>{
                type: TransportType.bus,
                message: message,
                respondTo: message.respondTo,
                destination: null,
                method: HttpMethod.GET,
                bus: messageBus,
                dontRespond: true
            };

            this.run(context);
        });
    }

    sendResult(context: InvocationContext) {
        context.output.request = context.input;
        context.output.setCorrelationId(context.input.correlationId);
        context.output.time = context.output.time ? moment(context.output.time).format() : moment().format();

        if (context.transport.type === TransportType.http) {
            this.httpSend(context);
        } else {
            this.busSendResult(context);
        }
    }

    busSendResult(context: InvocationContext) {
        var transport: any = context.transport;
        var bus: Bus = transport.bus;
        var respondTo = transport.respondTo;

        if (!transport.dontRespond) {
            bus.sendToPath(respondTo, context.output);
        }
    }

    httpSend(context: InvocationContext) {
        var res = (<any>context.transport).response;
        if (res) {
            let code = context.output.code;
            if (serviceInfo.simpleHttpResponseFormat) {
                delete context.output.request;
                //changes done as part of DSAPI-2030
                if (context.output.code < 300) {
                    delete context.output.code;
                    delete context.output.message;
                }
                else {
                    let contextOutputErrors: any = context.output.errors;
                    if (contextOutputErrors.length > 0) {
                        context.output.code = contextOutputErrors[0].code;
                        context.output.message = contextOutputErrors[0].message;
                    }
                }
            }
            res.send(code, context.output);
        }
    }
}

export class SimpleTemplate extends BaseTemplate {
    prepareInput(context: InvocationContext) {
        context.invokerInput = context.input;
    }

    prepareOutput(context: InvocationContext) {
        context.output = new GenericResponse().setData(context.invokerOutput);
    }
}

export interface InvokerMap {
    [index: string]: Invoker;
}

export class CompositeTemplateInvoker implements Invoker {
    template: CompositeTemplate;

    constructor(template: CompositeTemplate) {
        this.template = template;
    }

    invoke(context: InvocationContext, callback: ContextCallback) {
        let state = context.state._compositeTemplate = { step: 0, originalContext: context, currentTasks: [], currentContexts: [context.clone()], currentStates: [] };
        async.whilst(
            () => {
                state.currentTasks = this.template.prepareTasks(state.step, state.currentContexts);
                return !!(state.currentTasks && state.currentTasks.length);
            },
            callback => {
                let nextContexts = [];
                let errorState = false;
                let parallelTasks = state.currentTasks.map(task => {
                    return callback => {
                        task.template.run(task.context.clone(), context => {
                            if (!context.isValid()) {
                                errorState = true;
                            }
                            nextContexts.push(context);
                            callback();
                        });
                    };
                });

                async.parallel(parallelTasks, () => {
                    state.step++;
                    state.currentContexts = nextContexts;
                    if (errorState) {
                        callback(new Error('Some of tasks failed'), context);
                    } else {
                        callback();
                    }
                });
            },
            () => {
                if (state.currentContexts && state.currentContexts.length) {
                    context.state.subStates = state.currentContexts.map(subContext => subContext.state);
                    context.invokerOutput = state.currentContexts.map(subContext => subContext.invokerOutput);
                }

                delete context.state._compositeTemplate;
                callback(context);
            }
        );

    }

    getTargetSystem(): string {
        return 'internal';
    }

    getServiceCall(): string {
        return 'internal';
    }
}

export interface CompositeTemplateTask {
    template: SimpleTemplate;
    context: InvocationContext;
}

export class CompositeTemplate extends SimpleTemplate {
    subTemplates: SimpleTemplate[][];

    constructor(subTemplates?: SimpleTemplate[][], guardInvoker?: InvokerWrapper) {
        super(null, guardInvoker);
        this.subTemplates = subTemplates;
        this.invoker = new CompositeTemplateInvoker(this);
    }

    prepareTasks(index: number, prevContexts: InvocationContext[]): CompositeTemplateTask[] {
        // this is a default implemnentation - demo only
        return this.subTemplates[index].map(template => {
            return { template: template, context: prevContexts[0].clone() }
        });
    }
}

export class MultiTemplate extends SimpleTemplate {
    invokers: Invoker[] = [];

    constructor(namedInvokers: InvokerMap, guardInvoker?: InvokerWrapper) {
        super(null, guardInvoker);

        if (namedInvokers) {
            objectForEachProperty(namedInvokers, (name, invoker) => {
                invoker.invokerName = name;
                this.invokers.push(invoker);
            });
        }
    }
}

export class ChainTemplate extends MultiTemplate {
    constructor(namedInvokers?: InvokerMap, guardInvoker?: InvokerWrapper) {
        super(namedInvokers, guardInvoker);
    }

    getInvoker(index: number, context: InvocationContext): Invoker {
        return this.invokers[index];
    }

    prepareFinalOutput(context: InvocationContext) {
    }

    run(context: InvocationContext, callback?: ContextCallback) {
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists
        context.invokerIndex = 0;

        async.whilst(
            () => {
                let invoker = this.getInvoker(context.invokerIndex, context);
                if (invoker) {
                    context.invoker = invoker;
                    context.invokerIndex++;
                }
                return !!invoker;
            },
            callback => {
                let invoker = context.invoker;
                context.invokerName = invoker.invokerName;
                this.prepareInput(context);

                if (context.isValid()) {
                    this.guardInvoker.invoke(invoker, context, (context2) => {
                        if (context2.isValid()) {
                            this.prepareOutput(context2);
                        } else {
                            this.handleError(context2);
                        }

                        callback(context2.isValid() ? undefined : new Error(), context);
                    })
                } else {
                    callback(new Error(), context);
                }
            },
            () => {
                this.prepareFinalOutput(context);
                this.sendResult(context);
            }
        );
    }
}


export class ParallelTemplate extends MultiTemplate {
    prepareFinalOutput(context: InvocationContext, subContexts: InvocationContext[]) {
    }

    run(context: InvocationContext, callback?: ContextCallback) {
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists

        let tasks = this.invokers.map(invoker => {
            let contextCopy = objectClone(context);
            return callback => {
                contextCopy.invokerName = invoker.invokerName;
                this.prepareInput(contextCopy);

                if (contextCopy.isValid()) {
                    this.guardInvoker.invoke(invoker, contextCopy, (context2) => {
                        if (context2.isValid()) {
                            this.prepareOutput(context2);
                        } else {
                            this.handleError(context2);
                        }

                        callback(context2.isValid() ? null : true, contextCopy);
                    })
                } else {
                    callback(true, contextCopy);
                }
            }
        });

        async.parallel(tasks, (err, contexts: InvocationContext[]) => {
            this.prepareFinalOutput(context, contexts);
            this.sendResult(context);
        });
    }
}

export class AuthenticatorTemplate extends SimpleTemplate {
    /**
     * It could service info, etcd, or any other secured vault
     * Defaulting it to serviceInfo for now - can be overridden
     * @type {string}
     */
    credentialLocation = "serviceInfo";

    /**
     * Reference of the path of the credentials
     */
    credentialPath;

    /**
     * Defaulting it to this value - can be overridden
     * @type {{Content-type: string}}
     */
    headerInfo = { "Content-type": "application/x-www-form-urlencoded" };

    /**
     * Setting the endpoint path of the service, defaulting it - can be changed
     */
    path = "/v1/oauth/token";

    /**
     * Location of the credentials - serviceInfo, etcd, any other secured vault etc
     * @param paramCredentialLocation
     * @returns {AuthenticatorTemplate}
     */
    setCredentialLocation(paramCredentialLocation: any): AuthenticatorTemplate {
        this.credentialLocation = paramCredentialLocation;
        return this;
    }

    /**
     * @param paramCredentialPath
     * @returns {AuthenticatorTemplate}
     */
    setCredentialReferencePath(paramCredentialPath: string): AuthenticatorTemplate {
        this.credentialPath = paramCredentialPath;
        return this;
    }

    /**
     * Method to override the header info
     * @param paramHeaderInfo
     * @returns {AuthenticatorTemplate}
     */
    setHeaderInfo(paramHeaderInfo: any): AuthenticatorTemplate {
        this.headerInfo = paramHeaderInfo;
        return this;
    }

    /**
     * Method to override the endpoint resource path
     * @param paramPath
     * @returns {AuthenticatorTemplate}
     */
    setPath(paramPath: string): AuthenticatorTemplate {
        this.path = paramPath;
        return this;
    }

    public prepareInput(context: InvocationContext) {
        this.headerInfo = !isUndefined(this.headerInfo) ? this.headerInfo : { "Content-type": "application/x-www-form-urlencoded" };
        this.path = !isUndefined(this.path) ? this.path : '/v1/oauth/token';

        let oAuthCredentialMap;

        /**
         * Condition check for client credentials being read from the config file
         */
        if (this.credentialLocation === 'serviceInfo') {

            let configPath = serviceInfo.extras[this.credentialPath];

            if (!isUndefined(configPath)) {

                oAuthCredentialMap = {
                    "client_id": configPath.client_id,
                    "client_secret": configPath.client_secret,
                    "grant_type": configPath.grant_type,
                    "scope": configPath.scope
                };
            }
        }

        if (!isUndefined(oAuthCredentialMap)) {

            let body = setOAUTHCredentials(oAuthCredentialMap);

            context.invokerInput = new JsonAction(HttpMethod.POST, body, this.path, this.headerInfo).setEncoding(JsonClientEncoding.FORM);

        } else {
            throw new Error('AuthenticatorTemplate.prepareInput(), No credentials configuration path found.');
        }
    }

    public prepareOutput(context: InvocationContext) {
        if (context.isValid()) {

            let invokerOutput = context.invokerOutput;

            if (invokerOutput) {

                let body = invokerOutput.body;
                if (invokerOutput.code == 200) {

                    if (typeof context.output.data === "undefined") {
                        context.output.data = {};
                    }
                    context.output.data.access_token = body.access_token;

                } else {
                    context.setCode(invokerOutput.code).addError(1001, "Error in AuthenticatorTemplate!");
                }
            }
        }
    }

    handleError(context: InvocationContext) {
        return super.handleError(context);
    }
}
