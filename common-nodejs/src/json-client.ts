/**
 * Created by andrey on 22/09/15.
 */


import Request = require('request-json')
import { Url, parse } from 'url'
import { objectForEachProperty, objectAddEachProperty, parametriseUrl } from './utils'

var url = require("url");
var requestRaw = require("request-json/node_modules/request");
var helpers = {
    merge: function(obj1, obj2) {
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
    buildOptions: function(clientOptions, clientHeaders, host, path, requestOptions) {
        var options;
        if (requestOptions !== {}) {
            options = helpers.merge(clientOptions, requestOptions);
        }
        if ((requestOptions != null) && requestOptions !== {} && requestOptions.headers) {
            options.headers = helpers.merge(clientHeaders, requestOptions.headers);
        } else {
            options.headers = clientHeaders;
        }
        options.uri = url.resolve(host, path);
        return options;
    },
    parseBody: function(error, response, body, callback) {
        var err, msg, parsed;
        if (typeof body === "string" && body !== "") {
            try {
                parsed = JSON.parse(body);
            } catch (_error) {
                err = _error;
                msg = "Parsing error : " + err.message + ", body= \n " + body;
                if (error == null) {
                    error = new Error(msg);
                }
                parsed = body;
            }
        } else {
            parsed = body;
        }
        return callback(error, response, parsed);
    }
};

Request.JsonClient.post = function(path, json, options, callback, parse) {
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
    } else {
        opts.json = json;
    }
    return requestRaw(opts, function(error, response, body) {
        if (parse) {
            return helpers.parseBody(error, response, body, callback);
        } else {
            return callback(error, response, body);
        }
    });
};

Request.JsonClient.put = function(path, json, options, callback, parse) {
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
    } else {
        opts.json = json;
    }
    return requestRaw(opts, function(error, response, body) {
        if (parse) {
            return helpers.parseBody(error, response, body, callback);
        } else {
            return callback(error, response, body);
        }
    });
};

export interface JsonResultHandler {
    (err?: any, res?: any, body?: any);
}

export enum JsonClientEncoding {
    JSON,
    FORM
}

export class JsonClient {
    headers: any;
    encoding: JsonClientEncoding = JsonClientEncoding.JSON;

    constructor(public client: any, public url: Url, public options: any = {}) {}

    get(resultHandler: JsonResultHandler) {
        this.prepareClient();
        this.client.get(this.url.path, this.options, resultHandler);
    }

    post(body: any, resultHandler: JsonResultHandler) {
        this.prepareClient();
        if (this.encoding === JsonClientEncoding.FORM) {
            this.options.headers['Content-type'] = 'application/x-www-form-urlencoded';
            this.options.form = body;
            body = null;
        }
        this.client.post(this.url.path, body, this.options, resultHandler);
    }

    put(body: any, resultHandler: JsonResultHandler) {
        this.prepareClient();
        if (this.encoding === JsonClientEncoding.FORM) {
            this.options.headers['Content-type'] = 'application/x-www-form-urlencoded';
            this.options.form = body;
            body = null;
        }
        this.client.put(this.url.path, body, this.options, resultHandler);
    }

    del(resultHandler: JsonResultHandler) {
        this.prepareClient();
        this.client.del(this.url.path, this.options, resultHandler);
    }

    patch(body: any, resultHandler: JsonResultHandler) {
        this.prepareClient();
        this.client.patch(this.url.path, body, this.options, resultHandler);
    }

    private prepareClient() {
        if (!this.options) {
            this.options = {};
        }

        if (!this.options.headers) {
            this.options.headers = {};
        }

        if (this.headers) {
            objectAddEachProperty(this.headers, this.client.headers);
        } else {
            this.client.headers = {
                "accept": "application/json",
                "user-agent": "request-json/1.0"
            };
        }
    }
}

export function getJsonClient(url, path = '', params = {}, options = {}): JsonClient {
    var fullUrl = parse(parametriseUrl((url.href || url) + path, params));
    var host = fullUrl.protocol + '//' + fullUrl.host;
    var client = Request.createClient(host, options);
    return new JsonClient(client, fullUrl, options);
}

export function syncGet(url, path = '', params = {}): any {
    let deasync = require('deasync');
    let syncGetDelegate = deasync((callback) => {
        let client = getJsonClient(url, path, params);
        client.get((err, res, body) => {
            callback(err, body);
        });
    });

    return syncGetDelegate();
}