/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const METRICTYPE = require('./metrics').METRICTYPE;
const Events = require('./events');
const FuzzerRequest = require('./request');
const FuzzUtils = require('./utils');

/**
 * @typedef { import('http').IncomingMessage } IncomingMessage
 *
 * @typedef {import('./reveal').Run} Run
 * @typedef {import('./reveal').Options} Options
 * @typedef {import('./reveal').InputRequest} InputRequest
 * @typedef {import('./reveal').Request} Request
 * @typedef {import('./reveal').MetricKey} MetricKey
 * @typedef {import('./reveal').MetricType} MetricType
 * @typedef {import('./reveal').FuzzRequestResult} FuzzRequestResult
 *
 * @typedef {import('./request')} FuzzerRequest
 *
 * @typedef {import('./runtime').RuntimeV1} Runtime
 */

const Fuzzer = module.exports = class {
    /**
     * @param {Runtime} runtime - A Runtime instance.
     * @param {Run} run - A run instance.
     */
    constructor(runtime, run) {

        this._runtime = runtime;
        this._id = this._runtime.initFuzzer(run);

        this._fuzzedreqs = 0;
        this._mutationsdone = false;
        this._handledreqs = 0;
        this._timeout = null;
        // @ts-ignore
        this._initListener();
    }

    /**
     * @param {Runtime} runtime - A Runtime instance.
     * @param {object} run - Raw fuzzer run.
     * @returns {Run | null}
     */
    static validateRun(runtime, run) {

        return runtime.validateRun(run);
    }

    /**
     * Check if fuzzer is a valid instance
     *
     * @returns {boolean} True if fuzzer is a valid instance.
     */
    isValid() {

        return this._id !== null;
    }

    //$lab:coverage:off$
    /**
     * Get current fuzzer options.
     *
     * @returns {Options} Fuzzer options.
     */
    get options() {

        return this._runtime.getOptions(this._id);
    }
    //$lab:coverage:on$

    /**
     * Get current run ID.
     *
     * @returns {string | null} RunID if successful, null if not.
     */
    get runid() {

        return this._runtime.getRunID(this._id);
    }

    /**
     * Get run statistics.
     *
     * @returns {object | undefined} Stats if successful, undefined if not.
     */
    get runstats() {

        return this._runtime.getRunStats(this._id);
    }

    /**
     * Retrieve the number of requests fuzzed.
     *
     * @returns {number} Fuzzed requests.
     */
    get fuzzed() {

        return this._fuzzedreqs;
    }

    //$lab:coverage:off$
    /**
     * Terminate a fuzzer.
     *
     * Warning: the associated fuzzer resources will be released, and request reference will be consumed.
     *
     * @returns {boolean}
     */
    terminate(request) {

        const res = this._runtime.terminateFuzzer(this._id);
        this._id = null;
        return res;
    }
    //$lab:coverage:on$

    /**
     * Prepare a request (real or fake) before replaying it.
     *
     * @param {IncomingMessage} req - An input request object.
     * @param {InputRequest} orig - The original input.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    initRequest(req, orig, mutated) {

        // $lab:coverage:off$
        if (!req || Fuzzer.isRequestReplayed(req)) {
            return false;
        }
        // $lab:coverage:on$
        // @ts-ignore
        req.__sqreen_replayed = true;
        const fuzzerrequest = new FuzzerRequest(this, mutated);
        // $lab:coverage:off$
        if (!fuzzerrequest.isValid()) {
            return false;
        }
        // $lab:coverage:on$
        // @ts-ignore
        req.__sqreen_fuzzerrequest = fuzzerrequest;
        this._handledreqs++;
        return true;
    }

    /**
     * Finalize a request (real or fake) after replaying it.
     *
     * @param {IncomingMessage} req - An input request object.
     * @param {InputRequest} orig - The original input.
     * @param {Request} mutated - The mutated input.
     * @returns {boolean} True if request is being replayed by us.
     */
    finalizeRequest(req, orig, mutated) {

        // $lab:coverage:off$
        if (!Fuzzer.isRequestReplayed(req)) {
            return false;
        }
        // $lab:coverage:on$
        const fuzzerrequest = Fuzzer.getFuzzerRequest(req);
        // $lab:coverage:off$
        if (fuzzerrequest === null) {
            return false;
        }
        // $lab:coverage:on$
        const ret = fuzzerrequest.finalize(mutated);
        fuzzerrequest.terminate();
        // $lab:coverage:off$
        if (!ret) {
            return false;
        }
        if (ret.unique) {
            this._onNewRequest(req, orig, mutated, ret);
        }
        this._handledreqs--;
        this._onRequestDone(req);
        if (this._mutationsdone && this._handledreqs <= 0) {
            this._onDone();
        }
        return ret.success;
    }

    /**
     * Mutate an input request.
     *
     * @param {InputRequest} request - An input request object.
     * @param {number} mutations - Total number of mutations (override options)
     * @returns {Request[]} An array of mutated requests
     */
    mutateInputRequest(request, mutations) {

        return this._runtime.mutateInputRequest(this._id, request, mutations);
    }

    /**
     * @typedef {(original: InputRequest, mutated: Request[]) => boolean} HandleMutatedRequest
     */
    /**
     * Mutate input requests (in a primitive async way...).
     *
     * @param {InputRequest[]} requests - An input request object.
     * @param {HandleMutatedRequest} cbk - A callback handling the mutated request.
     * @param {{ delay?: number, batchlen?: number }} [options] - Some useful options.
     * @returns {Promise}
     */
    mutateInputRequests(requests, cbk, options) {

        // $lab:coverage:off$
        options = options || {};
        // $lab:coverage:on$
        return Promise.resolve()
            .then(() => this.mutationsPerRequest())
            .then((mutations) =>

                new Promise((resolve) => {

                    this._mutationsdone = false;
                    const done = () => {

                        this._mutationsdone = true;
                        return resolve();
                    };

                    const count = requests.length;
                    // $lab:coverage:off$
                    if (!count || count !== mutations.length) {
                        return done();
                    }
                    const delay = options.delay || 10;
                    const batchlen = options.batchlen || 20;
                    // $lab:coverage:on$
                    FuzzUtils.asyncForEach(requests, (request, i, next) => {

                        const mutatedReqs = this.mutateInputRequest(request, mutations[i]);
                        // $lab:coverage:off$
                        if (!mutatedReqs || !mutatedReqs.length) {
                            return done();
                        }
                        // $lab:coverage:on$
                        FuzzUtils.asyncForEach(mutatedReqs, (chunk, _j, innernext) => {

                            if (!cbk(request, chunk)) {
                                return done();
                            }
                            // handle next mutated requests
                            if (!innernext()) {
                                // handle next request
                                if (!next()) {
                                    done();
                                }
                            }
                        }, { delay, chunklen: batchlen });
                    }, { delay });
                }));
    };

    /**
     * Update an original input request based on mutated one values.
     *
     * @param {InputRequest} orig - Original input request.
     * @param {Partial<Request>} mutated - An associated mutated version of the input request.
     * @param {FuzzRequestResult} result - Fuzzing result (coming from the related `finalizeRequest` call).
     * @returns {InputRequest}
     */
    updateInputRequest(orig, mutated, result) {

        return this._runtime.updateInputRequest(this._id, orig, mutated, result);
    }

    /**
     * Compute an array with a balanced number of mutations for each request.
     *
     * @returns {Array} An array of mutations count, one for each request.
     */
    mutationsPerRequest() {

        return this._runtime.mutationsPerRequest(this._id);
    };

    /**
     * Update / add a fuzzer metric
     *
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateMetric(key, value, type) {

        // TODO: add cache
        return this.updateEndpointMetric(undefined, key, value, type);
    }

    /**
     * Update / add a fuzzer endpoint metric
     *
     * @param {string} endpoint - A path identifying an endpoint.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    updateEndpointMetric(endpoint, key, value, type) {

        // $lab:coverage:off$
        // TODO: add cache
        return this._runtime.updateMetrics(this._id, [{ endpoint, key, value, type }]);
        // $lab:coverage:on$
    }

    // $lab:coverage:off$
    /**
     * Record a trace.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {string} trace - A 'trace' (anything).
     * @returns {boolean}
     */
    static recordTrace(req, trace) {

        const fuzzerrequest = Fuzzer.getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.recordTrace(trace);
    }

    /**
     * Record a stacktrace as a trace.
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @returns {boolean}
     */
    static recordStackTrace(req) {

        const fuzzerrequest = Fuzzer.getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.recordStackTrace();
    }

    /**
     * Record markers based on evaluated rules
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {Array} rules - A list of rules being evaluated.
     * @returns {boolean}
     */
    static recordMarker(req, rules) {

        if (!req || !rules) {
            return false;
        }
        for (const entry of rules) {
            const rule = entry.rule || {};
            let record = false;
            if (rule.attack_type === 'sql_injection') {
                this.updateRequestMetric(req, 'markers.sqlops', 1, METRICTYPE.SUM);
                record = true;
            }
            else if (rule.attack_type === 'lfi') {
                this.updateRequestMetric(req, 'markers.fileops', 1, METRICTYPE.SUM);
                record = true;
            }
            if (record) {
                this.updateRequestMetric(req, 'markers.rules', rule.name, METRICTYPE.COLLECT);
            }
        }
        return true;
    }

    /**
     * Update / add a request metric
     *
     * @param {IncomingMessage} req - An HTTP request.
     * @param {MetricKey} key - A metric key (ex: 'requests.fuzzed').
     * @param {any} value - Update metric using this value.
     * @param {MetricType?} [type] - A metric type (optional on existing metrics).
     * @returns {boolean}
     */
    static updateRequestMetric(req, key, value, type) {

        const fuzzerrequest = Fuzzer.getFuzzerRequest(req);
        if (fuzzerrequest === null) {
            return false;
        }
        return fuzzerrequest.updateRequestMetric(key, value, type);
    }
    // $lab:coverage:on$

    /**
     * Test if a request is being replayed.
     *
     * @param {IncomingMessage | undefined} req - An input request object.
     * @returns {boolean} True if request is being replayed by us.
     */
    static isRequestReplayed(req) {

        // $lab:coverage:off$
        // @ts-ignore
        return req && !!req.__sqreen_replayed;
        // $lab:coverage:on$
    };

    /**
     * Get a {FuzzerRequest} object associated to a request.
     *
     * @param {IncomingMessage | null} req - An HTTP request.
     *
     * @return {FuzzerRequest}
     */
    static getFuzzerRequest(req) {
        // $lab:coverage:off$
        // @ts-ignore
        if (!req || !req.__sqreen_fuzzerrequest) {
            return null;
        }
        // $lab:coverage:on$
        // @ts-ignore
        return req.__sqreen_fuzzerrequest;
    }

    /**
     * Init a timeout on fuzzer.
     *
     * @param {number} timeout - Delay (in ms) before triggering the timeout event.
     */
    armTimeout(timeout) {
        // Every requests have been mutated and replayed...
        // ...but most of them are still being handled by the server at this point
        this._timeout = setTimeout(this._onTimeout.bind(this), timeout);
    }

    /**
     * Remove the fuzzer timeout event.
     */
    resetTimeout() {

        // $lab:coverage:off$
        if (this._timeout !== null) {
            // $lab:coverage:on$
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    _onRequestDone(req) {

        this._fuzzedreqs++;
        // @ts-ignore
        this.emit('request_done', req);
    }

    _onNewRequest(req, orig, mutated, res) {

        const updated = this.updateInputRequest(orig, mutated, res);
        // @ts-ignore
        this.emit('request_new', req, updated);
    }

    _onDone() {

        this.resetTimeout();
        // @ts-ignore
        this.emit('all_requests_done');
        // @ts-ignore
        this.removeAllListeners();
    }

    _onTimeout() {

        // $lab:coverage:off$
        if (this._timeout !== null) {
            // $lab:coverage:on$
            // @ts-ignore
            this.emit('timeout');
            // @ts-ignore
            this.removeAllListeners();
        }
    }

};

Events.makeEventEmitter(Fuzzer);