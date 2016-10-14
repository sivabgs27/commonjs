"use strict";
var service_info_1 = require("./service-info");
var utils_1 = require("./utils");
var util = require('util');
(function (MetricType) {
    MetricType[MetricType["MEMORY"] = 0] = "MEMORY";
    MetricType[MetricType["REQUEST"] = 1] = "REQUEST";
})(exports.MetricType || (exports.MetricType = {}));
var MetricType = exports.MetricType;
(function (AlarmSeverity) {
    AlarmSeverity[AlarmSeverity["CLEARING"] = 0] = "CLEARING";
    AlarmSeverity[AlarmSeverity["INFO"] = 1] = "INFO";
    AlarmSeverity[AlarmSeverity["MINOR"] = 2] = "MINOR";
    AlarmSeverity[AlarmSeverity["MAJOR"] = 3] = "MAJOR";
    AlarmSeverity[AlarmSeverity["CRITICAL"] = 4] = "CRITICAL";
})(exports.AlarmSeverity || (exports.AlarmSeverity = {}));
var AlarmSeverity = exports.AlarmSeverity;
var LoggerSet = (function () {
    function LoggerSet(serviceInfo) {
        this.debug = utils_1.noop;
        this.info = utils_1.noop;
        this.warn = utils_1.noop;
        this.error = utils_1.noop;
        this.eventTemplate = {};
        this.reload(serviceInfo);
    }
    LoggerSet.prototype.reload = function (serviceInfo) {
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
        var metricLogger = this.createLogger('METRIC');
        this.metric = function (metric, details) {
            if (!details) {
                details = {};
            }
            details.metric = MetricType[metric];
            return metricLogger(undefined, details);
        };
        var alarmLogger = this.createLogger('ALARM');
        this.alarm = function (alarm) {
            alarm.server = alarm.server || serviceInfo.hostName;
            alarm.module = alarm.module || serviceInfo.name;
            alarm.severity = AlarmSeverity[alarm.severity];
            return alarmLogger(alarm.message, alarm);
        };
        var accessLogger = this.createLogger('ACCESS');
        this.access = function (access) {
            return accessLogger(undefined, access);
        };
    };
    LoggerSet.prototype.createLogger = function (level) {
        var _this = this;
        return function (message) {
            var extras = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                extras[_i - 1] = arguments[_i];
            }
            var event = _this.createEvent(level, message, extras);
            if (event) {
                if (event.message) {
                    console.log('%s : %s', level, event.message);
                }
                console.log('EVENT>%j', event);
                return event;
            }
        };
    };
    /**
     * Utility method for logging
     *
     * @param loggerLevel
     * @param message
     * @param extras
     */
    LoggerSet.prototype.createEvent = function (loggerLevel, message, extras) {
        var event = utils_1.objectCloneSimple(this.eventTemplate);
        if (extras) {
            if (Object.prototype.toString.call(extras[extras.length - 1]) == "[object Object]") {
                event.extras = extras[extras.length - 1];
            }
        }
        if (!message && !event.extras) {
            return;
        }
        var formattedMessage = this.formatMessage(loggerLevel, message, extras);
        if (formattedMessage) {
            event.message = formattedMessage;
        }
        event.type = loggerLevel;
        return event;
    };
    /**
     * Formats the messgae object for Logstash logging and also does the equivalent logging to
     * local console
     *
     * @param message
     * @param loggerLevel
     * @param extras
     * @returns {string}
     */
    LoggerSet.prototype.formatMessage = function (loggerLevel, message, extras) {
        var formattedMessage;
        if (message && extras && extras.length) {
            if (Object.prototype.toString.call(extras[extras.length - 1]) == "[object Object]") {
                extras = extras.slice(0, -1);
            }
            if (extras.length) {
                formattedMessage = util.format.apply(null, [message].concat(extras));
            }
        }
        return formattedMessage || message;
    };
    LoggerSet.prototype.parseNodeShortName = function (nodeName) {
        var shortName;
        if (nodeName && nodeName.indexOf('.') !== -1) {
            shortName = nodeName.substring(0, nodeName.indexOf('.'));
        }
        return shortName;
    };
    return LoggerSet;
}());
exports.LoggerSet = LoggerSet;
exports.log = new LoggerSet(service_info_1.serviceInfo);
//# sourceMappingURL=logger.js.map