import {log} from "./logger";
export interface Handler {
    (context, state?, event?)
}


export class Transition {
    constructor(public from, public event, public to, public final: boolean){
    }
}

export interface Context {
    state?: string;
    nextState?: string;
    nextStateFinal?: boolean;
    prevState?: string;
    lastEvent?: string;
    finished?: boolean;
    events?: string[];
}

export enum HandlerType {
    WHEN_ENTER,
    WHEN_LEAVE,
    WHEN_EVENT
}

export class HandlerRecord {
    constructor(public handler: Handler, public match, public type: HandlerType) {
    }
}

export function runAsync(callback) {
    process.nextTick(callback);
}

export function from(state, ...transitions: Transition[]) {
    var t = EasyFlow.currentInstance;
    t.initialState = state;
    transitions.forEach((transition) => {
        if (!transition.from) {
            transition.from = state;
            t.resolvedTransitions.push(transition);
        }
    });
}

export function on(event, transition: Transition): Transition {
    transition.event = event;
    return transition;
}

function to_(final: boolean, state, ...transitions): Transition {
    var result;
    var t = EasyFlow.currentInstance;
    transitions.forEach((transition) => {
        if (!transition.to) {
            transition.to = state;
            result = transition;
        } else if (!transition.from) {
            transition.from = state;
            t.resolvedTransitions.push(transition);
        }
    });

    if (!result) {
        result = new Transition(null, null, state, final);
    }

    return result;
}


export function to(state, ...transitions): Transition {
    return to_.apply(null, [false, state].concat(transitions));
}

export function finish(state, ...transitions): Transition {
    return to_.apply(null, [true, state].concat(transitions));
}

export function whenEnter(state, handler: Handler) {
    EasyFlow.currentInstance.whenEnter(state, handler);
}

export function whenLeave(state, handler: Handler) {
    EasyFlow.currentInstance.whenLeave(state, handler);
}

export function whenEvent(event, handler: Handler) {
    EasyFlow.currentInstance.whenEvent(event, handler);
}

export class EasyFlow {
    static currentInstance;

    resolvedTransitions: Transition[] = [];
    handlers: HandlerRecord[] = [];
    initialState;
    debug = false;

    constructor() {
        EasyFlow.currentInstance = this;
    }

    start(context: Context = {}, initialState?): any {
        this.enter(context, initialState || this.initialState);
        return context;
    }

    trigger(event, context: Context) {
        if (this.event(context, event)) {
            if (context.finished) {
                log.warn('Warning: trying to exit final state %s', context.state);
                return;
            }

            this.leave(context);
            this.enter(context, context.nextState);
        } else {
            log.warn('Warning: invalid event triggered %s in state %s', event, context.state);
        }
    }

    whenEnter(state, handler: Handler) {
        this.handlers.push(new HandlerRecord(handler, state, HandlerType.WHEN_ENTER));
    }

    whenLeave(state, handler: Handler) {
        this.handlers.push(new HandlerRecord(handler, state, HandlerType.WHEN_LEAVE));
    }

    whenEvent(event, handler: Handler) {
        this.handlers.push(new HandlerRecord(handler, event, HandlerType.WHEN_EVENT));
    }


    dumpTransitions() {
        this.resolvedTransitions.forEach(t => {
            log.warn("%s => (%s) => %s%s", t.from, t.event, t.to, t.final ? ' (final)' : '');
        });
    }

    event(context: Context, event): boolean {
        var matchedTransition;

        for (var i = 0; i < this.resolvedTransitions.length; i++) {
            var transition = this.resolvedTransitions[i];
            if (context.state === transition.from && event === transition.event) {
                context.nextState = transition.to;
                context.nextStateFinal = transition.final;
                context.lastEvent = event;
                matchedTransition = transition;
                break;
            }
        }

        if (matchedTransition) {
            if (this.debug) {
                log.warn('Debug: triggered event %s', event);
            }

            this.handlers.forEach(handler => {
                if (handler.type === HandlerType.WHEN_EVENT && (handler.match === '*' || handler.match === event)) {
                    runAsync(() => {
                        handler.handler(context, context.state, event);
                    });
                }
            });
        }

        return !!matchedTransition;
    }

    enter(context: Context, nextState) {
        runAsync(() => {
            context.events = [];
            context.state = nextState;
            this.resolvedTransitions.forEach(transition => {
                if (context.state === transition.from) {
                    context.events.push(transition.event);
                }
            });

            if (this.debug) {
                log.warn('Debug: entered state %s', nextState);
            }

            if (context.nextStateFinal) {
                context.finished = true;
                if (this.debug) {
                    log.warn('Debug: context finished');
                }
            }

            this.handlers.forEach(handler => {
                if (handler.type === HandlerType.WHEN_ENTER && (handler.match === '*' || handler.match === nextState)) {
                    runAsync(() => {
                        handler.handler(context, context.state, context.lastEvent);
                    });
                }
            });
        });
    }

    leave(context: Context) {
        if (context.state) {
            runAsync(() => {
                context.prevState = context.state;

                this.handlers.forEach(handler => {
                    if (handler.type === HandlerType.WHEN_LEAVE && (handler.match === '*' || handler.match === context.prevState)) {
                        runAsync(() => {
                            handler.handler(context, context.state, context.lastEvent);
                        });
                    }
                });
            });
        }
    }
}

export function responseHandler(context, trigger, hint?, events?) {
    return (err, res?, body?) => {
        if (!err && ((res && res.statusCode && res.statusCode > 299) || (body && body.code && body.code.indexOf('ERROR') !=-1))) {
            err = res.statusCode + ': ' + body.code;
            if (body && body.message) {
                err += ': ' + body.message;
            }
            err = {message: err};
        }

        context.err = err;
        context.res = res;
        context.body = body;

        if (!events){
            events = ['success', 'error'];
        }

        if (err) {
            log.warn('Error handled by responseHandler while %s: %s', hint, err.message);
        }

        trigger(err && events.length > 1 ? events[1] : events[0], context);
    };
}

export function middleware(flow: EasyFlow) {
    return (req, res) => {
        flow.start(<any>{originalReq: req, originalRes: res});
    };
}