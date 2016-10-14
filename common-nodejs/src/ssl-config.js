/**
 * SSL Configuration Objects
 */
"use strict";
var json_client_1 = require('./json-client');
var fs = require('fs');
var logger_1 = require('./logger');
var utils_1 = require('./utils');
var CERT_PATH_BASE = 'certsEtcd';
var ETCD_KEYS_BASE = '/v2/keys'; // This is needed as syncGet is a straight HTTP get so the you need to provide the complete URL.
var ETCD_CERT_BASE = '/env/certificates';
var SslConfigEtcdJson = (function () {
    function SslConfigEtcdJson() {
        this.ca = [];
    }
    return SslConfigEtcdJson;
}());
var SslConfigEtcdImpl = (function () {
    function SslConfigEtcdImpl(etcdKey) {
        this.ca = [];
        logger_1.log.info('Creating an instance of SslConfigEtcdImpl for key [%s]', etcdKey);
        var sslConfigJson = SslConfigEtcdImpl.readConfigFromEtcd(etcdKey);
        if (sslConfigJson.ca) {
            //let asciiText = new Buffer(sslConfigJson.ca, 'base64').toString('ascii');
            //this.ca = SslConfigEtcdImpl.writeToFile(etcdKey, 'caFile', asciiText);
            for (var i in sslConfigJson.ca) {
                this.ca.push(new Buffer(sslConfigJson.ca[i], 'base64').toString('ascii'));
            }
        }
        if (sslConfigJson.cert) {
            var asciiText = new Buffer(sslConfigJson.cert, 'base64').toString('ascii');
            this.cert = SslConfigEtcdImpl.writeToFile(etcdKey, 'certificateFile', asciiText);
        }
        if (sslConfigJson.key) {
            var asciiText = new Buffer(sslConfigJson.key, 'base64').toString('ascii');
            this.key = SslConfigEtcdImpl.writeToFile(etcdKey, 'keyFile', asciiText);
        }
        if (sslConfigJson.password) {
            this.password = sslConfigJson.password;
        }
        if (sslConfigJson.userName) {
            this.userName = sslConfigJson.userName;
        }
    }
    SslConfigEtcdImpl.readConfigFromEtcd = function (etcdKey) {
        var certifcateKey = ETCD_KEYS_BASE + ETCD_CERT_BASE + '/' + etcdKey;
        var sslConfigJson = new SslConfigEtcdJson();
        var sslConfigJsonString = SslConfigEtcdImpl.getEtcdValue(certifcateKey);
        if (!sslConfigJsonString) {
            var msg = 'No SSL config returned from ETCD for [' + certifcateKey + ']';
            logger_1.log.error(msg);
            throw new Error(msg);
        }
        try {
            sslConfigJson = JSON.parse(sslConfigJsonString);
        }
        catch (e) {
            var msg = 'Error parsing the string value extracted from ETCD' + JSON.stringify(e);
            logger_1.log.error(msg);
            throw new Error(msg);
        }
        if (!sslConfigJson && !sslConfigJson.ca && !sslConfigJson.cert && !sslConfigJson.key && !sslConfigJson.userName && !sslConfigJson.password) {
            var msg = 'No data in ETCD for the SSL config [' + certifcateKey + ']';
            logger_1.log.error(msg);
            throw new Error(msg);
        }
        logger_1.log.debug('The SSL Configuration gotten from ETCD loaded is', sslConfigJson);
        return sslConfigJson;
    };
    SslConfigEtcdImpl.getEtcdValue = function (etcdKey) {
        var etcdNode;
        try {
            logger_1.log.info('Getting the etcd node for key [%s]', etcdKey);
            etcdNode = json_client_1.syncGet('http://' + utils_1.getRegistryHost() + ':4001', etcdKey);
        }
        catch (e) {
            logger_1.log.error('An error occured while gettting SSL config CA from etcd', e);
            return;
        }
        logger_1.log.debug('The ETCD value returned is', etcdNode);
        if (!etcdNode || !etcdNode.node || !etcdNode.node.value) {
            logger_1.log.error('No value in etcd data returned for key.');
            return;
        }
        return etcdNode.node.value;
    };
    SslConfigEtcdImpl.writeToFile = function (etcdKey, fileName, fileContents) {
        logger_1.log.debug('etcdKey %s', etcdKey);
        logger_1.log.debug('fileName %s', fileName);
        logger_1.log.debug('file contents %s', fileContents);
        // Write the contents to the file given.
        var certPathFull = CERT_PATH_BASE + '/' + etcdKey;
        var certFileName = certPathFull + '/' + fileName;
        // Check that the directories exists.
        try {
            fs.accessSync(CERT_PATH_BASE, fs.F_OK);
        }
        catch (e) {
            // It isn't accessible
            logger_1.log.info('Path [%s] not present so creating it!', CERT_PATH_BASE);
            fs.mkdirSync(CERT_PATH_BASE);
        }
        try {
            fs.accessSync(certPathFull, fs.F_OK);
        }
        catch (e) {
            // It isn't accessible
            logger_1.log.info('Path [%s] not present so creating it!', certPathFull);
            fs.mkdirSync(certPathFull);
        }
        // If the file already exists overwrite it.
        try {
            fs.accessSync(certFileName, fs.F_OK);
            logger_1.log.warn('The certificate file [%s] exists so I am deleting it and recreating it.', certFileName);
            try {
                fs.unlinkSync(certFileName);
            }
            catch (e) {
                logger_1.log.warn('An error occurred trying to delete the existing file [%s]. It will be ignored and processing will continue.', certFileName, e);
            }
        }
        catch (e) {
            // It isn't accessible
            logger_1.log.debug('The file does not exists so no need to delete it before writing the new contents [%s].', certFileName, e);
        }
        // Write the data to the file.
        fs.writeFileSync(certFileName, fileContents);
        return certFileName;
    };
    return SslConfigEtcdImpl;
}());
exports.SslConfigEtcdImpl = SslConfigEtcdImpl;
//# sourceMappingURL=ssl-config.js.map