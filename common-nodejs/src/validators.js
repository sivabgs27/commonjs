"use strict";
var nodeValidator = require('node-validator');
var utils_1 = require('./utils');
function validatorWrapper(validator, message) {
    var options = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        options[_i - 2] = arguments[_i];
    }
    return {
        validate: function (value, onError) {
            var options = utils_1.objectClone(options || []);
            options.unshift(value);
            if (validator.apply(null, options)) {
                return null;
            }
            else {
                return onError(message);
            }
        }
    };
}
exports.validatorWrapper = validatorWrapper;
function validateInput(input, context, validatorConfig, fields) {
    var errors;
    nodeValidator.run(validatorConfig, input, function (count, e) {
        errors = e;
    });
    if (errors && errors.length) {
        errors = errors.map(function (e) {
            return {
                field: e.parameter,
                message: e.message,
                code: 1000 + Math.max(0, fields.indexOf(e.parameter))
            };
        });
        context.setCode(422);
        context.output.errors = errors;
        return false;
    }
    else {
        return true;
    }
}
exports.validateInput = validateInput;
//# sourceMappingURL=validators.js.map