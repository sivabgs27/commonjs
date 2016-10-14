/**
 * Created by andrey on 7/10/15.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai = require('chai');
var expect = chai.expect;
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: true });
var utils_1 = require('../src/utils');
var templates_1 = require('../src/templates');
var messages_1 = require('../src/messages');
var service_invoker_1 = require('../src/service-invoker');
var utils_2 = require("../src/utils");
var MockServiceInvoker = (function (_super) {
    __extends(MockServiceInvoker, _super);
    function MockServiceInvoker(bus, jsonClient) {
        _super.call(this);
        this.bus = bus;
        this.jsonClient = jsonClient;
    }
    MockServiceInvoker.prototype.getMessageBus = function () {
        return this.bus;
    };
    MockServiceInvoker.prototype.getJsonClient = function (action) {
        this.jsonClient.action = action;
        return this.jsonClient;
    };
    return MockServiceInvoker;
}(service_invoker_1.ServiceInvoker));
describe('service-invoker', function () {
    describe('invokes services', function () {
        it('using ASYNC mode', function (callback) {
            var bus = {
                listenForResponse: function (dest, messageHandler) {
                    bus.messageHandler = messageHandler;
                },
                send: function (dest, request, send) {
                    var response = new messages_1.GenericResponse();
                    response.setData({ item: 'value' });
                    response.request = request;
                    bus.messageHandler(response);
                },
            };
            var invoker = new MockServiceInvoker(bus, null);
            var serviceRequest = new messages_1.GenericRequest('/api/path/:id', 'GET');
            var context = new templates_1.InvocationContext(serviceRequest);
            var downstreamRequest = new messages_1.GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({ id: 'abc123', force: true });
            downstreamRequest.setData({ update: 'it' });
            context.invokerInput = new service_invoker_1.ServiceAction('srv-target', 'v1', service_invoker_1.ServiceActionType.ASYNC, downstreamRequest);
            invoker.invoke(context, function (context2) {
                expect(context2.invokerOutput.time).to.be.a('Date');
                expect(context2.output.time).to.be.a('Date');
                var contextToCompare = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(context2, 'deployed', 'time', 'requestId', 'correlationId'));
                expect(contextToCompare).to.eql({
                    input: {
                        data: {},
                        method: 'GET',
                        params: {},
                        path: '/api/path/:id'
                    },
                    invokerInput: {
                        data: {
                            update: 'it'
                        },
                        original: {
                            data: {},
                            method: 'GET',
                            params: {},
                            path: '/api/path/:id'
                        },
                        method: 'POST',
                        params: {
                            id: 'abc123',
                            force: true
                        },
                        path: '/downstream/path/:id',
                        respondTo: 'common-nodejs.v1.Process'
                    },
                    invokerOutput: {
                        code: 200,
                        data: {
                            item: 'value'
                        },
                        request: {
                            data: {
                                update: 'it'
                            },
                            original: {
                                data: {},
                                method: 'GET',
                                params: {},
                                path: '/api/path/:id'
                            },
                            method: 'POST',
                            params: {
                                id: 'abc123',
                                force: true
                            },
                            path: '/downstream/path/:id',
                            respondTo: 'common-nodejs.v1.Process'
                        },
                        status: 200
                    },
                    output: {
                        code: 200,
                        status: 200
                    },
                    state: {}
                });
                callback();
            });
        });
        it('using ASYNC_NOTIFY mode', function (callback) {
            var bus = {
                listenForResponse: function (dest, messageHandler) {
                    throw new Error('Should not be called for ASYNC_NOTIFY mode');
                },
                send: function (dest, request, send) {
                    // not listening to response message in ASYNC_NOTIFY mode
                },
            };
            var invoker = new MockServiceInvoker(bus, null);
            var serviceRequest = new messages_1.GenericRequest('/api/path/:id', 'GET');
            var context = new templates_1.InvocationContext(serviceRequest);
            var downstreamRequest = new messages_1.GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({ id: 'abc123', force: true });
            downstreamRequest.setData({ update: 'it' });
            context.invokerInput = new service_invoker_1.ServiceAction('srv-target', 'v1', service_invoker_1.ServiceActionType.ASYNC_NOTIFY, downstreamRequest);
            invoker.invoke(context, function (context2) {
                expect(context2.output.time).to.be.a('Date');
                var contextToCompare = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(context2, 'deployed', 'time', 'requestId'));
                expect(contextToCompare).to.eql({
                    input: {
                        data: {},
                        method: 'GET',
                        params: {},
                        path: '/api/path/:id'
                    },
                    invokerInput: {
                        data: {
                            update: 'it'
                        },
                        original: {
                            data: {},
                            method: 'GET',
                            params: {},
                            path: '/api/path/:id'
                        },
                        method: 'POST',
                        params: {
                            id: 'abc123',
                            force: true
                        },
                        path: '/downstream/path/:id'
                    },
                    invokerOutput: {},
                    output: {
                        code: 200,
                        status: 200
                    },
                    state: {}
                });
                callback();
            });
        });
        it('using SYNC mode', function (callback) {
            var jsonClient = {
                post: function (req, handler) {
                    var response = { data: { item: 'value' } };
                    response.request = req;
                    handler(null, { statusCode: 200 }, response);
                },
            };
            var invoker = new MockServiceInvoker(null, jsonClient);
            var serviceRequest = new messages_1.GenericRequest('/api/path/:id', 'GET');
            var context = new templates_1.InvocationContext(serviceRequest);
            var downstreamRequest = new messages_1.GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({ id: 'abc123', force: true });
            downstreamRequest.setData({ update: 'it' });
            context.invokerInput = new service_invoker_1.ServiceAction('srv-target', 'v1', service_invoker_1.ServiceActionType.SYNC, downstreamRequest);
            invoker.invoke(context, function (context2) {
                expect(context2.output.time).to.be.a('Date');
                var contextToCompare = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(context2, 'deployed', 'time', 'requestId'));
                expect(contextToCompare).to.eql({
                    input: {
                        data: {},
                        method: 'GET',
                        params: {},
                        path: '/api/path/:id'
                    },
                    invokerInput: {
                        data: {
                            update: 'it'
                        },
                        original: {
                            data: {},
                            method: 'GET',
                            params: {},
                            path: '/api/path/:id'
                        },
                        method: 'POST',
                        params: {
                            id: 'abc123',
                            force: true
                        },
                        path: '/downstream/path/:id'
                    },
                    invokerOutput: {
                        code: 200,
                        data: {
                            item: 'value'
                        },
                        request: {
                            data: {
                                update: 'it'
                            },
                            original: {
                                data: {},
                                method: 'GET',
                                params: {},
                                path: '/api/path/:id'
                            },
                            method: 'POST',
                            params: {
                                id: 'abc123',
                                force: true
                            },
                            path: '/downstream/path/:id'
                        }
                    },
                    output: {
                        code: 200,
                        status: 200
                    },
                    state: {}
                });
                callback();
            });
        });
        it('using HYBRID mode', function (callback) {
            var bus = {
                listenForResponse: function (dest, messageHandler) {
                    bus.messageHandler = messageHandler;
                },
                send: function (dest, request, send) {
                    var response = new messages_1.GenericResponse();
                    response.setData({ item: 'value' });
                    response.request = request;
                    bus.messageHandler(response);
                },
            };
            var jsonClient = {
                post: function (req, handler) {
                    handler(null, { statusCode: 202 }, { request: req });
                    bus.send(null, req, null);
                },
            };
            var invoker = new MockServiceInvoker(bus, jsonClient);
            var serviceRequest = new messages_1.GenericRequest('/api/path/:id', 'GET');
            var context = new templates_1.InvocationContext(serviceRequest);
            var downstreamRequest = new messages_1.GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({ id: 'abc123', force: true });
            downstreamRequest.setData({ update: 'it' });
            context.invokerInput = new service_invoker_1.ServiceAction('srv-target', 'v1', service_invoker_1.ServiceActionType.HYBRID, downstreamRequest);
            invoker.invoke(context, function (context2) {
                expect(context2.output.time).to.be.a('Date');
                var contextToCompare = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(context2, 'deployed', 'time', 'requestId', 'correlationId'));
                expect(contextToCompare).to.eql({
                    input: {
                        data: {},
                        method: 'GET',
                        params: {},
                        path: '/api/path/:id'
                    },
                    invokerInput: {
                        data: {
                            update: 'it'
                        },
                        original: {
                            data: {},
                            method: 'GET',
                            params: {},
                            path: '/api/path/:id'
                        },
                        method: 'POST',
                        params: {
                            id: 'abc123',
                            force: true
                        },
                        path: '/downstream/path/:id'
                    },
                    invokerOutput: {
                        code: 200,
                        data: {
                            item: 'value'
                        },
                        request: {
                            data: {
                                update: 'it'
                            },
                            original: {
                                data: {},
                                method: 'GET',
                                params: {},
                                path: '/api/path/:id'
                            },
                            method: 'POST',
                            params: {
                                id: 'abc123',
                                force: true
                            },
                            path: '/downstream/path/:id'
                        },
                        status: 200
                    },
                    output: {
                        code: 200,
                        status: 200
                    },
                    state: {}
                });
                callback();
            });
        });
    });
});
//# sourceMappingURL=service-invoker.js.map