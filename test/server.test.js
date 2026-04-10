const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// --- Resolve FDK dependencies ---
const fdkBase = path.join(process.env.APPDATA || '', 'npm/node_modules/@freshworks/fdk');
const ili = require(path.join(fdkBase, 'node_modules/istanbul-lib-instrument'));
const instrumenter = ili.createInstrumenter({
  coverageVariable: '__fdkcoverage__',
  compact: false,
  preserveComments: true
});

// --- Coverage util from FDK (same instance used by the test runner) ---
let coverageUpdate;
try {
  const covCacheKey = Object.keys(require.cache).find(function (k) {
    return k.includes('coverage') && k.includes('utils');
  });
  if (covCacheKey) {
    coverageUpdate = require.cache[covCacheKey].exports.update;
  }
} catch (_) { /* ignore */ }

// --- Instrument and load a source file into a sandbox ---
function loadInstrumented(relPath, sandbox) {
  const absPath = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(absPath, 'utf8');
  const instrumented = instrumenter.instrumentSync(code, relPath);
  vm.runInContext(instrumented, sandbox);
}

// --- Helper: create sandbox with common mocks ---
function createServerSandbox(iparams, requestStub) {
  const sandbox = {
    __fdkcoverage__: {},
    console: console,
    $iparams: iparams,
    $request: { invokeTemplate: requestStub },
    renderData: function () {},
    JSON: JSON,
    Object: Object,
    Array: Array,
    Error: Error,
    Promise: Promise,
    setTimeout: setTimeout
  };
  return vm.createContext(sandbox);
}

function mergeCoverage(sandbox) {
  if (coverageUpdate && sandbox.__fdkcoverage__) {
    coverageUpdate(sandbox.__fdkcoverage__);
  }
}

// =========================================================
// SERVER.JS TESTS
// =========================================================
describe('server.js - onAppInstallHandler', function () {

  it('should call renderData() on successful validation (English)', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.resolve({}); }
    );
    ctx.renderData = function (err) {
      assert.strictEqual(err, undefined);
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should call renderData() on successful validation (Español)', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'Español' },
      function () { return Promise.resolve({}); }
    );
    ctx.renderData = function (err) {
      assert.strictEqual(err, undefined);
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should return 401 error message', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.reject({ status: 401 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('not valid'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should return 429 error message', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.reject({ status: 429 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('usage limit'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should return 500 error message for server errors', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.reject({ status: 500 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('not available'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should use 500 message for 503 status', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.reject({ status: 503 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('not available'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should use default message for unknown error status', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'English' },
      function () { return Promise.reject({ status: 403 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('not valid'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should fall back to English when language is unknown', function (done) {
    const ctx = createServerSandbox(
      { app_language: 'UnknownLanguage' },
      function () { return Promise.reject({ status: 401 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      assert.ok(err.message.includes('not valid'));
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });

  it('should fall back to English when app_language is undefined', function (done) {
    const ctx = createServerSandbox(
      {},
      function () { return Promise.reject({ status: 401 }); }
    );
    ctx.renderData = function (err) {
      assert.ok(err);
      mergeCoverage(ctx);
      done();
    };
    loadInstrumented('server/server.js', ctx);
    ctx.exports.onAppInstallHandler();
  });
});
