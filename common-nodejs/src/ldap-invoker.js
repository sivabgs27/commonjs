/**
 * Service invoker for LDAP operations
 *
 * Created by d393961 on 27/08/2015.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ldap = require('ldapjs');
var fs = require('fs');
(function (LdapModifyActionChangeType) {
    LdapModifyActionChangeType[LdapModifyActionChangeType["replace"] = 0] = "replace";
    LdapModifyActionChangeType[LdapModifyActionChangeType["add"] = 1] = "add";
    LdapModifyActionChangeType[LdapModifyActionChangeType["delete"] = 2] = "delete";
})(exports.LdapModifyActionChangeType || (exports.LdapModifyActionChangeType = {}));
var LdapModifyActionChangeType = exports.LdapModifyActionChangeType;
(function (LdapSearchActionOptionsScope) {
    LdapSearchActionOptionsScope[LdapSearchActionOptionsScope["base"] = 0] = "base";
    LdapSearchActionOptionsScope[LdapSearchActionOptionsScope["one"] = 1] = "one";
    LdapSearchActionOptionsScope[LdapSearchActionOptionsScope["sub"] = 2] = "sub";
})(exports.LdapSearchActionOptionsScope || (exports.LdapSearchActionOptionsScope = {}));
var LdapSearchActionOptionsScope = exports.LdapSearchActionOptionsScope;
var LdapSearchActionOptions = (function () {
    function LdapSearchActionOptions(filter, scope, attributes, attrsOnly, sizeLimit, timeLimit) {
        if (scope === void 0) { scope = LdapSearchActionOptionsScope.base; }
        if (attributes === void 0) { attributes = []; }
        if (attrsOnly === void 0) { attrsOnly = false; }
        if (sizeLimit === void 0) { sizeLimit = 0; }
        if (timeLimit === void 0) { timeLimit = 10; }
        this.filter = filter;
        this.scope = scope;
        this.attributes = attributes;
        this.attrsOnly = attrsOnly;
        this.sizeLimit = sizeLimit;
        this.timeLimit = timeLimit;
    }
    LdapSearchActionOptions.prototype.toClientOptions = function () {
        return {
            filter: this.filter,
            scope: LdapSearchActionOptionsScope[this.scope],
            attributes: this.attributes,
            attrsOnly: this.attrsOnly,
            sizeLimit: this.sizeLimit,
            timeLimit: this.timeLimit
        };
    };
    return LdapSearchActionOptions;
}());
exports.LdapSearchActionOptions = LdapSearchActionOptions;
var LdapModifyActionChange = (function () {
    function LdapModifyActionChange(operation, data) {
        this.operation = operation;
        this.data = data;
    }
    LdapModifyActionChange.prototype.toClientChange = function () {
        return new ldap.Change({
            operation: LdapModifyActionChangeType[this.operation],
            modification: this.data
        });
    };
    return LdapModifyActionChange;
}());
exports.LdapModifyActionChange = LdapModifyActionChange;
var LdapAction = (function () {
    function LdapAction(dn) {
        this.dn = dn;
    }
    LdapAction.prototype.execute = function (client, context, callback, targetSystem) {
    };
    LdapAction.prototype.createResultHandler = function (context, callback) {
        var _this = this;
        return function (err, res) {
            _this.handleResult(context, err, res);
            callback(context);
        };
    };
    LdapAction.prototype.handleResult = function (context, err, res) {
        if (err) {
            context.setCode(502).addError(1, 'LDAP Downstream service error: ' + (err.message || err));
        }
        else {
            context.invokerOutput = res;
        }
    };
    return LdapAction;
}());
exports.LdapAction = LdapAction;
var LdapAddAction = (function (_super) {
    __extends(LdapAddAction, _super);
    function LdapAddAction(dn, entry) {
        _super.call(this, dn);
        this.entry = entry;
    }
    LdapAddAction.prototype.execute = function (client, context, callback, targetSystem) {
        client.add(this.dn, this.entry, this.createResultHandler(context, callback));
    };
    return LdapAddAction;
}(LdapAction));
exports.LdapAddAction = LdapAddAction;
var LdapDeleteAction = (function (_super) {
    __extends(LdapDeleteAction, _super);
    function LdapDeleteAction(dn) {
        _super.call(this, dn);
    }
    LdapDeleteAction.prototype.execute = function (client, context, callback, targetSystem) {
        client.del(this.dn, this.createResultHandler(context, callback));
    };
    return LdapDeleteAction;
}(LdapAction));
exports.LdapDeleteAction = LdapDeleteAction;
var LdapModifyAction = (function (_super) {
    __extends(LdapModifyAction, _super);
    function LdapModifyAction(dn) {
        var changes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            changes[_i - 1] = arguments[_i];
        }
        _super.call(this, dn);
        this.changes = changes;
    }
    LdapModifyAction.prototype.execute = function (client, context, callback, targetSystem) {
        client.modify(this.dn, this.changes.map(function (change) { return change.toClientChange(); }), this.createResultHandler(context, callback));
    };
    return LdapModifyAction;
}(LdapAction));
exports.LdapModifyAction = LdapModifyAction;
var LdapSearchAction = (function (_super) {
    __extends(LdapSearchAction, _super);
    function LdapSearchAction(dn, options) {
        _super.call(this, dn);
        this.options = options;
    }
    LdapSearchAction.prototype.execute = function (client, context, callback, targetSystem) {
        var _this = this;
        if (null == client || !client._socket || !client.connected) {
            context.setCode(500).addError(101, 'LDAP Downstream service error: ');
            callback(context);
        }
        client.search(this.dn, this.options ? this.options.toClientOptions() : {}, this.createResultHandler(context, function () {
            var res = context.invokerOutput;
            var entries = context.invokerOutput = [];
            res.on('searchEntry', function (entry) {
                entries.push(entry.object);
            });
            var errorSent;
            res.on('error', function (err) {
                errorSent = true;
                _this.handleResult(context, err, null);
                callback(context);
            });
            res.on('end', function (result) {
                entries.push(result);
                _this.handleResult(context, null, entries);
                callback(context);
            });
        }));
    };
    return LdapSearchAction;
}(LdapAction));
exports.LdapSearchAction = LdapSearchAction;
var LdapInvoker = (function () {
    function LdapInvoker(url, bindDN, bindCredential, options, targetSystem) {
        this.url = url;
        this.strictDN = true;
        if (typeof (options.strictDN) === "boolean") {
            this.strictDN = options.strictDN;
        }
        if (options.key) {
            this.keyRead = fs.readFileSync(options.key);
        }
        if (options.pfx) {
            this.pfx = fs.readFileSync(options.pfx);
        }
        if (options.cert) {
            this.certificate = fs.readFileSync(options.cert);
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
    LdapInvoker.prototype.createClient = function () {
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
    };
    LdapInvoker.prototype.invoke = function (context, callback) {
        var action = context.invokerInput;
        if (null == this.client || !this.client.connected) {
            this.client = this.createClient();
        }
        if (!action) {
            throw new Error('LdapAction object must be passed in "context.payload"');
        }
        action.execute(this.client, context, callback, this.targetSystem);
    };
    LdapInvoker.prototype.getTargetSystem = function () {
        return this.targetSystem;
    };
    LdapInvoker.prototype.getServiceCall = function () {
        return;
    };
    return LdapInvoker;
}());
exports.LdapInvoker = LdapInvoker;
//# sourceMappingURL=ldap-invoker.js.map