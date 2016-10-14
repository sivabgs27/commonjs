/**
 * Created by andrey on 17/11/2015.
 */

import fs = require('fs');
import crypto = require('crypto');
import {ensureLeadingSlash, objectAddEachProperty, getHostIP, getHostName, getRegistryHost} from "./utils";
import {syncGet} from "./json-client";
import {log} from "./logger";


export function createGuardConfig(config?:any):GuardConfig {
    return objectAddEachProperty(config || {}, {
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

export interface GuardConfig {
    concurrency:number;

    useCircuitBreaker:boolean;
    windowDuration:number;
    numBuckets:number;
    timeoutDuration:number;
    errorThreshold:number;
    volumeThreshold:number;
}

export interface ServiceInfo {
    name:string;
    title:string;
    version:string;
    apiVersion:number;
    hasApidoc:boolean;
    description:string;
    path:string[];
    environment:string;
    hostName:string;
    hostIp:string;
    port:number;
    deployed:Date;
    standalone:boolean;
    forever:boolean;
    downstream:string;
    proxy:string;
    busUrl:string;
    busDisabled:boolean;
    guard:GuardConfig;
    extras:any;
    id:string;
    libVersion:string;
    downstreamCertificate:string;
    ownCertificate:string;
    logLevel:string; // DEBUG | INFO | WARN | ERROR
    simpleHttpResponseFormat:boolean;
    maxLifeTime: number;

    update(info);
    reload():ServiceInfo;
}

class ServiceInfoImpl implements ServiceInfo {
    name:string;
    title:string;
    version:string;
    libVersion:string;
    apiVersion:number;
    hasApidoc:boolean;
    description:string;
    path:string[];
    environment:string;
    hostName:string;
    hostIp:string;
    port:number;
    deployed:Date;
    standalone:boolean;
    forever:boolean;
    downstream:string;
    proxy:string;
    busUrl:string;
    busDisabled:boolean;
    guard:GuardConfig;
    extras:any;
    id:string;
    downstreamCertificate:string;
    ownCertificate:string;
    logLevel:string;
    simpleHttpResponseFormat:boolean;
    maxLifeTime: number;

    update(info):ServiceInfo {
        objectAddEachProperty(info, this);
        return this;
    }

    reload():ServiceInfo {
        // Read config information from package.json
        var packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        packageInfo.service = packageInfo.service || {};

        var libInfo;
        try {
            libInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
        } catch (e) {
            libInfo = {};
        }

        // process common config
        var info:any = {
            name: packageInfo.name,
            title: packageInfo.service.title,
            version: packageInfo.version,
            libVersion: libInfo.version,
            apiVersion: packageInfo.service.apiVersion || 1,
            hasApidoc: !!(packageInfo.apidoc && packageInfo.devDependencies.apidoc),
            description: packageInfo.description,
            path: packageInfo.service.path || [],
            environment: process.env.APP_ENV || 'local',
            hostName: process.env.HOST_NAME || getHostName(),
            hostIp: process.env.HOST_IP || getHostIP(),
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
        let configFileInfo:any = {};
        if (process.env.APP_ENV) {
            let configFileName = 'config/app_config.' + process.env.APP_ENV + '.json';
            try {
                configFileInfo = JSON.parse(fs.readFileSync(configFileName, 'utf8')) || {};
                processConfigSource(configFileInfo, info);
                log.info('Using config file: %s', configFileName);
            } catch (e) {
            }
        }

        // Read config information from APP_CONFIG environment variable.
        var deploymentInfo:any = {};
        try {
            deploymentInfo = process.env.APP_CONFIG ? JSON.parse(process.env.APP_CONFIG.replace(/'/g, '"')) : {};
            processConfigSource(deploymentInfo, info);
            log.info('Using APP_CONFIG variable: %s', process.env.APP_CONFIG);
        } catch (e) {
        }

        if (info.standalone) {
            completeInfoPreparation();
        } else {
            try {
                let body = syncGet('http://' + getRegistryHost() + ':4001', '/v2/keys/env/config');
                let etcdEnvConfig = JSON.parse(body.node.value); // JSON is put in JSON that's right!
                processConfigSource(etcdEnvConfig, info);
                log.info('Using environment config from etcd: %s', body.node.value);
            } catch (e) {
            }

            completeInfoPreparation();
        }

        objectAddEachProperty(info, this);

        return this;

        function processConfigSource(additionalConfig:ServiceInfo, resultConfig:ServiceInfo) {
            // process Guard config
            if (additionalConfig.guard) {
                objectAddEachProperty(additionalConfig.guard, resultConfig.guard);
                delete additionalConfig.guard;
            }

            objectAddEachProperty(additionalConfig, resultConfig);
        }

        function completeInfoPreparation() {
            // process path
            if (!Array.isArray(info.path)) {
                (<any>info).path = [info.path];
            }

            if (!info.path.length) {
                info.path.push('/' + info.name + '/v' + info.apiVersion);
            }

            info.path = info.path.map(ensureLeadingSlash);
            info.id = crypto.createHash('md5').update(info.hostIp + ':' + info.port).digest('hex').substr(0, 7);

            if (!info.logLevel) {
                info.logLevel = 'INFO';
            }
        }
    }
}

export var serviceInfo:ServiceInfo = new ServiceInfoImpl().reload();
export var isParentProcess:boolean = serviceInfo.forever && !process.env.FOREVER_CHILD;
log.reload(serviceInfo);
