/**
 * Created by andrey on 7/10/15.
 */

import chai = require('chai');
var expect = chai.expect;

import { serviceInfo } from '../src/service-info'
serviceInfo.update({ standalone: true, forever: false, busDisabled: true });

import { objectClone, objectRemoveProperty } from '../src/utils'
import { InvocationContext } from '../src/templates'
import { GenericRequest, GenericResponse } from '../src/messages'
import { JsonClient } from '../src/json-client'
import { ServiceInvoker, ServiceAction, ServiceActionType } from '../src/service-invoker'
import {objectCloneSimple} from "../src/utils";

class MockServiceInvoker extends ServiceInvoker {
    bus;
    jsonClient;

    constructor(bus, jsonClient) {
        super();
        this.bus = bus;
        this.jsonClient = jsonClient;
    }

    getMessageBus(): any {
        return this.bus;
    }


    getJsonClient(action: ServiceAction): JsonClient {
        this.jsonClient.action = action;
        return this.jsonClient;
    }
}

describe('service-invoker', function () {
    describe('invokes services', function () {
        it('using ASYNC mode', function (callback) {
            var bus: any = {
                listenForResponse: (dest, messageHandler) => {
                    bus.messageHandler = messageHandler;
                },
                send: (dest, request, send) => {
                    var response = new GenericResponse();
                    response.setData({ item: 'value' });
                    response.request = request;
                    bus.messageHandler(response);
                },
            };
            var invoker = new MockServiceInvoker(bus, null);

            var serviceRequest = new GenericRequest('/api/path/:id', 'GET');
            var context = new InvocationContext(serviceRequest);

            var downstreamRequest = new GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({id: 'abc123', force: true});
            downstreamRequest.setData({update: 'it'});
            context.invokerInput = new ServiceAction('srv-target', 'v1', ServiceActionType.ASYNC, downstreamRequest);
            invoker.invoke(context, context2 => {
                expect(context2.invokerOutput.time).to.be.a('Date');

                expect(context2.output.time).to.be.a('Date');

                var contextToCompare = objectCloneSimple(objectRemoveProperty(context2, 'deployed', 'time', 'requestId', 'correlationId'));
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
            var bus: any = {
                listenForResponse: (dest, messageHandler) => {
                    throw new Error('Should not be called for ASYNC_NOTIFY mode');
                },
                send: (dest, request, send) => {
                    // not listening to response message in ASYNC_NOTIFY mode
                },
            };
            var invoker = new MockServiceInvoker(bus, null);

            var serviceRequest = new GenericRequest('/api/path/:id', 'GET');
            var context = new InvocationContext(serviceRequest);

            var downstreamRequest = new GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({id: 'abc123', force: true});
            downstreamRequest.setData({update: 'it'});
            context.invokerInput = new ServiceAction('srv-target', 'v1', ServiceActionType.ASYNC_NOTIFY, downstreamRequest);
            invoker.invoke(context, context2 => {
                expect(context2.output.time).to.be.a('Date');

                var contextToCompare = objectCloneSimple(objectRemoveProperty(context2, 'deployed', 'time', 'requestId'));
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
            var jsonClient: any = {
                post: (req, handler) => {
                    let response: any = { data: { item: 'value' } };
                    response.request = req;
                    handler(null, { statusCode: 200 }, response);
                },
            };
            var invoker = new MockServiceInvoker(null, jsonClient);

            var serviceRequest = new GenericRequest('/api/path/:id', 'GET');
            var context = new InvocationContext(serviceRequest);

            var downstreamRequest = new GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({id: 'abc123', force: true});
            downstreamRequest.setData({update: 'it'});
            context.invokerInput = new ServiceAction('srv-target', 'v1', ServiceActionType.SYNC, downstreamRequest);
            invoker.invoke(context, context2 => {
                expect(context2.output.time).to.be.a('Date');

                var contextToCompare = objectCloneSimple(objectRemoveProperty(context2, 'deployed', 'time', 'requestId'));
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
            let bus: any = {
                listenForResponse: (dest, messageHandler) => {
                    bus.messageHandler = messageHandler;
                },
                send: (dest, request, send) => {
                    var response = new GenericResponse();
                    response.setData({ item: 'value' });
                    response.request = request;
                    bus.messageHandler(response);
                },
            };

            var jsonClient: any = {
                post: (req, handler) => {
                    handler(null, { statusCode: 202 }, { request: req });
                    bus.send(null, req, null);
                },
            };
            var invoker = new MockServiceInvoker(bus, jsonClient);

            var serviceRequest = new GenericRequest('/api/path/:id', 'GET');
            var context = new InvocationContext(serviceRequest);

            var downstreamRequest = new GenericRequest('/downstream/path/:id', 'POST');
            downstreamRequest.setParams({id: 'abc123', force: true});
            downstreamRequest.setData({update: 'it'});
            context.invokerInput = new ServiceAction('srv-target', 'v1', ServiceActionType.HYBRID, downstreamRequest);
            invoker.invoke(context, context2 => {
                expect(context2.output.time).to.be.a('Date');

                var contextToCompare = objectCloneSimple(objectRemoveProperty(context2, 'deployed', 'time', 'requestId', 'correlationId'));
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
