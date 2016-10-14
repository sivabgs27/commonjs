/**
 * Created by d393961 on 9/12/2015.
 *
 * Logger for logging and indexing mandatory fields such as correlationId.
 * Only for internal consumption and currently only catered for use by ping-pong
 * template and Bus.
 */


import { noop } from './utils'
import {log, MetricType, AlarmInfo} from './logger';
import {InvocationContext} from "./templates";

function wrapLogger(name: string, context: InvocationContext) {
    let logger = log[name];
    return logger && noop != logger ? (message: string, ...extras: any[]): any => {
        prepareExtras(context, extras);
        logger.apply(null, [message].concat(extras));
    } : noop;
}

function prepareExtras(context: InvocationContext, extras: any[]) {
    let extrasObj;
    if (extras && extras.length && extras[extras.length - 1] == "[object Object]") {
        extrasObj = extras[extras.length - 1]
    } else {
        extrasObj = {};
        extras.push(extrasObj);
    }

    let input = context.input;
    if (input) {
        extrasObj['correlationId'] = input.correlationId;
        extrasObj['requestId'] = input.requestId;
        extrasObj['sourceSystem'] = input.sourceSystem;
        extrasObj['status'] = context.isValid() ? 'SUCCESS' : 'EXCEPTION';
    }
}


export function createContextLoggers(context: InvocationContext) {
    context.debug = wrapLogger('debug', context);
    context.info = wrapLogger('info', context);
    context.warn = wrapLogger('warn', context);
    context.error = wrapLogger('error', context);
    context.metric = (metric: MetricType, details?: any): any => {
        prepareExtras(context, [details]);
        log.metric(metric, details);
    };
    context.alarm = (alarm: AlarmInfo): any => {
        prepareExtras(context, [alarm]);
        log.alarm(alarm);
    }
}
