/**
 * Created by Chris Thill on 16/10/15.
 */

import chai = require('chai');
var expect = chai.expect;

import { serviceInfo } from '../src/service-info'
serviceInfo.update({ standalone: true, forever: false, busDisabled: true });

describe('service', function () {
    describe('getServiceInfo', function () {
        it('runs successfully without APP_ENV or APP_CONFIG set.', function (callback) {
            expect(serviceInfo.name).to.equal('common-nodejs');
            callback();
        });
        it('runs successfully with with APP_ENV set but no config file.', function (callback) {
            process.env.APP_ENV = 'XXXX';

            expect(serviceInfo.reload().extras).to.eql({});
            callback();
        });
        it('runs successfully with with APP_ENV set and config file exists and APP_CONFIG set.', function (callback) {
            process.env.APP_ENV = 'UNIT_TEST';
            process.env.APP_CONFIG = '{"extras": {"name" : "fromAppConfig"}}';

            expect(serviceInfo.reload().extras).to.eql({ name: "fromAppConfig" });
            callback();
        });
    });
});