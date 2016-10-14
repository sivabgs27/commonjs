/**
 * Created by andrey on 30/09/15.
 */
"use strict";
var utils_1 = require('./utils');
var messages_1 = require('./messages');
var json_client_1 = require('./json-client');
var templates_1 = require('./templates');
var bus_1 = require('./bus');
(function (ServiceActionType) {
    ServiceActionType[ServiceActionType["SYNC"] = 0] = "SYNC";
    ServiceActionType[ServiceActionType["ASYNC"] = 1] = "ASYNC";
    ServiceActionType[ServiceActionType["ASYNC_ISOLATED"] = 2] = "ASYNC_ISOLATED";
    ServiceActionType[ServiceActionType["ASYNC_NOTIFY"] = 3] = "ASYNC_NOTIFY";
    ServiceActionType[ServiceActionType["HYBRID"] = 4] = "HYBRID"; // SYNC Rest invocation with 202 confirmation and ASYNC response through the bus
})(exports.ServiceActionType || (exports.ServiceActionType = {}));
var ServiceActionType = exports.ServiceActionType;
var ServiceAction = (function () {
    function ServiceAction(service, version, type, request) {
        this.service = service;
        this.version = version;
        this.type = type;
        this.request = request;
    }
    ServiceAction.prototype.getUrl = function () {
        return utils_1.getFullServiceUrl(this.service + '/' + this.version);
    };
    return ServiceAction;
}());
exports.ServiceAction = ServiceAction;
var ServiceInvoker = (function () {
    function ServiceInvoker() {
    }
    ServiceInvoker.prototype.invoke = function (context, callback) {
        var _this = this;
        var action = context.invokerInput;
        var request = action.request;
        if (action.type === ServiceActionType.ASYNC || action.type === ServiceActionType.ASYNC_ISOLATED || action.type === ServiceActionType.ASYNC_NOTIFY) {
            if (action.type === ServiceActionType.ASYNC || action.type === ServiceActionType.ASYNC_ISOLATED) {
                var responseDest = this.getResponseDestination(action.request);
                if (action.type === ServiceActionType.ASYNC_ISOLATED) {
                    responseDest.setRandomKey();
                }
                request.setRespondTo(responseDest.toPathString());
                this.listenForResponse(request, callback);
            }
            request.original = utils_1.objectClone(context.input);
            this.getMessageBus().send(this.getMessageDestination(action), request);
            if (action.type === ServiceActionType.ASYNC_NOTIFY) {
                context.invokerInput = context.invokerInput.request;
                callback(context);
            }
        }
        else if (action.type === ServiceActionType.SYNC || action.type === ServiceActionType.HYBRID) {
            var resultHandler = function (err, res, obj) {
                _this.handleResponseFromHttp(err, res, obj, context, action, callback);
            };
            if (action.type === ServiceActionType.HYBRID) {
                this.listenForResponse(request, callback);
            }
            var requestMethod = messages_1.HttpMethod[request.method];
            var client = this.getJsonClient(action);
            var body = void 0;
            if (requestMethod === messages_1.HttpMethod.POST || requestMethod === messages_1.HttpMethod.PUT || requestMethod === messages_1.HttpMethod.PATCH) {
                body = {
                    data: utils_1.objectClone(request.data),
                    original: utils_1.objectClone(context.input)
                };
            }
            switch (requestMethod) {
                case messages_1.HttpMethod.GET:
                    client.get(resultHandler);
                    break;
                case messages_1.HttpMethod.DELETE:
                    client.del(resultHandler);
                    break;
                case messages_1.HttpMethod.POST:
                    client.post(body, resultHandler);
                    break;
                case messages_1.HttpMethod.PUT:
                    client.put(body, resultHandler);
                    break;
                case messages_1.HttpMethod.PATCH:
                    client.patch(body, resultHandler);
                    break;
            }
        }
    };
    ServiceInvoker.prototype.getMessageDestination = function (action) {
        return new bus_1.MessageDestination(bus_1.MessageDestinationType.Process)
            .setService(action.service)
            .setVersion(action.version)
            .setMethod(messages_1.HttpMethod[action.request.method])
            .setPath(action.request.path);
    };
    ServiceInvoker.prototype.getResponseDestination = function (request) {
        return new bus_1.MessageDestination(bus_1.MessageDestinationType.Process)
            .setMethod(messages_1.HttpMethod[request.method])
            .setPath(request.path);
    };
    ServiceInvoker.prototype.listenForResponse = function (request, callback) {
        var _this = this;
        var messageBus = this.getMessageBus();
        messageBus.listenForResponse(this.getResponseDestination(request), function (message) {
            _this.handleResponseFromBus(message, callback);
        });
    };
    ServiceInvoker.prototype.handleResponseFromBus = function (message, callback) {
        // recreate context from message
        var r = message.request;
        if (r.original) {
            r.original.setCorrelationId(r.original.correlationId);
        }
        var restoredContext = new templates_1.InvocationContext(r.original || {});
        restoredContext.invokerInput = r;
        restoredContext.invokerOutput = message;
        callback(restoredContext);
    };
    ServiceInvoker.prototype.handleResponseFromHttp = function (err, res, obj, context, action, callback) {
        if (err) {
            context.setCode(502).addError(1, 'Downstream error: ' + (err.message || err));
        }
        context.invokerOutput = obj || {};
        context.invokerOutput.code = res.statusCode;
        var actionReq = context.invokerInput.request;
        context.invokerInput = obj.request;
        context.invokerInput.method = context.invokerInput.method || actionReq.method;
        context.invokerInput.params = context.invokerInput.params || actionReq.params;
        context.invokerInput.path = context.invokerInput.path || actionReq.path;
        if (action.type === ServiceActionType.SYNC || !context.isValid()) {
            callback(context);
        }
    };
    ServiceInvoker.prototype.getJsonClient = function (action) {
        var request = action.request;
        return json_client_1.getJsonClient(action.getUrl(), request.path, request.params);
    };
    ServiceInvoker.prototype.getMessageBus = function () {
        return bus_1.bus;
    };
    ServiceInvoker.prototype.getTargetSystem = function () {
        return;
    };
    ServiceInvoker.prototype.getServiceCall = function () {
        return;
    };
    return ServiceInvoker;
}());
exports.ServiceInvoker = ServiceInvoker;
//# sourceMappingURL=service-invoker.js.map