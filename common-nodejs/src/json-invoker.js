/**
 * Created by andrey on 22/09/15.
 */
"use strict";
var messages_1 = require('./messages');
var json_client_1 = require('./json-client');
var ssl_config_1 = require("./ssl-config");
var service_info_1 = require("./service-info");
var logger_1 = require('./logger');
var JsonAction = (function () {
    function JsonAction(method, body, path, headers) {
        if (body === void 0) { body = {}; }
        if (path === void 0) { path = ''; }
        this.method = method;
        this.body = body;
        this.path = path;
        this.headers = headers;
        this.encoding = json_client_1.JsonClientEncoding.JSON;
    }
    JsonAction.prototype.setBody = function (body) {
        this.body = body;
        return this;
    };
    JsonAction.prototype.setPath = function (path) {
        this.path = path;
        return this;
    };
    JsonAction.prototype.setHeaders = function (headers) {
        this.headers = headers;
        return this;
    };
    JsonAction.prototype.setEncoding = function (encoding) {
        this.encoding = encoding;
        return this;
    };
    return JsonAction;
}());
exports.JsonAction = JsonAction;
var JsonInvoker = (function () {
    function JsonInvoker(url, proxy) {
        this.url = url;
        this.proxy = proxy;
        if (service_info_1.serviceInfo.downstreamCertificate) {
            var sslConfig = void 0;
            sslConfig = new ssl_config_1.SslConfigEtcdImpl(service_info_1.serviceInfo.downstreamCertificate);
            // This is very a unOO short cut.  The SsslConfig has all the properties of the
            // sslSecurityConfig and the wsSecurity object so it can be directly assigned to both.
            // In a strongly types language this would not be possible.
            if (sslConfig.ca || sslConfig.cert || sslConfig.key) {
                logger_1.log.debug('Setting the sslSecurityConfig object to', sslConfig);
                this.sslSecurityConfig = sslConfig;
            }
        }
    }
    JsonInvoker.prototype.invoke = function (context, callback) {
        var jsonAction = context.invokerInput;
        this.serviceCall = this.url;
        var resultHandler = function (err, res, obj) {
            if (err) {
                context.setCode(502).addError(1, 'Downstream service error: ' + (err.message || err));
            }
            else {
                context.invokerOutput = {
                    code: res.statusCode,
                    body: obj
                };
            }
            callback(context);
        };
        var options = {};
        if (this.sslSecurityConfig) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            options = {
                ca: this.sslSecurityConfig.ca,
                key: this.sslSecurityConfig.key,
                cert: this.sslSecurityConfig.cert
            };
        }
        if (this.proxy) {
            options.proxy = this.proxy;
        }
        var client = json_client_1.getJsonClient(this.url, jsonAction.path, {}, options);
        client.encoding = jsonAction.encoding;
        if (jsonAction.headers) {
            client.headers = jsonAction.headers;
        }
        else {
            client.headers = null;
        }
        switch (jsonAction.method) {
            case messages_1.HttpMethod.GET:
                client.get(resultHandler);
                break;
            case messages_1.HttpMethod.POST:
                client.post(jsonAction.body, resultHandler);
                break;
            case messages_1.HttpMethod.PUT:
                client.put(jsonAction.body, resultHandler);
                break;
            case messages_1.HttpMethod.DELETE:
                client.del(resultHandler);
                break;
            case messages_1.HttpMethod.PATCH:
                client.patch(jsonAction.body, resultHandler);
                break;
        }
    };
    JsonInvoker.prototype.setTargetSystem = function (targetSystem) {
        this.targetSystem = targetSystem;
    };
    JsonInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    JsonInvoker.prototype.getServiceCall = function () {
        return this.serviceCall;
    };
    return JsonInvoker;
}());
exports.JsonInvoker = JsonInvoker;
//# sourceMappingURL=json-invoker.js.map