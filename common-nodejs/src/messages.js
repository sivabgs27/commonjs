/**
 * Created by andrey on 28/09/15.
 */
"use strict";
var utils_1 = require('./utils');
(function (HttpMethod) {
    HttpMethod[HttpMethod["GET"] = 0] = "GET";
    HttpMethod[HttpMethod["POST"] = 1] = "POST";
    HttpMethod[HttpMethod["PUT"] = 2] = "PUT";
    HttpMethod[HttpMethod["DELETE"] = 3] = "DELETE";
    HttpMethod[HttpMethod["PATCH"] = 4] = "PATCH";
})(exports.HttpMethod || (exports.HttpMethod = {}));
var HttpMethod = exports.HttpMethod;
var ErrorDetails = (function () {
    function ErrorDetails(code, message, field) {
        this.code = code;
        this.message = message;
        this.field = field;
    }
    return ErrorDetails;
}());
exports.ErrorDetails = ErrorDetails;
var GenericRequest = (function () {
    function GenericRequest(path, method) {
        this.params = {};
        this.data = {};
        this.path = path;
        this.method = method;
        this.requestId = utils_1.createUuid();
    }
    GenericRequest.prototype.setPath = function (path) {
        this.path = path;
        return this;
    };
    GenericRequest.prototype.setMethod = function (method) {
        this.method = method;
        return this;
    };
    GenericRequest.prototype.setParams = function (params) {
        this.params = params;
        return this;
    };
    GenericRequest.prototype.setData = function (data) {
        this.data = data;
        return this;
    };
    GenericRequest.prototype.setCorrelationId = function (correlationId) {
        this.correlationId = correlationId || utils_1.createUuid();
        return this;
    };
    GenericRequest.prototype.setRespondTo = function (respondTo) {
        this.respondTo = respondTo;
        return this;
    };
    GenericRequest.prototype.setSourceSystem = function (sourceSystem) {
        this.sourceSystem = sourceSystem;
        return this;
    };
    return GenericRequest;
}());
exports.GenericRequest = GenericRequest;
var GenericResponse = (function () {
    function GenericResponse(code) {
        if (code === void 0) { code = 200; }
        this.code = code;
        this.status = code;
        this.time = new Date();
    }
    GenericResponse.prototype.setData = function (data) {
        this.data = data;
        return this;
    };
    GenericResponse.prototype.setCorrelationId = function (correlationId) {
        this.correlationId = correlationId || utils_1.createUuid();
        return this;
    };
    return GenericResponse;
}());
exports.GenericResponse = GenericResponse;
//# sourceMappingURL=messages.js.map