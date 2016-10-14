/**
 * Created by andrey on 17/11/2015.
 */
"use strict";
var fs = require('fs');
var crypto = require('crypto');
var utils_1 = require("./utils");
var json_client_1 = require("./json-client");
var logger_1 = require("./logger");
function createGuardConfig(config) {
    return utils_1.objectAddEachProperty(config || {}, {
        global: true,
        concurrency: 0,
        useCircuitBreaker: false,
        windowDuration: 10000,
        numBuckets: 10,
        timeoutDuration: 3000,
        errorThreshold: 50,
        volumeThreshold: 5
    });
}
exports.createGuardConfig = createGuardConfig;
var ServiceInfoImpl = (function () {
    function ServiceInfoImpl() {
    }
    ServiceInfoImpl.prototype.update = function (info) {
        utils_1.objectAddEachProperty(info, this);
        return this;
    };
    ServiceInfoImpl.prototype.reload = function () {
        // Read config information from package.json
        var packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        packageInfo.service = packageInfo.service || {};
        var libInfo;
        try {
            libInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
        }
        catch (e) {
            libInfo = {};
        }
        // process common config
        var info = {
            name: packageInfo.name,
            title: packageInfo.service.title,
            version: packageInfo.version,
            libVersion: libInfo.version,
            apiVersion: packageInfo.service.apiVersion || 1,
            hasApidoc: !!(packageInfo.apidoc && packageInfo.devDependencies.apidoc),
            description: packageInfo.description,
            path: packageInfo.service.path || [],
            environment: process.env.APP_ENV || 'local',
            hostName: process.env.HOST_NAME || utils_1.getHostName(),
            hostIp: process.env.HOST_IP || utils_1.getHostIP(),
            port: 0,
            deployed: process.env.DEPLOYED_TS ? new Date(process.env.DEPLOYED_TS * 1000) : new Date(),
            standalone: process.env.STANDALONE ? true : false,
            forever: packageInfo.service.forever !== undefined ? packageInfo.service.forever : true,
            downstream: packageInfo.service.downstream || '',
            proxy: packageInfo.service.proxy || '',
            busUrl: packageInfo.service.busUrl || 'amqp://rabbitmq',
            busDisabled: packageInfo.service.busDisabled || false,
            guard: createGuardConfig(packageInfo.service.guard),
            simpleHttpResponseFormat: packageInfo.service.simpleHttpResponseFormat === undefined ? true : packageInfo.service.simpleHttpResponseFormat,
            maxLifeTime: packageInfo.service.maxLifeTime || 0,
            extras: {},
            id: ''
        };
        // Read config information from config file based on APP_ENV environment variable.
        var configFileInfo = {};
        if (process.env.APP_ENV) {
            var configFileName = 'config/app_config.' + process.env.APP_ENV + '.json';
            try {
                configFileInfo = JSON.parse(fs.readFileSync(configFileName, 'utf8')) || {};
                processConfigSource(configFileInfo, info);
                logger_1.log.info('Using config file: %s', configFileName);
            }
            catch (e) {
            }
        }
        // Read config information from APP_CONFIG environment variable.
        var deploymentInfo = {};
        try {
            deploymentInfo = process.env.APP_CONFIG ? JSON.parse(process.env.APP_CONFIG.replace(/'/g, '"')) : {};
            processConfigSource(deploymentInfo, info);
            logger_1.log.info('Using APP_CONFIG variable: %s', process.env.APP_CONFIG);
        }
        catch (e) {
        }
        if (info.standalone) {
            completeInfoPreparation();
        }
        else {
            try {
                var body = json_client_1.syncGet('http://' + utils_1.getRegistryHost() + ':4001', '/v2/keys/env/config');
                var etcdEnvConfig = JSON.parse(body.node.value); // JSON is put in JSON that's right!
                processConfigSource(etcdEnvConfig, info);
                logger_1.log.info('Using environment config from etcd: %s', body.node.value);
            }
            catch (e) {
            }
            completeInfoPreparation();
        }
        utils_1.objectAddEachProperty(info, this);
        return this;
        function processConfigSource(additionalConfig, resultConfig) {
            // process Guard config
            if (additionalConfig.guard) {
                utils_1.objectAddEachProperty(additionalConfig.guard, resultConfig.guard);
                delete additionalConfig.guard;
            }
            utils_1.objectAddEachProperty(additionalConfig, resultConfig);
        }
        function completeInfoPreparation() {
            // process path
            if (!Array.isArray(info.path)) {
                info.path = [info.path];
            }
            if (!info.path.length) {
                info.path.push('/' + info.name + '/v' + info.apiVersion);
            }
            info.path = info.path.map(utils_1.ensureLeadingSlash);
            info.id = crypto.createHash('md5').update(info.hostIp + ':' + info.port).digest('hex').substr(0, 7);
            if (!info.logLevel) {
                info.logLevel = 'INFO';
            }
        }
    };
    return ServiceInfoImpl;
}());
exports.serviceInfo = new ServiceInfoImpl().reload();
exports.isParentProcess = exports.serviceInfo.forever && !process.env.FOREVER_CHILD;
logger_1.log.reload(exports.serviceInfo);
//# sourceMappingURL=service-info.js.map