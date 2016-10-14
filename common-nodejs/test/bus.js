/**
 * Created by andrey on 2/10/15.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai = require('chai');
var expect = chai.expect;
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: true });
var utils_1 = require('../src/utils');
var messages_1 = require('../src/messages');
var bus_1 = require('../src/bus');
var utils_2 = require("../src/utils");
var BusMock = (function (_super) {
    __extends(BusMock, _super);
    function BusMock() {
        _super.apply(this, arguments);
    }
    BusMock.prototype.getServiceBus = function () {
        return this;
    };
    BusMock.prototype.assertQueue = function (queueName, options, callback) {
        callback();
    };
    BusMock.prototype.bindQueue = function (queueName, exchange, path) {
    };
    BusMock.prototype.consume = function (path, listener) {
        this.listeners = {};
        this.listeners[path] = listener;
    };
    BusMock.prototype._subscribe = function (path, queueName, exclusive, messageHandler) {
        if (path === 'common-nodejs.v1.Process') {
            return _super.prototype._subscribe.call(this, path, queueName, exclusive, messageHandler);
        }
    };
    BusMock.prototype.publish = function (exchange, path, message) {
        var listener = this.listeners[path];
        message = { content: message };
        listener(message);
    };
    return BusMock;
}(bus_1.BusImpl));
describe('Bus', function () {
    describe('local message routing', function () {
        it('routes messages using route object', function (callback) {
            var bus = new BusMock();
            var events = [];
            var dest1 = new bus_1.MessageDestination(bus_1.MessageDestinationType.Process)
                .setService('common-nodejs')
                .setMethod(messages_1.HttpMethod.POST)
                .setPath('/api/path1');
            bus.listenForRequest(dest1, function (message) {
                events.push({
                    listener: 1,
                    message: message
                });
            });
            var dest2 = new bus_1.MessageDestination(bus_1.MessageDestinationType.Process)
                .setService('common-nodejs')
                .setMethod(messages_1.HttpMethod.POST)
                .setPath('/api/path2');
            bus.listenForRequest(dest2, function (message) {
                events.push({
                    listener: 2,
                    message: message
                });
            });
            var message1 = new messages_1.GenericRequest('/api/path1', 'POST')
                .setCorrelationId('123456')
                .setData({ field1: 'value1' })
                .setParams({ param1: 1 })
                .setRespondTo('client-service.v1');
            bus.send(dest1, message1);
            bus.send(dest1, message1.setMethod('GET'));
            var message2 = new messages_1.GenericRequest('/api/path2', 'POST')
                .setCorrelationId('123456')
                .setData({ field1: 'value1' })
                .setParams({ param1: 1 })
                .setRespondTo('client-service.v1');
            bus.send(dest2, message2);
            expect(utils_2.objectCloneSimple(utils_1.objectRemoveProperty(events, 'requestId'))).to.eql([{
                    listener: 1,
                    message: {
                        params: { param1: 1 },
                        data: { field1: 'value1' },
                        path: '/api/path1',
                        method: 'POST',
                        correlationId: '123456',
                        respondTo: 'client-service.v1'
                    }
                },
                {
                    listener: 2,
                    message: {
                        params: { param1: 1 },
                        data: { field1: 'value1' },
                        path: '/api/path2',
                        method: 'POST',
                        correlationId: '123456',
                        respondTo: 'client-service.v1'
                    }
                }]);
            callback();
        });
    });
});
//# sourceMappingURL=bus.js.map