/**
 * Created by andrey on 23/06/2016.
 */

import { expect } from 'chai';
import {
    CompositeTemplate, SimpleTemplate, MockInvoker, InvocationContext,
    CompositeTemplateTask, TransportType
} from "../src/templates";
import { GenericRequest } from "../src/messages";

let downstreamCallCounter = 0;
let scenario1results = {
    invocations: [],
    final: null
};

let scenario1expected = {
    "invocations": [
        {
            "task": 1
        },
        {
            "task": 21,
            "tasks1result": [
                1
            ]
        },
        {
            "task": 22,
            "tasks1result": [
                1
            ]
        },
        {
            "task": 23,
            "tasks1result": [
                1
            ]
        },
        {
            "task": 3,
            "tasks1result": [
                1
            ],
            "tasks2result": [
                2,
                3,
                4
            ]
        }
    ],
    "final": {
        "state": {
            "subStates": [
                {
                    "task": 3,
                    "tasks1result": [
                        1
                    ],
                    "tasks2result": [
                        2,
                        3,
                        4
                    ]
                }
            ]
        },
        "invokerOutput": [ 5 ]
    }
};

class SimpleTemplateMock extends SimpleTemplate {
    constructor() {
        super(new MockInvoker(() => ++downstreamCallCounter))
    }

    prepareOutput(context: InvocationContext) {
        super.prepareOutput(context);
        scenario1results.invocations.push(context.state);
    }
}

class CompositeTemplateMock extends CompositeTemplate {
    prepareTasks(index: number, prevContexts: InvocationContext[]): CompositeTemplateTask[] {
        if (index === 0) {
            prevContexts[0].state.task = 1;
            return [
                { template: new SimpleTemplateMock(), context: prevContexts[0] }
            ];
        } else if (index === 1) {
            let ctx1 = prevContexts[0].clone();
            ctx1.state.tasks1result = [ prevContexts[0].invokerOutput ];
            ctx1.state.task = 21;
            let ctx2 = ctx1.clone();
            ctx2.state.task = 22;
            let ctx3 = ctx1.clone();
            ctx3.state.task = 23;
            return [
                { template: new SimpleTemplateMock(), context: ctx1 },
                { template: new SimpleTemplateMock(), context: ctx2 },
                { template: new SimpleTemplateMock(), context: ctx3 }
            ];
        } else if (index === 2) {
            let ctx1 = prevContexts[0].clone();
            ctx1.state.tasks2result = [ prevContexts[0].invokerOutput, prevContexts[1].invokerOutput, prevContexts[2].invokerOutput ];
            ctx1.state.task = 3;

            return [
                { template: new SimpleTemplateMock(), context: ctx1 }
            ];
        } else {
            let ctx1 = prevContexts[0].clone();
            ctx1.state.tasks3result = [ prevContexts[0].invokerOutput ];
        }
    }

    prepareInput(context: InvocationContext) {
        super.prepareInput(context);
    }

    prepareOutput(context: InvocationContext) {
        super.prepareOutput(context);
    }
}


describe('CompositeTemplate', () => {
    it('CompositeTemplate', (callback) => {
        let template = new CompositeTemplateMock();

        let context = new InvocationContext(new GenericRequest('/service/path', 'POST'));
        context.transport = {
            type: TransportType.internal
        };
        template.run(context, context => {
            scenario1results.final = {
                state: context.state,
                invokerOutput: context.invokerOutput
            };

            expect(scenario1results).to.eql(scenario1expected);
            callback();
        })
    });
});

