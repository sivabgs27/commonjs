/**
 * Created by andrey on 22/09/15.
 */


import { HttpMethod } from './messages'
import { getJsonClient, JsonClientEncoding } from './json-client'
import { Invoker, ContextCallback, InvocationContext } from './templates'
import { SslConfig, SslConfigEtcdImpl, InvokerSSLSecurityConfig } from "./ssl-config";
import { serviceInfo } from "./service-info";
import { log } from './logger';

export class JsonAction {
    encoding: JsonClientEncoding = JsonClientEncoding.JSON;

    constructor(public method: HttpMethod, public body: any = {}, public path: string = '', public headers?: any){}

    setBody(body: any): JsonAction {
        this.body = body;
        return this;
    }

    setPath(path: string): JsonAction {
        this.path = path;
        return this;
    }

    setHeaders(headers: any): JsonAction {
        this.headers = headers;
        return this;
    }

    setEncoding(encoding: any): JsonAction {
        this.encoding = encoding;
        return this;
    }
}

export class JsonInvoker implements Invoker {
    targetSystem: string;
    serviceCall: string;
    
    sslSecurityConfig: InvokerSSLSecurityConfig;

    constructor(public url: string, public proxy?: string) {
        if (serviceInfo.downstreamCertificate) {
            let sslConfig:SslConfig;
            sslConfig = new SslConfigEtcdImpl(serviceInfo.downstreamCertificate);
            // This is very a unOO short cut.  The SsslConfig has all the properties of the
            // sslSecurityConfig and the wsSecurity object so it can be directly assigned to both.
            // In a strongly types language this would not be possible.
            if (sslConfig.ca || sslConfig.cert || sslConfig.key ) {
                log.debug('Setting the sslSecurityConfig object to', sslConfig);
                this.sslSecurityConfig = sslConfig;
            }
        }
    }

    invoke(context: InvocationContext, callback: ContextCallback) {
        var jsonAction: JsonAction = context.invokerInput;

        this.serviceCall = this.url;

        var resultHandler = (err, res, obj) => {
            if (err) {
                context.setCode(502).addError(1, 'Downstream service error: ' + (err.message || err));
            } else {
                context.invokerOutput = {
                    code: res.statusCode,
                    body: obj
                };
            }

            callback(context);
        };

        var options: any = {};

	    if (this.sslSecurityConfig) {
	        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	        options = {
	            ca:   this.sslSecurityConfig.ca,
		        key:  this.sslSecurityConfig.key,
		        cert: this.sslSecurityConfig.cert
	        };
	    }

        if (this.proxy) {
            options.proxy = this.proxy;
        }

        var client = getJsonClient(this.url, jsonAction.path, {}, options);

        client.encoding = jsonAction.encoding;

        if (jsonAction.headers) {
            client.headers = jsonAction.headers;
        } else {
            client.headers = null;
        }

        switch (jsonAction.method) {
            case HttpMethod.GET:
                client.get(resultHandler);
                break;
            case HttpMethod.POST:
                client.post(jsonAction.body, resultHandler);
                break;
            case HttpMethod.PUT:
                client.put(jsonAction.body, resultHandler);
                break;
            case HttpMethod.DELETE:
                client.del(resultHandler);
                break;
            case HttpMethod.PATCH:
                client.patch(jsonAction.body, resultHandler);
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

