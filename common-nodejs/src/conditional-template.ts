/**
 * Created by cam on 8/02/2016.
 */

import { SimpleTemplate, GuardedInvoker, InvokerWrapper, InvocationContext } from './templates';
import async = require('async');
import {log} from "./logger";


export class ConditionalItem {
    template: SimpleTemplate;
    conditional: boolean;
    attribute: string;
    value: string;
    outcome: boolean;

    constructor(template: SimpleTemplate, conditional: boolean, attribute?: string, value?: string, outcome?: boolean) {
        this.template = template;
        this.conditional = conditional;
        this.attribute = attribute;
        this.value = value;
        this.outcome = outcome;
    }
}

export interface ItemMap {
    [index: string]: ConditionalItem
}

export class ConditionalTemplate extends SimpleTemplate {
    items: ConditionalItem[] = [];

    constructor(namedItems: ItemMap, guardInvoker?: InvokerWrapper) {
        super(null, guardInvoker);

        for (var key in namedItems)  {
            var item = namedItems[key];
            item.template.invoker.invokerName = key;
            this.items.push(item);
        }

    }
}


export class ConditionalChainTemplate extends ConditionalTemplate {
    constructor(namedItems: ItemMap, guardInvoker?: InvokerWrapper) {
        super(namedItems, guardInvoker);
    }

    prepareFinalOutput(context: InvocationContext) {
    }

    run(context: InvocationContext) {
        context.input.setCorrelationId(context.input.correlationId); // ensure correlationId exists

        let tasks = this.items.map(item => {

            return callback => {

                var attribute = item.attribute;
                var execute:boolean = true;
                if (item.conditional) {

                    log.debug("(context.state[attribute]  ==  item.value) == item.outcome");
                    log.debug("(%s == %s) == %s", context.state[attribute], item.value, item.outcome);
                    execute = ((context.state[attribute] == (item.value)) == item.outcome);
                }

                if (execute) {
                    context.invokerName = item.template.invoker.invokerName;
                    item.template.prepareInput(context);
                }

                if (execute) {
                    if (context.isValid()) {
                        item.template.guardInvoker.invoke(item.template.invoker, context, (context2) => {
                            if (context2.isValid()) {
                                item.template.prepareOutput(context2);
                            } else {
                                this.handleError(context2);
                            }

                            callback(context2.isValid() ? null : true);
                        })
                    } else {
                        callback(true);
                    }
                }
                else {
                    callback(!execute ? null : true)
                }
            }


        });

        async.series(tasks, () => {
            this.prepareFinalOutput(context);
            this.sendResult(context);
        });
    }

}

