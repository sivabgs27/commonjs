"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var moment = require('moment');
var utils_1 = require('./utils');
var messages_1 = require('./messages');
var bus_1 = require('./bus');
var service_invoker_1 = require('./service-invoker');
var templates_1 = require('./templates');
var service_info_1 = require('./service-info');
var json_client_1 = require('./json-client');
var templates_2 = require("./templates");
var logger_1 = require("./logger");
// what we send to downstream
var ProcessRequest = (function (_super) {
    __extends(ProcessRequest, _super);
    function ProcessRequest() {
        _super.apply(this, arguments);
    }
    return ProcessRequest;
}(messages_1.GenericRequest));
exports.ProcessRequest = ProcessRequest;
// what we receive from downstream
var ProcessResponse = (function (_super) {
    __extends(ProcessResponse, _super);
    function ProcessResponse() {
        _super.apply(this, arguments);
    }
    return ProcessResponse;
}(messages_1.GenericResponse));
exports.ProcessResponse = ProcessResponse;
var PingPongInvoker = (function (_super) {
    __extends(PingPongInvoker, _super);
    function PingPongInvoker(template, flowContext) {
        _super.call(this);
        this.template = template;
        this.messageBus = template.getMessageBus();
        this.flowContext = flowContext;
    }
    PingPongInvoker.prototype.invoke = function (context, callback) {
        var action = context.invokerInput;
        if (action.type === service_invoker_1.ServiceActionType.ASYNC_NOTIFY || action.type === service_invoker_1.ServiceActionType.HYBRID) {
            throw new Error("PingPongInvoker doesn't support action type ASYNC_NOTIFY or HYBRID");
        }
        return _super.prototype.invoke.call(this, context, callback);
    };
    PingPongInvoker.prototype.listenForResponse = function (request, callback) {
    };
    PingPongInvoker.prototype.handleResponseFromHttp = function (err, res, obj, context, action, callback) {
        if (action.type === service_invoker_1.ServiceActionType.SYNC) {
            try {
                obj.request = context.invokerInput.request;
            }
            catch (e) {
            }
            this.template.continueProcess(obj, this.flowContext);
        }
    };
    PingPongInvoker.prototype.getMessageBus = function () {
        return this.messageBus;
    };
    PingPongInvoker.prototype.getJsonClient = function (action) {
        return this.template.getJsonClient(action);
    };
    return PingPongInvoker;
}(service_invoker_1.ServiceInvoker));
var PingPongTemplate = (function () {
    function PingPongTemplate(flow) {
        if (flow) {
            this.init(flow);
        }
    }
    PingPongTemplate.prototype.init = function (flow) {
        var _this = this;
        this.flow = flow;
        this.processName = service_info_1.serviceInfo.name + '-v' + service_info_1.serviceInfo.apiVersion;
        this.messageBus = this.getMessageBus();
        this.flow.whenEnter('*', function (context) {
            if (context.httpConfirmationData && context.httpConfirmationData.sendNow) {
                // send HTTP confirmation response if required
                var response = context.httpConfirmationMessage;
                context.httpConfirmationData.transport.response.send(response.code, response);
                delete context.httpConfirmationData;
                delete context.httpConfirmationMessage;
            }
            if (context.outputMessage) {
                if (context.finished) {
                    _this.handleFinalState(context);
                }
                else {
                    _this.handleIntermediateState(context);
                }
            }
        });
    };
    PingPongTemplate.prototype.handleIntermediateState = function (context) {
        var action = context.outputMessage;
        var invocationContext = new templates_2.InvocationContext(null);
        invocationContext.invokerInput = action;
        var request = action.request;
        var process = context.inputMessage.process[this.processName];
        delete context.inputMessage;
        delete context.outputMessage;
        process.state = {};
        var props = Object.getOwnPropertyNames(context);
        props.forEach(function (name) {
            if (name !== 'httpConfirmationData' && name !== 'httpConfirmationMessage') {
                var destination = Object.getOwnPropertyDescriptor(context, name);
                Object.defineProperty(process.state, name, destination);
            }
        });
        request.process = {};
        request.process[this.processName] = process;
        new PingPongInvoker(this, context).invoke(invocationContext, function (context) {
        });
    };
    PingPongTemplate.prototype.handleFinalState = function (context) {
        var processResult = context.outputMessage;
        var message = context.inputMessage;
        delete context.inputMessage;
        delete context.outputMessage;
        processResult.request = utils_1.objectClone(message.request.process[this.processName].initialRequest);
        processResult.process = utils_1.objectClone(message.request);
        if (processResult.request.respondTo) {
            this.messageBus.sendToPath(processResult.request.respondTo, processResult);
        }
        else {
            logger_1.log.info('respondTo is not specified');
        }
    };
    PingPongTemplate.prototype.createEntryPoint = function (server, method, path) {
        var _this = this;
        if (path === void 0) { path = '/'; }
        var messageRoute = {
            method: method,
            path: path
        };
        templates_1.createHttpEntryPoint(server, method, path, function (request, transport) {
            _this.startProcess(request, {
                transport: transport,
                request: request
            });
        });
        this.messageBus.listenForAny(messageRoute, function (message) {
            var isRequest = !!message.respondTo;
            if (isRequest) {
                _this.startProcess(message);
            }
            else {
                _this.continueProcess(message);
            }
        });
    };
    PingPongTemplate.prototype.startProcess = function (message, httpConfirmationData) {
        var pid = utils_1.createUuid();
        var process = {
            time: moment().format(),
            name: this.processName,
            id: pid,
            initialRequest: utils_1.objectClone(message),
            state: {}
        };
        var processList = message.process = {};
        processList[this.processName] = process;
        var flowContext = {
            inputMessage: message
        };
        if (httpConfirmationData) {
            httpConfirmationData.process = process;
            flowContext.httpConfirmationData = httpConfirmationData;
            flowContext.httpConfirmationData.sendNow = true;
            flowContext.httpConfirmationMessage = new messages_1.GenericResponse(202).setCorrelationId(message.correlationId);
            flowContext.httpConfirmationMessage.request = httpConfirmationData.request;
        }
        this.flow.start(flowContext);
        return process;
    };
    PingPongTemplate.prototype.continueProcess = function (message, oldFlowContext) {
        var processInfoList = utils_1.objectClone(message.request.process);
        var processInfo = processInfoList[this.processName];
        message.process = processInfoList;
        var flowContext = processInfo.state;
        flowContext.inputMessage = message;
        if (oldFlowContext) {
            flowContext.httpConfirmationData = oldFlowContext.httpConfirmationData;
            flowContext.httpConfirmationMessage = oldFlowContext.httpConfirmationMessage;
        }
        var nextEvent = flowContext.events[0];
        this.flow.trigger(nextEvent, flowContext);
    };
    PingPongTemplate.prototype.getMessageBus = function () {
        return bus_1.bus;
    };
    PingPongTemplate.prototype.getJsonClient = function (action) {
        var request = action.request;
        return json_client_1.getJsonClient(utils_1.getFullServiceUrl(action.service + '/' + action.version), request.path, request.params);
    };
    return PingPongTemplate;
}());
exports.PingPongTemplate = PingPongTemplate;
//# sourceMappingURL=ping-pong-template.js.map