"use strict";
(function (ProbeType) {
    ProbeType[ProbeType["GUARD"] = 0] = "GUARD";
    ProbeType[ProbeType["DATABASE"] = 1] = "DATABASE";
    ProbeType[ProbeType["DOWNSTREAM_REST"] = 2] = "DOWNSTREAM_REST";
    ProbeType[ProbeType["DOWNSTREAM_SOAP"] = 3] = "DOWNSTREAM_SOAP";
})(exports.ProbeType || (exports.ProbeType = {}));
var ProbeType = exports.ProbeType;
(function (ProbeScanSeverity) {
    ProbeScanSeverity[ProbeScanSeverity["INFO"] = 0] = "INFO";
    ProbeScanSeverity[ProbeScanSeverity["WARNING"] = 1] = "WARNING";
    ProbeScanSeverity[ProbeScanSeverity["CRITICAL"] = 2] = "CRITICAL";
})(exports.ProbeScanSeverity || (exports.ProbeScanSeverity = {}));
var ProbeScanSeverity = exports.ProbeScanSeverity;
var ProbeScan = (function () {
    function ProbeScan() {
        this.timestamp = new Date();
    }
    ProbeScan.prototype.startTimer = function () {
        this.startTime = new Date();
    };
    ProbeScan.prototype.finaliseTimer = function () {
        this.endTime = new Date();
        this.duration = (this.endTime.getTime() - this.startTime.getTime());
    };
    return ProbeScan;
}());
exports.ProbeScan = ProbeScan;
var Diagnostics = (function () {
    function Diagnostics() {
        this.probes = [];
    }
    Diagnostics.prototype.registerProbe = function (callback) {
        this.probes.push(callback);
    };
    Diagnostics.prototype.flushProbes = function () {
        // The only use case for this I can see is in the test cases.
        this.probes = [];
    };
    Diagnostics.prototype.run = function () {
        var results = [];
        for (var i = 0; i < this.probes.length; i++) {
            var probeScan = this.probes[i]();
            // Convert the timestamp to an ISO formated string
            probeScan.timestamp = probeScan.timestamp.toISOString();
            // remove any 'transient' variables from the object sent back.
            delete probeScan.startTime;
            delete probeScan.endTime;
            // convert the enums to text before returning.
            probeScan.type = ProbeType[probeScan.type];
            probeScan.severity = ProbeScanSeverity[probeScan.severity];
            results.push(probeScan);
        }
        return results;
    };
    return Diagnostics;
}());
exports.Diagnostics = Diagnostics;
exports.diagnostics = new Diagnostics();
//# sourceMappingURL=diagnostics.js.map