/**
 * Created by cam on 8/02/2016.
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var templates_1 = require('./templates');
var async = require('async');
var logger_1 = require("./logger");
var ConditionalItem = (function () {
    function ConditionalItem(template, conditional, attribute, value, outcome) {
        this.template = template;
        this.conditional = conditional;
        this.attribute = attribute;
        this.value = value;
        this.outcome = outcome;
    }
    return ConditionalItem;
}());
exports.ConditionalItem = ConditionalItem;
var ConditionalTemplate = (function (_super) {
    __extends(ConditionalTemplate, _super);
    function ConditionalTemplate(namedItems, guardInvoker) {
        _super.call(this, null, guardInvoker);
        this.items = [];
        for (var key in namedItems) {
            var item = namedItems[key];
            item.template.invoker.invokerName = key;
            this.items.push(item);
        }
    }
    return ConditionalTemplate;
}(templates_1.SimpleTemplate));
exports.ConditionalTemplate = ConditionalTemplate;
var ConditionalChainTemplate = (function (_super) {
    __extends(ConditionalChainTemplate, _super);
    function ConditionalChainTemplate(namedItems, guardInvoker) {
        _super.call(this, namedItems, guardInvoker);
    }
    ConditionalChainTemplate.prototype.prepareFinalOutput = function (context) {
    };
    ConditionalChainTemplate.prototype.run = function (context) {
        var _this = this;
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists
        var tasks = this.items.map(function (item) {
            return function (callback) {
                var attribute = item.attribute;
                var execute = true;
                if (item.conditional) {
                    logger_1.log.debug("(context.state[attribute]  ==  item.value) == item.outcome");
                    logger_1.log.debug("(%s == %s) == %s", context.state[attribute], item.value, item.outcome);
                    execute = ((context.state[attribute] == (item.value)) == item.outcome);
                }
                if (execute) {
                    context.invokerName = item.template.invoker.invokerName;
                    item.template.prepareInput(context);
                }
                if (execute) {
                    if (context.isValid()) {
                        item.template.guardInvoker.invoke(item.template.invoker, context, function (context2) {
                            if (context2.isValid()) {
                                item.template.prepareOutput(context2);
                            }
                            else {
                                _this.handleError(context2);
                            }
                            callback(context2.isValid() ? null : true);
                        });
                    }
                    else {
                        callback(true);
                    }
                }
                else {
                    callback(!execute ? null : true);
                }
            };
        });
        async.series(tasks, function () {
            _this.prepareFinalOutput(context);
            _this.sendResult(context);
        });
    };
    return ConditionalChainTemplate;
}(ConditionalTemplate));
exports.ConditionalChainTemplate = ConditionalChainTemplate;
//# sourceMappingURL=conditional-template.js.map