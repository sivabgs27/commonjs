"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var url_1 = require('url');
process.env.APP_CONFIG = '{ "standalone": true, "forever": false }';
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: false });
var utils_1 = require('../src/utils');
var json_client_1 = require('../src/json-client');
var messages_1 = require('../src/messages');
var bus_1 = require('../src/bus');
var service_invoker_1 = require('../src/service-invoker');
var easy_flow_1 = require('../src/easy-flow');
var ping_pong_template_1 = require('../src/ping-pong-template');
var utils_2 = require("../src/utils");
var messagingScenario1 = [
    {
        "receive": true,
        "path": "common-nodejs.v1.Process",
        "message": {
            "params": {},
            "data": { "orderId": "ABC123456" },
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
                        "data": { "orderId": "ABC123456" },
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": { "events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456" }
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
                            "data": { "orderId": "ABC123456" },
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": { "events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456" }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200,
            "data": { "id": "123456", "status": 1, "customerId": "C1234567" }
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
                        "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
            "data": { "message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456" },
            "request": {
                "params": {},
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
        "data": { "respondTo": "client.v1.Process", "data": { "orderId": "ABC123456" } }
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
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
                        "data": { "orderId": "ABC123456" },
                        "path": "/",
                        "method": "POST",
                        "respondTo": "client.v1.Process"
                    },
                    "state": { "events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456" }
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
                            "data": { "orderId": "ABC123456" },
                            "path": "/",
                            "method": "POST",
                            "respondTo": "client.v1.Process"
                        },
                        "state": { "events": ["result"], "state": "REQUESTING_DATA", "originalOrderId": "ABC123456" }
                    }
                },
                "respondTo": "common-nodejs.v1.Process"
            },
            "status": 200,
            "data": { "id": "123456", "status": 1, "customerId": "C1234567" }
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
                        "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
            "data": { "message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456" },
            "request": {
                "params": {},
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
            "data": { "orderId": "ABC123456" },
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
            "data": { "message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456" },
            "request": {
                "params": {},
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
        "data": { "respondTo": "client.v1.Process", "data": { "orderId": "ABC123456" } }
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
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
            "data": { "message": "Order has been created", "customerId": "C1234567", "orderId": "ABC123456" },
            "request": {
                "params": {},
                "data": { "orderId": "ABC123456" },
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
                            "data": { "orderId": "ABC123456" },
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
var TestProcessFlow = (function (_super) {
    __extends(TestProcessFlow, _super);
    function TestProcessFlow(communicationType) {
        var _this = this;
        _super.call(this);
        this.communicationType = communicationType;
        // define states
        var REQUESTING_DATA = 'REQUESTING_DATA', ANALYSING_RESULT = 'ANALYSING_RESULT', COMMITTING = 'COMMITTING', ROLLING_BACK = 'ROLLING_BACK', RETURNING_PROCESS_RESULT = 'RETURNING_PROCESS_RESULT';
        // define events
        var result = 'result', success = 'success', error = 'error';
        // define transitions
        easy_flow_1.from(REQUESTING_DATA, easy_flow_1.on(result, easy_flow_1.to(ANALYSING_RESULT, easy_flow_1.on(success, easy_flow_1.to(COMMITTING, easy_flow_1.on(result, easy_flow_1.finish(RETURNING_PROCESS_RESULT)))), easy_flow_1.on(error, easy_flow_1.to(ROLLING_BACK, easy_flow_1.on(result, easy_flow_1.finish(RETURNING_PROCESS_RESULT)))))));
        // define handlers
        easy_flow_1.whenEnter(REQUESTING_DATA, function (context) {
            context.originalOrderId = context.inputMessage.data.orderId;
            var params = { id2: context.originalOrderId.replace('ABC', '') };
            context.outputMessage = new service_invoker_1.ServiceAction('svc-order', 'v1', _this.communicationType, new messages_1.GenericRequest('/:id2', 'GET').setParams(params));
            if (context.httpConfirmationMessage) {
                context.httpConfirmationMessage.data = params;
            }
        });
        easy_flow_1.whenEnter(ANALYSING_RESULT, function (context) {
            if (context.inputMessage.code === 200) {
                context.customerId = context.inputMessage.data.customerId;
                _this.trigger(success, context);
            }
            else {
                _this.trigger(error, context);
            }
        });
        easy_flow_1.whenEnter(COMMITTING, function (context) {
            context.outputMessage = new service_invoker_1.ServiceAction('svc-commit', 'v1', _this.communicationType, new messages_1.GenericRequest('/:id', 'GET').setParams({}));
        });
        easy_flow_1.whenEnter(ROLLING_BACK, function (context) {
            context.outputMessage = new service_invoker_1.ServiceAction('svc-rollback', 'v1', _this.communicationType, new messages_1.GenericRequest('/:id', 'GET').setParams({}));
        });
        easy_flow_1.whenEnter(RETURNING_PROCESS_RESULT, function (context) {
            var data;
            if (context.prevState === COMMITTING) {
                data = {
                    message: 'Order has been created',
                    customerId: context.customerId,
                    orderId: context.originalOrderId
                };
            }
            else {
                data = {
                    message: 'Error during creating order'
                };
            }
            context.outputMessage = new messages_1.GenericResponse().setData(data);
        });
    }
    return TestProcessFlow;
}(easy_flow_1.EasyFlow));
var MockJsonClient = (function (_super) {
    __extends(MockJsonClient, _super);
    function MockJsonClient(url, action, messages) {
        _super.call(this, null, url);
        this.action = action;
        this.messages = messages;
    }
    MockJsonClient.prototype.get = function (resultHandler) {
        var _this = this;
        var request = this.action.request;
        this.messages.push({
            receive: false,
            http: true,
            method: request.method,
            params: request.params,
            path: this.action.service + '/' + this.action.version
        });
        process.nextTick(function () {
            var message;
            if (_this.action.service === 'svc-order') {
                message = {
                    code: 200,
                    data: {
                        id: _this.action.request.params.id,
                        status: 1,
                        customerId: 'C1234567'
                    }
                };
            }
            else if (_this.action.service === 'svc-commit') {
                message = {
                    code: 200
                };
            }
            var message2 = utils_1.objectAddEachProperty(message, {
                receive: true,
                http: true
            });
            _this.messages.push(message2);
            resultHandler(null, null, message);
        });
    };
    return MockJsonClient;
}(json_client_1.JsonClient));
var MockPingPongTemplate = (function (_super) {
    __extends(MockPingPongTemplate, _super);
    function MockPingPongTemplate(bus, flow) {
        _super.call(this);
        this.bus = bus;
        _super.prototype.init.call(this, flow);
    }
    MockPingPongTemplate.prototype.getMessageBus = function () {
        return this.bus;
    };
    MockPingPongTemplate.prototype.getJsonClient = function (action) {
        return new MockJsonClient(url_1.parse(''), action, this.bus.messages);
    };
    return MockPingPongTemplate;
}(ping_pong_template_1.PingPongTemplate));
var MockBus = (function (_super) {
    __extends(MockBus, _super);
    function MockBus(resultHandler) {
        _super.call(this);
        this.listeners = [];
        this.resultHandler = resultHandler;
        this.messages = [];
    }
    MockBus.prototype.getServiceBus = function () {
        return this;
    };
    MockBus.prototype.assertQueue = function (queueName, options, callback) {
        callback();
    };
    MockBus.prototype.bindQueue = function (queueName, exchange, path) {
    };
    MockBus.prototype.consume = function (path, busListener) {
        this.listeners.push({
            path: path,
            busListener: busListener
        });
    };
    MockBus.prototype.send = function (path, message) {
        var _this = this;
        this.messages.push(utils_1.objectClone({
            receive: false,
            path: path.toPathString(),
            message: message
        }));
        process.nextTick(function () {
            if (path.service === 'svc-order') {
                var response = new ping_pong_template_1.ProcessResponse();
                response.request = message;
                response.data = {
                    id: message.params.id,
                    status: 1,
                    customerId: 'C1234567'
                };
                _this.mockReceiveMessage(message.respondTo, response);
            }
            else if (path.service === 'svc-commit') {
                var response = new ping_pong_template_1.ProcessResponse();
                response.request = message;
                _this.mockReceiveMessage(message.respondTo, response);
            }
            else if (path.service === 'svc-rollback') {
                var response = new ping_pong_template_1.ProcessResponse();
                response.request = message;
                _this.mockReceiveMessage(message.respondTo, response);
            }
        });
    };
    MockBus.prototype.sendToPath = function (path, message) {
        this.messages.push(utils_1.objectClone({
            receive: false,
            path: path,
            message: message
        }));
        if (path === 'client.v1.Process') {
            chai_1.expect(message.code).to.equal(200);
            chai_1.expect(message.data).to.eql({
                customerId: 'C1234567',
                message: 'Order has been created',
                orderId: 'ABC123456'
            });
            chai_1.expect(utils_2.objectCloneSimple(utils_1.objectRemoveProperty(message.request, 'requestId'))).to.eql({
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
    };
    MockBus.prototype.mockReceiveMessage = function (path, message) {
        this.messages.push(utils_1.objectClone({
            receive: true,
            path: path,
            message: message
        }));
        message = { content: JSON.stringify(message) };
        this.listeners.forEach(function (listener) {
            if (path === listener.path) {
                listener.busListener(message);
            }
        });
    };
    return MockBus;
}(bus_1.BusImpl));
var HttpMock = (function () {
    function HttpMock(callHandler) {
        this.callHandler = callHandler;
    }
    HttpMock.prototype.post = function (path, httpHandler) {
        this.httpHandler = httpHandler;
    };
    HttpMock.prototype.mockPost = function (body) {
        var _this = this;
        var req = {
            method: 'POST',
            body: body,
            header: function (value) {
                if (value === 'ds-correlation-id' || value === 'ds-source-system') {
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
            send: function (code, data) {
                _this.callHandler({
                    receive: false,
                    http: true,
                    code: code,
                    data: data
                });
            }
        });
    };
    return HttpMock;
}());
describe('ping-pong-template', function () {
    describe('in ASYNC communication mode, process can be started', function () {
        it('asynchronously', function (callback) {
            var bus = new MockBus(function () {
                // TODO need to find out where "original" comes from
                var res = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(bus.messages, 'id', 'time', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = utils_1.objectRemoveProperty(messagingScenario1, 'id', 'time');
                chai_1.expect(res).to.eql(exp);
                callback();
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(service_invoker_1.ServiceActionType.ASYNC));
            template.createEntryPoint(null, messages_1.HttpMethod.POST, '/');
            var request = new messages_1.GenericRequest('/', 'POST')
                .setData({
                orderId: 'ABC123456'
            })
                .setRespondTo('client.v1.Process');
            bus.mockReceiveMessage('common-nodejs.v1.Process', request);
        });
        it('synchronously', function (callback) {
            var bus = new MockBus(function () {
                // TODO need to find out where "original" comes from
                var res = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(bus.messages, 'id', 'time', 'correlationId', 'requestId', 'original'));
                var exp = utils_1.objectRemoveProperty(messagingScenario2, 'id', 'time', 'correlationId');
                chai_1.expect(res).to.eql(exp);
                callback();
            });
            var server = new HttpMock(function (message) {
                bus.messages.push(utils_1.objectClone(message));
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(service_invoker_1.ServiceActionType.ASYNC));
            template.createEntryPoint(server, messages_1.HttpMethod.POST, '/');
            server.mockPost({
                respondTo: 'client.v1.Process',
                data: {
                    orderId: 'ABC123456'
                }
            });
        });
    });
    describe('in SYNC communication mode, process can be started', function () {
        it('asynchronously', function (callback) {
            var bus = new MockBus(function () {
                // TODO need to find out where "original" comes from
                var res = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(bus.messages, 'id', 'time', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = utils_1.objectRemoveProperty(messagingScenario3, 'id', 'time');
                chai_1.expect(res).to.eql(exp);
                callback();
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(service_invoker_1.ServiceActionType.SYNC));
            template.createEntryPoint(null, messages_1.HttpMethod.POST, '/');
            var request = new messages_1.GenericRequest('/', 'POST')
                .setData({
                orderId: 'ABC123456'
            })
                .setRespondTo('client.v1.Process');
            bus.mockReceiveMessage('common-nodejs.v1.Process', request);
        });
        it('synchronously', function (callback) {
            var bus = new MockBus(function () {
                // TODO need to find out where "original" comes from
                var res = utils_2.objectCloneSimple(utils_1.objectRemoveProperty(bus.messages, 'id', 'time', 'correlationId', 'requestId', 'original', 'correlationId', 'sourceSystem'));
                var exp = utils_1.objectRemoveProperty(messagingScenario4, 'id', 'time', 'correlationId');
                chai_1.expect(res).to.eql(exp);
                callback();
            });
            var server = new HttpMock(function (message) {
                bus.messages.push(utils_1.objectClone(message));
            });
            var template = new MockPingPongTemplate(bus, new TestProcessFlow(service_invoker_1.ServiceActionType.SYNC));
            template.createEntryPoint(server, messages_1.HttpMethod.POST, '/');
            server.mockPost({
                respondTo: 'client.v1.Process',
                data: {
                    orderId: 'ABC123456'
                }
            });
        });
    });
});
//# sourceMappingURL=ping-pong-template.js.map