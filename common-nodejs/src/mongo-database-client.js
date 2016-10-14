/**
 * Created by cam on 23/01/16.
 */
"use strict";
var url_1 = require('url');
var utils_1 = require('./utils');
var logger_1 = require("./logger");
var MongoClient = require('mongodb').MongoClient;
var clients = {};
var MongoDatabaseClient = (function () {
    function MongoDatabaseClient(url) {
        this.url = url;
    }
    // NOTE: Other invokers do not pass body through to get
    MongoDatabaseClient.prototype.get = function (body, resultHandler) {
        MongoClient.connect(this.url.href, function (err, db) {
            if (err) {
                resultHandler(err, null, null);
                return;
            }
            db.collection(body.collection).find(body.queryObject).toArray(function (err, docs) {
                var obj = [];
                for (var i = 0; i < docs.length; i++) {
                    obj.push(docs[i]);
                    logger_1.log.debug("Found object", docs[i]);
                }
                db.close();
                var res = { "statusCode": 200 };
                resultHandler(err, res, obj);
            });
        });
    };
    MongoDatabaseClient.prototype.post = function (body, resultHandler) {
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
                }
                else {
                    logger_1.log.debug("Created a document in the %s collection.", body.collection);
                    logger_1.log.debug("resulted in ", result);
                    db.close();
                    var res = { "statusCode": 200 };
                    resultHandler(err, res, obj);
                }
            });
        });
    };
    MongoDatabaseClient.prototype.put = function (body, resultHandler) {
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
                    if (err)
                        throw err;
                    logger_1.log.debug("Single document updated in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            }
            else if (type == "MANY") {
                collection.updateMany(queryObject, updatedFieldsObject, function (err, res) {
                    if (err)
                        throw err;
                    logger_1.log.debug("Many documents updated in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            }
            else if (type == "REPLACE") {
                collection.replaceOne(queryObject, updatedFieldsObject, function (err, res) {
                    if (err)
                        throw err;
                    logger_1.log.debug("Single document replaced in the %s collection.", collection);
                    db.close();
                    results = res;
                    resultHandler(err, res, obj);
                });
            }
            else {
                logger_1.log.debug("A valid update type was not specified");
                var res = { "statusCode": 400 };
                db.close();
                resultHandler(err, res, obj);
            }
        });
    };
    MongoDatabaseClient.prototype.del = function (body, resultHandler) {
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
                    if (err)
                        throw err;
                    logger_1.log.debug("Single document deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            }
            else if (type == "MANY") {
                collection.deleteMany(body.queryObject, function (err, res) {
                    if (err)
                        throw err;
                    logger_1.log.debug("Many documents deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    logger_1.log.debug("Documents Removed: %d", res.deletedCount);
                    resultHandler(err, res, obj);
                });
            }
            else if (type == "ALL") {
                collection.deleteMany({}, function (err, res) {
                    if (err)
                        throw err;
                    logger_1.log.debug("All documents deleted from the %s collection.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            }
            else if (type == "DROP") {
                collection.drop(function (err, res) {
                    if (err)
                        throw err;
                    logger_1.log.debug("%s collection dropped.", collection);
                    db.close();
                    results = res;
                    results.statusCode = 200;
                    resultHandler(err, res, obj);
                });
            }
            else {
                logger_1.log.debug("A valid delete type was not specified");
                var res = { "statusCode": 400 };
                db.close();
                resultHandler(err, res, obj);
            }
        });
    };
    return MongoDatabaseClient;
}());
exports.MongoDatabaseClient = MongoDatabaseClient;
function getMongoDatabaseClient(url, path, params) {
    if (path === void 0) { path = ''; }
    if (params === void 0) { params = {}; }
    return url_1.parse(utils_1.parametriseUrl((url.href || url) + path, params));
}
exports.getMongoDatabaseClient = getMongoDatabaseClient;
//# sourceMappingURL=mongo-database-client.js.map