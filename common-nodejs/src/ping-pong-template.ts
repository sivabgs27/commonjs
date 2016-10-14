import moment = require('moment');


import { objectClone, getFullServiceUrl, objectAddEachProperty, createUuid } from './utils'
import { EasyFlow, Context as FlowContext } from './easy-flow'
import { HttpMethod, GenericRequest, GenericResponse } from './messages'
import { Bus, bus, MessageDestination, MessageDestinationType } from './bus'
import { ServiceAction, ServiceActionType, ServiceInvoker } from './service-invoker'
import { createHttpEntryPoint } from './templates'
import { serviceInfo } from './service-info'
import { getJsonClient, JsonClient } from './json-client'
import {InvocationContext, ContextCallback} from "./templates";
import {log} from "./logger";


export interface ProcessInfo {
    time: string;
    name: string;      // service name
    id: string;        // unique process id
    initialRequest: GenericRequest;
    state: any;
}

export interface ProcessInfoArray {
    [index: string]: ProcessInfo;
}

// what we send to downstream
export class ProcessRequest extends GenericRequest {
    process: ProcessInfoArray;
}

// what we receive from downstream
export class ProcessResponse extends GenericResponse {
    process: ProcessInfoArray;
    request: ProcessRequest;
}

class PingPongInvoker extends ServiceInvoker {
    template: PingPongTemplate;
    messageBus: Bus;
    flowContext: any;

    constructor(template: PingPongTemplate, flowContext: any) {
        super();
        this.template = template;
        this.messageBus = template.getMessageBus();
        this.flowContext = flowContext;
    }


    invoke(context:InvocationContext, callback:ContextCallback) {
        let action: ServiceAction = context.invokerInput;

        if (action.type === ServiceActionType.ASYNC_NOTIFY || action.type === ServiceActionType.HYBRID) {
            throw new Error("PingPongInvoker doesn't support action type ASYNC_NOTIFY or HYBRID");
        //} else if (action.type === ServiceActionType.HYBRID && (action.request.method === 'GET' || action.request.method === 'DELETE')) {
        //    throw new Error("PingPongInvoker doesn't support action type HYBRID in combination with HTTP methods GET and DELETE")
        }

        return super.invoke(context, callback);
    }

    listenForResponse(request:GenericRequest, callback:ContextCallback) {
    }


    handleResponseFromHttp(err, res, obj, context:InvocationContext, action:ServiceAction, callback:ContextCallback) {
        if (action.type === ServiceActionType.SYNC) {
            try {
                obj.request = context.invokerInput.request;
            } catch (e) {
            }

            this.template.continueProcess(obj, this.flowContext);
        }
    }

    getMessageBus(): Bus {
        return this.messageBus;
    }

    getJsonClient(action:ServiceAction):JsonClient {
        return this.template.getJsonClient(action);
    }
}

export class PingPongTemplate {
    flow: EasyFlow;
    messageBus: Bus;
    processName: string;

    constructor(flow?: EasyFlow) {
        if (flow) {
            this.init(flow);
        }
    }

    init(flow: EasyFlow) {
        this.flow = flow;
        this.processName = serviceInfo.name + '-v' + serviceInfo.apiVersion;
        this.messageBus = this.getMessageBus();

        this.flow.whenEnter('*', context => {
            if (context.httpConfirmationData && context.httpConfirmationData.sendNow) {
                // send HTTP confirmation response if required
                let response = context.httpConfirmationMessage;
                context.httpConfirmationData.transport.response.send(response.code, response);

                delete context.httpConfirmationData;
                delete context.httpConfirmationMessage;
            }

            if (context.outputMessage) {
                if (context.finished) {
                    this.handleFinalState(context);
                } else {
                    this.handleIntermediateState(context);
                }
            }
        });
    }

    handleIntermediateState(context) {
        var action: ServiceAction = context.outputMessage;
        var invocationContext = new InvocationContext(null);
        invocationContext.invokerInput = action;

        var request: ProcessRequest = <ProcessRequest>action.request;
        var process: ProcessInfo = context.inputMessage.process[this.processName];
        delete context.inputMessage;
        delete context.outputMessage;
        process.state = {};

        var props = Object.getOwnPropertyNames(context);
        props.forEach(function(name) {
            if (name !== 'httpConfirmationData' && name !== 'httpConfirmationMessage') {
                var destination = Object.getOwnPropertyDescriptor(context, name);
                Object.defineProperty(process.state, name, destination);
            }
        });

        request.process = {};
        request.process[this.processName] = process;

        new PingPongInvoker(this, context).invoke(invocationContext, (context: InvocationContext) => {
        });
    }

    handleFinalState(context) {
        var processResult: ProcessResponse = context.outputMessage;
        var message: ProcessResponse = context.inputMessage;
        delete context.inputMessage;
        delete context.outputMessage;
        processResult.request = objectClone(message.request.process[this.processName].initialRequest);
        processResult.process = objectClone(message.request);
        if (processResult.request.respondTo) {
            this.messageBus.sendToPath(processResult.request.respondTo, processResult);
        } else {
            log.info('respondTo is not specified');
        }
    }

    createEntryPoint(server, method: HttpMethod, path: string = '/') {
        let messageRoute = {
            method: method,
            path: path
        };

        createHttpEntryPoint(server, method, path, (request: GenericRequest, transport) => {
            this.startProcess(request, {
                transport: transport,
                request: request
            });
        });

        this.messageBus.listenForAny(messageRoute, (message: any) => {
            var isRequest = !!message.respondTo;
            if (isRequest) {
                this.startProcess(message);
            } else {
                this.continueProcess(message);
            }
        });
    }

    startProcess(message: GenericRequest, httpConfirmationData?): ProcessInfo {
        var pid = createUuid();
        var process: ProcessInfo = {
            time: moment().format(),
            name: this.processName,
            id: pid,
            initialRequest: objectClone(message),
            state: {}
        };

        var processList = (<any>message).process = {};
        processList[this.processName] = process;

        var flowContext: any = {
            inputMessage: message
        };

        if (httpConfirmationData) {
            httpConfirmationData.process = process;
            flowContext.httpConfirmationData = httpConfirmationData;
            flowContext.httpConfirmationData.sendNow = true;
            flowContext.httpConfirmationMessage = new GenericResponse(202).setCorrelationId(message.correlationId);
            flowContext.httpConfirmationMessage.request = httpConfirmationData.request;
        }

        this.flow.start(flowContext);

        return process;
    }

    continueProcess(message: ProcessResponse, oldFlowContext?) {

        let processInfoList = objectClone(message.request.process);
        let processInfo = processInfoList[this.processName];
        message.process = processInfoList;
        let flowContext = processInfo.state;
        flowContext.inputMessage = message;

        if (oldFlowContext) {
            flowContext.httpConfirmationData = oldFlowContext.httpConfirmationData;
            flowContext.httpConfirmationMessage = oldFlowContext.httpConfirmationMessage;
        }

        var nextEvent = flowContext.events[0];
        this.flow.trigger(nextEvent, flowContext);
    }

    getMessageBus(): Bus {
        return bus;
    }

    getJsonClient(action: ServiceAction): JsonClient {
        var request: GenericRequest = action.request;
        return getJsonClient(getFullServiceUrl(action.service + '/' + action.version), request.path, request.params);
    }
}