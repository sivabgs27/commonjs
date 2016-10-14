/**
 * Created by cam on 25/01/16.
 */

import { getMongoDatabaseClient, MongoDatabaseClient } from './mongo-database-client';
import { HttpMethod } from './messages'
import { Invoker, ContextCallback, InvocationContext } from './templates'

export class MongoAction {
    constructor(public method: HttpMethod, public body: any = {}, public path: string = '', public headers?: any){}

    setBody(body: any): MongoAction {
        this.body = body;
        return this;
    }

    setPath(path: string): MongoAction {
        this.path = path;
        return this;
    }

    setHeaders(headers: any): MongoAction {
        this.headers = headers;
        return this;
    }
}

export class MongoInvoker implements Invoker {
    targetSystem: string;
    serviceCall: string;

    constructor(public url: string) {
    }

    invoke(context: InvocationContext, callback: ContextCallback) {
        var mongoAction: MongoAction = context.invokerInput;

        this.serviceCall = this.url;

        var resultHandler = (err, res, obj) => {
            if (err) {
                context.setCode(502).addError(1, 'MongoDB Downstream service error: ' + (err.message || err));
            } else {
                context.invokerOutput = {
                    code: res.statusCode,
                    result: res,
                    body: obj
                };
            }

            callback(context);
        };

        var fullUrl = getMongoDatabaseClient(this.url, mongoAction.path);
        switch (mongoAction.method) {
            case HttpMethod.GET:
                new MongoDatabaseClient(fullUrl).get(mongoAction.body, resultHandler);
                break;
            case HttpMethod.POST:
                new MongoDatabaseClient(fullUrl).post(mongoAction.body, resultHandler);
                break;
            case HttpMethod.PUT:
                new MongoDatabaseClient(fullUrl).put(mongoAction.body, resultHandler);
                break;
            case HttpMethod.DELETE:
                new MongoDatabaseClient(fullUrl).del(mongoAction.body, resultHandler);
                break;
        }
    }

    setTargetSystem(targetSystem: string) {
        this.targetSystem = targetSystem;
    }

    getTargetSystem(): string {
        return this.targetSystem;
    }

    getServiceCall(): string {
        return this.serviceCall;
    }
}

