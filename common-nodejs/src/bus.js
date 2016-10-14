/**
 * Created by andrey on 24/09/15.
 */
"use strict";
var crypto = require('crypto');
var utils_1 = require('./utils');
var messages_1 = require('./messages');
var service_info_1 = require('./service-info');
var asynch = require('async');
(function (MessageDestinationType) {
    MessageDestinationType[MessageDestinationType["Log"] = 0] = "Log";
    MessageDestinationType[MessageDestinationType["Error"] = 1] = "Error";
    MessageDestinationType[MessageDestinationType["Success"] = 2] = "Success";
    MessageDestinationType[MessageDestinationType["Process"] = 3] = "Process";
    MessageDestinationType[MessageDestinationType["Monitor"] = 4] = "Monitor";
})(exports.MessageDestinationType || (exports.MessageDestinationType = {}));
var MessageDestinationType = exports.MessageDestinationType;
var MessageDestination = (function () {
    function MessageDestination(type) {
        this.type = type;
        this.service = service_info_1.serviceInfo.name;
        this.version = 'v1';
        this.queueAndRoutingkeyList = service_info_1.serviceInfo.extras.queueAndRoutingkeyList || '';
    }
    MessageDestination.prototype.setType = function (type) {
        this.type = type;
        return this;
    };
    MessageDestination.prototype.setService = function (service) {
        this.service = service;
        return this;
    };
    MessageDestination.prototype.setlistenFromQueue = function (queueAndRoutingkeyList) {
        this.queueAndRoutingkeyList = queueAndRoutingkeyList;
        return this;
    };
    MessageDestination.prototype.setRandomKey = function (processQueue) {
        this.randomKey = processQueue || service_info_1.serviceInfo.id || crypto.createHash('md5').update(Date.now().toString()).digest('hex').substr(0, 7);
        return this;
    };
    MessageDestination.prototype.setVersion = function (version) {
        this.version = version;
        return this;
    };
    MessageDestination.prototype.setPath = function (path) {
        this.path = path;
        return this;
    };
    MessageDestination.prototype.setMethod = function (method) {
        this.method = method;
        return this;
    };
    MessageDestination.prototype.clone = function () {
        var from = this, to = new MessageDestination(this.type);
        return utils_1.objectAddEachProperty(from, to);
    };
    MessageDestination.prototype.toPathString = function () {
        var path = [this.service, this.version, MessageDestinationType[this.type]];
        if (this.randomKey) {
            path.push(this.randomKey);
        }
        return path.join('.');
    };
    MessageDestination.prototype.toRouteObject = function () {
        return {
            path: this.path,
            method: this.method
        };
    };
    MessageDestination.prototype.addrandomkey = function (key) {
        var path = [key];
        if (this.randomKey) {
            path.push(this.randomKey);
        }
        return path.join('.');
    };
    return MessageDestination;
}());
exports.MessageDestination = MessageDestination;
var exchange = 'amq.topic';
var apiVersion = 'v' + service_info_1.serviceInfo.apiVersion;
var processQueue = new MessageDestination(MessageDestinationType.Process).setVersion(apiVersion).toPathString();
var processQueueExclusive = new MessageDestination(MessageDestinationType.Process).setVersion(apiVersion).setRandomKey().toPathString();
var processQueueList = new MessageDestination(MessageDestinationType.Process).queueAndRoutingkeyList;
function createMonitorQueueName() {
    var newKey = crypto.createHash('md5').update(service_info_1.serviceInfo.id + Date.now()).digest('hex').substr(0, 7);
    return new MessageDestination(MessageDestinationType.Monitor).setRandomKey(newKey).toPathString();
}
var BusImpl = (function () {
    function BusImpl() {
        this.busListeners = {};
        this.messageHandlers = {};
        this.subscribedToProcess = false;
        this.busChannel = this.getServiceBus();
    }
    BusImpl.prototype.listenForRequest = function (route, handler) {
        this._initDefaultSubscriptions();
        this.listen(handler, route, true);
    };
    BusImpl.prototype.listenForResponse = function (route, handler) {
        this._initDefaultSubscriptions();
        this.listen(handler, route, false);
    };
    BusImpl.prototype.listenForAny = function (route, handler) {
        this._initDefaultSubscriptions();
        this.listen(handler);
    };
    BusImpl.prototype.subscribe = function (path, handler) {
        this._subscribe(path, createMonitorQueueName(), true, handler);
    };
    BusImpl.prototype._initDefaultSubscriptions = function () {
        var _this = this;
        // create default bus listener for current service
        if (!this.subscribedToProcess && this.busChannel) {
            var messageHandler = function (msg) {
                var content = msg.content.toString();
                var message = {};
                try {
                    message = JSON.parse(content);
                }
                catch (e) { }
                var isRequest = !message.request, method, path;
                if (isRequest) {
                    path = message.path;
                    method = messages_1.HttpMethod[message.method];
                }
                else if (message.request) {
                    path = message.request.path;
                    method = messages_1.HttpMethod[message.request.method];
                }
                var key = [path, method, isRequest].join('.');
                if (_this.messageHandlers[key]) {
                    _this.messageHandlers[key](message);
                }
                if (_this.messageHandlers['*']) {
                    _this.messageHandlers['*'](message);
                }
            };
            if (!service_info_1.serviceInfo.extras.configureCustomListner) {
                this._subscribe(processQueue, processQueue, false, messageHandler);
                this._subscribe(processQueueExclusive, processQueueExclusive, true, messageHandler);
            }
            else {
                this._subscribeCustomQueue(processQueueList, false, messageHandler);
                this._subscribeCustomQueue(processQueueList, true, messageHandler);
            }
            this.subscribedToProcess = true;
        }
    };
    BusImpl.prototype._subscribe = function (path, queueName, exclusive, messageHandler) {
        var _this = this;
        if (!this.busChannel) {
            return;
        }
        var options = exclusive ? { exclusive: true } : { durable: true };
        this.busChannel.assertQueue(queueName, options, function (err) {
            if (!err) {
                _this.busChannel.bindQueue(queueName, exchange, path);
                _this.busChannel.consume(queueName, messageHandler, { noAck: true });
            }
        });
    };
    BusImpl.prototype._subscribeCustomQueue = function (processQueueList, exclusive, messageHandler) {
        var _this = this;
        if (!this.busChannel) {
            return;
        }
        var options = exclusive ? { exclusive: true } : { durable: true };
        asynch.each(processQueueList, function (processQueue, callback) {
            var index = 0;
            if (!processQueue.queue || processQueue.queue === '') {
                throw new Error('queue name cant be empty in custom configuration');
            }
            var queueName = exclusive ? new MessageDestination(MessageDestinationType.Process).setRandomKey().addrandomkey(processQueue.queue) : processQueue.queue;
            var routingkeysArr = processQueue.routingKeys;
            _this.busChannel.assertQueue(queueName, options, function (err) {
                if (!err) {
                    for (var i = 0, len = routingkeysArr.length; i < len; i++) {
                        if (!routingkeysArr[i] || routingkeysArr[i] == '') {
                            throw new Error('Routing key cant be empty in custom configuration');
                        }
                        var routekey = exclusive ? new MessageDestination(MessageDestinationType.Process).setRandomKey().addrandomkey((routingkeysArr[i])) : routingkeysArr[i];
                        _this.busChannel.bindQueue(queueName, exchange, routekey);
                    }
                    _this.busChannel.consume(queueName, messageHandler, { noAck: true });
                }
                index++;
                callback();
            });
        });
    };
    BusImpl.prototype.listen = function (handler, route, isRequest) {
        if (!this.busChannel) {
            return;
        }
        var listenerKey = '*';
        if (route) {
            listenerKey = route.path + '.' + route.method;
        }
        if (isRequest !== undefined) {
            listenerKey += '.' + isRequest;
        }
        this.messageHandlers[listenerKey] = handler;
    };
    BusImpl.prototype.send = function (dest, message) {
        this.sendToPath(dest.toPathString(), message);
    };
    BusImpl.prototype.sendToPath = function (path, message) {
        if (!this.busChannel) {
            return;
        }
        this.busChannel.publish(exchange, path, new Buffer(JSON.stringify(message)), { persistent: true });
    };
    BusImpl.prototype.getServiceBus = function () {
        if (!service_info_1.serviceInfo.busDisabled && !service_info_1.isParentProcess) {
            var amqp_1 = require('amqplib/callback_api');
            var deasync = require('deasync');
            var createBusDelegate = deasync(function (callback) {
                amqp_1.connect(service_info_1.serviceInfo.busUrl + '?heartbeat=30', function (err, conn) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        conn.createChannel(function (err, ch) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                ch.assertExchange(exchange, 'topic', { durable: true });
                                callback(null, ch);
                            }
                        });
                    }
                });
            });
            return createBusDelegate();
        }
    };
    return BusImpl;
}());
exports.BusImpl = BusImpl;
exports.bus = new BusImpl();
//# sourceMappingURL=bus.js.map