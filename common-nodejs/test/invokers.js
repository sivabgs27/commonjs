"use strict";
var chai = require('chai');
var expect = chai.expect;
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: true });
var templates_1 = require('../src/templates');
var service_info_2 = require('../src/service-info');
var messages_1 = require('../src/messages');
var MockInvoker = (function () {
    function MockInvoker() {
        this.delay = 0;
    }
    MockInvoker.prototype.invoke = function (context, callback) {
        var _this = this;
        if (this.delay) {
            setTimeout(function () {
                _this.doInvoke(context, callback);
            }, this.delay);
        }
        else {
            this.doInvoke(context, callback);
        }
    };
    MockInvoker.prototype.setDelay = function (delay) {
        this.delay = delay;
        return this;
    };
    MockInvoker.prototype.setWorker = function (worker) {
        this.worker = worker;
        return this;
    };
    MockInvoker.prototype.doInvoke = function (context, callback) {
        if (this.worker) {
            this.worker(context);
        }
        callback(context);
    };
    MockInvoker.prototype.getTargetSystem = function () {
        return 'MockInvoker';
    };
    MockInvoker.prototype.getServiceCall = function () {
        return 'MockInvoker';
    };
    return MockInvoker;
}());
function createContext() {
    return new templates_1.InvocationContext(new messages_1.GenericRequest('/endpoint', 'POST'));
}
describe('Invoker unit tests', function () {
    describe('Downstream guard enforces throttle concurrency limits', function () {
        var guard = new templates_1.GuardedInvoker(service_info_2.createGuardConfig({ concurrency: 1 }), 'Test target system');
        var resultCount = 0;
        var invocation1 = createContext();
        var invocation2 = createContext();
        it('First request is processed and second is declined with 503 code', function (callback) {
            var handler = function () {
                resultCount++;
                if (resultCount === 2) {
                    expect(invocation1.output.code).to.equal(200);
                    expect(invocation2.output.code).to.equal(503);
                    callback();
                }
            };
            guard.invoke(new MockInvoker().setDelay(500), invocation1, handler);
            guard.invoke(new MockInvoker(), invocation2, handler);
        });
    });
});
//# sourceMappingURL=invokers.js.map