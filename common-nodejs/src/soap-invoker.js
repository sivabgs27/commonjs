/**
 * Soap service invoker. Internally uses the SoapClient library
 */
"use strict";
var nodeValidator = require('node-validator');
var assert = require('assert');
var soap = require('soap');
var logger_1 = require('./logger');
var ssl_config_1 = require("./ssl-config");
var service_info_1 = require("./service-info");
var SoapAction = (function () {
    function SoapAction(operation, body, extraHttpHeaders) {
        if (body === void 0) { body = {}; }
        if (extraHttpHeaders === void 0) { extraHttpHeaders = {}; }
        this.operation = operation;
        this.body = body;
        this.extraHttpHeaders = extraHttpHeaders;
    }
    return SoapAction;
}());
exports.SoapAction = SoapAction;
var SoapInvoker = (function () {
    function SoapInvoker(wsdl, url, targetSystem, etcdKeyForSslConfig) {
        var _this = this;
        //
        // Load the SSL config from etcd if a etcd key has been set.
        //
        var actualKey;
        if (etcdKeyForSslConfig) {
            logger_1.log.debug('Setting the Security parameters from the SslConfig loaded from ETCD key passed into constructor. Key', etcdKeyForSslConfig);
            actualKey = etcdKeyForSslConfig;
        }
        else if (service_info_1.serviceInfo.downstreamCertificate) {
            logger_1.log.debug('Setting the Security parameters from the SslConfig loaded from ETCD key set in service info. Key', service_info_1.serviceInfo.downstreamCertificate);
            actualKey = service_info_1.serviceInfo.downstreamCertificate;
        }
        if (actualKey) {
            var sslConfig = void 0;
            sslConfig = new ssl_config_1.SslConfigEtcdImpl(actualKey);
            // This is very a unOO short cut.  The SsslConfig has all the properties of the
            // sslSecurityConfig and the wsSecurity object so it can be directly assigned to both.
            // In a strongly types language this would not be possible.
            if (sslConfig.ca || sslConfig.cert || sslConfig.key) {
                logger_1.log.debug('Setting the sslSecurityConfig object to', sslConfig);
                this.sslSecurityConfig = sslConfig;
            }
            if (sslConfig.userName || sslConfig.password) {
                logger_1.log.debug('Setting the wsSecurityConfig object to', sslConfig);
                this.wsSecurityConfig = sslConfig;
            }
        }
        soap.createClient(wsdl, { endpoint: url }, function (err, client) {
            if (err) {
                logger_1.log.error('Error creating SoapClient', err);
                throw new Error('Error creating SoapClient');
            }
            logger_1.log.info("Preparing Soap Request. Client SSL: %s, WS Security: %s", !!_this.sslSecurityConfig, !!_this.wsSecurityConfig);
            if (_this.sslSecurityConfig) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
                var defaults = {};
                client.security = new soap.ClientSSLSecurity(_this.sslSecurityConfig.key, _this.sslSecurityConfig.cert, _this.sslSecurityConfig.ca, defaults);
            }
            if (_this.wsSecurityConfig) {
                var security = new soap.WSSecurity(_this.wsSecurityConfig.userName, _this.wsSecurityConfig.password, {
                    passwordType: 'PasswordText',
                    hasTimeStamp: false
                });
                client.addSoapHeader(security.toXML());
            }
            // handle SOAP headers
            if (_this.soapHeaders && _this.soapHeaders.length) {
                _this.soapHeaders.forEach(function (header) {
                    client.addSoapHeader(header);
                });
            }
            var TNS_PREFIX = '__tns__'; // Prefix for targetNamespace
            function findPrefix(xmlnsMapping, nsURI) {
                for (var n in xmlnsMapping) {
                    if (n === TNS_PREFIX)
                        continue;
                    if (xmlnsMapping[n] === nsURI)
                        return n;
                }
            }
            client._invoke = function (method, args, location, callback, options, extraHeaders) {
                var self = this, name = method.$name, input = method.input, output = method.output, style = method.style, defs = this.wsdl.definitions, ns = defs.$targetNamespace, encoding = '', message = '', xml = null, req = null, soapAction, alias = findPrefix(defs.xmlns, ns), headers = {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": ""
                }, xmlnsSoap = "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"";
                if (this.wsdl.options.forceSoap12Headers) {
                    headers["Content-Type"] = "application/soap+xml; charset=utf-8";
                    xmlnsSoap = "xmlns:soap=\"http://www.w3.org/2003/05/soap-envelope\"";
                }
                if (this.SOAPAction) {
                    soapAction = this.SOAPAction;
                }
                else if (method.soapAction !== undefined && method.soapAction !== null) {
                    soapAction = method.soapAction;
                }
                else {
                    soapAction = ((ns.lastIndexOf("/") !== ns.length - 1) ? ns + "/" : ns) + name;
                }
                headers.SOAPAction = '"' + soapAction + '"';
                options = options || {};
                //Add extra headers
                for (var attr in extraHeaders) {
                    headers[attr] = extraHeaders[attr];
                }
                // Allow the security object to add headers
                if (self.security && self.security.addHeaders)
                    self.security.addHeaders(headers);
                if (self.security && self.security.addOptions)
                    self.security.addOptions(options);
                if (input.parts || args === null) {
                    assert.ok(!style || style === 'rpc', 'invalid message definition for document style binding');
                    message = self.wsdl.objectToRpcXML(name, args, alias, ns);
                    (method.inputSoap === 'encoded') && (encoding = 'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" ');
                }
                else if (typeof (args) === 'string') {
                    message = args;
                }
                else {
                    assert.ok(!style || style === 'document', 'invalid message definition for rpc style binding');
                    // pass `input.$lookupType` if `input.$type` could not be found
                    message = self.wsdl.objectToDocumentXML(input.$name, args, input.targetNSAlias, input.targetNamespace, (input.$type || input.$lookupType));
                }
                xml = "<soap:Envelope " +
                    xmlnsSoap + " " +
                    "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
                    encoding +
                    this.wsdl.xmlnsInEnvelope + '>' +
                    ((self.soapHeaders || self.security) ?
                        ("<soap:Header>" +
                            (self.soapHeaders ? self.soapHeaders.join("\n") : "") +
                            (self.security ? self.security.toXML() : "") +
                            "</soap:Header>")
                        :
                            '') +
                    "<soap:Body" +
                    (self.bodyAttributes ? self.bodyAttributes.join(' ') : '') +
                    ">" +
                    message +
                    "</soap:Body>" +
                    "</soap:Envelope>";
                self.lastMessage = message;
                self.lastRequest = xml;
                self.lastEndpoint = location;
                self.emit('message', message);
                self.emit('request', xml);
                var tryJSONparse = function (body) {
                    try {
                        return JSON.parse(body);
                    }
                    catch (err) {
                        return undefined;
                    }
                };
                req = self.httpClient.request(location, xml, function (err, response, body) {
                    var result;
                    var obj;
                    self.lastResponse = body;
                    self.lastResponseHeaders = response && response.headers;
                    self.emit('response', body);
                    if (err) {
                        callback(err);
                    }
                    else {
                        try {
                            obj = self.wsdl.xmlToObject(body);
                        }
                        catch (error) {
                            //  When the output element cannot be looked up in the wsdl and the body is JSON
                            //  instead of sending the error, we pass the body in the response.
                            if (output && !output.$lookupTypes) {
                                logger_1.log.warn('Response element is not present. Unable to convert response xml to json.');
                                //  If the response is JSON then return it as-is.
                                var json = nodeValidator.isObject(body) ? body : tryJSONparse(body);
                                if (json) {
                                    return callback(null, response, json);
                                }
                            }
                            error.response = response;
                            error.body = body;
                            self.emit('soapError', error);
                            return callback(error, response, body);
                        }
                        if (!output) {
                            // one-way, no output expected
                            return callback(null, null, body, obj.Header);
                        }
                        if (typeof obj.Body !== 'object') {
                            var error = new Error('Cannot parse response');
                            error.name = response;
                            error.message = body;
                            return callback(error, obj, body);
                        }
                        result = obj.Body[output.$name];
                        // RPC/literal response body may contain elements with added suffixes I.E.
                        // 'Response', or 'Output', or 'Out'
                        // This doesn't necessarily equal the ouput message name. See WSDL 1.1 Section 2.4.5
                        if (!result) {
                            result = obj.Body[output.$name.replace(/(?:Out(?:put)?|Response)$/, '')];
                        }
                        if (!result) {
                            ['Response', 'Out', 'Output'].forEach(function (term) {
                                if (obj.Body.hasOwnProperty(name + term)) {
                                    return result = obj.Body[name + term];
                                }
                            });
                        }
                        callback(null, result, body, obj.Header);
                    }
                }, headers, options, self);
                // Added mostly for testability, but possibly useful for debugging
                self.lastRequestHeaders = req.headers;
            };
            _this.soapClient = client;
        });
        this.targetSystem = targetSystem;
    }
    SoapInvoker.prototype.invoke = function (context, callback) {
        var soapAction = context.invokerInput;
        //TODO - change this to proper service name
        this.serviceCall = this.url + '.' + soapAction.operation;
        this.soapClient[soapAction.operation](soapAction.body, function (err, output, rawOutput, responseSoapHeaders) {
            if (err) {
                var soapMessage = void 0;
                var soapCode = void 0;
                try {
                    var soapBody = err.root.Envelope.Body;
                    soapMessage = soapBody.Fault.faultcode + ' | ' + soapBody.Fault.faultstring;
                    soapCode = isNaN(soapBody.Fault.faultcode) ? 1 : soapBody.Fault.faultcode;
                    context.transport.soapErrorDetails = soapBody;
                }
                catch (e) { }
                context.setCode(502).addError(soapCode || 1, 'Downstream error: ' + (soapMessage || err.message || err));
            }
            else {
                var combinedOutput = {
                    soapBody: output,
                    soapHeader: responseSoapHeaders
                };
                context.invokerOutput = combinedOutput;
            }
            callback(context);
        }, null, soapAction.extraHttpHeaders); // options are defaulted null right now, can be changed later just as required.
    };
    SoapInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    SoapInvoker.prototype.getServiceCall = function () {
        return this.serviceCall;
    };
    return SoapInvoker;
}());
exports.SoapInvoker = SoapInvoker;
//# sourceMappingURL=soap-invoker.js.map