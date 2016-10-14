/**
 * Created by andrey on 24/09/15.
 */

import crypto = require('crypto');
import { objectAddEachProperty } from './utils'
import { HttpMethod, GenericRequest, GenericResponse } from './messages'
import { serviceInfo, isParentProcess } from './service-info'
import asynch = require('async');

export enum MessageDestinationType {
    Log, Error, Success, Process, Monitor
}

export interface MessageRoute {
    method: HttpMethod;
    path: string;
}

export class MessageDestination {
    service: string = serviceInfo.name;
    version: string = 'v1';
    method: HttpMethod;
    path: string;
    randomKey: string;
    queueAndRoutingkeyList: string = serviceInfo.extras.queueAndRoutingkeyList || '';   
    
    constructor(public type: MessageDestinationType) {}

    setType(type: MessageDestinationType): MessageDestination {
        this.type = type;
        return this;
    }

    setService(service: string): MessageDestination {
        this.service = service;
        return this;
    }
    
    setlistenFromQueue(queueAndRoutingkeyList: any): MessageDestination {
        this.queueAndRoutingkeyList = queueAndRoutingkeyList;
        return this;
    }

    setRandomKey(processQueue?: string): MessageDestination {
        this.randomKey = processQueue || serviceInfo.id || crypto.createHash('md5').update(Date.now().toString()).digest('hex').substr(0, 7);
        return this;
    }

    setVersion(version: string): MessageDestination {
        this.version = version;
        return this;
    }

    setPath(path: string): MessageDestination {
        this.path = path;
        return this;
    }

    setMethod(method: HttpMethod): MessageDestination {
        this.method = method;
        return this;
    }

    clone(): MessageDestination {
        var from = this, to = new MessageDestination(this.type);
        return objectAddEachProperty(from, to);
    }

    toPathString(): string {
        var path = [this.service, this.version, MessageDestinationType[this.type]];
        if (this.randomKey) {
            path.push(this.randomKey);
        }
        return path.join('.');
    }

    toRouteObject(): MessageRoute {
        return {
            path: this.path,
            method: this.method
        }
    }
    
    addrandomkey(key: string): string {
          var path = [key];
                if (this.randomKey) {
                    path.push(this.randomKey);
                }
                return path.join('.');
    }
}

export interface RequestHandler {
    (requestMessage: GenericRequest);
}

export interface ResponseHandler {
    (responseMessage: GenericResponse);
}

export interface Bus {
    listenForRequest(dest: MessageRoute, handler: RequestHandler);
    listenForResponse(dest: MessageRoute, handler: ResponseHandler);
    listenForAny(dest: MessageRoute, handler: ResponseHandler);
    subscribe(path: string, handler: { (message: any) });
    send(dest: MessageDestination, message: any);
    sendToPath(path: string, message: any);
    getServiceBus(): any;
}

let exchange = 'amq.topic';
let apiVersion = 'v' + serviceInfo.apiVersion;
let processQueue = new MessageDestination(MessageDestinationType.Process).setVersion(apiVersion).toPathString();
let processQueueExclusive = new MessageDestination(MessageDestinationType.Process).setVersion(apiVersion).setRandomKey().toPathString();
let processQueueList = new MessageDestination(MessageDestinationType.Process).queueAndRoutingkeyList;

function createMonitorQueueName() {
    let newKey = crypto.createHash('md5').update(serviceInfo.id + Date.now()).digest('hex').substr(0, 7);
    return new MessageDestination(MessageDestinationType.Monitor).setRandomKey(newKey).toPathString();
}

export class BusImpl implements Bus {
    busChannel;
    busListeners = {};
    messageHandlers = {};

    subscribedToProcess = false;

    constructor() {
        this.busChannel = this.getServiceBus();
    }

    listenForRequest(route: MessageRoute, handler: RequestHandler)  {
        this._initDefaultSubscriptions();
        this.listen(handler, route, true);
    }

    listenForResponse(route: MessageRoute, handler: ResponseHandler) {
        this._initDefaultSubscriptions();
        this.listen(handler, route, false);
    }

    listenForAny(route: MessageRoute, handler: ResponseHandler) {
        this._initDefaultSubscriptions();
        this.listen(handler);
    }

    subscribe(path: string, handler: { (message: any) }) {
        this._subscribe(path, createMonitorQueueName(), true, handler);
    }

