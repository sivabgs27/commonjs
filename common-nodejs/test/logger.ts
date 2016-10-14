import { expect } from 'chai';

import {LoggerSet, MetricType, AlarmSeverity} from '../src/logger'

let serviceInfo = {
    name: 'some-service',
    environment: 'test',
    hostName: 'host.local',
    logLevel: 'DEBUG'
};


describe('Logger', () => {
    it('Creating event from formatted message, and parameters: string, number, extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.info('Some message: %s, %d', 'string', 111, { 'aaa': 'bbb', 'ccc': 222 });
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                aaa: 'bbb',
                ccc: 222
            },
            host: 'host.local',
            message: 'Some message: string, 111',
            type: 'INFO'
        });
    });

    it('Creating event from simple message, and parameters: extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.debug('Some message', { 'aaa': 'bbb', 'ccc': 222 });
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                aaa: 'bbb',
                ccc: 222
            },
            host: 'host.local',
            message: 'Some message',
            type: 'DEBUG'
        });
    });

    it('Creating event from missing message, and parameters: extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.warn(undefined, { 'aaa': 'bbb', 'ccc': 222 });
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                aaa: 'bbb',
                ccc: 222
            },
            host: 'host.local',
            type: 'WARN'
        });
    });

    it('Creating event from simple message, and no parameters', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.error('Some error message');
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            host: 'host.local',
            message: 'Some error message',
            type: 'ERROR'
        });
    });

    it('Creating event from simple message, and number parameter', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.error('Some error message: %d', 123);
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            host: 'host.local',
            message: 'Some error message: 123',
            type: 'ERROR'
        });
    });

    it('Creating event from formatted message, and parameters: object, extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.info('Some message: %j', { 'aaa': 'bbb', 'ccc': 222 }, { 'ddd': 333 });
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                ddd: 333,
            },
            host: 'host.local',
            message: 'Some message: {\"aaa\":\"bbb\",\"ccc\":222}',
            type: 'INFO'
        });
    });

    it('Ignoring invocation with empty message and extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.info('');
        expect(event).to.be.an('undefined');
    });

    it('Creating metric event with extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.metric(MetricType.MEMORY, { 'aaa': 'bbb', 'ccc': 222, metric: 'MEMORY' });
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                aaa: 'bbb',
                ccc: 222,
                metric: 'MEMORY'
            },
            host: 'host.local',
            type: 'METRIC'
        });
    });

    it('Creating metric event without extras', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.metric(MetricType.MEMORY);
        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                metric: 'MEMORY'
            },
            host: 'host.local',
            type: 'METRIC'
        });
    });

    it('Creating alarm event', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.alarm({ id: '111', category: 'Circuit Breaker', severity: AlarmSeverity.MAJOR, module: 'svc-service',
            server: 'host.local', message: 'Alarm!!!',shortText:'Circuit breaker',longText:'Circuit breaker'});

        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                category: 'Circuit Breaker',
                id: '111',
                message: 'Alarm!!!',
                module: 'svc-service',
                server: 'host.local',
                severity: 'MAJOR',
                shortText:'Circuit breaker',
                longText:'Circuit breaker'
            },
            host: 'host.local',
            message: 'Alarm!!!',
            type: 'ALARM'
        });
    });

    it('Creating access event', () => {
        let log = new LoggerSet(serviceInfo);
        let event = log.access({ remoteIp:"127.0.0.1",dateTime:"2016-05-15T23:57:33+10:00",method:"GET",path:"/orders/planChangeOrders/v1?serviceId=0429760649&startDate=11-02-2016",code:"200",userAgent:"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",responseTime:1678});

        expect(event).to.be.eql({
            name: 'some-service',
            environment: 'test',
            extras: {
                remoteIp: "127.0.0.1",
                dateTime: "2016-05-15T23:57:33+10:00",
                method: "GET",
                path: "/orders/planChangeOrders/v1?serviceId=0429760649&startDate=11-02-2016",
                code: "200",
                userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
                responseTime: 1678
            },
            host: 'host.local',
            type: 'ACCESS'
        });
    });
});
