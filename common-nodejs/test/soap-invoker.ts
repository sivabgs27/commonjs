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


describe.skip('soap-invoker', function () {
    describe('constructor', function () {
        it('Nothing', function (callback) {
            callback();
        });
    });
});

