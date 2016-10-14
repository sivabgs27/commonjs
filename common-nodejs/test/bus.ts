/**
 * Created by andrey on 2/10/15.
 */

import chai = require('chai');
var expect = chai.expect;

import { serviceInfo } from '../src/service-info'
serviceInfo.update({ standalone: true, forever: false, busDisabled: true });

import { objectClone, objectRemoveProperty } from '../src/utils'
import { HttpMethod, GenericRequest } from '../src/messages'
import { BusImpl, MessageDestination, MessageDestinationType } from '../src/bus'
import {objectCloneSimple} from "../src/utils";

class BusMock extends BusImpl {
    listeners;

    getServiceBus():any {
        return this;
    }

    assertQueue(queueName, options, callback) {
        callback()
    }

    bindQueue(queueName, exchange, path) {
    }

    consume(path, listener) {
        this.listeners = {};
        this.listeners[path] = listener;
    }


    _subscribe(path:string, queueName:string, exclusive:boolean, messageHandler:{(message:any)}) {
        if (path === 'common-nodejs.v1.Process') {
            return super._subscribe(path, queueName, exclusive, messageHandler);
        }
    }

    publish(exchange, path, message) {
        var listener = this.listeners[path];
        message = { content: message };
        listener(message);
    }
}

describe('Bus', function () {
    describe('local message routing', function () {
        it('routes messages using route object', function (callback) {
            var bus = new BusMock();

            var events = [];
            var dest1 = new MessageDestination(MessageDestinationType.Process)
                .setService('common-nodejs')
                .setMethod(HttpMethod.POST)
                .setPath('/api/path1');
            bus.listenForRequest(dest1, (message:GenericRequest) => {
                events.push({
                    listener: 1,
                    message: message
                });
            });

            var dest2 = new MessageDestination(MessageDestinationType.Process)
                .setService('common-nodejs')
                .setMethod(HttpMethod.POST)
                .setPath('/api/path2');
            bus.listenForRequest(dest2, (message:GenericRequest) => {
                events.push({
                    listener: 2,
                    message: message
                });
            });

            var message1 = new GenericRequest('/api/path1', 'POST')
                .setCorrelationId('123456')
                .setData({field1: 'value1'})
                .setParams({param1: 1})
                .setRespondTo('client-service.v1');
            bus.send(dest1, message1);
            bus.send(dest1, message1.setMethod('GET'));

            var message2 = new GenericRequest('/api/path2', 'POST')
                .setCorrelationId('123456')
                .setData({field1: 'value1'})
                .setParams({param1: 1})
                .setRespondTo('client-service.v1');
            bus.send(dest2, message2);

            expect(objectCloneSimple(objectRemoveProperty(events, 'requestId'))).to.eql(
                [{
                    listener: 1,
                    message: {
                        params: {param1: 1},
                        data: {field1: 'value1'},
                        path: '/api/path1',
                        method: 'POST',
                        correlationId: '123456',
                        respondTo: 'client-service.v1'
                    }
                },
                    {
                        listener: 2,
                        message: {
                            params: {param1: 1},
                            data: {field1: 'value1'},
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
