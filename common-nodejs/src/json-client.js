/**
 * Created by andrey on 22/09/15.
 */
"use strict";
var Request = require('request-json');
var url_1 = require('url');
var utils_1 = require('./utils');
var url = require("url");
var requestRaw = require("request-json/node_modules/request");
var helpers = {
    merge: function (obj1, obj2) {
        var key, result;
        result = {};
        for (key in obj1) {
            result[key] = obj1[key];
        }
        if (obj2 != null) {
            for (key in obj2) {
                result[key] = obj2[key];
            }
        }
        return result;
    },
    buildOptions: function (clientOptions, clientHeaders, host, path, requestOptions) {
        var options;
        if (requestOptions !== {}) {
            options = helpers.merge(clientOptions, requestOptions);
        }
        if ((requestOptions != null) && requestOptions !== {} && requestOptions.headers) {
            options.headers = helpers.merge(clientHeaders, requestOptions.headers);
        }
        else {
            options.headers = clientHeaders;
        }
        options.uri = url.resolve(host, path);
        return options;
    },
    parseBody: function (error, response, body, callback) {
        var err, msg, parsed;
        if (typeof body === "string" && body !== "") {
            try {
                parsed = JSON.parse(body);
            }
            catch (_error) {
                err = _error;
                msg = "Parsing error : " + err.message + ", body= \n " + body;
                if (error == null) {
                    error = new Error(msg);
                }
                parsed = body;
            }
        }
        else {
            parsed = body;
        }
        return callback(error, response, parsed);
    }
};
Request.JsonClient.post = function (path, json, options, callback, parse) {
    var opts;
    if (parse == null) {
        parse = true;
    }
    if (typeof options === 'function') {
        if (typeof callback === 'boolean') {
            parse = callback;
        }
        callback = options;
        options = {};
    }
    opts = helpers.buildOptions(this.options, this.headers, this.host, path, options);
    opts.method = "POST";
    if (options.form) {
        opts.form = options.form;
    }
    else {
        opts.json = json;
    }
    return requestRaw(opts, function (error, response, body) {
        if (parse) {
            return helpers.parseBody(error, response, body, callback);
        }
        else {
            return callback(error, response, body);
        }
    });
};
Request.JsonClient.put = function (path, json, options, callback, parse) {
    var opts;
    if (parse == null) {
        parse = true;
    }
    if (typeof options === 'function') {
        if (typeof callback === 'boolean') {
            parse = callback;
        }
        callback = options;
        options = {};
    }
    opts = helpers.buildOptions(this.options, this.headers, this.host, path, options);
    opts.method = "PUT";
    if (options.form) {
        opts.form = options.form;
    }
    else {
        opts.json = json;
    }
    return requestRaw(opts, function (error, response, body) {
        if (parse) {
            return helpers.parseBody(error, response, body, callback);
        }
        else {
            return callback(error, response, body);
        }
    });
};
(function (JsonClientEncoding) {
    JsonClientEncoding[JsonClientEncoding["JSON"] = 0] = "JSON";
    JsonClientEncoding[JsonClientEncoding["FORM"] = 1] = "FORM";
})(exports.JsonClientEncoding || (exports.JsonClientEncoding = {}));
var JsonClientEncoding = exports.JsonClientEncoding;
var JsonClient = (function () {
    function JsonClient(client, url, options) {
        if (options === void 0) { options = {}; }
        this.client = client;
        this.url = url;
        this.options = options;
        this.encoding = JsonClientEncoding.JSON;
    }
    JsonClient.prototype.get = function (resultHandler) {
        this.prepareClient();
        this.client.get(this.url.path, this.options, resultHandler);
    };
    JsonClient.prototype.post = function (body, resultHandler) {
        this.prepareClient();
        if (this.encoding === JsonClientEncoding.FORM) {
            this.options.headers['Content-type'] = 'application/x-www-form-urlencoded';
            this.options.form = body;
            body = null;
        }
        this.client.post(this.url.path, body, this.options, resultHandler);
    };
    JsonClient.prototype.put = function (body, resultHandler) {
        this.prepareClient();
        if (this.encoding === JsonClientEncoding.FORM) {
            this.options.headers['Content-type'] = 'application/x-www-form-urlencoded';
            this.options.form = body;
            body = null;
        }
        this.client.put(this.url.path, body, this.options, resultHandler);
    };
    JsonClient.prototype.del = function (resultHandler) {
        this.prepareClient();
        this.client.del(this.url.path, this.options, resultHandler);
    };
    JsonClient.prototype.patch = function (body, resultHandler) {
        this.prepareClient();
        this.client.patch(this.url.path, body, this.options, resultHandler);
    };
    JsonClient.prototype.prepareClient = function () {
        if (!this.options) {
            this.options = {};
        }
        if (!this.options.headers) {
            this.options.headers = {};
        }
        if (this.headers) {
            utils_1.objectAddEachProperty(this.headers, this.client.headers);
        }
        else {
            this.client.headers = {
                "accept": "application/json",
                "user-agent": "request-json/1.0"
            };
        }
    };
    return JsonClient;
}());
exports.JsonClient = JsonClient;
function getJsonClient(url, path, params, options) {
    if (path === void 0) { path = ''; }
    if (params === void 0) { params = {}; }
    if (options === void 0) { options = {}; }
    var fullUrl = url_1.parse(utils_1.parametriseUrl((url.href || url) + path, params));
    var host = fullUrl.protocol + '//' + fullUrl.host;
    var client = Request.createClient(host, options);
    return new JsonClient(client, fullUrl, options);
}
exports.getJsonClient = getJsonClient;
function syncGet(url, path, params) {
    if (path === void 0) { path = ''; }
    if (params === void 0) { params = {}; }
    var deasync = require('deasync');
    var syncGetDelegate = deasync(function (callback) {
        var client = getJsonClient(url, path, params);
        client.get(function (err, res, body) {
            callback(err, body);
        });
    });
    return syncGetDelegate();
}
exports.syncGet = syncGet;
//# sourceMappingURL=json-client.js.map