/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';
const HTTP              = require('http');
const HTTPS             = require('http');
const URL               = require('url');
const Querystring       = require('querystring');
const Default           = require('./default');


class FakeSocket {
    constructor(options = {}) {

        //$lab:coverage:off$
        this.address = options.addr || Default.addr;
        this.remoteAddress = options.remoteAddr || Default.remoteAddr;
        this.remotePort = options.port || Default.port;
        this.encrypted = options.encrypted || false;
        //$lab:coverage:on$
        this.writable = false;
    }

    write(chunk, encoding, callback) {
    }

    setTimeout(msecs) {
    }

    cork() {
    }

    uncork() {
    }

    disconnect() {
    }

    close(callback) {
    }

    destroy() {
    }

    end() {
    }
};

// TODO: improve FakeSocket object to avoid legitimate warnings here...
// @ts-ignore
class FakeMessage extends HTTP.IncomingMessage {

    constructor(options = {}) {

        super(undefined);
        //$lab:coverage:off$
        this.method         = (options.method || Default.method).toUpperCase();
        if (options.protocol && typeof options.protocol === 'string') {
            options.protocol = options.protocol.trim().split(':').splice(0, 1)[0] + ':';
        }
        const protocol      = options.protocol || Default.protocol;
        const [host, port]  = (options.host || options.hostname || Default.host).split(':');
        this.host           = host;
        this.port           = options.port || port || (protocol === 'https:' ? 443 : 80);
        this.url            = options.path || Default.path;
        this.auth           = options.auth;
        this.agent          = options.agent || (protocol === 'https:' ? HTTPS.globalAgent : HTTP.globalAgent);
        this.cert           = options.cert;
        this.key            = options.key;
        this.httpVersion    = options.version || Default.version;
        //$lab:coverage:on$
        this.httpVersionMajor = this.httpVersion.split('.')[0];
        this.httpVersionMinor = this.httpVersion.split('.')[1];
        const socket        = new FakeSocket(options);
        this.connection     = socket;
        this.socket         = socket;
        this.headers        = {};
        this._inputLen      = 0;
        this._hasDataSource = false;
        //$lab:coverage:off$
        if (options.headers) {
            for (const name in options.headers) {
                const value = options.headers[name];
                if (value !== null) {
                    this.headers[name.toLowerCase()] = value.toString();
                }
            }
        }
        //$lab:coverage:on$
        // Those are mandatory for Sqreen reporting
        //$lab:coverage:off$
        this.headers['user-agent'] = this.headers['user-agent'] || Default.agent;
        this.headers.host = this.headers.host || Default.host;
        this.headers.referer = this.headers.referer || 'https://reveal.sqreen.com';
        //$lab:coverage:on$
    }

    flushHeaders() {
    }

    setHeader(name, value) {

        //$lab:coverage:off$
        if (!this.ended && !this.body) {
            //$lab:coverage:on$
            this.headers[name.toLowerCase()] = value;
        }
    }

    getHeader(name) {

        return this.headers[name.toLowerCase()];
    }

    //$lab:coverage:off$
    removeHeader(name) {

        if (!this.ended && !this.body) {
            delete this.headers[name.toLowerCase()];
        }
    }

    addTrailers(trailers) {

        this.trailers = trailers;
    }

    setTimeout(timeout, callback) {

        if (typeof callback === 'function') {
            setImmediate(callback);
        }
        return this;
    }

    setNoDelay(/*nodelay = true*/) {
    }

    setSocketKeepAlive(/*enable = false, initial*/) {
    }

    write(chunk, encoding, callback) {

        if (this.ended) {
            return;
        }
        this.body = this.body || [];
        this.body.push([chunk, encoding]);
        this._inputLen += (chunk || '').length;
        if (typeof callback === 'function') {
            setImmediate(callback);
        }
    }

    end(chunk, encoding, callback) {

        if (this.ended) {
            return;
        }

        if (typeof chunk === 'function') {
            [callback, chunk] = [chunk, null];
        }
        else if (typeof encoding === 'function') {
            [callback, encoding] = [encoding, null];
        }

        if (chunk) {
            this.body = this.body || [];
            this.body.push([chunk, encoding]);
            this._inputLen += (chunk || '').length;
        }
        if (this._inputLen) {
            this.setContentLengthHeader(this._inputLen);
        }

        this.ended = true;

        if (typeof callback === 'function') {
            setImmediate(callback);
        }
    }
    //$lab:coverage:on$

    setContentLengthHeader(length) {

        this.headers['content-length'] = '' + length;
    }

    setSource(src) {

        const self = this;

        //$lab:coverage:off$
        if (self._hasDataSource || self.body) {
            return;
        }
        //$lab:coverage:on$
        const srcIsNull = src === null;
        //$lab:coverage:off$
        const srcIsBuffer = !srcIsNull && Buffer.isBuffer(src);
        if (srcIsNull || typeof src === 'string' || srcIsBuffer) {
            //$lab:coverage:on$
            self._hasDataSource = true;

            let length = 0;
            //$lab:coverage:off$
            if (!srcIsNull) {
                if (!srcIsBuffer) {
                    //$lab:coverage:on$
                    src = Buffer.from(src);
                }
                length = src.length;
            }

            self.setContentLengthHeader(length);

            return process.nextTick(() => {

                //$lab:coverage:off$
                if (!srcIsNull) {
                    //$lab:coverage:on$
                    self.push(src);
                }

                self.push(null);
            });
        }
    }

