/**
 * Created by cam on 25/01/16.
 */
"use strict";
var mongo_database_client_1 = require('./mongo-database-client');
var messages_1 = require('./messages');
var MongoAction = (function () {
    function MongoAction(method, body, path, headers) {
        if (body === void 0) { body = {}; }
        if (path === void 0) { path = ''; }
        this.method = method;
        this.body = body;
        this.path = path;
        this.headers = headers;
    }
    MongoAction.prototype.setBody = function (body) {
        this.body = body;
        return this;
    };
    MongoAction.prototype.setPath = function (path) {
        this.path = path;
        return this;
    };
    MongoAction.prototype.setHeaders = function (headers) {
        this.headers = headers;
        return this;
    };
    return MongoAction;
}());
exports.MongoAction = MongoAction;
var MongoInvoker = (function () {
    function MongoInvoker(url) {
        this.url = url;
    }
    MongoInvoker.prototype.invoke = function (context, callback) {
        var mongoAction = context.invokerInput;
        this.serviceCall = this.url;
        var resultHandler = function (err, res, obj) {
            if (err) {
                context.setCode(502).addError(1, 'MongoDB Downstream service error: ' + (err.message || err));
            }
            else {
                context.invokerOutput = {
                    code: res.statusCode,
                    result: res,
                    body: obj
                };
            }
            callback(context);
        };
        var fullUrl = mongo_database_client_1.getMongoDatabaseClient(this.url, mongoAction.path);
        switch (mongoAction.method) {
            case messages_1.HttpMethod.GET:
                new mongo_database_client_1.MongoDatabaseClient(fullUrl).get(mongoAction.body, resultHandler);
                break;
            case messages_1.HttpMethod.POST:
                new mongo_database_client_1.MongoDatabaseClient(fullUrl).post(mongoAction.body, resultHandler);
                break;
            case messages_1.HttpMethod.PUT:
                new mongo_database_client_1.MongoDatabaseClient(fullUrl).put(mongoAction.body, resultHandler);
                break;
            case messages_1.HttpMethod.DELETE:
                new mongo_database_client_1.MongoDatabaseClient(fullUrl).del(mongoAction.body, resultHandler);
                break;
        }
    };
    MongoInvoker.prototype.setTargetSystem = function (targetSystem) {
        this.targetSystem = targetSystem;
    };
    MongoInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    MongoInvoker.prototype.getServiceCall = function () {
        return this.serviceCall;
    };
    return MongoInvoker;
}());
exports.MongoInvoker = MongoInvoker;
//# sourceMappingURL=mongo-invoker.js.map