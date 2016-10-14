/**
 * Created by cam on 23/01/16.
 */


import { Url, parse } from 'url'
import { parametriseUrl } from './utils';
import {log} from "./logger";
var MongoClient = require('mongodb').MongoClient;

var clients = {};

export interface MongoResultHandler {
    (err?: any, res?: any, body?: any);
}

export class MongoDatabaseClient {
    constructor(public url: Url) {}

    // NOTE: Other invokers do not pass body through to get
    public get(body:any, resultHandler:MongoResultHandler) {
        MongoClient.connect(this.url.href, function (err, db) {
            if (err) {
                resultHandler(err, null, null);
                return;
            }
            db.collection(body.collection).find(body.queryObject).toArray(function(err, docs) {
                var obj = [];
                for (var i=0; i< docs.length; i++)
                {
                    obj.push(docs[i]);
                    log.debug("Found object", docs[i]);
                }
                db.close();
                var res = { "statusCode":  200};
                resultHandler(err, res, obj);
            });
        });

    }

    public post(body: any, resultHandler: MongoResultHandler) {
        MongoClient.connect(this.url.href, function (err, db) {
            if (err) {
                resultHandler(err, null, null);
                return;
            }
            db.collection(body.collection).insertOne(body.object, function (err, result) {
                var obj = [];
                if (err) {
                    db.close();
                    resultHandler(err, null, null);
                    return;
                } else {
                    log.debug("Created a document in the %s collection.", body.collection);
                    log.debug("resulted in ", result);
                    db.close();
                    var res = { "statusCode":  200};
                    resultHandler(err, res, obj);
                }
            });

        });
    }

    put(body: any, resultHandler: MongoResultHandler) {
        //this.prepareClient();
        MongoClient.connect(this.url.href, function (err, db) {
            if (err) {
                resultHandler(err, null, null);
                return;
            }
            var obj = [];
            var collection = db.collection(body.collection);
            var type = body.queryType;
            var queryObject = body.queryObject;
            var updatedFieldsObject = body.updatedFieldsObject;
            var results;
            if (type == "SINGLE") {
                collection.updateOne(queryObject, updatedFieldsObject, function (err, res) {
                    if (err) throw err;
                    log.debug("Single document updated in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            } else if (type == "MANY") {
                collection.updateMany(queryObject, updatedFieldsObject, function (err, res) {
                    if (err) throw err;
                    log.debug("Many documents updated in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            } else if (type == "REPLACE") {
                collection.replaceOne(queryObject, updatedFieldsObject, function (err, res) {
                    if (err) throw err;
                    log.debug("Single document replaced in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            } else {
                log.debug("A valid update type was not specified");
                var res = { "statusCode": 400} ;
                db.close();
                resultHandler(err, res, obj);
            }

        });
    }

    del(body: any, resultHandler: MongoResultHandler) {
        MongoClient.connect(this.url.href, function (err, db) {
            if (err) {
                resultHandler(err, null, null);
                return;
            }
            var obj = [];
            var collection = db.collection(body.collection);
            var type = body.queryType;
            var results;
            if (type == "SINGLE") {
                collection.deleteOne(body.queryObject, function (err, res) {
                    if (err) throw err;
                    log.debug("Single document deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            } else if (type == "MANY") {
                collection.deleteMany(body.queryObject, function (err, res) {
                    if (err) throw err;
                    log.debug("Many documents deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    log.debug("Documents Removed: %d", res.deletedCount);
                    resultHandler(err, res, obj);
                });
            } else if (type == "ALL") {
                collection.deleteMany({}, function (err, res) {
                    if (err) throw err;
                    log.debug("All documents deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            } else if (type == "DROP") {
                collection.drop(function (err, res) {
                    if (err) throw err;
                    log.debug("%s collection dropped.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            }
            else {
                log.debug("A valid delete type was not specified");
                var res = { "statusCode": 400} ;
                db.close();
                resultHandler(err, res, obj);
            }
        });

    }
}

export function getMongoDatabaseClient(url, path = '', params = {}) {
    return parse(parametriseUrl((url.href || url) + path, params));
}

