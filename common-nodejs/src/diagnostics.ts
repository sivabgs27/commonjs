

export enum ProbeType {
    GUARD, DATABASE, DOWNSTREAM_REST, DOWNSTREAM_SOAP
}

export enum ProbeScanSeverity {
    INFO, WARNING, CRITICAL
}

export class ProbeScan {
    timestamp: Date;
    type: ProbeType
    name: string;
    description: string;
    severity: ProbeScanSeverity;
    healthy: boolean;
    duration: number;
    details: any;

    // Working values not output in the final diagnostics response.
    startTime: Date;
    endTime: Date;

    constructor() {
        this.timestamp = new Date();
    }

    startTimer() {
        this.startTime = new Date();
    }

    finaliseTimer() {
        this.endTime = new Date();
        this.duration = (this.endTime.getTime() - this.startTime.getTime());
    }
}

export class Diagnostics {
    probes = [];

    registerProbe(callback) {
        this.probes.push(callback);
    }

    flushProbes() {
        // The only use case for this I can see is in the test cases.
        this.probes = [];
    }

    run() {
        let results = [];
        for (var i=0; i < this.probes.length; i++) {
            let probeScan = this.probes[i]()
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
    }
}

export let diagnostics: Diagnostics = new Diagnostics();
