import restify = require('restify');
import moment = require('moment');
import async = require('async');
import fs = require('fs');
import forever = require('forever-monitor');
const AsciiBanner = require('ascii-banner');
var responseTime = require('response-time');

import { isParentProcess, serviceInfo } from './service-info'
import { objectAddEachProperty, getRegistryHost } from './utils'
import { log, MetricType, AlarmSeverity, AccessInfo } from './logger'


var REGISTRY_CONTROL_URL = 'http://' + getRegistryHost() + ':8182';

export class GenericService {
    server;
    etcd;
    serviceId;

    constructor() {
        this.serviceId = serviceInfo.name + ':' + serviceInfo.version + ':' + serviceInfo.id;

        if (isParentProcess) {
            // start children process for Service
            var child = new (forever.Monitor)('src/service.js', {
                max: Number.MAX_VALUE,
                env: { FOREVER_CHILD: 1 }
            });

            child.on('exit', function () {
                log.info('Service has exited');
            });

            child.start();
            log.info('Started forever monitor');
        }
    }

    start() {
        if (isParentProcess) {
            return;
        }

        this.createServer();
        this.configureHeaders();
        this.addStandardEndpoints();
        this.configure();
        this.startServer();
        AsciiBanner.write(serviceInfo.name).out();
        this.autoShutdown();
    }

    register() {
        if (isParentProcess) {
            return;
        }

        if (serviceInfo.standalone) {
            log.info('Started standalone service', serviceInfo);
            return;
        } else {
            log.info('Registering service', serviceInfo);
        }

        var Etcd = require('node-etcd');
        this.etcd = new Etcd(getRegistryHost(), '4001');

        var serviceName = serviceInfo.name + '-v' + serviceInfo.apiVersion;
        var registryClient;
        var registerService = (onDone) => {
            var tasks = [
                (callback) => {
                    registryClient.post(REGISTRY_CONTROL_URL + '/v2/backends', {
                        Backend: { Id: 'be-' + serviceName, Type: 'http' },
                        TTL: '180s'
                    }, callback);
                }
            ];

            var feIndex = 0;
            serviceInfo.path.forEach(path => {
                var feName = serviceName + '-' + (feIndex++);
                let pathRegex = path === '/' ? '.*' : `^${ path }.*`;
                tasks.push(
                    callback => {
                        registryClient.post(REGISTRY_CONTROL_URL + '/v2/frontends', {
                            Frontend: {
                                Id: 'fe-' + feName,
                                Type: 'http',
                                BackendId: 'be-' + serviceName,
                                Route: `PathRegexp(\"${ pathRegex }\")`
                            },
                            TTL: '180s'
                        }, callback);
                    },
                    callback => {
                        this.etcd.set('/skydns/local/kube/' + serviceInfo.name + '/v' + serviceInfo.apiVersion + '/' + serviceInfo.id,
                            JSON.stringify({ 'host': serviceInfo.hostIp, 'ttl': 180 }), { ttl: 180 }, callback);
                    }
                );

                if (path !== '/') {
                    tasks.push(
                        callback => {
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
                        }
                    )
                }
            });

            async.series(tasks, onDone);
        };

        var heartbeatStatus;
        var heartbeatService = () => {
            registryClient.post(REGISTRY_CONTROL_URL + '/v2/backends/be-' + serviceName + '/servers', {
                Server: {
                    Id: 'srv-' + serviceInfo.hostName + '-' + serviceInfo.port,
                    URL: 'http://' + serviceInfo.hostIp + ':' + serviceInfo.port
                },
                TTL: '30s'
            }, (err) => {
                if (err) {
                    if (heartbeatStatus !== 'error') {
                        log.error('Error heartbeating service', err);
                        heartbeatStatus = 'error';
                    }
                } else {
                    if (heartbeatStatus !== 'ok') {
                        log.info('Heartbeat OK.');
                        heartbeatStatus = 'ok';
                    }
                }
            });

            this.etcd.set('services/info/' + serviceInfo.hostIp + ':' + serviceInfo.port, JSON.stringify(serviceInfo), { ttl: 30 });
        };

        registryClient = restify.createJsonClient({
            url: REGISTRY_CONTROL_URL
        });

        registerService((err) => {
            if (err) {
                log.error('Error registering service', err);
            } else {
                log.info('Successfully registered service. Starting heartbeating.');
                heartbeatService();
                setInterval(heartbeatService, 10 * 1000);
                setInterval(registerService, 60 * 1000);
            }
        });
    }

