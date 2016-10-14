import { expect } from 'chai'
import { Url, parse } from 'url'

process.env.APP_CONFIG = '{ "standalone": true, "forever": false }';

import { serviceInfo } from '../src/service-info'
serviceInfo.update({standalone: true, forever: false, busDisabled: false});


import { objectClone, objectRemoveProperty, objectAddEachProperty } from '../src/utils'
import { JsonClient, JsonResultHandler } from '../src/json-client'
import { HttpMethod, GenericRequest, GenericResponse } from '../src/messages'
import { BusImpl, Bus, MessageDestination, RequestHandler, ResponseHandler } from '../src/bus'
import { ServiceAction, ServiceActionType } from '../src/service-invoker'
import { EasyFlow, Context as FlowContext, from, on, to, finish, whenEnter } from '../src/easy-flow'
import { PingPongTemplate, ProcessResponse } from '../src/ping-pong-template'
import {objectCloneSimple} from "../src/utils";

var messagingScenario1 = [
    {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "params": {},
            "data": {"orderId": "ABC123456"},
            "path": "/",
            "method": "POST",
            "respondTo": "client.v1.Process"
        }
    }, {
        "receive": false,
        "path": "svc-order.v1.Process",
        "message": {
            "params": {
                "id2": "123456"
            },
            "data": {},
            "path": "/:id2",
            "method": "GET",
            "process": {
                "common-nodejs-v1": {
                    "time": "2015-10-21T16:22:46+11:00",
                    "name": "common-nodejs-v1",
                    "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                    "initialRequest": {
                        "params": {},
                        "data": {"orderId": "ABC123456"},
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": {"events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456"}
                }
            },
            "respondTo": "common-nodejs.v1.Process"
        }
    }, {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T05:22:46.524Z",
            "request": {
                "params": {
                    "id2": "123456"
                },
                "data": {},
                "path": "/:id2",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T16:22:46+11:00",
                        "name": "common-nodejs-v1",
                        "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {"events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456"}
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200,
            "data": {"id": "123456", "status": 1, "customerId": "C1234567"}
        }
    }, {
        "receive": false,
        "path": "svc-commit.v1.Process",
        "message": {
            "params": {},
            "data": {},
            "path": "/:id",
            "method": "GET",
            "process": {
                "common-nodejs-v1": {
                    "time": "2015-10-21T16:22:46+11:00",
                    "name": "common-nodejs-v1",
                    "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                    "initialRequest": {
                        "params": {},
                        "data": {"orderId": "ABC123456"},
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": {
                        "events": ["result"],
                        "state": "COMMITTING",
                        "originalOrderId": "ABC123456",
                        "nextState": "COMMITTING",
                        "nextStateFinal": false,
                        "lastEvent": "success",
                        "prevState": "ANALYSING_RESULT",
                        "customerId": "C1234567"
                    }
                }
            },
            "respondTo": "common-nodejs.v1.Process"
        }
    }, {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T05:22:46.525Z",
            "request": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T16:22:46+11:00",
                        "name": "common-nodejs-v1",
                        "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200
        }
    }, {
        "receive": false,
        "path": "client.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T05:22:46.525Z",
            "data": {"message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456"},
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process"
            },
            "process": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T16:22:46+11:00",
                        "name": "common-nodejs-v1",
                        "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200
        }
    }
];

var messagingScenario2 = [
    {
        "receive": true,
        "http": true,
        "data": {"respondTo": "client.v1.Process", "data": {"orderId": "ABC123456"}}
    }, {
        "receive": false,
        "http": true,
        "code": 202,
        "data": {
            "code": 202,
            "time": "2015-10-21T06:04:31.603Z",
            "correlationId": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
            "data": {
                "id2": "123456"
            },
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {}
                    }
                }
            },
            "status": 202
        }
    }, {
        "receive": false,
        "path": "svc-order.v1.Process",
        "message": {
            "params": {
                "id2": "123456"
            },
            "data": {},
            "path": "/:id2",
            "method": "GET",
            "process": {
                "common-nodejs-v1": {
                    "time": "2015-10-21T17:04:31+11:00",
                    "name": "common-nodejs-v1",
                    "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                    "initialRequest": {
                        "params": {},
                        "data": {"orderId": "ABC123456"},
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": {"events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456"}
                }
            },
            "respondTo": "common-nodejs.v1.Process"
        }
    }, {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T06:04:31.603Z",
            "request": {
                "params": {
                    "id2": "123456"
                },
                "data": {},
                "path": "/:id2",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {"events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456"}
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200,
            "data": {"id": "123456", "status": 1, "customerId": "C1234567"}
        }
    }, {
        "receive": false,
        "path": "svc-commit.v1.Process",
        "message": {
            "params": {},
            "data": {},
            "path": "/:id",
            "method": "GET",
            "process": {
                "common-nodejs-v1": {
                    "time": "2015-10-21T17:04:31+11:00",
                    "name": "common-nodejs-v1",
                    "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                    "initialRequest": {
                        "params": {},
                        "data": {"orderId": "ABC123456"},
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": {
                        "events": ["result"],
                        "state": "COMMITTING",
                        "originalOrderId": "ABC123456",
                        "nextState": "COMMITTING",
                        "nextStateFinal": false,
                        "lastEvent": "success",
                        "prevState": "ANALYSING_RESULT",
                        "customerId": "C1234567"
                    }
                }
            },
            "respondTo": "common-nodejs.v1.Process"
        }
    }, {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T06:04:31.604Z",
            "request": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200
        }
    }, {
        "receive": false,
        "path": "client.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T06:04:31.604Z",
            "data": {"message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456"},
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process"
            },
            "process": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200
        }
    }
];

