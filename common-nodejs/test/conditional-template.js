/**
 * Created by c736448 on 4/04/2016.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var utils_1 = require('../src/utils');
var messages_1 = require('../src/messages');
var templates_1 = require('../src/templates');
var conditional_template_1 = require('../src/conditional-template');
var scenario1 = [
    {
        "httpResponse": {
            "body": {
                "data": "Invoker2 result",
                "status": 200
            },
            "code": 200
        }
    }
];
var scenario2 = [
    {
        "httpResponse": {
            "body": {
                "data": "Invoker3 result",
                "status": 200
            },
            "code": 200
        }
    }
];
var ConditionalChainTemplateMock = (function (_super) {
    __extends(ConditionalChainTemplateMock, _super);
    function ConditionalChainTemplateMock() {
        _super.apply(this, arguments);
        this.snapshots = [];
    }
    ConditionalChainTemplateMock.prototype.prepareFinalOutput = function (context) {
    };
    ConditionalChainTemplateMock.prototype.handleError = function (context) {
    };
    return ConditionalChainTemplateMock;
}(conditional_template_1.ConditionalChainTemplate));
describe('Conditional-templates', function () {
    var httpServer = {
        post: function (path, handler) {
            httpServer.mockPost = function (req, res) {
                handler(req, res);
            };
        }
    };
    it('ChainTemplate performs invocations conditionally, bypass template3', function (callback) {
        var invoker1 = new templates_1.MockInvoker('Invoker1 result');
        var invoker2 = new templates_1.MockInvoker('Invoker2 result');
        var invoker3 = new templates_1.MockInvoker('Invoker3 result');
        var template1 = new templates_1.SimpleTemplate(invoker1);
        var template2 = new templates_1.SimpleTemplate(invoker2);
        var template3 = new templates_1.SimpleTemplate(invoker3);
        var item1 = new conditional_template_1.ConditionalItem(template1, false);
        var item2 = new conditional_template_1.ConditionalItem(template2, true, "attribute", "run", true);
        var item3 = new conditional_template_1.ConditionalItem(template3, true, "attribute", "run", false);
        var flow = new ConditionalChainTemplateMock({ item1: item1, item2: item2, item3: item3 });
        flow.createHttpEntryPoint(httpServer, messages_1.HttpMethod.POST, '/tests');
        var context = new templates_1.InvocationContext(new messages_1.GenericRequest('/tests', 'POST'));
        context.transport = {
            type: templates_1.TransportType.http
        };
        context.state.attribute = "run";
        context.transport.response = {
            send: function (code, body) {
                flow.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: utils_1.objectCloneSimple(body)
                    }
                });
                chai_1.expect(utils_1.objectRemoveProperty(flow.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario1);
                callback();
            }
        };
        flow.run(context);
    });
    it('ChainTemplate performs invocations conditionally, bypass template2', function (callback) {
        var invoker1 = new templates_1.MockInvoker('Invoker1 result');
        var invoker2 = new templates_1.MockInvoker('Invoker2 result');
        var invoker3 = new templates_1.MockInvoker('Invoker3 result');
        var template1 = new templates_1.SimpleTemplate(invoker1);
        var template2 = new templates_1.SimpleTemplate(invoker2);
        var template3 = new templates_1.SimpleTemplate(invoker3);
        var item1 = new conditional_template_1.ConditionalItem(template1, false);
        var item2 = new conditional_template_1.ConditionalItem(template2, true, "attribute", "run", false);
        var item3 = new conditional_template_1.ConditionalItem(template3, true, "attribute", "run", true);
        var flow = new ConditionalChainTemplateMock({ item1: item1, item2: item2, item3: item3 });
        flow.createHttpEntryPoint(httpServer, messages_1.HttpMethod.POST, '/tests');
        var context = new templates_1.InvocationContext(new messages_1.GenericRequest('/tests', 'POST'));
        context.transport = {
            type: templates_1.TransportType.http
        };
        context.state.attribute = "run";
        context.transport.response = {
            send: function (code, body) {
                flow.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: utils_1.objectCloneSimple(body)
                    }
                });
                chai_1.expect(utils_1.objectRemoveProperty(flow.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario2);
                callback();
            }
        };
        flow.run(context);
    });
});
//# sourceMappingURL=conditional-template.js.map