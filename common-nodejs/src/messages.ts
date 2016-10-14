/**
 * Created by andrey on 28/09/15.
 */


import { createUuid } from './utils'

export enum HttpMethod { GET, POST, PUT, DELETE, PATCH }

export class ErrorDetails {
    code: number;
    message: string;
    field: string;

    constructor(code: number, message: string, field?: string){
        this.code = code;
        this.message = message;
        this.field = field;
    }
}

export class GenericRequest {
    path: string;
    method: string;
    params: any = {};
    data: any = {};
    requestId: string;
    correlationId: string;
    respondTo: string;
    sourceSystem: string;

    constructor(path: string, method: string){
        this.path = path;
        this.method = method;
        this.requestId = createUuid();
    }

    setPath(path: string): GenericRequest {
        this.path = path;
        return this;
    }

    setMethod(method: string): GenericRequest {
        this.method = method;
        return this;
    }

    setParams(params: any): GenericRequest {
        this.params = params;
        return this;
    }

    setData(data: any): GenericRequest {
        this.data = data;
        return this;
    }

    setCorrelationId(correlationId: string): GenericRequest {
        this.correlationId = correlationId || createUuid();
        return this;
    }

    setRespondTo(respondTo: string): GenericRequest {
        this.respondTo = respondTo;
        return this;
    }

    setSourceSystem(sourceSystem: string): GenericRequest {
        this.sourceSystem = sourceSystem;
        return this;
    }
}

export class GenericResponse {
    code: number;
    time: Date | string;
    correlationId: string;
    data: any;
    request: GenericRequest;
    errors: ErrorDetails[];
    message: string;
    status: number;

    constructor(code: number = 200) {
        this.code = code;
        this.status = code;
        this.time = new Date();
    }

    setData(data: any): GenericResponse {
        this.data = data;
        return this;
    }

    setCorrelationId(correlationId: string): GenericResponse {
        this.correlationId = correlationId || createUuid();
        return this;
    }
}
