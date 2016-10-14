/**
 * Created by andrey on 1/12/2015.
 */


import { expect } from 'chai';
import { objectCloneSimple, objectRemoveProperty } from '../src/utils';
import { GenericRequest } from '../src/messages';
import { ChainTemplate, ParallelTemplate, MockInvoker, DelayingInvoker, InvocationContext, TransportType } from '../src/templates';

let scenario1 = [
    {
        "prepareInput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path",
            },
            "invoker": {
                "delay": 100,
                "delayed": {
                    "result": "Invoker1 result"
                },
                "invokerName": "invoker1"
            },
            "invokerInput": "invoker1 input",
            "invokerName": "invoker1",
            "invokerIndex": 1,
            "invokerOutput": {},
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {},
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareOutput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path",
            },
            "invoker": {
                "delay": 100,
                "delayed": {
                    "result": "Invoker1 result"
                },
                "invokerName": "invoker1"
            },
            "invokerInput": "invoker1 input",
            "invokerName": "invoker1",
            "invokerIndex": 1,
            "invokerOutput": "Invoker1 result",
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {
                "invoker1": {
                    "invokerOutput": "Invoker1 result"
                }
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareInput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invoker": {
                "delay": 100,
                "delayed": {
                    "result": "Invoker2 result"
                },
                "invokerName": "invoker2"
            },
            "invokerInput": "invoker2 input",
            "invokerName": "invoker2",
            "invokerIndex": 2,
            "invokerOutput": "Invoker1 result",
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {
                "invoker1": {
                    "invokerOutput": "Invoker1 result"
                }
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareOutput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invoker": {
                "delay": 100,
                "delayed": {
                    "result": "Invoker2 result"
                },
                "invokerName": "invoker2"
            },
            "invokerInput": "invoker2 input",
            "invokerName": "invoker2",
            "invokerIndex": 2,
            "invokerOutput": "Invoker2 result",
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {
                "invoker1": {
                    "invokerOutput": "Invoker1 result"
                },
                "invoker2": {
                    "invokerOutput": "Invoker2 result"
                }
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareFinalOutput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invoker": {
                "delay": 100,
                "delayed": {
                    "result": "Invoker2 result"
                },
                "invokerName": "invoker2"
            },
            "invokerInput": "invoker2 input",
            "invokerName": "invoker2",
            "invokerIndex": 2,
            "invokerOutput": "Invoker2 result",
            "output": {
                "code": 200,
                "status": 200,
                "data": {
                    "invoker1": {
                        "invokerOutput": "Invoker1 result"
                    },
                    "invoker2": {
                        "invokerOutput": "Invoker2 result"
                    }
                }
            },
            "state": {
                "invoker1": {
                    "invokerOutput": "Invoker1 result"
                },
                "invoker2": {
                    "invokerOutput": "Invoker2 result"
                }
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "httpResponse": {
            "body": {
                "data": {
                    "invoker1": {
                        "invokerOutput": "Invoker1 result"
                    },
                    "invoker2": {
                        "invokerOutput": "Invoker2 result"
                    }
                },
                "status": 200

            },
            "code": 200
        }
    }
];

let scenario2 = [
    {
        "prepareInput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invokerInput": "invoker1 input",
            "invokerName": "invoker1",
            "invokerOutput": {},
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {},
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareInput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invokerInput": "invoker2 input",
            "invokerName": "invoker2",
            "invokerOutput": {},
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {},
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareOutput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invokerInput": "invoker1 input",
            "invokerName": "invoker1",
            "invokerOutput": "Invoker1 result",
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {
                "invokerName": "Invoker1 result"
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareOutput": {
            "input": {
                "data": {},
                "method": "POST",
                "params": {},
                "path": "/service/path"
            },
            "invokerInput": "invoker2 input",
            "invokerName": "invoker2",
            "invokerOutput": "Invoker2 result",
            "output": {
                "code": 200,
                "status": 200
            },
            "state": {
                "invokerName": "Invoker2 result"
            },
            "transport": {
                "response": {},
                "type": 0
            }
        }
    },
    {
        "prepareFinalOutput": {
            "mainContext": {
                "input": {
                    "data": {},
                    "method": "POST",
                    "params": {},
                    "path": "/service/path"
                },
                "invokerInput": {},
                "invokerOutput": {},
                "output": {
                    "code": 200,
                    "status": 200,
                    "data": {
                        items: [
                            {
                                "invokerName": "Invoker1 result"
                            },
                            {
                                "invokerName": "Invoker2 result"
                            }
                        ]
                    }
                },
                "state": {},
                "transport": {
                    "response": {},
                    "type": 0
                }
            },
            "subContexts": [
                {
                    "input": {
                        "data": {},
                        "method": "POST",
                        "params": {},
                        "path": "/service/path"
                    },
                    "invokerInput": "invoker1 input",
                    "invokerName": "invoker1",
                    "invokerOutput": "Invoker1 result",
                    "output": {
                        "code": 200,
                        "status": 200
                    },
                    "state": {
                        "invokerName": "Invoker1 result"
                    },
                    "transport": {
                        "response": {},
                        "type": 0
                    }
                },
                {
                    "input": {
                        "data": {},
                        "method": "POST",
                        "params": {},
                        "path": "/service/path"
                    },
                    "invokerInput": "invoker2 input",
                    "invokerName": "invoker2",
                    "invokerOutput": "Invoker2 result",
                    "output": {
                        "code": 200,
                        "status": 200
                    },
                    "state": {
                        "invokerName": "Invoker2 result"
                    },
                    "transport": {
                        "response": {},
                        "type": 0
                    }
                }
            ]
        }
    },
    {
        "httpResponse": {
            "body": {
                "data": {
                    items: [
                        {
                            "invokerName": "Invoker1 result"
                        },
                        {
                            "invokerName": "Invoker2 result"
                        }
                    ]
                },
                "status": 200
            },
            "code": 200
        }
    }
];

