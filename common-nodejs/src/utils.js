"use strict";
var Url = require('url');
var request = require('request-json');
var clone = require('clone');
var util = require('util');
var os = require('os');
var uuid = require('node-uuid');
var collections_1 = require("./collections");
function objectForEachProperty(o, callback) {
    if (o) {
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                callback(i, o[i]);
            }
        }
    }
}
exports.objectForEachProperty = objectForEachProperty;
function objectReplaceEachProperty(o, callback) {
    if (o) {
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                var newVal = callback(i, o[i]);
                if (newVal === undefined) {
                    // remove value
                    delete o[i];
                }
                else {
                    // replace value
                    o[i] = newVal;
                }
                if (o[i] && (Object.prototype.toString.call(o[i]) == "[object Object]" || util.isArray(o[i]))) {
                    objectReplaceEachProperty(o[i], callback);
                }
            }
        }
    }
    return o;
}
exports.objectReplaceEachProperty = objectReplaceEachProperty;
function objectRemoveProperty(o) {
    var properties = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        properties[_i - 1] = arguments[_i];
    }
    function processObject(o2) {
        objectForEachProperty(o2, function (key, value) {
            if (properties.indexOf(key) !== -1) {
                delete o2[key];
            }
            if (value && (Object.prototype.toString.call(value) == "[object Object]" || util.isArray(value))) {
                processObject(value);
            }
        });
    }
    processObject(o);
    return o;
}
exports.objectRemoveProperty = objectRemoveProperty;
function objectAddEachProperty(from, to) {
    if (from && to) {
        objectForEachProperty(from, function (key, value) { return to[key] = value; });
        return to;
    }
}
exports.objectAddEachProperty = objectAddEachProperty;
function objectWrap(object, callback) {
    var wrapper = {};
    objectForEachProperty(object, function (name, method) {
        if (typeof method === 'function') {
            wrapper[name] = function () {
                callback(name, Array.prototype.slice.call(arguments), method);
            };
        }
    });
    return wrapper;
}
exports.objectWrap = objectWrap;
function objectCloneSimple(original) {
    return original ? JSON.parse(JSON.stringify(original)) : undefined;
}
exports.objectCloneSimple = objectCloneSimple;
function objectClone(original) {
    return clone(original);
}
exports.objectClone = objectClone;
function filteredShallowObjectClone(original) {
    var filterFields = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        filterFields[_i - 1] = arguments[_i];
    }
    var result;
    if (original) {
        result = {};
        var filterFields_1 = filterFields || [];
        objectForEachProperty(original, function (key, value) {
            if (filterFields_1.indexOf(key) === -1) {
                result[key] = value;
            }
        });
    }
    return result;
}
exports.filteredShallowObjectClone = filteredShallowObjectClone;
function ensureTrailingSlash(s) {
    if (s.charAt(s.length - 1) !== '/') {
        s = s + '/';
    }
    return s;
}
exports.ensureTrailingSlash = ensureTrailingSlash;
function ensureLeadingSlash(s) {
    if (s.charAt(0) !== '/') {
        s = '/' + s;
    }
    return s;
}
exports.ensureLeadingSlash = ensureLeadingSlash;
function noop() {
}
exports.noop = noop;
function getFullServiceUrl(service) {
    var serviceUrl = Url.parse(service);
    return serviceUrl.host ? serviceUrl : Url.parse('http://' + getRegistryHost() + ':8181' + ensureLeadingSlash(service));
}
exports.getFullServiceUrl = getFullServiceUrl;
/*
export function getFullServiceUrl(service, apiVersion?: number, serviceId?: string) {
    let serviceUrl = Url.parse(service);
    if (serviceUrl.host) {
        return serviceUrl;
    }

    let serviceArr = [ service ];
    if (apiVersion) {
        serviceArr.unshift('v' + apiVersion);
    }
    if (serviceId) {
        serviceArr.unshift(serviceId);
    }

    return Url.parse('http://' + serviceArr.join('.') + ':3000');
}  */
var httpClients = {};
function baseRequestGet(url, path, onResult) {
    var fullUrl = Url.parse(url + path);
    var host = fullUrl.protocol + '//' + fullUrl.host;
    var client = httpClients[host] = httpClients[host] || request.createClient(host);
    client.get(fullUrl.path, onResult);
}
exports.baseRequestGet = baseRequestGet;
function getRegistryHost() {
    return process.env.ENV_REGISTRY_HOST || '127.0.0.1';
}
exports.getRegistryHost = getRegistryHost;
function getHostName() {
    return os.hostname();
}
exports.getHostName = getHostName;
function getHostIP(ifaceName) {
    if (ifaceName === void 0) { ifaceName = 'e'; }
    var ip;
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if (!ip && 'IPv4' === iface.family && !iface.internal && (!ifaceName || ifname.indexOf(ifaceName) === 0)) {
                ip = iface.address;
            }
        });
    });
    return ip;
}
exports.getHostIP = getHostIP;
function parametriseUrl(url, params) {
    var queryParams = [];
    objectForEachProperty(params, function (name, value) {
        var pathParam = ':' + name;
        if (url.indexOf(pathParam) !== -1) {
            url = url.replace(pathParam, value);
        }
        else {
            queryParams.push(name + '=' + value);
        }
    });
    if (queryParams.length) {
        url += '?' + queryParams.join('&');
    }
    return url;
}
exports.parametriseUrl = parametriseUrl;
function createUuid() {
    return uuid.v4();
}
exports.createUuid = createUuid;
/**
 * Method to pass the map's value as parameters
 * @param oAuthCredentialMap
 * @returns {string}
 */
function setOAUTHCredentials(oAuthCredentialMap) {
    var credentials = "";
    if (!collections_1.isUndefined(oAuthCredentialMap)) {
        var count = 0;
        for (var key in oAuthCredentialMap) {
            if (count++ > 0) {
                credentials += "&";
            }
            credentials += (key + "=" + oAuthCredentialMap[key]);
        }
    }
    return credentials;
}
exports.setOAUTHCredentials = setOAUTHCredentials;
//# sourceMappingURL=utils.js.map