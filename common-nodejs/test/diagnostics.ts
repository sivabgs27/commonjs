import chai = require('chai');

import {diagnostics, ProbeScan, ProbeScanSeverity, ProbeType} from "../src/diagnostics";

import { expect } from 'chai'

class MockProbe {
    probeHasRun: boolean = false;

    runProbe() {
        this.probeHasRun = true;

        let response = new ProbeScan();
        response.type = ProbeType.GUARD;
        response.name = 'UnitTest';
        response.severity = ProbeScanSeverity.INFO;

        return response;
    }
}

describe('Diagnostics', () => {
    describe('Diagnostics', () => {
        beforeEach(() => {
            diagnostics.flushProbes();
        })
        it('Test a registered probe is run', (callback) => {
            let mockProbe = new MockProbe();

            diagnostics.registerProbe( () => {return mockProbe.runProbe()} );
            let scans = diagnostics.run();

            expect(mockProbe.probeHasRun).to.equal(true);
            expect(scans[0].name).to.equal('UnitTest');
            expect(scans[0].type).to.equal('GUARD');
            expect(scans[0].severity).to.equal('INFO');

            callback();
        });
    });
    describe('Probe Scan', () => {
        it('Test the timer works', (callback) => {
            let probeScan = new ProbeScan();

            probeScan.startTimer();
            for (let i=0; i < 1000; i++) {
                // Hopefully this is equivelant to a sleep.
                let x = i^i;
            }
            probeScan.finaliseTimer();

            expect(probeScan.duration).is.greaterThan(-1);

            callback();
        });
    });
});
