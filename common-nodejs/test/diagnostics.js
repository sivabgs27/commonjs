"use strict";
var diagnostics_1 = require("../src/diagnostics");
var chai_1 = require('chai');
var MockProbe = (function () {
    function MockProbe() {
        this.probeHasRun = false;
    }
    MockProbe.prototype.runProbe = function () {
        this.probeHasRun = true;
        var response = new diagnostics_1.ProbeScan();
        response.type = diagnostics_1.ProbeType.GUARD;
        response.name = 'UnitTest';
        response.severity = diagnostics_1.ProbeScanSeverity.INFO;
        return response;
    };
    return MockProbe;
}());
describe('Diagnostics', function () {
    describe('Diagnostics', function () {
        beforeEach(function () {
            diagnostics_1.diagnostics.flushProbes();
        });
        it('Test a registered probe is run', function (callback) {
            var mockProbe = new MockProbe();
            diagnostics_1.diagnostics.registerProbe(function () { return mockProbe.runProbe(); });
            var scans = diagnostics_1.diagnostics.run();
            chai_1.expect(mockProbe.probeHasRun).to.equal(true);
            chai_1.expect(scans[0].name).to.equal('UnitTest');
            chai_1.expect(scans[0].type).to.equal('GUARD');
            chai_1.expect(scans[0].severity).to.equal('INFO');
            callback();
        });
    });
    describe('Probe Scan', function () {
        it('Test the timer works', function (callback) {
            var probeScan = new diagnostics_1.ProbeScan();
            probeScan.startTimer();
            for (var i = 0; i < 1000; i++) {
                // Hopefully this is equivelant to a sleep.
                var x = i ^ i;
            }
            probeScan.finaliseTimer();
            chai_1.expect(probeScan.duration).is.greaterThan(-1);
            callback();
        });
    });
});
//# sourceMappingURL=diagnostics.js.map