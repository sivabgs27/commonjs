import chai = require('chai');
var expect = chai.expect;

import { serviceInfo } from '../src/service-info'
serviceInfo.update({ standalone: true, forever: false, busDisabled: true });

import { GuardedInvoker, Invoker, InvocationContext, ContextCallback } from '../src/templates'
import { createGuardConfig } from '../src/service-info'
import { GenericRequest } from '../src/messages'

class MockInvoker implements Invoker {
    delay: number = 0;
    worker: {(context: InvocationContext)};

    invoke(context: InvocationContext, callback: ContextCallback) {
        if (this.delay) {
            setTimeout(() => {
                this.doInvoke(context, callback);
            }, this.delay);
        } else {
            this.doInvoke(context, callback);
        }
    }

    setDelay(delay: number): MockInvoker {
        this.delay = delay;
        return this;
    }

    setWorker(worker: {(context: InvocationContext)}): MockInvoker {
        this.worker = worker;
        return this;
    }

    private doInvoke(context: InvocationContext, callback: ContextCallback) {
        if (this.worker) {
            this.worker(context);
        }

        callback(context);
    }

    getTargetSystem(): string {
        return 'MockInvoker';
    }

    getServiceCall(): string {
        return 'MockInvoker';
    }
}

function createContext(): InvocationContext {
    return new InvocationContext(new GenericRequest('/endpoint', 'POST'));
}

describe('Invoker unit tests', function () {
    describe('Downstream guard enforces throttle concurrency limits', function () {
        var guard = new GuardedInvoker(createGuardConfig({ concurrency: 1 }), 'Test target system');
        var resultCount = 0;

        var invocation1 = createContext();
        var invocation2 = createContext();
        it('First request is processed and second is declined with 503 code', function (callback) {
            var handler = () => {
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
