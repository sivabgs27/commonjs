"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: false });
var utils_1 = require('../src/utils');
var messages_1 = require('../src/messages');
var bus_1 = require('../src/bus');
var templates_1 = require('../src/templates');
var MockFlow = (function (_super) {
    __extends(MockFlow, _super);
    function MockFlow(invoker) {
        _super.call(this, invoker);
        this.sendResultViaBus = false;
    }
    MockFlow.prototype.prepareInput = function (context) {
        context.invokerInput = context.input.params.id;
    };
    MockFlow.prototype.prepareOutput = function (context) {
        this.context = context;
        context.setResult(context.invokerOutput);
    };
    return MockFlow;
}(templates_1.SimpleTemplate));
describe('Templates unit tests', function () {
    describe('Workflow template goes through defined set of stages and calls http send() method at the end', function () {
        it('createEntryPoint() in sync mode', function (callback) {
            var flow = new MockFlow(new templates_1.MockInvoker({ source: 'downstream', message: 'hello' }));
            var httpEntryPointPath;
            var httpServer = {
                post: function (path, handler) {
                    httpEntryPointPath = path;
                    httpServer.mockPost = function (req, res) {
                        handler(req, res);
                    };
                }
            };
            flow.createEntryPoint(httpServer, null, messages_1.HttpMethod.POST, '/api/path');
            var req = {
                path: function () { return '/api/path'; },
                method: 'POST',
                params: { id: 123456 },
                body: { data: { field1: 'value 1' } },
                header: function (value) {
                    if (value === 'ds-correlation-id' || value === 'ds-source-system') {
                        return;
                    }
                }
            };
            var httpCode, httpResult;
            var res = {
                send: function (code, obj) {
                    httpCode = code;
                    httpResult = obj;
                }
            };
            httpServer.mockPost(req, res);
            var ctx = flow.context;
            chai_1.expect(utils_1.objectCloneSimple(utils_1.objectRemoveProperty(ctx.input, 'correlationId', 'requestId'))).to.eql({
                path: '/api/path',
                method: 'POST',
                params: { id: 123456 },
                data: { field1: 'value 1' }
            });
            chai_1.expect(utils_1.objectRemoveProperty(utils_1.objectCloneSimple(ctx.invokerOutput))).to.eql({ source: 'downstream', message: 'hello' });
            chai_1.expect(ctx.transport.type).to.equal(templates_1.TransportType.http);
            chai_1.expect(httpEntryPointPath).to.equal('/api/path');
            // HTTP response
            chai_1.expect(httpCode).to.equal(200);
            chai_1.expect(httpResult.time).to.be.a('string');
            chai_1.expect(httpResult.correlationId).to.be.a('string');
            chai_1.expect(utils_1.objectRemoveProperty(utils_1.objectCloneSimple(httpResult), 'correlationId', 'requestId', 'time')).to.eql({
                data: { source: 'downstream', message: 'hello' }, status: 200
            });
            callback();
        });
        it('createEntryPoint() in async mode', function (callback) {
            var flow = new MockFlow(new templates_1.MockInvoker({ source: 'downstream', message: 'hello' }));
            var requestDest, responseMessage, responseDest;
            var messageBus = {
                listenForRequest: function (dest, handler) {
                    requestDest = dest;
                    messageBus.mockPost = function (message) {
                        handler(message);
                    };
                },
                sendToPath: function (dest, message) {
                    responseDest = dest;
                    responseMessage = message;
                }
            };
            flow.createEntryPoint(null, messageBus, messages_1.HttpMethod.POST, '/api/path');
            var requestMessage = {
                params: { id: 123456 },
                data: { field1: 'value 1' },
                respondTo: 'client.v1.Process'
            };
            messageBus.mockPost(requestMessage);
            // Request Message
            chai_1.expect(utils_1.objectCloneSimple(requestDest)).to.eql({
                'method': messages_1.HttpMethod.POST,
                'path': '/api/path',
                'queueAndRoutingkeyList': '',
                'service': 'common-nodejs',
                'type': bus_1.MessageDestinationType.Process,
                'version': 'v1'
            });
            // Response Message
            chai_1.expect(responseDest).to.equal('client.v1.Process');
            chai_1.expect(responseMessage.time).to.be.a('string');
            chai_1.expect(responseMessage.correlationId).to.be.a('string');
            chai_1.expect(utils_1.objectCloneSimple(utils_1.objectRemoveProperty(responseMessage, 'correlationId', 'requestId', 'time'))).to.eql({
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
        it('doProbe runs', function (callback) {
            var guardConfig = service_info_1.createGuardConfig();
            var guardedInvoker = new templates_1.GuardedInvoker(guardConfig, "TEST_SDF");
            var probeScan = guardedInvoker.runProbe();
            chai_1.expect(probeScan.name).is.equal('GuardedInvoker');
            callback();
        });
    });
});
//# sourceMappingURL=templates.js.map