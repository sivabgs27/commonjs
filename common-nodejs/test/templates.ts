import { expect } from 'chai'

import { serviceInfo, createGuardConfig } from '../src/service-info'
serviceInfo.update({ standalone: true, forever: false, busDisabled: false });


import { objectClone, objectRemoveProperty, objectCloneSimple } from '../src/utils'
import { HttpMethod } from '../src/messages'
import { MessageDestinationType } from '../src/bus'
import { SimpleTemplate, Invoker, InvocationContext, InvokerWrapper, TransportType, MockInvoker, GuardedInvoker } from '../src/templates'
import { ProbeScan } from '../src/diagnostics'

class MockFlow extends SimpleTemplate {
    context: InvocationContext;

    constructor(invoker: Invoker) {
        super(invoker);
        this.sendResultViaBus = false;
    }

    prepareInput(context: InvocationContext) {
        context.invokerInput = context.input.params.id;
    }

    prepareOutput(context: InvocationContext) {
        this.context = context;
        context.setResult(context.invokerOutput);
    }
}

describe('Templates unit tests', () => {
    describe('Workflow template goes through defined set of stages and calls http send() method at the end', () => {
        it('createEntryPoint() in sync mode', (callback) => {
            var flow = new MockFlow(new MockInvoker({source: 'downstream', message: 'hello' }));

            var httpEntryPointPath;
            var httpServer: any = {
                post: (path, handler) => {
                    httpEntryPointPath = path;
                    httpServer.mockPost = (req, res) => {
                        handler(req, res);
                    };
                }
            };

            flow.createEntryPoint(httpServer, null, HttpMethod.POST, '/api/path');

            var req = {
                path: () => '/api/path',
                method: 'POST',
                params: { id: 123456 },
                body: { data: { field1: 'value 1' }},
                header: (value) => {
                    if(value === 'ds-correlation-id' || value === 'ds-source-system') {
                        return;
                    }
                }
            };

            var httpCode, httpResult;
            var res = {
                send: (code, obj) => {
                    httpCode = code;
                    httpResult = obj;
                }
            };

            httpServer.mockPost(req, res);

            var ctx = flow.context;
            expect(objectCloneSimple(objectRemoveProperty(ctx.input, 'correlationId', 'requestId'))).to.eql({
                path: '/api/path',
                method: 'POST',
                params: { id: 123456 },
                data: { field1: 'value 1' }
            });

            expect(objectRemoveProperty(objectCloneSimple(ctx.invokerOutput))).to.eql({ source: 'downstream', message: 'hello' });
            expect(ctx.transport.type).to.equal(TransportType.http);

            expect(httpEntryPointPath).to.equal('/api/path');

            // HTTP response
            expect(httpCode).to.equal(200);

            expect(httpResult.time).to.be.a('string');

            expect(httpResult.correlationId).to.be.a('string');

            expect(objectRemoveProperty(objectCloneSimple(httpResult), 'correlationId', 'requestId', 'time')).to.eql({
                data: { source: 'downstream', message: 'hello' }, status: 200
            });

            callback();
        });

        it('createEntryPoint() in async mode', (callback) => {
            var flow = new MockFlow(new MockInvoker({ source: 'downstream', message: 'hello' }));

            var requestDest, responseMessage, responseDest;
            var messageBus: any = {
                listenForRequest: (dest, handler) => {
                    requestDest = dest;
                    messageBus.mockPost = (message) => {
                        handler(message);
                    };
                },

                sendToPath: (dest, message) => {
                    responseDest = dest;
                    responseMessage = message;
                }
            };

            flow.createEntryPoint(null, messageBus, HttpMethod.POST, '/api/path');

            var requestMessage = {
                params: { id: 123456 },
                data: { field1: 'value 1' },
                respondTo: 'client.v1.Process'
            };

            messageBus.mockPost(requestMessage);

            // Request Message
            expect(objectCloneSimple(requestDest)).to.eql({
                'method': HttpMethod.POST,
                'path': '/api/path',
				'queueAndRoutingkeyList' : '',
                'service': 'common-nodejs',
                'type': MessageDestinationType.Process,
                'version': 'v1'
            });

            // Response Message
            expect(responseDest).to.equal('client.v1.Process');

            expect(responseMessage.time).to.be.a('string');

            expect(responseMessage.correlationId).to.be.a('string');

            expect(objectCloneSimple(objectRemoveProperty(responseMessage, 'correlationId', 'requestId', 'time'))).to.eql({
                code: 200,
                data: { source: 'downstream', message: 'hello' },
                request: {
                    path: '/api/path',
                    method: 'POST',
                    params: { id: 123456 },
                    data: { field1: 'value 1' },
                    respondTo: 'client.v1.Process'
                },
                status: 200
            });

            callback();
        });
        it('doProbe runs', (callback) => {
            let guardConfig = createGuardConfig();
            let guardedInvoker = new GuardedInvoker(guardConfig,"TEST_SDF");

            let probeScan: ProbeScan = guardedInvoker.runProbe();

            expect(probeScan.name).is.equal('GuardedInvoker');

            callback();
        });
    });
});
