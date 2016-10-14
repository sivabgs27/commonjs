/**
 * Service invoker for LDAP operations
 *
 * Created by d393961 on 27/08/2015.
 */

import ldap = require('ldapjs');
import { Invoker, InvocationContext, ContextCallback } from './templates'
var fs = require('fs');

export enum LdapModifyActionChangeType {
    replace, add, delete
}

export enum LdapSearchActionOptionsScope {
    base, one, sub
}

export class LdapSearchActionOptions {
    constructor(
        public filter: string,
        public scope: LdapSearchActionOptionsScope = LdapSearchActionOptionsScope.base,
        public attributes: string[] = [],
        public attrsOnly: boolean = false,
        public sizeLimit: number = 0,
        public timeLimit: number = 10){}

    toClientOptions() {
        return {
            filter: this.filter,
            scope: LdapSearchActionOptionsScope[this.scope],
            attributes: this.attributes,
            attrsOnly: this.attrsOnly,
            sizeLimit: this.sizeLimit,
            timeLimit: this.timeLimit
        };
    }
}

export class LdapModifyActionChange {
    constructor(public operation: LdapModifyActionChangeType,
                public data: any){}

    toClientChange() {
        return new ldap.Change({
            operation: LdapModifyActionChangeType[this.operation],
            modification: this.data
        });
    }
}

export class LdapAction {
    constructor(public dn: string) {
    }

    execute(client: any, context: InvocationContext, callback: ContextCallback, targetSystem?: string){
    }

    createResultHandler(context: InvocationContext, callback: ContextCallback) {
        return (err, res) => {
            this.handleResult(context, err, res);
            callback(context);
        };
    }

    handleResult(context, err, res) {
        if (err) {
            context.setCode(502).addError(1, 'LDAP Downstream service error: ' + (err.message || err));
        } else {
            context.invokerOutput = res;
        }
    }
}

export class LdapAddAction extends LdapAction {
    constructor(dn: string, public entry: any){
        super(dn);
    }

    execute(client: any, context: InvocationContext, callback: ContextCallback, targetSystem?: string){
        client.add(this.dn, this.entry, this.createResultHandler(context, callback));
    }
}

export class LdapDeleteAction extends LdapAction {
    constructor(dn: string){
        super(dn);
    }

    execute(client: any, context: InvocationContext, callback: ContextCallback, targetSystem?: string){
        client.del(this.dn, this.createResultHandler(context, callback));
    }
}

export class LdapModifyAction extends LdapAction {
    changes: LdapModifyActionChange[];

    constructor(dn: string, ...changes: LdapModifyActionChange[]){
        super(dn);
        this.changes = changes;
    }

    execute(client: any, context: InvocationContext, callback: ContextCallback, targetSystem?: string){
        client.modify(this.dn,
            this.changes.map( (change: LdapModifyActionChange) => { return change.toClientChange() } ),
            this.createResultHandler(context, callback));
    }
}

export class LdapSearchAction extends LdapAction {
    constructor(dn: string, public options?: LdapSearchActionOptions){
        super(dn);
    }

    execute(client: any, context: InvocationContext, callback: ContextCallback, targetSystem?: string){
        if (null == client || !client._socket || !client.connected) {
            context.setCode(500).addError(101, 'LDAP Downstream service error: ');
            callback(context);
        }
        client.search(this.dn, this.options ? this.options.toClientOptions() : {}, this.createResultHandler(context, () => {
            var res = context.invokerOutput;
            var entries = context.invokerOutput = [];

            res.on('searchEntry', entry => {
                entries.push(entry.object);
            });

            var errorSent;
            res.on('error', err => {
                errorSent = true;
                this.handleResult(context, err, null);
                callback(context);
            });

            res.on('end', result => {
                entries.push(result);
                this.handleResult(context, null, entries);
                callback(context);
            });
        }));
    }
}

export class LdapInvoker implements Invoker {
    client;
    targetSystem: string;
    tlsOptions;
    strictDN = true;
    keyRead;
    certificate;
    pfx;
    bindCredentials;
    urls;
    bindDNs;
    extraOptions;
    constructor(public url: string, bindDN: string, bindCredential: string, options: any,targetSystem?: string) {


        if(typeof(options.strictDN) === "boolean"){
            this.strictDN = options.strictDN;
        }
        if(options.key){
            this.keyRead =  fs.readFileSync(options.key);
        }
        if(options.pfx){
            this.pfx =  fs.readFileSync(options.pfx);
        }
        if(options.cert){
            this.certificate =  fs.readFileSync(options.cert);
        }
        this.tlsOptions = {
            key: this.keyRead,
            pfx: this.pfx,
            passphrase: options.passphrase,
            cert: this.certificate,
            rejectUnauthorized: options.rejectUnauthorized
        };
        this.urls = url;
        this.bindCredentials = bindCredential;
        this.bindDNs = bindDN;
        this.extraOptions = options;

        this.client = this.createClient();
        this.targetSystem = targetSystem;
    }


    createClient(){
    var client = ldap.createClient({
        url: this.urls,
        bindDN: this.bindDNs,
        bindCredentials: this.bindCredentials,
        strictDN: this.strictDN,
        tlsOptions: this.tlsOptions,
        reconnect: this.extraOptions.reconnect,
        connectTimeout: this.extraOptions.connectTimeout,
        timeout: this.extraOptions.timeout,
        idleTimeout: this.extraOptions.idleTimeout
    }).on('error', function (e) {
        // Error creating client which will be retried on first request and alarm will be triggered
        client = null;
    });
    return client;

}
    invoke(context: InvocationContext, callback: ContextCallback) {
        var action: LdapAction = context.invokerInput;
        if(null == this.client || !this.client.connected){
            this.client = this.createClient();
        }
        if (!action) {
            throw new Error('LdapAction object must be passed in "context.payload"');
        }

        action.execute(this.client, context, callback, this.targetSystem);
    }

    getTargetSystem(): string {
        return this.targetSystem;
    }

    getServiceCall(): string {
        return;
    }
}

