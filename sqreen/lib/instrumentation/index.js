/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const ModuleHijacker = require('./moduleHijacker');
const DefaultMetrics = require('../metric/default');

DefaultMetrics.enableCallCount();
ModuleHijacker.enable();

// Always start instrumentation for http and https
require('./hooks/tracingHook')
    .enable(require('http'), require('./moduleIdentity').scan('http', module));

require('./hooks/tracingHook')
    .enable(require('https'), require('./moduleIdentity').scan('https', module));