import Url = require('url');
import request = require('request-json');
import clone = require('clone');
import util = require('util');
import os = require('os');
import uuid = require('node-uuid');
import { isUndefined } from "./collections";


export function objectForEachProperty(o: any, callback: { (key: string, value: any) }) {
    if (o) {
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                callback(i, o[i]);
            }
        }
    }
}

export function objectReplaceEachProperty(o: any, callback: { (key: string, value: any): any }) {
    if (o) {
        for (let i in o) {
            if (o.hasOwnProperty(i)) {
                let newVal = callback(i, o[i]);
                if (newVal === undefined) {
                    // remove value
                    delete o[i];
                } else {
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

export function objectRemoveProperty(o: any, ...properties: string[]) {
    function processObject(o2) {
        objectForEachProperty(o2, (key, value) => {
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

export function objectAddEachProperty(from: any, to: any): any {
    if (from && to) {
        objectForEachProperty(from, (key, value) => to[key] = value);
        return to;
    }
}

export function objectWrap(object, callback) {
    var wrapper = {};
    objectForEachProperty(object, function(name, method) {
        if (typeof method === 'function') {
            wrapper[name] = function () {
                callback(name, Array.prototype.slice.call(arguments), method);
            };
        }
    });

    return wrapper;
}

export function objectCloneSimple(original) {
    return original ? JSON.parse(JSON.stringify(original)) : undefined;
}

export function objectClone(original) {
    return clone(original);
}

export function filteredShallowObjectClone(original: any, ...filterFields: string []): any {
    let result;

    if(original) {
        result = {};
        let filterFields_ = filterFields || [];
        objectForEachProperty(original, (key, value) => {
            if (filterFields_.indexOf(key) === -1) {
                result[key] = value;
            }
        });
    }

    return result;
}

export function ensureTrailingSlash(s) {
    if (s.charAt(s.length - 1) !== '/') {
        s = s + '/';
    }

    return s;
}

export function ensureLeadingSlash(s) {
    if (s.charAt(0) !== '/') {
        s = '/' + s;
    }

    return s;
}

export function noop() {

}

export function getFullServiceUrl(service) {
    var serviceUrl = Url.parse(service);
    return serviceUrl.host ? serviceUrl : Url.parse('http://' + getRegistryHost() + ':8181' + ensureLeadingSlash(service));
}

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
export function baseRequestGet(url: string, path: string, onResult: { (err?, result?, doc?) }) {
    var fullUrl = Url.parse(url + path);
    var host = fullUrl.protocol + '//' + fullUrl.host;
    var client = httpClients[host] = httpClients[host] || request.createClient(host);
    client.get(fullUrl.path, onResult);
}

export function getRegistryHost(): string {
    return process.env.ENV_REGISTRY_HOST || '127.0.0.1';
}

export function getHostName(): string {
    return os.hostname();
}

export function getHostIP(ifaceName: string = 'e'): string {
    let ip;
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

export function parametriseUrl(url: string, params): string {
    var queryParams = [];
    objectForEachProperty(params, (name, value) => {
        var pathParam = ':' + name;
        if (url.indexOf(pathParam) !== -1) {
            url = url.replace(pathParam, value);
        } else {
            queryParams.push(name + '=' + value);
        }
    });

    if (queryParams.length) {
        url += '?' + queryParams.join('&');
    }

    return url;
}

export function createUuid(): string {
    return uuid.v4();
}

/**
 * Method to pass the map's value as parameters
 * @param oAuthCredentialMap
 * @returns {string}
 */
export function setOAUTHCredentials(oAuthCredentialMap: any): string {

    let credentials = "";
    if (!isUndefined(oAuthCredentialMap)) {

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