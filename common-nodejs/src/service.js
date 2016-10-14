"use strict";
var restify = require('restify');
var moment = require('moment');
var async = require('async');
var fs = require('fs');
var forever = require('forever-monitor');
var AsciiBanner = require('ascii-banner');
var responseTime = require('response-time');
var service_info_1 = require('./service-info');
var utils_1 = require('./utils');
var logger_1 = require('./logger');
var REGISTRY_CONTROL_URL = 'http://' + utils_1.getRegistryHost() + ':8182';
var GenericService = (function () {
    function GenericService() {
        this.serviceId = service_info_1.serviceInfo.name + ':' + service_info_1.serviceInfo.version + ':' + service_info_1.serviceInfo.id;
        if (service_info_1.isParentProcess) {
            // start children process for Service
            var child = new (forever.Monitor)('src/service.js', {
                max: Number.MAX_VALUE,
                env: { FOREVER_CHILD: 1 }
            });
            child.on('exit', function () {
                logger_1.log.info('Service has exited');
            });
            child.start();
            logger_1.log.info('Started forever monitor');
        }
    }
    GenericService.prototype.start = function () {
        if (service_info_1.isParentProcess) {
            return;
        }
        this.createServer();
        this.configureHeaders();
        this.addStandardEndpoints();
        this.configure();
        this.startServer();
        AsciiBanner.write(service_info_1.serviceInfo.name).out();
        this.autoShutdown();
    };
    GenericService.prototype.register = function () {
        var _this = this;
        if (service_info_1.isParentProcess) {
            return;
        }
        if (service_info_1.serviceInfo.standalone) {
            logger_1.log.info('Started standalone service', service_info_1.serviceInfo);
            return;
        }
        else {
            logger_1.log.info('Registering service', service_info_1.serviceInfo);
        }
        var Etcd = require('node-etcd');
        this.etcd = new Etcd(utils_1.getRegistryHost(), '4001');
        var serviceName = service_info_1.serviceInfo.name + '-v' + service_info_1.serviceInfo.apiVersion;
        var registryClient;
        var registerService = function (onDone) {
            var tasks = [
                function (callback) {
                    registryClient.post(REGISTRY_CONTROL_URL + '/v2/backends', {
                        Backend: { Id: 'be-' + serviceName, Type: 'http' },
                        TTL: '180s'
                    }, callback);
                }
            ];
            var feIndex = 0;
            service_info_1.serviceInfo.path.forEach(function (path) {
                var feName = serviceName + '-' + (feIndex++);
                var pathRegex = path === '/' ? '.*' : "^" + path + ".*";
                tasks.push(function (callback) {
                    registryClient.post(REGISTRY_CONTROL_URL + '/v2/frontends', {
                        Frontend: {
                            Id: 'fe-' + feName,
                            Type: 'http',
                            BackendId: 'be-' + serviceName,
                            Route: "PathRegexp(\"" + pathRegex + "\")"
                        },
                        TTL: '180s'
                    }, callback);
                }, function (callback) {
                    _this.etcd.set('/skydns/local/kube/' + service_info_1.serviceInfo.name + '/v' + service_info_1.serviceInfo.apiVersion + '/' + service_info_1.serviceInfo.id, JSON.stringify({ 'host': service_info_1.serviceInfo.hostIp, 'ttl': 180 }), { ttl: 180 }, callback);
                });
                if (path !== '/') {
                    tasks.push(function (callback) {
                        registryClient.post(REGISTRY_CONTROL_URL + '/v2/frontends/fe-' + feName + '/middlewares', {
                            Middleware: {
                                Id: 'rw-' + feName,
                                Priority: 1,
                                Type: 'rewrite',
                                Middleware: {
                                    Regexp: path + '(.*)',
                                    Replacement: '$1',
                                    RewriteBody: false,
                                    Redirect: false
                                }
                            },
                            TTL: '180s'
                        }, callback);
                    });
                }
            });
            async.series(tasks, onDone);
        };
        var heartbeatStatus;
        var heartbeatService = function () {
            registryClient.post(REGISTRY_CONTROL_URL + '/v2/backends/be-' + serviceName + '/servers', {
                Server: {
                    Id: 'srv-' + service_info_1.serviceInfo.hostName + '-' + service_info_1.serviceInfo.port,
                    URL: 'http://' + service_info_1.serviceInfo.hostIp + ':' + service_info_1.serviceInfo.port
                },
                TTL: '30s'
            }, function (err) {
                if (err) {
                    if (heartbeatStatus !== 'error') {
                        logger_1.log.error('Error heartbeating service', err);
                        heartbeatStatus = 'error';
                    }
                }
                else {
                    if (heartbeatStatus !== 'ok') {
                        logger_1.log.info('Heartbeat OK.');
                        heartbeatStatus = 'ok';
                    }
                }
            });
            _this.etcd.set('services/info/' + service_info_1.serviceInfo.hostIp + ':' + service_info_1.serviceInfo.port, JSON.stringify(service_info_1.serviceInfo), { ttl: 30 });
        };
        registryClient = restify.createJsonClient({
            url: REGISTRY_CONTROL_URL
        });
        registerService(function (err) {
            if (err) {
                logger_1.log.error('Error registering service', err);
            }
            else {
                logger_1.log.info('Successfully registered service. Starting heartbeating.');
                heartbeatService();
                setInterval(heartbeatService, 10 * 1000);
                setInterval(registerService, 60 * 1000);
            }
        });
    };
    GenericService.prototype.monitor = function () {
        var profiler = require('gc-profiler');
        profiler.on('gc', function (info) {
            var extras = {
                logger_type: 'gc',
                gc_name: info.type,
                gc_duration: info.duration
            };
            logger_1.log.metric(logger_1.MetricType.MEMORY, extras);
        });
        var memoryStats = function () {
            var extras = {
                logger_type: 'mem',
                mem_rss: process.memoryUsage().rss,
                mem_heap_used: process.memoryUsage().heapUsed,
                mem_heap_total: process.memoryUsage().heapTotal
            };
            logger_1.log.metric(logger_1.MetricType.MEMORY, extras);
        };
        memoryStats();
        setInterval(memoryStats, 30 * 1000);
    };
    GenericService.prototype.createServer = function () {
        var _this = this;
        this.server = restify.createServer();
        this.server.on('NotFound', function (req, res) {
            res.setHeader('X-Service-Id', _this.serviceId);
            return res.send(new restify.NotFoundError());
        });
        this.server.on('uncaughtException', function (rew, res, route, error) {
            res.setHeader('X-Service-Id', _this.serviceId);
            res.send(error);
        });
        this.server.use(restify.queryParser());
        this.server.use(restify.bodyParser());
        this.server.use(restify.CORS());
        this.server.on('MethodNotAllowed', function (req, res) {
            if (req.method.toLowerCase() === 'options') {
                var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version'];
                if (res.methods.indexOf('OPTIONS') === -1) {
                    res.methods.push('OPTIONS');
                    res.header('Access-Control-Allow-Credentials', true);
                    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
                    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
                    res.header('Access-Control-Allow-Origin', req.headers.origin);
                    res.header('X-Service-Id', _this.serviceId);
                    return res.send(204);
                }
                else {
                    res.header('X-Service-Id', _this.serviceId);
                    return res.send(new restify.MethodNotAllowedError());
                }
            }
        });
    };
    GenericService.prototype.configureHeaders = function () {
        var _this = this;
        this.server.use(function (req, res, next) {
            res.setHeader('Cache-Control', 'private, max-age=0, no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', 0);
            res.setHeader('X-Service-Id', _this.serviceId);
            return next();
        });
        this.server.use(responseTime(function (req, res, time) {
            var ipAddress = req.headers['x-forwarded-for'] ||
                (req.connection && req.connection.remoteAddress) ||
                (req.socket && req.socket.remoteAddress) ||
                (req.connection && req.connection.socket && req.connection.socket.remoteAddress);
            logger_1.log.access({
                remoteIp: ipAddress,
                dateTime: moment().format(),
                method: req.method,
                path: req.url,
                code: res.statusCode,
                userAgent: req.headers['user-agent'],
                responseTime: Math.round(time)
            });
        }));
    };
    GenericService.prototype.addStandardEndpoints = function () {
        var _this = this;
        var docInfo;
        try {
            docInfo = JSON.parse(fs.readFileSync('api_data.json', 'utf8'));
        }
        catch (e) {
            docInfo = [];
        }
        this.server.get('/_health', function (req, res) {
            res.setHeader('Content-Type', 'text/plain');
            _this.sendHealthStatus(res);
        });
        this.server.get('/_info', function (req, res) {
            res.send(service_info_1.serviceInfo);
        });
        this.server.get('/_doc', function (req, res) {
            res.send(docInfo);
        });
        this.server.get('/_diagnostics', function (req, res) {
            _this.sendDiagnosticsInfo(res);
        });
        this.server.get('/_testAlarm', function (req, res) {
            var event = logger_1.log.alarm({
                id: req.params['id'] || '200001',
                category: req.params['category'] || 'Test alarm',
                severity: (logger_1.AlarmSeverity[req.params['severity']] || logger_1.AlarmSeverity.MINOR),
                message: req.params['message'] || 'My Test alarm message',
                shortText: req.params['message'] || 'My Test alarm short txt message',
                longText: req.params['message'] || 'My Test alarm long txt message',
                targetSystem: req.params['targetSystem'] || 'TEST_BACKEND'
            });
            res.send({
                code: 200,
                time: moment().format(),
                event: event
            });
        });
        this.server.post('/_control?action=restart', function (req, res) {
            logger_1.log.info('Restart request received');
            res.send({ code: 'OK' });
            process.nextTick(function () { return process.exit(); });
        });
        this.server.post('/_control/info', function (req, res) {
            utils_1.objectAddEachProperty(req.body, service_info_1.serviceInfo);
            logger_1.log.info('Service info updated', service_info_1.serviceInfo);
            res.send({ code: 'OK', info: service_info_1.serviceInfo });
        });
    };
    GenericService.prototype.configure = function () {
    };
    GenericService.prototype.sendDiagnosticsInfo = function (res) {
        res.send({});
    };
    GenericService.prototype.sendHealthStatus = function (res) {
        res.send('normal');
    };
    GenericService.prototype.startServer = function () {
        var _this = this;
        var httpServer = this.server.listen(service_info_1.serviceInfo.port || 0, function () {
            var port = httpServer.address().port;
            logger_1.log.info('Server listening on port: %d', port);
            service_info_1.serviceInfo.port = port;
            _this.register();
            _this.monitor();
        });
    };
    GenericService.prototype.autoShutdown = function () {
        if (service_info_1.serviceInfo.maxLifeTime > 0) {
            var shutdownDelay = service_info_1.serviceInfo.maxLifeTime * 60 * 1000 + Math.round(Math.random() * 100000);
            setTimeout(function () {
                process.exit(0);
            }, shutdownDelay);
        }
    };
    return GenericService;
}());
exports.GenericService = GenericService;
//# sourceMappingURL=service.js.map