var messagingScenario3 = [
    {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "params": {},
            "data": {"orderId": "ABC123456"},
            "path": "/",
            "method": "POST",
            "respondTo": "client.v1.Process"
        }
    }, {
        "http": true,
        "method": "GET",
        "params": {
            "id2": "123456"
        },
        "path": "svc-order/v1",
        "receive": false
    }, {
        "code": 200,
        "data": {
            "customerId": "C1234567",
            "status": 1
        },
        "http": true,
        "receive": true,
    }, {
        "http": true,
        "method": "GET",
        "params": {},
        "path": "svc-commit/v1",
        "receive": false,
    }, {
        "code": 200,
        "http": true,
        "receive": true
    }, {
        "receive": false,
        "path": "client.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T05:22:46.525Z",
            "data": {"message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456"},
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process"
            },
            "status": 200,
            "process": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T16:22:46+11:00",
                        "name": "common-nodejs-v1",
                        "id": "c1c6861a-0b25-4c66-a1d1-4154ee9f2b10",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                }
            }
        }
    }
];

var messagingScenario4 = [
    {
        "receive": true,
        "http": true,
        "data": {"respondTo": "client.v1.Process", "data": {"orderId": "ABC123456"}}
    }, {
        "receive": false,
        "http": true,
        "code": 202,
        "data": {
            "code": 202,
            "time": "2015-10-21T06:04:31.603Z",
            "correlationId": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
            "data": {
                "id2": "123456"
            },
            "status": 202,
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {}
                    }
                }
            }
        }
    }, {
        "http": true,
        "method": "GET",
        "params": {
            "id2": "123456"
        },
        "path": "svc-order/v1",
        "receive": false
    }, {
        "code": 200,
        "data": {
            "customerId": "C1234567",
            "status": 1
        },
        "http": true,
        "receive": true
    }, {
        "http": true,
        "method": "GET",
        "params": {},
        "path": "svc-commit/v1",
        "receive": false
    }, {
        "code": 200,
        "http": true,
        "receive": true
    }, {
        "receive": false,
        "path": "client.v1.Process",
        "message": {
            "code": 200,
            "time": "2015-10-21T06:04:31.604Z",
            "data": {"message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456"},
            "request": {
                "params": {},
                "data": {"orderId": "ABC123456"},
                "path": "/",
                "method": "POST",
                "respondTo": "client.v1.Process"
            },
            "status": 200,
            "process": {
                "params": {},
                "data": {},
                "path": "/:id",
                "method": "GET",
                "process": {
                    "common-nodejs-v1": {
                        "time": "2015-10-21T17:04:31+11:00",
                        "name": "common-nodejs-v1",
                        "id": "a20adba6-50bf-47ff-8f7d-ec49d275bdbd",
                        "initialRequest": {
                            "params": {},
                            "data": {"orderId": "ABC123456"},
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": {
                            "events": ["result"],
                            "state": "COMMITTING",
                            "originalOrderId": "ABC123456",
                            "nextState": "COMMITTING",
                            "nextStateFinal": false,
                            "lastEvent": "success",
                            "prevState": "ANALYSING_RESULT",
                            "customerId": "C1234567"
                        }
                    }
                }
            }
        }
    }
];

