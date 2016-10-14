/**
 * SSL Configuration Objects
 */


import { syncGet } from './json-client';
import fs = require('fs');
import soap = require('soap');
import { log } from './logger';
import {getRegistryHost} from './utils'

let CERT_PATH_BASE:string = 'certsEtcd';
let ETCD_KEYS_BASE:string = '/v2/keys'; // This is needed as syncGet is a straight HTTP get so the you need to provide the complete URL.
let ETCD_CERT_BASE:string = '/env/certificates';

class SslConfigEtcdJson {
    key: string;
    cert: string;
    ca: Array<string> = [];
    userName: string;
    password: string;
}

export interface SslConfig {
    key: string;
    cert: string;
    ca: Array<string>;
    userName: string;
    password: string;

    // TODO Look at properties that are needed like isSllEnabled or isPasswordEnable
}

export interface InvokerSSLSecurityConfig {
    ca: Array<string>;
    key:  string;
    cert: string;   
}

export class SslConfigEtcdImpl implements SslConfig {
    key: string;
    cert: string;
    ca: Array<string> = [];
    userName: string;
    password: string;

    constructor(etcdKey: string) {
        log.info('Creating an instance of SslConfigEtcdImpl for key [%s]', etcdKey);

        let sslConfigJson:SslConfigEtcdJson = SslConfigEtcdImpl.readConfigFromEtcd(etcdKey);

        if (sslConfigJson.ca) {
            //let asciiText = new Buffer(sslConfigJson.ca, 'base64').toString('ascii');
            //this.ca = SslConfigEtcdImpl.writeToFile(etcdKey, 'caFile', asciiText);
            for(var i in sslConfigJson.ca) {
                this.ca.push(new Buffer(sslConfigJson.ca[i], 'base64').toString('ascii'));
            }
        }
        if (sslConfigJson.cert) {
            let asciiText = new Buffer(sslConfigJson.cert, 'base64').toString('ascii');
            this.cert = SslConfigEtcdImpl.writeToFile(etcdKey, 'certificateFile', asciiText);
        }
        if (sslConfigJson.key) {
            let asciiText = new Buffer(sslConfigJson.key, 'base64').toString('ascii');
            this.key = SslConfigEtcdImpl.writeToFile(etcdKey, 'keyFile', asciiText);
        }
        if (sslConfigJson.password) {
            this.password = sslConfigJson.password;
        }
        if (sslConfigJson.userName) {
            this.userName = sslConfigJson.userName;
        }
    }

    private static readConfigFromEtcd(etcdKey: string):SslConfigEtcdJson {
        let certifcateKey = ETCD_KEYS_BASE+ETCD_CERT_BASE+'/'+etcdKey;

        let sslConfigJson:SslConfigEtcdJson = new SslConfigEtcdJson();

        let sslConfigJsonString:string = SslConfigEtcdImpl.getEtcdValue(certifcateKey);

        if (!sslConfigJsonString) {
            let msg:string = 'No SSL config returned from ETCD for ['+certifcateKey+']';
            log.error(msg);
            throw new Error(msg)
        }

        try {
            sslConfigJson = JSON.parse(sslConfigJsonString);
        } catch (e) {
            let msg:string = 'Error parsing the string value extracted from ETCD' + JSON.stringify(e);
            log.error(msg);
            throw new Error(msg);
        }

        if (!sslConfigJson && !sslConfigJson.ca && !sslConfigJson.cert && !sslConfigJson.key && !sslConfigJson.userName && !sslConfigJson.password) {
            let msg:string = 'No data in ETCD for the SSL config ['+certifcateKey+']';
            log.error(msg);
            throw new Error(msg);
        }

        log.debug('The SSL Configuration gotten from ETCD loaded is', sslConfigJson);
        return sslConfigJson;
    }

    private static getEtcdValue(etcdKey: string):string {
        let etcdNode:any;
        try {
            log.info('Getting the etcd node for key [%s]', etcdKey);
            etcdNode = syncGet('http://'+getRegistryHost()+':4001', etcdKey);
        } catch (e) {
            log.error('An error occured while gettting SSL config CA from etcd', e);
            return;
        }

        log.debug('The ETCD value returned is', etcdNode);

        if (!etcdNode || !etcdNode.node || !etcdNode.node.value) {
            log.error('No value in etcd data returned for key.');
            return;
        }
        return etcdNode.node.value;
    }

    private static writeToFile(etcdKey:string, fileName: string, fileContents: string):string {
        log.debug('etcdKey %s', etcdKey);
        log.debug('fileName %s', fileName);
        log.debug('file contents %s', fileContents);

        // Write the contents to the file given.
        let certPathFull = CERT_PATH_BASE+'/'+etcdKey;
        let certFileName = certPathFull+'/'+fileName;

        // Check that the directories exists.
        try {
            fs.accessSync(CERT_PATH_BASE, fs.F_OK);
        } catch (e) {
            // It isn't accessible
            log.info('Path [%s] not present so creating it!', CERT_PATH_BASE);
            fs.mkdirSync(CERT_PATH_BASE);
        }
        try {
            fs.accessSync(certPathFull, fs.F_OK);
        } catch (e) {
            // It isn't accessible
            log.info('Path [%s] not present so creating it!', certPathFull);
            fs.mkdirSync(certPathFull);
        }

        // If the file already exists overwrite it.
        try {
            fs.accessSync(certFileName, fs.F_OK);
            log.warn('The certificate file [%s] exists so I am deleting it and recreating it.', certFileName);
            try {
                fs.unlinkSync(certFileName);
            } catch (e) {
                log.warn('An error occurred trying to delete the existing file [%s]. It will be ignored and processing will continue.', certFileName, e);
            }
        } catch (e) {
            // It isn't accessible
            log.debug('The file does not exists so no need to delete it before writing the new contents [%s].', certFileName, e);
        }

        // Write the data to the file.
        fs.writeFileSync(certFileName, fileContents);
        return certFileName;
    }
}