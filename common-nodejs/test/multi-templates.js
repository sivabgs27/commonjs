/**
 * Created by andrey on 1/12/2015.
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
var scenario1 = [
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
var scenario2 = [
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
var ChainTemplateMock = (function (_super) {
    __extends(ChainTemplateMock, _super);
    function ChainTemplateMock() {
        _super.apply(this, arguments);
        this.snapshots = [];
    }
    ChainTemplateMock.prototype.prepareInput = function (context) {
        context.invokerInput = context.invokerName + ' input';
        this.snapshots.push({
            prepareInput: utils_1.objectCloneSimple(context)
        });
    };
    ChainTemplateMock.prototype.prepareOutput = function (context) {
        (context.state = context.state || {})[context.invokerName] = {
            invokerOutput: context.invokerOutput,
            time: Date.now()
        };
        this.snapshots.push({
            prepareOutput: utils_1.objectCloneSimple(context)
        });
    };
    ChainTemplateMock.prototype.prepareFinalOutput = function (context) {
        context.output.setData(context.state);
        // check that calls made sequentially
        chai_1.expect(Math.abs(context.state.invoker1.time - context.state.invoker2.time)).is.gt(90);
        this.snapshots.push({
            prepareFinalOutput: utils_1.objectCloneSimple(context)
        });
    };
    return ChainTemplateMock;
}(templates_1.ChainTemplate));
var ParallelTemplateMock = (function (_super) {
    __extends(ParallelTemplateMock, _super);
    function ParallelTemplateMock() {
        _super.apply(this, arguments);
        this.snapshots = [];
    }
    ParallelTemplateMock.prototype.prepareInput = function (context) {
        context.invokerInput = context.invokerName + ' input';
        this.snapshots.push({
            prepareInput: utils_1.objectCloneSimple(context)
        });
    };
    ParallelTemplateMock.prototype.prepareOutput = function (context) {
        (context.state = context.state || {}).invokerName = context.invokerOutput;
        (context.state = context.state || {}).time = Date.now();
        this.snapshots.push({
            prepareOutput: utils_1.objectCloneSimple(context)
        });
    };
    ParallelTemplateMock.prototype.prepareFinalOutput = function (context, subContexts) {
        context.output.setData({ items: subContexts.map(function (c) { return c.state; }) });
        // check that calls made in parallel
        chai_1.expect(Math.abs(subContexts[0].state.time - subContexts[1].state.time)).is.lt(50);
        this.snapshots.push({
            prepareFinalOutput: {
                mainContext: utils_1.objectCloneSimple(context),
                subContexts: utils_1.objectCloneSimple(subContexts)
            }
        });
    };
    return ParallelTemplateMock;
}(templates_1.ParallelTemplate));
describe('Multi-templates', function () {
    it('ChainTemplate performs invocations sequentially', function (callback) {
        var invoker1 = new templates_1.DelayingInvoker(new templates_1.MockInvoker('Invoker1 result'), 100);
        var invoker2 = new templates_1.DelayingInvoker(new templates_1.MockInvoker('Invoker2 result'), 100);
        var template = new ChainTemplateMock({
            invoker1: invoker1,
            invoker2: invoker2
        });
        var context = new templates_1.InvocationContext(new messages_1.GenericRequest('/service/path', 'POST'));
        context.transport = {
            type: templates_1.TransportType.http
        };
        context.transport.response = {
            send: function (code, body) {
                template.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: utils_1.objectCloneSimple(body)
                    }
                });
                chai_1.expect(utils_1.objectRemoveProperty(template.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario1);
                callback();
            }
        };
        template.run(context);
    });
    it('ParallelTemplate performs invocations simultaniously', function (callback) {
        var invoker1 = new templates_1.DelayingInvoker(new templates_1.MockInvoker('Invoker1 result'), 100);
        var invoker2 = new templates_1.DelayingInvoker(new templates_1.MockInvoker('Invoker2 result'), 100);
        var template = new ParallelTemplateMock({
            invoker1: invoker1,
            invoker2: invoker2
        });
        var context = new templates_1.InvocationContext(new messages_1.GenericRequest('/service/path', 'POST'));
        context.transport = {
            type: templates_1.TransportType.http
        };
        context.transport.response = {
            send: function (code, body) {
                template.snapshots.push({
                    httpResponse: {
                        code: code,
                        body: utils_1.objectCloneSimple(body)
                    }
                });
                chai_1.expect(utils_1.objectRemoveProperty(template.snapshots, 'time', 'correlationId', 'requestId')).to.eql(scenario2);
                callback();
            }
        };
        template.run(context);
    });
});
//# sourceMappingURL=multi-templates.js.map