    _read() {
    }

    flush() {
    }

    abort() {
    }
};

class FakeResponse extends HTTP.ServerResponse {

    constructor(req, options = {}) {

        super(req);
        this._fake = true;
        this.output = [];
        this.outputSize = 0;
        this._outputLen = 0;
        this.finished = false;
    }

    _finish() {
    }

    write(chunk, encoding, callback) {

        if (this.finished) {
            return;
        }
        this._outputData = this._outputData || [];
        this._outputData.push([chunk, encoding]);
        this._outputLen += (chunk || '').length;
        if (typeof callback === 'function') {
            setImmediate(callback);
        }
        return true;
    }

    end(chunk, encoding, callback) {

        if (this.finished) {
            return;
        }

        //$lab:coverage:off$
        if (typeof chunk === 'function') {
            [callback, chunk] = [chunk, null];
        }
        else if (typeof encoding === 'function') {
            [callback, encoding] = [encoding, null];
        }
        //$lab:coverage:on$

        //$lab:coverage:off$
        if (chunk) {
            this._outputData = this._outputData || [];
            //$lab:coverage:on$
            this._outputData.push([chunk, encoding]);
            //$lab:coverage:off$
            this._outputLen += (chunk || '').length;
            //$lab:coverage:on$
        }
        // TODO: understand how we could have headers is our fake answer
        // without breaking the agent when our fake request is blocked...
        // this.flushHeaders();

        // Handle output
        //$lab:coverage:off$
        if (this._outputLen !== 0) {
            //$lab:coverage:on$
            let output = '';
            for (const key in this._outputData) {
                //$lab:coverage:off$
                output += (this._outputData[key] || '').toString();
                //$lab:coverage:on$
            }
            this.output.push(output);
            this.outputSize += output.length;
        }

        //$lab:coverage:off$
        if (typeof callback === 'function') {
            //$lab:coverage:on$
            setImmediate(callback);
        }

        this.finished = true;

        this.emit('finish');
        return this;
    }
}

// Need to do this because of hacks in express...
const end = HTTP.ServerResponse.prototype.end;
HTTP.ServerResponse.prototype.end = function () {

    //$lab:coverage:off$
    // @ts-ignore
    if (this._fake) {
        return FakeResponse.prototype.end.apply(this, arguments);
    }
    return end.apply(this, arguments);
    //$lab:coverage:on$
};

class FakeRequest {
    constructor(server, options = {}) {

        //$lab:coverage:off$
        options.path = options.path || '/';
        //$lab:coverage:on$
        this.options = options;
        this._server = server;
        this._req = new FakeMessage(options);
        this._res = new FakeResponse(this._req);
        return this;
    }

    //$lab:coverage:off$
    get(path) {

        this._req.url = path;
        this._req.method = 'GET';
        return this;
    }

    post(path) {

        this._req.url = path;
        this._req.method = 'POST';
        return this;
    }

    set(key, value) {

        this._req.setHeader(key, value);
        return this;
    }
    //$lab:coverage:on$

    type(type) {

        this._req.setHeader('content-type', type);
        return this;
    }

    query(query) {

        if (!query) {
            return this;
        }
        //$lab:coverage:off$
        if (query !== null && typeof query === 'object') {
            //$lab:coverage:on$
            query = Querystring.stringify(query);
        }
        this._query = query;
        return this;
    }

    send(data) {

        if (!data) {
            return this;
        }
        let type = 'text/plain';
        //$lab:coverage:off$
        if (data !== null && typeof data === 'object') {
            //$lab:coverage:on$
            type = 'application/json';
            data = JSON.stringify(data);
        }
        this._data = data;
        //$lab:coverage:off$
        if (!this._req.getHeader('content-type')) {
            //$lab:coverage:on$
            this.type(type);
        }
        return this;
    }

    custom(callback) {

        const self = this;
        //$lab:coverage:off$
        if (typeof callback === 'function') {
            //$lab:coverage:on$
            callback(self._req, self._res);
        }
        return this;
    }

    end(callback) {

        if (this._query && typeof this._req.url === 'string') {
            const url = URL.parse(this._req.url);
            // Invalid type signature for URL object
            // @ts-ignore
            url.query = Querystring.parse(this._query);
            this._req.url = URL.format(url);
        }
        if (this._data) {
            this._req.setSource(this._data);
        }
        const self = this;
        //$lab:coverage:off$
        if (typeof callback === 'function') {
            //$lab:coverage:on$
            self._res.on('finish', () => {

                callback(self._req, self._res);
            });
        }
        //$lab:coverage:off$
        if (self._server) {
            //$lab:coverage:on$
            self._server.emit('request', self._req, self._res);
        }
    }
}

module.exports = function (server, options = {}) {

    return new FakeRequest(server, options);
};
