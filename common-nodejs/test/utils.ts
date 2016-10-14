import { expect } from 'chai';

import { objectReplaceEachProperty, objectClone, getFullServiceUrl } from '../src/utils'


let input1 = [
    {
        "type": "POST",
        "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/",
        "title": "CPQ - CreateBillingAccount",
        "name": "CreateBillingAccount",
        "group": "svc-cpq-cs-commerce-service",
        "description": "<p>create billing account</p>",
        "parameter": {
            "fields": {
                "Parameter": [
                    {
                        "group": "Parameter",
                        "optional": false,
                        "description": ""
                    }
                ]
            }
        },
        "version": "0.0.0",
        "filename": "src/service.ts",
        "groupTitle": "svc-cpq-cs-commerce-service",
        "sampleRequest": [
            {
                "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/"
            }
        ]
    },
    {
        "type": "get",
        "url": "/svc-cpq-cs-products-service/v1/mock/:id",
        "title": "Hello World",
        "name": "APIName",
        "group": "svc-cpq-cs-products-service",
        "description": "<p>APIDescription</p>",
        "parameter": {
            "fields": {
                "Parameter": [
                    {
                        "group": "Parameter",
                        "type": "String",
                        "optional": false,
                        "field": "id",
                        "description": "<p>Input ID, e.g. &quot;123&quot;</p>"
                    }
                    ]
            }
        }
    }
];

let output1 = [
    {
        "type": "POST",
        "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/",
        "title": "CPQ - CreateBillingAccount",
        "name": "CreateBillingAccount",
        "group": "svc-cpq-cs-commerce-service",
        "description": "<p>create billing account</p>",
        "parameter": {
            "fields": {
                "Parameter": []
            }
        },
        "version": "0.0.0",
        "filename": "src/service.ts",
        "groupTitle": "svc-cpq-cs-commerce-service",
        "sampleRequest": [
            {
                "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/"
            }
        ]
    },
    {
        "type": "get",
        "url": "/svc-cpq-cs-products-service/v1/mock/:id",
        "title": "Hello World",
        "name": "APIName",
        "group": "svc-cpq-cs-products-service",
        "description": "<p>APIDescription</p>",
        "parameter": {
            "fields": {
                "Parameter": [
                    {
                        "group": "Parameter",
                        "type": "String",
                        "optional": false,
                        "field": "id",
                        "description": "<p>Input ID, e.g. &quot;123&quot;</p>"
                    }
                ]
            }
        }
    }
];

let output2 = [
    {
        "type": "POST",
        "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/",
        "title": "CPQ - CreateBillingAccount",
        "name": "CreateBillingAccount",
        "group": "svc-cpq-cs-commerce-service",
        "description": "<p>create billing account</p>",
        "parameter": {
            "fields": {
                "Parameter": [
                    {
                        "type": "Unknown",
                        "field": "Unknown",
                        "group": "Parameter",
                        "optional": false,
                        "description": ""
                    }
                ]
            }
        },
        "version": "0.0.0",
        "filename": "src/service.ts",
        "groupTitle": "svc-cpq-cs-commerce-service",
        "sampleRequest": [
            {
                "url": "/svc-cpq-cs-commerce-service/v1/commerce/v1/billing/"
            }
        ]
    },
    {
        "type": "get",
        "url": "/svc-cpq-cs-products-service/v1/mock/:id",
        "title": "Hello World",
        "name": "APIName",
        "group": "svc-cpq-cs-products-service",
        "description": "<p>APIDescription</p>",
        "parameter": {
            "fields": {
                "Parameter": [
                    {
                        "group": "Parameter",
                        "type": "String",
                        "optional": false,
                        "field": "id",
                        "description": "<p>Input ID, e.g. &quot;123&quot;</p>"
                    }
                ]
            }
        }
    }
];

describe('Utils', () => {
    describe('objectReplaceEachProperty', () => {
        it('removes fields when callback returns "undefined"', () => {
            expect(objectReplaceEachProperty(objectClone(input1), (k, v) => {
                if (!(v.group === 'Parameter' && (!v.type || !v.field))) {
                    return v;
                }
            })).to.eql(output1);
        });

        it('replaces fields when callback returns a value', () => {
            expect(objectReplaceEachProperty(objectClone(input1), (k, v) => {
                if (v.group === 'Parameter') {
                    v.type = v.type || 'Unknown';
                    v.field = v.field || 'Unknown';
                }

                return v;
            })).to.eql(output2);
        });

        // it('getFullServiceUrl() for any service instance', () => {
        //     expect(getFullServiceUrl('ud-nodejs-poc').href.toString()).to.equal('http://ud-nodejs-poc:3000/');
        // });
        //
        // it('getFullServiceUrl() for v1 service instance', () => {
        //     expect(getFullServiceUrl('ud-nodejs-poc', 1).href.toString()).to.equal('http://v1.ud-nodejs-poc:3000/');
        // });
        //
        // it('getFullServiceUrl() for specific service instance', () => {
        //     expect(getFullServiceUrl('ud-nodejs-poc', 1, 'abc123').href.toString()).to.equal('http://abc123.v1.ud-nodejs-poc:3000/');
        // });
    });
});