class ChainTemplateMock extends ChainTemplate {
    snapshots = [];

    prepareInput(context: InvocationContext) {
        context.invokerInput = context.invokerName + ' input';

        this.snapshots.push({
            prepareInput: objectCloneSimple(context)
        });
    }

    prepareOutput(context: InvocationContext) {
        (context.state = context.state || {})[context.invokerName] = {
            invokerOutput: context.invokerOutput,
            time: Date.now()
        };

        this.snapshots.push({
            prepareOutput: objectCloneSimple(context)
        });
    }


    prepareFinalOutput(context:InvocationContext) {
        context.output.setData(context.state);

        // check that calls made sequentially
        expect(Math.abs(context.state.invoker1.time - context.state.invoker2.time)).is.gt(90);

        this.snapshots.push({
            prepareFinalOutput: objectCloneSimple(context)
        });
    }
}

class ParallelTemplateMock extends ParallelTemplate {
    snapshots = [];

    prepareInput(context: InvocationContext) {
        context.invokerInput = context.invokerName + ' input';

        this.snapshots.push({
            prepareInput: objectCloneSimple(context)
        });
    }

    prepareOutput(context: InvocationContext) {
        (context.state = context.state || {}).invokerName = context.invokerOutput;
        (context.state = context.state || {}).time = Date.now();

        this.snapshots.push({
            prepareOutput: objectCloneSimple(context)
        });
    }


    prepareFinalOutput(context:InvocationContext, subContexts:InvocationContext[]) {
        context.output.setData({items: subContexts.map(c => c.state)});

        // check that calls made in parallel
        expect(Math.abs(subContexts[0].state.time - subContexts[1].state.time)).is.lt(50);

        this.snapshots.push({
            prepareFinalOutput: {
                mainContext: objectCloneSimple(context),
                subContexts: objectCloneSimple(subContexts)
            }
        });
    }
}

describe('Multi-templates', () => {
    it('ChainTemplate performs invocations sequentially', (callback) => {
        let invoker1 = new DelayingInvoker(new MockInvoker('Invoker1 result'), 100);
        let invoker2 = new DelayingInvoker(new MockInvoker('Invoker2 result'), 100);
        let template = new ChainTemplateMock({
            invoker1: invoker1,
            invoker2: invoker2
        });

        let context = new InvocationContext(new GenericRequest('/service/path', 'POST'));
        context.transport = {
            type: TransportType.http
        };

        (<any>context.transport).response = {
            send: (code, body) => {
                template.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: objectCloneSimple(body)
                    }
                });

                expect(objectRemoveProperty(template.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario1);

                callback();
            }
        };

        template.run(context);
    });

    it('ParallelTemplate performs invocations simultaniously', (callback) => {
        let invoker1 = new DelayingInvoker(new MockInvoker('Invoker1 result'), 100);
        let invoker2 = new DelayingInvoker(new MockInvoker('Invoker2 result'), 100);
        let template = new ParallelTemplateMock({
            invoker1: invoker1,
            invoker2: invoker2
        });

        let context = new InvocationContext(new GenericRequest('/service/path', 'POST'));
        context.transport = {
            type: TransportType.http
        };

        (<any>context.transport).response = {
            send: (code, body) => {
                template.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: objectCloneSimple(body)
                    }
                });

                expect(objectRemoveProperty(template.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario2);

                callback();
            }
        };

        template.run(context);
    });
});
