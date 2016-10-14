/**
 * Created by d393961 on 9/12/2015.
 *
 * Logger for logging and indexing mandatory fields such as correlationId.
 * Only for internal consumption and currently only catered for use by ping-pong
 * template and Bus.
 */
"use strict";
var utils_1 = require('./utils');
var logger_1 = require('./logger');
function wrapLogger(name, context) {
    var logger = logger_1.log[name];
    return logger && utils_1.noop != logger ? function (message) {
        var extras = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            extras[_i - 1] = arguments[_i];
        }
        prepareExtras(context, extras);
        logger.apply(null, [message].concat(extras));
    } : utils_1.noop;
}
function prepareExtras(context, extras) {
    var extrasObj;
    if (extras && extras.length && extras[extras.length - 1] == "[object Object]") {
        extrasObj = extras[extras.length - 1];
    }
    else {
        extrasObj = {};
        extras.push(extrasObj);
    }
    var input = context.input;
    if (input) {
        extrasObj['correlationId'] = input.correlationId;
        extrasObj['requestId'] = input.requestId;
        extrasObj['sourceSystem'] = input.sourceSystem;
        extrasObj['status'] = context.isValid() ? 'SUCCESS' : 'EXCEPTION';
    }
}
function createContextLoggers(context) {
    context.debug = wrapLogger('debug', context);
    context.info = wrapLogger('info', context);
    context.warn = wrapLogger('warn', context);
    context.error = wrapLogger('error', context);
    context.metric = function (metric, details) {
        prepareExtras(context, [details]);
        logger_1.log.metric(metric, details);
    };
    context.alarm = function (alarm) {
        prepareExtras(context, [alarm]);
        logger_1.log.alarm(alarm);
    };
}
exports.createContextLoggers = createContextLoggers;
//# sourceMappingURL=context-logger.js.map