    _initDefaultSubscriptions() {
        // create default bus listener for current service
        if (!this.subscribedToProcess && this.busChannel) {
            let messageHandler = msg => {
                let content = msg.content.toString();
                let message: any = {};
                try {
                    message = JSON.parse(content);
                } catch(e) {}

                let isRequest = !message.request, method, path;
                if (isRequest) {
                    path = message.path;
                    method = HttpMethod[message.method];
                } else if (message.request) {
                    path = message.request.path;
                    method = HttpMethod[message.request.method];
                }

                let key = [path, method, isRequest].join('.');

                if (this.messageHandlers[key]) {
                    this.messageHandlers[key](message);
                }

                if (this.messageHandlers['*']) {
                    this.messageHandlers['*'](message);
                }

            };
            if (!serviceInfo.extras.configureCustomListner){
                    this._subscribe(processQueue, processQueue, false, messageHandler);
                    this._subscribe(processQueueExclusive, processQueueExclusive, true, messageHandler);
            }else {

                    this._subscribeCustomQueue(processQueueList, false, messageHandler);
                    this._subscribeCustomQueue(processQueueList, true, messageHandler);
            }
            this.subscribedToProcess = true;
        }
    }

    _subscribe(path: string, queueName: string, exclusive: boolean, messageHandler: { (message: any) }) {
        if (!this.busChannel) {
            return;
        }

        let options = exclusive ? { exclusive: true } : { durable: true };
        this.busChannel.assertQueue(queueName, options, (err) => {
            if (!err) {
                this.busChannel.bindQueue(queueName, exchange, path);
                this.busChannel.consume(queueName, messageHandler, { noAck: true });
            }
        });
    }
    
     _subscribeCustomQueue(processQueueList : any, exclusive: boolean, messageHandler: { (message: any) }) {
         let _this = this;
        if (!this.busChannel) {
            return;
        }
        
        var options = exclusive ? { exclusive: true } : { durable: true };
        
         asynch.each(processQueueList,

          function(processQueue, callback){
            var index =0;
			if(!(<any>processQueue).queue || (<any>processQueue).queue==='') {
                throw new Error('queue name cant be empty in custom configuration');
            }

			
            var queueName = exclusive ? new MessageDestination(MessageDestinationType.Process).setRandomKey().addrandomkey((<any>processQueue).queue) : (<any>processQueue).queue ;

            var routingkeysArr = (<any>processQueue).routingKeys;
            _this.busChannel.assertQueue(queueName, options, function (err) {
                if (!err) {
                    for (var i = 0, len = routingkeysArr.length; i < len; i++) {
						
					if(!routingkeysArr[i] || routingkeysArr[i]=='') {
                       throw new Error('Routing key cant be empty in custom configuration');
                    }

						
                        var routekey = exclusive ? new MessageDestination(MessageDestinationType.Process).setRandomKey().addrandomkey((routingkeysArr[i])) : routingkeysArr[i]  ;
                        _this.busChannel.bindQueue(queueName, exchange, routekey);
                       
                    }
                     _this.busChannel.consume(queueName, messageHandler, { noAck: true });
                }
                index++;
                callback();
            });
          });
    }

    listen(handler: any, route?: MessageRoute, isRequest?: boolean) {
        if (!this.busChannel) {
            return;
        }

        let listenerKey = '*';
        if (route) {
            listenerKey = route.path + '.' + route.method
        }

        if (isRequest !== undefined) {
            listenerKey += '.' + isRequest;
        }

        this.messageHandlers[listenerKey] = handler;
    }

    send(dest: MessageDestination, message: any) {
        this.sendToPath(dest.toPathString(), message);
    }

    sendToPath(path: string, message: any) {
        if (!this.busChannel) {
            return;
        }

        this.busChannel.publish(exchange, path, new Buffer(JSON.stringify(message)), { persistent: true });
    }

    getServiceBus(): any {
        if (!serviceInfo.busDisabled && !isParentProcess) {
            let amqp = require('amqplib/callback_api');
            let deasync = require('deasync');
            let createBusDelegate = deasync(callback => {
                amqp.connect(serviceInfo.busUrl + '?heartbeat=30', (err, conn) => {
                    if (err) {
                        callback(err);
                    } else {
                        conn.createChannel((err, ch) => {
                            if (err) {
                                callback(err);
                            } else {
                                ch.assertExchange(exchange, 'topic', { durable: true });
                                callback(null, ch)
                            }
                        });
                    }
                });
            });

            return createBusDelegate();
        }
    }
}

export var bus: Bus = new BusImpl();