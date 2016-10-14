/**
 * Created by Chris Thill on 16/10/15.
 */
"use strict";
var chai = require('chai');
var expect = chai.expect;
var service_info_1 = require('../src/service-info');
service_info_1.serviceInfo.update({ standalone: true, forever: false, busDisabled: true });
describe('service', function () {
    describe('getServiceInfo', function () {
        it('runs successfully without APP_ENV or APP_CONFIG set.', function (callback) {
            expect(service_info_1.serviceInfo.name).to.equal('common-nodejs');
            callback();
        });
        it('runs successfully with with APP_ENV set but no config file.', function (callback) {
            process.env.APP_ENV = 'XXXX';
            expect(service_info_1.serviceInfo.reload().extras).to.eql({});
            callback();
        });
        it('runs successfully with with APP_ENV set and config file exists and APP_CONFIG set.', function (callback) {
            process.env.APP_ENV = 'UNIT_TEST';
            process.env.APP_CONFIG = '{"extras": {"name" : "fromAppConfig"}}';
            expect(service_info_1.serviceInfo.reload().extras).to.eql({ name: "fromAppConfig" });
            callback();
        });
    });
});
//# sourceMappingURL=service.js.map