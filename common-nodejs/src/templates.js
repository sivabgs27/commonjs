"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var async = require('async');
var moment = require('moment');
var CircuitBreaker = require('circuit-breaker-js');
var service_info_1 = require("./service-info");
var messages_1 = require("./messages");
var bus_1 = require("./bus");
var utils_1 = require("./utils");
var logger_1 = require("./logger");
var diagnostics_1 = require("./diagnostics");
var collections_1 = require("./collections");
var json_invoker_1 = require("./json-invoker");
var json_client_1 = require("./json-client");
var context_logger_1 = require("./context-logger");
(function (TransportType) {
    TransportType[TransportType["http"] = 0] = "http";
    TransportType[TransportType["bus"] = 1] = "bus";
    TransportType[TransportType["internal"] = 2] = "internal";
})(exports.TransportType || (exports.TransportType = {}));
var TransportType = exports.TransportType;
var InvocationContext = (function () {
    function InvocationContext(input) {
        this.state = {};
        this.invokerInput = {};
        this.invokerOutput = {};
        this.input = input;
        this.output = new messages_1.GenericResponse();
        context_logger_1.createContextLoggers(this);
        this.info('Received request');
    }
    InvocationContext.prototype.clone = function () {
        var c2 = this.cloneCleanState();
        c2.state = utils_1.objectClone(this.state);
        return c2;
    };
    InvocationContext.prototype.cloneCleanState = function () {
        var c2 = new InvocationContext(this.input);
        c2.output = this.output;
        c2.invokerName = this.invokerName;
        c2.invokerIndex = this.invokerIndex;
        c2.invoker = this.invoker;
        c2.invokerInput = this.invokerInput;
        c2.invokerOutput = this.invokerOutput;
        c2.transport = { type: TransportType.internal };
        c2.state = {};
        return c2;
    };
    InvocationContext.prototype.isValid = function () {
        return this.output.code < 300;
    };
    InvocationContext.prototype.addError = function (errorCode, errorMessage, errorField) {
        (this.output.errors = this.output.errors || []).push(new messages_1.ErrorDetails(errorCode, errorMessage, errorField));
        return this;
    };
    InvocationContext.prototype.setCode = function (code) {
        this.output.code = code;
        this.output.status = code;
        return this;
    };
    InvocationContext.prototype.setResult = function (data) {
        this.output.data = data;
        return this;
    };
    InvocationContext.prototype.contructLogPayload = function () {
        var decoratedPayload = {};
        if (this.input.correlationId) {
            decoratedPayload['correlation_id'] = this.input.correlationId;
        }
        else if (this.output.correlationId) {
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
        }
        else {
            decoratedPayload['result_status'] = 'EXCEPTION';
        }
        return decoratedPayload;
    };
    return InvocationContext;
}());
exports.InvocationContext = InvocationContext;
var GuardedInvoker = (function () {
    function GuardedInvoker(config, targetSystem) {
        var _this = this;
        this.concurrency = 0;
        this.concurrencyHighWaterMark = 0;
        this.countConcurrencyExceeded = 0;
        this.countBreakerError = 0;
        this.config = utils_1.objectCloneSimple(config);
        this.targetSystem = targetSystem;
        var shortName = 'vm';
        var nodeName = service_info_1.serviceInfo.hostName;
        if (nodeName && nodeName.indexOf('.') !== -1) {
            shortName = nodeName.substring(0, nodeName.indexOf('.'));
        }
        if (this.config.useCircuitBreaker) {
            this.config.onCircuitOpen = function (metrics) {
                logger_1.log.alarm({
                    id: '200002',
                    category: 'Circuit Breaker',
                    message: 'Circuit breaker is open for downstream ' + targetSystem,
                    targetSystem: targetSystem,
                    severity: logger_1.AlarmSeverity.MAJOR,
                    shortText: 'Circuit breaker is open for downstream ' + targetSystem,
                    longText: 'Circuit breaker is open for downstream ' + targetSystem
                });
                logger_1.log.warn('Circuit breaker is open', { metrics: metrics });
            };
            this.config.onCircuitClose = function (metrics) {
                logger_1.log.alarm({
                    id: '200002',
                    category: 'Circuit Breaker',
                    message: 'Circuit breaker is closed for downstream ' + targetSystem,
                    targetSystem: targetSystem,
                    severity: logger_1.AlarmSeverity.CLEARING,
                    shortText: 'Circuit breaker is closed for downstream ' + targetSystem,
                    longText: 'Circuit breaker is closed for downstream ' + targetSystem
                });
                logger_1.log.warn('Circuit breaker is closed', { metrics: metrics });
            };
            this.breaker = new CircuitBreaker(this.config);
        }
        diagnostics_1.diagnostics.registerProbe(function () { return _this.runProbe(); });
    }
    GuardedInvoker.prototype.invoke = function (guarded, context, callback) {
        var _this = this;
        if (this.config.concurrency === 0 || this.config.concurrency > this.concurrency) {
            this.concurrency++;
            if (this.concurrency > this.concurrencyHighWaterMark) {
                this.concurrencyHighWaterMark = this.concurrency;
            }
            if (this.breaker) {
                this.breaker.run(function (success, failed) {
                    // run command
                    guarded.invoke(context, function () {
                        _this.concurrency--;
                        if (context.isValid()) {
                            success();
                        }
                        else {
                            failed();
                        }
                        callback(context);
                    });
                }, function () {
                    // service is down
                    context.setCode(503).addError(2, 'Downstream service is down');
                    callback(context);
                });
            }
            else {
                guarded.invoke(context, function () {
                    _this.concurrency--;
                    callback(context);
                });
            }
        }
        else {
            this.countConcurrencyExceeded++;
            logger_1.log.warn('Concurrency threshold reached: ' + this.config.concurrency);
            context.setCode(503).addError(1, 'Concurrency threshold reached: ' + this.config.concurrency);
            callback(context);
        }
    };
    GuardedInvoker.prototype.runProbe = function () {
        var probeScan = new diagnostics_1.ProbeScan();
        probeScan.startTimer();
        probeScan.type = diagnostics_1.ProbeType.GUARD;
        probeScan.name = 'GuardedInvoker';
        probeScan.description = 'Details on the state of the GuardedInvoker and historical data on its performance.';
        probeScan.healthy = true;
        probeScan.severity = diagnostics_1.ProbeScanSeverity.INFO;
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
    };
    GuardedInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    return GuardedInvoker;
}());
exports.GuardedInvoker = GuardedInvoker;
var MockInvoker = (function () {
    function MockInvoker(result, targetSystem) {
        this.result = result;
        this.targetSystem = targetSystem;
    }
    MockInvoker.prototype.invoke = function (context, callback) {
        context.invokerOutput = typeof (this.result) == 'function' ? this.result(context) : this.result;
        callback(context);
    };
    MockInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    MockInvoker.prototype.getServiceCall = function () {
        return;
    };
    return MockInvoker;
}());
exports.MockInvoker = MockInvoker;
var DelayingInvoker = (function () {
    function DelayingInvoker(delayed, delay, targetSystem) {
        if (delay === void 0) { delay = 5000; }
        this.delayed = delayed;
        this.delay = delay;
        this.targetSystem = targetSystem;
    }
    DelayingInvoker.prototype.invoke = function (context, callback) {
        var _this = this;
        setTimeout(function () {
            _this.delayed.invoke(context, callback);
        }, this.delay);
    };
    DelayingInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    DelayingInvoker.prototype.getServiceCall = function () {
        return;
    };
    return DelayingInvoker;
}());
exports.DelayingInvoker = DelayingInvoker;
function createHttpEntryPoint(server, method, path, requestHandler) {
    if (server) {
        // create HTTP endpoint
        var httpHandler = function (req, res) {
            var request = new messages_1.GenericRequest(path, req.method);
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
            utils_1.objectAddEachProperty(req.body, request);
            var transport = {
                type: TransportType.http,
                request: req,
                response: res
            };
            requestHandler(request, transport);
        };
        switch (method) {
            case messages_1.HttpMethod.GET:
                server.get(path, httpHandler);
                break;
            case messages_1.HttpMethod.POST:
                server.post(path, httpHandler);
                break;
            case messages_1.HttpMethod.PUT:
                server.put(path, httpHandler);
                break;
            case messages_1.HttpMethod.DELETE:
                server.del(path, httpHandler);
                break;
            case messages_1.HttpMethod.PATCH:
                server.patch(path, httpHandler);
                break;
        }
    }
}
exports.createHttpEntryPoint = createHttpEntryPoint;
var BaseTemplate = (function () {
    function BaseTemplate(invoker, guardInvoker) {
        this.sendResultViaBus = true;
        this.invoker = invoker;
        if (guardInvoker) {
            this.guardInvoker = guardInvoker;
        }
        else {
            if (!BaseTemplate.globalGuard) {
                BaseTemplate.globalGuard = new GuardedInvoker(service_info_1.serviceInfo.guard, "NO_DOWNSTREAM_INFO_PROVIDED");
            }
            this.guardInvoker = BaseTemplate.globalGuard;
        }
    }
    BaseTemplate.prototype.disableResultViaBus = function () {
        this.sendResultViaBus = false;
        return this;
    };
    BaseTemplate.prototype.prepareInput = function (context) {
    };
    BaseTemplate.prototype.prepareOutput = function (context) {
    };
    BaseTemplate.prototype.handleError = function (context) {
    };
    BaseTemplate.prototype.run = function (context, callback) {
        var _this = this;
        this.prepareInput(context);
        if (context.isValid()) {
            this.guardInvoker.invoke(this.invoker, context, function (context2) {
                if (context.isValid()) {
                    _this.prepareOutput(context2);
                    if (callback) {
                        callback(context2);
                    }
                    if (context2.transport.type != TransportType.internal) {
                        _this.sendResult(context2);
                    }
                }
                else {
                    _this.handleError(context2);
                    if (callback) {
                        callback(context2);
                    }
                    if (context2.transport.type != TransportType.internal) {
                        _this.sendResult(context2);
                    }
                }
            });
        }
        else {
            this.handleError(context);
            if (callback) {
                callback(context);
            }
            if (context.transport.type != TransportType.internal) {
                this.sendResult(context);
            }
        }
    };
    BaseTemplate.prototype.createEntryPoint = function (server, messageBus, method, path) {
        if (path === void 0) { path = '/'; }
        this.createHttpEntryPoint(server, method, path);
        this.createBusEntryPoint(messageBus, method, path);
    };
    BaseTemplate.prototype.createHttpEntryPoint = function (server, method, path) {
        var _this = this;
        if (path === void 0) { path = '/'; }
        var template = this;
        createHttpEntryPoint(server, method, path, function (request, transport) {
            request.setCorrelationId(request.correlationId || request.requestId);
            var context = new InvocationContext(request);
            context.transport = transport;
            _this.run(context);
        });
    };
    BaseTemplate.prototype.createBusEntryPoint = function (messageBus, method, path) {
        var _this = this;
        if (path === void 0) { path = '/'; }
        if (messageBus && !service_info_1.serviceInfo.busDisabled) {
            var template = this;
            var dest = new bus_1.MessageDestination(bus_1.MessageDestinationType.Process)
                .setPath(path)
                .setMethod(method);
            var messageHandler = function (message) {
                var request = new messages_1.GenericRequest(path, messages_1.HttpMethod[method]);
                request.setCorrelationId(request.correlationId || request.requestId);
                var context = new InvocationContext(request);
                utils_1.objectAddEachProperty(message, context.input);
                context.transport = {
                    type: TransportType.bus,
                    message: message,
                    respondTo: message.respondTo,
                    destination: dest,
                    method: method,
                    bus: messageBus
                };
                _this.run(context);
            };
            messageBus.listenForRequest(dest, messageHandler);
        }
    };
    BaseTemplate.prototype.createBusMonitorEntryPoint = function (messageBus, path) {
        var _this = this;
        messageBus.subscribe(path, function (busMessage) {
            var content = busMessage.content.toString();
            var message = {};
            try {
                message = JSON.parse(content);
            }
            catch (e) { }
            var request = new messages_1.GenericRequest(path, messages_1.HttpMethod[messages_1.HttpMethod.GET]);
            request.setCorrelationId(request.correlationId || request.requestId);
            var context = new InvocationContext(request);
            utils_1.objectAddEachProperty(message, context.input);
            context.transport = {
                type: TransportType.bus,
                message: message,
                respondTo: message.respondTo,
                destination: null,
                method: messages_1.HttpMethod.GET,
                bus: messageBus,
                dontRespond: true
            };
            _this.run(context);
        });
    };
    BaseTemplate.prototype.sendResult = function (context) {
        context.output.request = context.input;
        context.output.setCorrelationId(context.input.correlationId);
        context.output.time = context.output.time ? moment(context.output.time).format() : moment().format();
        if (context.transport.type === TransportType.http) {
            this.httpSend(context);
        }
        else {
            this.busSendResult(context);
        }
    };
    BaseTemplate.prototype.busSendResult = function (context) {
        var transport = context.transport;
        var bus = transport.bus;
        var respondTo = transport.respondTo;
        if (!transport.dontRespond) {
            bus.sendToPath(respondTo, context.output);
        }
    };
    BaseTemplate.prototype.httpSend = function (context) {
        var res = context.transport.response;
        if (res) {
            var code = context.output.code;
            if (service_info_1.serviceInfo.simpleHttpResponseFormat) {
                delete context.output.request;
                //changes done as part of DSAPI-2030
                if (context.output.code < 300) {
                    delete context.output.code;
                    delete context.output.message;
                }
                else {
                    var contextOutputErrors = context.output.errors;
                    if (contextOutputErrors.length > 0) {
                        context.output.code = contextOutputErrors[0].code;
                        context.output.message = contextOutputErrors[0].message;
                    }
                }
            }
            res.send(code, context.output);
        }
    };
    return BaseTemplate;
}());
exports.BaseTemplate = BaseTemplate;
var SimpleTemplate = (function (_super) {
    __extends(SimpleTemplate, _super);
    function SimpleTemplate() {
        _super.apply(this, arguments);
    }
    SimpleTemplate.prototype.prepareInput = function (context) {
        context.invokerInput = context.input;
    };
    SimpleTemplate.prototype.prepareOutput = function (context) {
        context.output = new messages_1.GenericResponse().setData(context.invokerOutput);
    };
    return SimpleTemplate;
}(BaseTemplate));
exports.SimpleTemplate = SimpleTemplate;
var CompositeTemplateInvoker = (function () {
    function CompositeTemplateInvoker(template) {
        this.template = template;
    }
    CompositeTemplateInvoker.prototype.invoke = function (context, callback) {
        var _this = this;
        var state = context.state._compositeTemplate = { step: 0, originalContext: context, currentTasks: [], currentContexts: [context.clone()], currentStates: [] };
        async.whilst(function () {
            state.currentTasks = _this.template.prepareTasks(state.step, state.currentContexts);
            return !!(state.currentTasks && state.currentTasks.length);
        }, function (callback) {
            var nextContexts = [];
            var errorState = false;
            var parallelTasks = state.currentTasks.map(function (task) {
                return function (callback) {
                    task.template.run(task.context.clone(), function (context) {
                        if (!context.isValid()) {
                            errorState = true;
                        }
                        nextContexts.push(context);
                        callback();
                    });
                };
            });
            async.parallel(parallelTasks, function () {
                state.step++;
                state.currentContexts = nextContexts;
                if (errorState) {
                    callback(new Error('Some of tasks failed'), context);
                }
                else {
                    callback();
                }
            });
        }, function () {
            if (state.currentContexts && state.currentContexts.length) {
                context.state.subStates = state.currentContexts.map(function (subContext) { return subContext.state; });
                context.invokerOutput = state.currentContexts.map(function (subContext) { return subContext.invokerOutput; });
            }
            delete context.state._compositeTemplate;
            callback(context);
        });
    };
    CompositeTemplateInvoker.prototype.getTargetSystem = function () {
        return 'internal';
    };
    CompositeTemplateInvoker.prototype.getServiceCall = function () {
        return 'internal';
    };
    return CompositeTemplateInvoker;
}());
exports.CompositeTemplateInvoker = CompositeTemplateInvoker;
var CompositeTemplate = (function (_super) {
    __extends(CompositeTemplate, _super);
    function CompositeTemplate(subTemplates, guardInvoker) {
        _super.call(this, null, guardInvoker);
        this.subTemplates = subTemplates;
        this.invoker = new CompositeTemplateInvoker(this);
    }
    CompositeTemplate.prototype.prepareTasks = function (index, prevContexts) {
        // this is a default implemnentation - demo only
        return this.subTemplates[index].map(function (template) {
            return { template: template, context: prevContexts[0].clone() };
        });
    };
    return CompositeTemplate;
}(SimpleTemplate));
exports.CompositeTemplate = CompositeTemplate;
var MultiTemplate = (function (_super) {
    __extends(MultiTemplate, _super);
    function MultiTemplate(namedInvokers, guardInvoker) {
        var _this = this;
        _super.call(this, null, guardInvoker);
        this.invokers = [];
        if (namedInvokers) {
            utils_1.objectForEachProperty(namedInvokers, function (name, invoker) {
                invoker.invokerName = name;
                _this.invokers.push(invoker);
            });
        }
    }
    return MultiTemplate;
}(SimpleTemplate));
exports.MultiTemplate = MultiTemplate;
var ChainTemplate = (function (_super) {
    __extends(ChainTemplate, _super);
    function ChainTemplate(namedInvokers, guardInvoker) {
        _super.call(this, namedInvokers, guardInvoker);
    }
    ChainTemplate.prototype.getInvoker = function (index, context) {
        return this.invokers[index];
    };
    ChainTemplate.prototype.prepareFinalOutput = function (context) {
    };
    ChainTemplate.prototype.run = function (context, callback) {
        var _this = this;
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists
        context.invokerIndex = 0;
        async.whilst(function () {
            var invoker = _this.getInvoker(context.invokerIndex, context);
            if (invoker) {
                context.invoker = invoker;
                context.invokerIndex++;
            }
            return !!invoker;
        }, function (callback) {
            var invoker = context.invoker;
            context.invokerName = invoker.invokerName;
            _this.prepareInput(context);
            if (context.isValid()) {
                _this.guardInvoker.invoke(invoker, context, function (context2) {
                    if (context2.isValid()) {
                        _this.prepareOutput(context2);
                    }
                    else {
                        _this.handleError(context2);
                    }
                    callback(context2.isValid() ? undefined : new Error(), context);
                });
            }
            else {
                callback(new Error(), context);
            }
        }, function () {
            _this.prepareFinalOutput(context);
            _this.sendResult(context);
        });
    };
    return ChainTemplate;
}(MultiTemplate));
exports.ChainTemplate = ChainTemplate;
var ParallelTemplate = (function (_super) {
    __extends(ParallelTemplate, _super);
    function ParallelTemplate() {
        _super.apply(this, arguments);
    }
    ParallelTemplate.prototype.prepareFinalOutput = function (context, subContexts) {
    };
    ParallelTemplate.prototype.run = function (context, callback) {
        var _this = this;
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists
        var tasks = this.invokers.map(function (invoker) {
            var contextCopy = utils_1.objectClone(context);
            return function (callback) {
                contextCopy.invokerName = invoker.invokerName;
                _this.prepareInput(contextCopy);
                if (contextCopy.isValid()) {
                    _this.guardInvoker.invoke(invoker, contextCopy, function (context2) {
                        if (context2.isValid()) {
                            _this.prepareOutput(context2);
                        }
                        else {
                            _this.handleError(context2);
                        }
                        callback(context2.isValid() ? null : true, contextCopy);
                    });
                }
                else {
                    callback(true, contextCopy);
                }
            };
        });
        async.parallel(tasks, function (err, contexts) {
            _this.prepareFinalOutput(context, contexts);
            _this.sendResult(context);
        });
    };
    return ParallelTemplate;
}(MultiTemplate));
exports.ParallelTemplate = ParallelTemplate;
var AuthenticatorTemplate = (function (_super) {
    __extends(AuthenticatorTemplate, _super);
    function AuthenticatorTemplate() {
        _super.apply(this, arguments);
        /**
         * It could service info, etcd, or any other secured vault
         * Defaulting it to serviceInfo for now - can be overridden
         * @type {string}
         */
        this.credentialLocation = "serviceInfo";
        /**
         * Defaulting it to this value - can be overridden
         * @type {{Content-type: string}}
         */
        this.headerInfo = { "Content-type": "application/x-www-form-urlencoded" };
        /**
         * Setting the endpoint path of the service, defaulting it - can be changed
         */
        this.path = "/v1/oauth/token";
    }
    /**
     * Location of the credentials - serviceInfo, etcd, any other secured vault etc
     * @param paramCredentialLocation
     * @returns {AuthenticatorTemplate}
     */
    AuthenticatorTemplate.prototype.setCredentialLocation = function (paramCredentialLocation) {
        this.credentialLocation = paramCredentialLocation;
        return this;
    };
    /**
     * @param paramCredentialPath
     * @returns {AuthenticatorTemplate}
     */
    AuthenticatorTemplate.prototype.setCredentialReferencePath = function (paramCredentialPath) {
        this.credentialPath = paramCredentialPath;
        return this;
    };
    /**
     * Method to override the header info
     * @param paramHeaderInfo
     * @returns {AuthenticatorTemplate}
     */
    AuthenticatorTemplate.prototype.setHeaderInfo = function (paramHeaderInfo) {
        this.headerInfo = paramHeaderInfo;
        return this;
    };
    /**
     * Method to override the endpoint resource path
     * @param paramPath
     * @returns {AuthenticatorTemplate}
     */
    AuthenticatorTemplate.prototype.setPath = function (paramPath) {
        this.path = paramPath;
        return this;
    };
    AuthenticatorTemplate.prototype.prepareInput = function (context) {
        this.headerInfo = !collections_1.isUndefined(this.headerInfo) ? this.headerInfo : { "Content-type": "application/x-www-form-urlencoded" };
        this.path = !collections_1.isUndefined(this.path) ? this.path : '/v1/oauth/token';
        var oAuthCredentialMap;
        /**
         * Condition check for client credentials being read from the config file
         */
        if (this.credentialLocation === 'serviceInfo') {
            var configPath = service_info_1.serviceInfo.extras[this.credentialPath];
            if (!collections_1.isUndefined(configPath)) {
                oAuthCredentialMap = {
                    "client_id": configPath.client_id,
                    "client_secret": configPath.client_secret,
                    "grant_type": configPath.grant_type,
                    "scope": configPath.scope
                };
            }
        }
        if (!collections_1.isUndefined(oAuthCredentialMap)) {
            var body = utils_1.setOAUTHCredentials(oAuthCredentialMap);
            context.invokerInput = new json_invoker_1.JsonAction(messages_1.HttpMethod.POST, body, this.path, this.headerInfo).setEncoding(json_client_1.JsonClientEncoding.FORM);
        }
        else {
            throw new Error('AuthenticatorTemplate.prepareInput(), No credentials configuration path found.');
        }
    };
    AuthenticatorTemplate.prototype.prepareOutput = function (context) {
        if (context.isValid()) {
            var invokerOutput = context.invokerOutput;
            if (invokerOutput) {
                var body = invokerOutput.body;
                if (invokerOutput.code == 200) {
                    if (typeof context.output.data === "undefined") {
                        context.output.data = {};
                    }
                    context.output.data.access_token = body.access_token;
                }
                else {
                    context.setCode(invokerOutput.code).addError(1001, "Error in AuthenticatorTemplate!");
                }
            }
        }
    };
    AuthenticatorTemplate.prototype.handleError = function (context) {
        return _super.prototype.handleError.call(this, context);
    };
    return AuthenticatorTemplate;
}(SimpleTemplate));
exports.AuthenticatorTemplate = AuthenticatorTemplate;
//# sourceMappingURL=templates.js.map