    monitor() {
        var profiler = require('gc-profiler');
        profiler.on('gc', function (info) {
            var extras = {
                logger_type: 'gc',
                gc_name: info.type,
                gc_duration: info.duration
            };
            log.metric(MetricType.MEMORY, extras);
        });

        var memoryStats = () => {
            var extras = {
                logger_type: 'mem',
                mem_rss: process.memoryUsage().rss,
                mem_heap_used: process.memoryUsage().heapUsed,
                mem_heap_total: process.memoryUsage().heapTotal
            };
            log.metric(MetricType.MEMORY, extras);
        };
        memoryStats();
        setInterval(memoryStats, 30 * 1000);
    }

    createServer() {
        this.server = restify.createServer();
        this.server.on('NotFound', (req, res) => {
            res.setHeader('X-Service-Id', this.serviceId);
            return res.send(new restify.NotFoundError());
        });

        this.server.on('uncaughtException', (rew, res, route, error) => {
            res.setHeader('X-Service-Id', this.serviceId);
            res.send(error);
        });

        this.server.use(restify.queryParser());
        this.server.use(restify.bodyParser());
        this.server.use(restify.CORS());

        this.server.on('MethodNotAllowed', (req, res) => {
            if (req.method.toLowerCase() === 'options') {
                var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version'];
                if (res.methods.indexOf('OPTIONS') === -1) {
                    res.methods.push('OPTIONS');
                    res.header('Access-Control-Allow-Credentials', true);
                    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
                    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
                    res.header('Access-Control-Allow-Origin', req.headers.origin);
                    res.header('X-Service-Id', this.serviceId);
                    return res.send(204);
                } else {
                    res.header('X-Service-Id', this.serviceId);
                    return res.send(new restify.MethodNotAllowedError());
                }
            }
        });
    }

    configureHeaders() {

        this.server.use((req, res, next) => {
            res.setHeader('Cache-Control', 'private, max-age=0, no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', 0);
            res.setHeader('X-Service-Id', this.serviceId);
            return next();
        });

        this.server.use(responseTime(function (req, res, time) {
            var ipAddress = req.headers['x-forwarded-for'] ||
                (req.connection && req.connection.remoteAddress) ||
                (req.socket && req.socket.remoteAddress) ||
                (req.connection && req.connection.socket && req.connection.socket.remoteAddress);

            log.access({
                remoteIp: ipAddress,
                dateTime: moment().format(),
                method: req.method,
                path: req.url,
                code: res.statusCode,
                userAgent: req.headers['user-agent'],
                responseTime: Math.round(time)
            });
        }));
    }

    addStandardEndpoints() {
        var docInfo;
        try {
            docInfo = JSON.parse(fs.readFileSync('api_data.json', 'utf8'));
        } catch (e) {
            docInfo = [];
        }

        this.server.get('/_health', (req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            this.sendHealthStatus(res);
        });

        this.server.get('/_info', (req, res) => {
            res.send(serviceInfo);
        });

        this.server.get('/_doc', (req, res) => {
            res.send(docInfo);
        });

        this.server.get('/_diagnostics', (req, res) => {
            this.sendDiagnosticsInfo(res);
        });

        this.server.get('/_testAlarm', (req, res) => {
            let event = log.alarm({
                id: req.params['id'] || '200001',
                category: req.params['category'] || 'Test alarm',
                severity: <AlarmSeverity>(AlarmSeverity[req.params['severity']] || AlarmSeverity.MINOR),
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

        this.server.post('/_control?action=restart', (req, res) => {
            log.info('Restart request received');
            res.send({ code: 'OK' });
            process.nextTick(() => process.exit());
        });

        this.server.post('/_control/info', (req, res) => {
            objectAddEachProperty(req.body, serviceInfo);
            log.info('Service info updated', serviceInfo);
            res.send({ code: 'OK', info: serviceInfo });
        });
    }

    configure() {
    }

    sendDiagnosticsInfo(res) {
        res.send({});
    }

    sendHealthStatus(res) {
        res.send('normal');
    }

    startServer() {
        var httpServer = this.server.listen(serviceInfo.port || 0, () => {
            var port = httpServer.address().port;
            log.info('Server listening on port: %d', port);
            serviceInfo.port = port;
            this.register();
            this.monitor();
        });
    }

    autoShutdown() {
        if (serviceInfo.maxLifeTime > 0) {
            let shutdownDelay = serviceInfo.maxLifeTime * 60 * 1000 + Math.round(Math.random() * 100000);
            setTimeout(() => {
                process.exit(0);
            }, shutdownDelay)
        }
    }
}
