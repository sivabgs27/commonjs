import nodeValidator = require('node-validator');

import { objectClone } from './utils'
import { InvocationContext } from './templates'


export function validatorWrapper(validator, message?, ...options): any {
    return {
        validate: (value, onError) => {
            var options = objectClone(options || []);
            options.unshift(value);
            if (validator.apply(null, options)) {
                return null;
            } else {
                return onError(message)
            }
        }
    };
}

export function validateInput(input, context: InvocationContext, validatorConfig: any, fields?: any): boolean {
    var errors;

    nodeValidator.run(validatorConfig, input, (count, e) => {
        errors = e;
    });

    if (errors && errors.length) {
        errors = errors.map( e => {
                return {
                    field: e.parameter,
                    message: e.message,
                    code: 1000 + Math.max(0, fields.indexOf(e.parameter))
                }}
        );
        context.setCode(422);
        context.output.errors = errors;
        return false;
    } else {
        return true;
    }
}