class TestProcessFlow extends EasyFlow {
    constructor(public communicationType:ServiceActionType) {
        super();

        // define states
        var REQUESTING_DATA = 'REQUESTING_DATA',
            ANALYSING_RESULT = 'ANALYSING_RESULT',
            COMMITTING = 'COMMITTING',
            ROLLING_BACK = 'ROLLING_BACK',
            RETURNING_PROCESS_RESULT = 'RETURNING_PROCESS_RESULT';

        // define events
        var result = 'result',
            success = 'success',
            error = 'error';

        // define transitions
        from(REQUESTING_DATA,
            on(result, to(ANALYSING_RESULT,
                on(success, to(COMMITTING,
                    on(result, finish(RETURNING_PROCESS_RESULT))
                )),
                on(error, to(ROLLING_BACK,
                    on(result, finish(RETURNING_PROCESS_RESULT))
                ))
            ))
        );

        // define handlers
        whenEnter(REQUESTING_DATA, context => {
            context.originalOrderId = context.inputMessage.data.orderId;
            var params = {id2: context.originalOrderId.replace('ABC', '')};
            context.outputMessage = new ServiceAction('svc-order', 'v1', this.communicationType, new GenericRequest('/:id2', 'GET').setParams(params));
            if (context.httpConfirmationMessage) {
                context.httpConfirmationMessage.data = params;
            }
        });

        whenEnter(ANALYSING_RESULT, context => {
            if (context.inputMessage.code === 200) {
                context.customerId = context.inputMessage.data.customerId;
                this.trigger(success, context);
            } else {
                this.trigger(error, context);
            }
        });

        whenEnter(COMMITTING, context => {
            context.outputMessage = new ServiceAction('svc-commit', 'v1', this.communicationType, new GenericRequest('/:id', 'GET').setParams({}));
        });

        whenEnter(ROLLING_BACK, context => {
            context.outputMessage = new ServiceAction('svc-rollback', 'v1', this.communicationType, new GenericRequest('/:id', 'GET').setParams({}));
        });

        whenEnter(RETURNING_PROCESS_RESULT, context => {
            var data;
            if (context.prevState === COMMITTING) {
                data = {
                    message: 'Order has been created',
                    customerId: context.customerId,
                    orderId: context.originalOrderId
                };
            } else {
                data = {
                    message: 'Error during creating order'
                };
            }

            context.outputMessage = new GenericResponse().setData(data);
        });
    }
}

class MockJsonClient extends JsonClient {
    action:ServiceAction;
    messages;

    constructor(url:Url, action:ServiceAction, messages) {
        super(null, url);
        this.action = action;
        this.messages = messages;
    }

    get(resultHandler:JsonResultHandler) {
        let request = this.action.request;
        this.messages.push({
            receive: false,
            http: true,
            method: request.method,
            params: request.params,
            path: this.action.service + '/' + this.action.version
        });

        process.nextTick(() => {
            var message:any;

            if (this.action.service === 'svc-order') {
                message = {
                    code: 200,
                    data: {
                        id: this.action.request.params.id,
                        status: 1,
                        customerId: 'C1234567'
                    }
                };
            } else if (this.action.service === 'svc-commit') {
                message = {
                    code: 200
                };
            }

            let message2 = objectAddEachProperty(message, {
                receive: true,
                http: true
            });
            this.messages.push(message2);

            resultHandler(null, null, message);
        });
    }
}

class MockPingPongTemplate extends PingPongTemplate {
    constructor(public bus, flow) {
        super();
        super.init(flow);
    }

    getMessageBus():any {
        return this.bus;
    }

    getJsonClient(action:ServiceAction):JsonClient {
        return new MockJsonClient(parse(''), action, this.bus.messages);
    }
}

class MockBus extends BusImpl {
    listeners;
    resultHandler;
    messages;

    constructor(resultHandler) {
        super();
        this.listeners = [];
        this.resultHandler = resultHandler;
        this.messages = [];
    }

    getServiceBus():any {
        return this;
    }

    assertQueue(queueName, options, callback) {
        callback()
    }

    bindQueue(queueName, exchange, path) {
    }

    consume(path, busListener) {
        this.listeners.push({
            path: path,
            busListener: busListener
        });
    }

    send(path: MessageDestination, message) {
        this.messages.push(objectClone({
            receive: false,
            path: path.toPathString(),
            message: message
        }));

        process.nextTick(() => {
            if (path.service === 'svc-order') {
                var response = new ProcessResponse();
                response.request = message;
                response.data = {
                    id: message.params.id,
                    status: 1,
                    customerId: 'C1234567'
                };
                this.mockReceiveMessage(message.respondTo, response);
            } else if (path.service === 'svc-commit') {
                var response = new ProcessResponse();
                response.request = message;
                this.mockReceiveMessage(message.respondTo, response);
            } else if (path.service === 'svc-rollback') {
                var response = new ProcessResponse();
                response.request = message;
                this.mockReceiveMessage(message.respondTo, response);
            }
        });
    }

