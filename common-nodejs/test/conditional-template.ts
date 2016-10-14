/**
 * Created by c736448 on 4/04/2016.
 */


import { expect } from 'chai';
import { objectCloneSimple, objectRemoveProperty } from '../src/utils';
import { GenericRequest, HttpMethod } from '../src/messages';
import { SimpleTemplate, ChainTemplate, ParallelTemplate, MockInvoker,
    DelayingInvoker, InvocationContext, TransportType } from '../src/templates';
import { ConditionalChainTemplate, ConditionalItem } from '../src/conditional-template';
import {serviceInfo} from "../src/service-info";


let scenario1 = [
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

let scenario2 = [
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

class ConditionalChainTemplateMock extends ConditionalChainTemplate {
    snapshots = [];

    prepareFinalOutput(context:InvocationContext) {
    }

    handleError(context:InvocationContext) {
    }

}

describe('Conditional-templates', () => {

    var httpServer:any = {
        post: (path, handler) => {
            httpServer.mockPost = (req, res) => {
                handler(req, res);
            };
        }
    };
    it('ChainTemplate performs invocations conditionally, bypass template3', (callback) => {
        let invoker1 = new MockInvoker('Invoker1 result');
        let invoker2 = new MockInvoker('Invoker2 result');
        let invoker3 = new MockInvoker('Invoker3 result');

        let template1 = new SimpleTemplate(invoker1);
        let template2 = new SimpleTemplate(invoker2);
        let template3 = new SimpleTemplate(invoker3);

        let item1 = new ConditionalItem(template1, false);
        let item2 = new ConditionalItem(template2, true, "attribute", "run", true);
        let item3 = new ConditionalItem(template3, true, "attribute", "run", false);

        let flow = new ConditionalChainTemplateMock({item1, item2, item3});

        flow.createHttpEntryPoint(httpServer, HttpMethod.POST, '/tests');


        let context = new InvocationContext(new GenericRequest('/tests', 'POST'));
        context.transport = {
            type: TransportType.http
        };

        context.state.attribute = "run";

        (<any>context.transport).response = {
            send: (code, body) => {
                flow.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: objectCloneSimple(body)
                    }
                });

                expect(objectRemoveProperty(flow.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario1);

                callback();
            }
        };

        flow.run(context);
    });

    it('ChainTemplate performs invocations conditionally, bypass template2', (callback) => {
        let invoker1 = new MockInvoker('Invoker1 result');
        let invoker2 = new MockInvoker('Invoker2 result');
        let invoker3 = new MockInvoker('Invoker3 result');

        let template1 = new SimpleTemplate(invoker1);
        let template2 = new SimpleTemplate(invoker2);
        let template3 = new SimpleTemplate(invoker3);

        let item1 = new ConditionalItem(template1, false);
        let item2 = new ConditionalItem(template2, true, "attribute", "run", false);
        let item3 = new ConditionalItem(template3, true, "attribute", "run", true);

        let flow = new ConditionalChainTemplateMock({item1, item2, item3});

        flow.createHttpEntryPoint(httpServer, HttpMethod.POST, '/tests');


        let context = new InvocationContext(new GenericRequest('/tests', 'POST'));
        context.transport = {
            type: TransportType.http
        };

        context.state.attribute = "run";

        (<any>context.transport).response = {
            send: (code, body) => {
                flow.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: objectCloneSimple(body)
                    }
                });

                expect(objectRemoveProperty(flow.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario2);

                callback();
            }
        };

        flow.run(context);
    });
})

