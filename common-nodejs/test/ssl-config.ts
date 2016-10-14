/**
 * Created by Chris Thill on 16/10/15.
 */

import chai = require('chai');
import fs = require('fs');

import {SslConfig, SslConfigEtcdImpl} from "../src/ssl-config";
import {JsonClient, getJsonClient} from "../src/json-client"
import {NotExtendedError} from "restify";

var Etcd = require('node-etcd');

var expect = chai.expect;


describe.skip('ssl-config', function () {
    //
    // NOTE this test case needs some manual setup before it will succeed.  This is why it is "skip"ed
    //      You will need to be running ETCD on your local machine.  Download it from the
    //      web site https://github.com/coreos/etcd/releases/
    //      Once ETCD is running locally this test should be set to go.
    var etcd;

    before(function () {
        console.log('Connect tot he locally running ETCD instance and populate the test data.');
        this.etcd = new Etcd('localhost', 4001);

        // Load a simple CA certificate into ETCD for testing.
        let ca:Array<string> = [fs.readFileSync('test/certs/fn0/Telstra Test Root CA.pem.cer', 'utf8')];
        let unitTestDataCaOnlyJson = {'ca': new Buffer(ca).toString('base64')};
        //console.log('The value to set is ['+JSON.stringify(sslConfigEtcdJson)+']');
        //this.etcd.set('/env/certificates/unitTestDataCaOnly', JSON.stringify(unitTestDataCaOnlyJson));
        //this.etcd.get('/env/certificates/unitTestDataCaOnly', console.log);

        // Load a fully populate SSL config into ETCD for testing purposes
        // TODO get a certfile and key file to load into the SSL config.
        let caCert = [new Buffer(ca[0]).toString('base64')]
        let unitTestFullSslConfigJson = {'ca': [caCert], 'cert': caCert, 'key': caCert, 'userName': 'unitTestUserName', 'password': 'unitTestPassword'};
        this.etcd.set('/env/certificates/unitTestFullSslConfig', JSON.stringify(unitTestFullSslConfigJson));
        //this.etcd.get('/env/certificates/unitTestRubbishData', console.log);

        // Put in an SSL configuration that will work with the DMS system
        let dmsService = {'ca': [caCert], 'userName': 'microservices', 'password': 'cGFzc3dvcmQ'};
        this.etcd.set('/env/certificates/dmsService', JSON.stringify(dmsService));

        // Simple data (but useless) put into ETCD to see if it is working.
        this.etcd.set('/env/certificates/unitTestFullRubbishData', '{ "cert": "- Base64 data -", "key": "- Base64 data -", "ca": "- Base64 data -" }');
    });
    describe('constructor', function () {
        it('runs successfully when the ETCD key is passed in for an existing ETCD entry.', function (callback) {
            console.log('Create an SslConfigEtcdImpl.');
            //let sslConfig: SslConfig = new SslConfigEtcdImpl('http://dsapi.dev.cly.np.top.corp.telstra.com/proxy/http://10.12.35.105:4001', 'unitTestDataCaOnly');
            let sslConfig: SslConfig = new SslConfigEtcdImpl('dmsService');

            expect(sslConfig.ca).to.equal('certsEtcd/dmsService/caFile');
            expect(sslConfig.userName).to.equal('microservices');
            expect(sslConfig.password).to.equal('cGFzc3dvcmQ');
            callback();
        });
        it('fails gracefully when a ETCD key for a non existent ETCD etry is passed in', function (callback) {
            console.log('Create an SslConfigEtcdImpl.');
            expect(() => {new SslConfigEtcdImpl('asdf')}).to.throw(Error, new RegExp('No SSL config returned from ETCD for '));

            callback();
        });
    });
});