    sendToPath(path:string, message:any) {
        this.messages.push(objectClone({
            receive: false,
            path: path,
            message: message
        }));

        if (path === 'client.v1.Process') {
            expect(message.code).to.equal(200);

            expect(message.data).to.eql({
                customerId: 'C1234567',
                message: 'Order has been created',
                orderId: 'ABC123456'
            });

            expect(objectCloneSimple(objectRemoveProperty(message.request, 'requestId'))).to.eql({
                data: {
                    orderId: 'ABC123456'
                },
                method: 'POST',
                params: {},
                path: '/',
                respondTo: 'client.v1.Process'
            });

            this.resultHandler();
        }
    }

    mockReceiveMessage(path, message) {
        this.messages.push(objectClone({
            receive: true,
            path: path,
            message: message
        }));

        message = { content: JSON.stringify(message) };
        this.listeners.forEach(listener => {
            if (path === listener.path) {
                listener.busListener(message);
            }
        });
    }
}

class HttpMock {
    httpHandler;
    callHandler;

    constructor(callHandler) {
        this.callHandler = callHandler;
    }

    post(path, httpHandler) {
        this.httpHandler = httpHandler;
    }

    mockPost(body) {
        var req = {
            method: 'POST',
            body: body,
            header: (value) => {
                if(value === 'ds-correlation-id' || value === 'ds-source-system') {
                    return;
                }
            }
        };

        this.callHandler({
            receive: true,
            http: true,
            data: body
        });

        this.httpHandler(req, {
            send: (code, data) => {
                this.callHandler({
                    receive: false,
                    http: true,
                    code: code,
                    data: data
                });
            }
        });
    }
}

describe('ping-pong-template', () => {
    describe('in ASYNC communication mode, process can be started', () => {
        it('asynchronously', function (callback) {
            var bus = new MockBus(() => {
                // TODO need to find out where "original" comes from
                var res = objectCloneSimple(objectRemoveProperty(bus.messages, 'id', 'time', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = objectRemoveProperty(messagingScenario1, 'id', 'time');
                expect(res).to.eql(exp);
                callback();
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(ServiceActionType.ASYNC));
            template.createEntryPoint(null, HttpMethod.POST, '/');

            var request = new GenericRequest('/', 'POST')
                .setData({
                    orderId: 'ABC123456'
                })
                .setRespondTo('client.v1.Process');

            bus.mockReceiveMessage('common-nodejs.v1.Process', request);
        });



        it('synchronously', (callback) => {
            var bus = new MockBus(() => {
                // TODO need to find out where "original" comes from
                var res = objectCloneSimple(objectRemoveProperty(bus.messages, 'id', 'time', 'correlationId', 'requestId', 'original'));
                var exp = objectRemoveProperty(messagingScenario2, 'id', 'time', 'correlationId');
                expect(res).to.eql(exp);
                callback();
            });
            var server = new HttpMock(message => {
                bus.messages.push(objectClone(message));
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(ServiceActionType.ASYNC));
            template.createEntryPoint(server, HttpMethod.POST, '/');

            server.mockPost({
                respondTo: 'client.v1.Process',
                data: {
                    orderId: 'ABC123456'
                }
            });
        });
    });

    describe('in SYNC communication mode, process can be started', () => {
        it('asynchronously', function (callback) {
            var bus = new MockBus(() => {
                // TODO need to find out where "original" comes from
                var res = objectCloneSimple(objectRemoveProperty(bus.messages, 'id', 'time', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = objectRemoveProperty(messagingScenario3, 'id', 'time');
                expect(res).to.eql(exp);
                callback();
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(ServiceActionType.SYNC));
            template.createEntryPoint(null, HttpMethod.POST, '/');

            var request = new GenericRequest('/', 'POST')
                .setData({
                    orderId: 'ABC123456'
                })
                .setRespondTo('client.v1.Process');

            bus.mockReceiveMessage('common-nodejs.v1.Process', request);
        });

        it('synchronously', (callback) => {
            var bus = new MockBus(() => {
                // TODO need to find out where "original" comes from
                var res = objectCloneSimple(objectRemoveProperty(bus.messages, 'id', 'time', 'correlationId', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = objectRemoveProperty(messagingScenario4, 'id', 'time', 'correlationId');
                expect(res).to.eql(exp);
                callback();
            });
            var server = new HttpMock(message => {
                bus.messages.push(objectClone(message));
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(ServiceActionType.SYNC));
            template.createEntryPoint(server, HttpMethod.POST, '/');

            server.mockPost({
                respondTo: 'client.v1.Process',
                data: {
                    orderId: 'ABC123456'
                }
            });
        });
    });
});
