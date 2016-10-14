
import {serviceInfo} from "./service-info";
import {objectCloneSimple, noop} from "./utils";
import util = require('util');

export interface Logger {
    (message: string, ...extras: any[]): any;
}

export enum MetricType {
    MEMORY,
    REQUEST
}

export enum AlarmSeverity {
    CLEARING,
    INFO,
    MINOR,
    MAJOR,
    CRITICAL
}

export interface AlarmInfo {
    id: string;
    category: string;
    severity: AlarmSeverity;
    module?: string;
    server?: string;
    message: string;
    targetSystem?: string;
    shortText: string;
    longText: string;
}

export interface AccessInfo {
    remoteIp: string;
    dateTime: string;
    method: string;
    path: string;
    code: any;
    userAgent: string;
    responseTime: any;
}

export interface MetricLogger {
    (metric: MetricType, details?: any): any;
}

export interface AlarmLogger {
    (alarm: AlarmInfo): any;
}

export interface AccessLogger {
    (access: AccessInfo): any;
}

export class LoggerSet {
    debug: Logger = noop;
    info: Logger = noop;
    warn: Logger = noop;
    error: Logger = noop;
    metric: MetricLogger;
    alarm: AlarmLogger;
    access: AccessLogger;

    private eventTemplate: any = {};

    constructor (serviceInfo) {
        this.reload(serviceInfo);
    }

    reload (serviceInfo) {
        if (!serviceInfo) {
            serviceInfo = {
                environment: 'local',
                hostName: 'localhost'
            };
        }

        this.eventTemplate = {
            name: serviceInfo.name,
            environment: serviceInfo.environment,
            host: serviceInfo.hostName,
            apiVersion: serviceInfo.apiVersion,
            version: serviceInfo.version
        };

        if (!serviceInfo.logLevel) {
            serviceInfo.logLevel = 'INFO';
        }

        switch (serviceInfo.logLevel) {
            case 'DEBUG':
                this.debug = this.createLogger('DEBUG');
            case 'INFO':
                this.info = this.createLogger('INFO');
            case 'WARN':
                this.warn = this.createLogger('WARN');
            case 'ERROR':
                this.error = this.createLogger('ERROR');
        }

        let metricLogger = this.createLogger('METRIC');
        this.metric = (metric: MetricType, details: any) => {
            if (!details) {
                details = {};
            }

            details.metric = MetricType[metric];
            return metricLogger(undefined, details);
        };

        let alarmLogger = this.createLogger('ALARM');
        this.alarm = (alarm: AlarmInfo): any => {
            alarm.server = alarm.server || serviceInfo.hostName;
            alarm.module = alarm.module || serviceInfo.name;
            alarm.severity = <any>AlarmSeverity[alarm.severity];
            return alarmLogger(alarm.message, alarm);
        };

        let accessLogger = this.createLogger('ACCESS');
        this.access = (access: AccessInfo): any => {
            return accessLogger(undefined, access);
        };
    }

    createLogger(level: string): Logger {
        return (message: string, ...extras: any[]): any => {
            let event = <any>this.createEvent(level, message, extras);
            if(event) {
                if (event.message) {
                    console.log('%s : %s', level, event.message);
                }
                console.log('EVENT>%j', event);
                return event;
            }
        };
    }

    /**
     * Utility method for logging
     *
     * @param loggerLevel
     * @param message
     * @param extras
     */
    createEvent(loggerLevel, message, extras?: any[]) {
        let event = objectCloneSimple(this.eventTemplate);

        if (extras) {
            if(Object.prototype.toString.call(extras[extras.length - 1]) == "[object Object]") {
                event.extras = extras[extras.length - 1];
            }
        }

        if (!message && !event.extras) {
            return;
        }

        let formattedMessage = this.formatMessage(loggerLevel, message, extras);
        if (formattedMessage) {
            event.message = formattedMessage;
        }

        event.type = loggerLevel;
        return event;
    }

    /**
     * Formats the messgae object for Logstash logging and also does the equivalent logging to
     * local console
     *
     * @param message
     * @param loggerLevel
     * @param extras
     * @returns {string}
     */
    formatMessage(loggerLevel, message, extras?: any[]): string {
        let formattedMessage: string;

        if (message && extras && extras.length) {
            if (Object.prototype.toString.call(extras[extras.length - 1]) == "[object Object]") {
                extras = extras.slice(0, -1);
            }

            if (extras.length) {
                formattedMessage = util.format.apply(null, [message].concat(extras));
            }
        }

        return formattedMessage || message;
    }

    parseNodeShortName(nodeName: string): string {
        let shortName;

        if(nodeName && nodeName.indexOf('.') !== -1) {
            shortName = nodeName.substring(0, nodeName.indexOf('.'));
        }

        return shortName;
    }
}

export var log: LoggerSet = new LoggerSet(serviceInfo);