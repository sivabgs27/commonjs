/**
 * Created by andrey on 30/09/15.
 */

import { getFullServiceUrl, objectClone } from './utils'
import { HttpMethod, GenericRequest } from './messages'
import { getJsonClient, JsonClient } from './json-client'
import { Invoker, ContextCallback, InvocationContext } from './templates'
import { Bus, MessageDestination, MessageDestinationType, bus } from './bus'


export enum ServiceActionType {
    SYNC, // SYNC Rest invocation
    ASYNC, // ASYNC invocation through the bus (request, response messages)
    ASYNC_ISOLATED, // ASYNC invocation through the bus (request, response messages) - ensuring response is received by the same instance
    ASYNC_NOTIFY, // ASYNC invocation through the bus (request message only)
    HYBRID // SYNC Rest invocation with 202 confirmation and ASYNC response through the bus
}

export class ServiceAction {
    constructor(public service: string,
                public version: string,
                public type: ServiceActionType,
                public request: GenericRequest) {

    }

    getUrl() {
        return getFullServiceUrl(this.service + '/' + this.version);
    }
}

export class ServiceInvoker implements Invoker {
    invoke(context:InvocationContext, callback:ContextCallback) {
        var action: ServiceAction = context.invokerInput;
        var request: GenericRequest = action.request;

        if (action.type === ServiceActionType.ASYNC || action.type === ServiceActionType.ASYNC_ISOLATED || action.type === ServiceActionType.ASYNC_NOTIFY) {
            if (action.type === ServiceActionType.ASYNC || action.type === ServiceActionType.ASYNC_ISOLATED) {
                let responseDest = this.getResponseDestination(action.request);

                if (action.type === ServiceActionType.ASYNC_ISOLATED) {
                    responseDest.setRandomKey()
                }

                request.setRespondTo(responseDest.toPathString());
                this.listenForResponse(request, callback);
            }

            (<any>request).original = objectClone(context.input);
            this.getMessageBus().send(this.getMessageDestination(action), request);

            if (action.type === ServiceActionType.ASYNC_NOTIFY) {
                context.invokerInput = context.invokerInput.request;
                callback(context);
            }
        } else if (action.type === ServiceActionType.SYNC || action.type === ServiceActionType.HYBRID) {
            var resultHandler = (err, res, obj) => {
                this.handleResponseFromHttp(err, res, obj, context, action, callback);
            };

            if (action.type === ServiceActionType.HYBRID) {
                this.listenForResponse(request, callback);
            }



            let requestMethod = HttpMethod[request.method];
            let client = this.getJsonClient(action);
            let body;
            if (requestMethod === HttpMethod.POST || requestMethod === HttpMethod.PUT || requestMethod === HttpMethod.PATCH) {
                body = {
                    data: objectClone(request.data),
                    original: objectClone(context.input)
                };
            }

            switch (requestMethod) {
                case HttpMethod.GET:
                    client.get(resultHandler);
                    break;
                case HttpMethod.DELETE:
                    client.del(resultHandler);
                    break;
                case HttpMethod.POST:
                    client.post(body, resultHandler);
                    break;
                case HttpMethod.PUT:
                    client.put(body, resultHandler);
                    break;
                case HttpMethod.PATCH:
                    client.patch(body, resultHandler);
                    break;
            }
        }
    }

    getMessageDestination(action: ServiceAction): MessageDestination {
        return new MessageDestination(MessageDestinationType.Process)
            .setService(action.service)
            .setVersion(action.version)
            .setMethod(HttpMethod[action.request.method])
            .setPath(action.request.path);
    }

    getResponseDestination(request: GenericRequest): MessageDestination {
        return new MessageDestination(MessageDestinationType.Process)
            .setMethod(HttpMethod[request.method])
            .setPath(request.path);
    }

    listenForResponse(request: GenericRequest, callback: ContextCallback) {
        let messageBus = this.getMessageBus();


        messageBus.listenForResponse(this.getResponseDestination(request), message => {
            this.handleResponseFromBus(message, callback);
        });
    }

    handleResponseFromBus(message, callback: ContextCallback) {
        // recreate context from message
        var r: any = message.request;
        if (r.original) {
            r.original.setCorrelationId(r.original.correlationId);
        }

        var restoredContext = new InvocationContext(r.original || {});
        restoredContext.invokerInput = r;
        restoredContext.invokerOutput = message;
        callback(restoredContext);
    }

    handleResponseFromHttp(err, res, obj, context: InvocationContext, action: ServiceAction,
                           callback: ContextCallback) {
        if (err) {
            context.setCode(502).addError(1, 'Downstream error: ' + (err.message || err));
        }

        context.invokerOutput = obj || {};
        context.invokerOutput.code = res.statusCode;

        var actionReq = context.invokerInput.request;
        context.invokerInput = obj.request;
        context.invokerInput.method = context.invokerInput.method || actionReq.method;
        context.invokerInput.params = context.invokerInput.params || actionReq.params;
        context.invokerInput.path = context.invokerInput.path || actionReq.path;


        if (action.type === ServiceActionType.SYNC || !context.isValid()) {
            callback(context);
        }
    }

    getJsonClient(action: ServiceAction): JsonClient {
        var request: GenericRequest = action.request;
        return getJsonClient(action.getUrl(), request.path, request.params);
    }

    getMessageBus(): Bus {
        return bus;
    }

    getTargetSystem(): string {
        return;
    }

    getServiceCall(): string {
        return;
    }
}