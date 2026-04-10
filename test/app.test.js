const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// --- Resolve FDK dependencies for instrumentation ---
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

function mergeCoverage(sandbox) {
  if (coverageUpdate && sandbox.__fdkcoverage__) {
    coverageUpdate(sandbox.__fdkcoverage__);
  }
}

// --- Load and instrument a source file into a sandbox ---
// varNames: array of const/let variable names to export to the sandbox
function loadInstrumented(relPath, sandbox, varNames) {
  const absPath = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(absPath, 'utf8');
  const instrumented = instrumenter.instrumentSync(code, relPath);

  if (varNames && varNames.length) {
    const assignments = varNames.map(function (v) {
      return 'try { this["' + v + '"] = ' + v + '; } catch(e){}';
    }).join('\n');
    const wrapped = '(function() {\n' + instrumented + '\n' + assignments + '\n}).call(this);';
    vm.runInContext(wrapped, sandbox);
  } else {
    vm.runInContext(instrumented, sandbox);
  }
}

// --- Build a shared sandbox with all browser/app mocks ---
function createAppSandbox(overrides) {
  const mockIparams = {
    app_language: 'English',
    system_prompt: 'You are a helpful assistant',
    debug_enabled: true
  };

  const defaults = {
    __fdkcoverage__: {},
    console: console,
    JSON: JSON,
    Object: Object,
    Array: Array,
    Error: Error,
    TypeError: TypeError,
    ReferenceError: ReferenceError,
    Promise: Promise,
    setTimeout: setTimeout,
    RegExp: RegExp,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    String: String,
    Number: Number,
    Boolean: Boolean,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,

    // Browser globals
    window: {
      client: {
        iparams: {
          get: function () { return Promise.resolve(mockIparams); }
        },
        request: {
          invokeTemplate: function () {
            return Promise.resolve({
              response: JSON.stringify({
                choices: [{ message: { content: '{"status":{"emoji":"✅","status":"OK"},"response":"Test response"}' } }]
              })
            });
          }
        },
        interface: {
          trigger: function () { return Promise.resolve(); }
        },
        data: {
          get: function () {
            return Promise.resolve({
              ticket: { subject: 'Test Subject', description: 'Test Description' }
            });
          }
        },
        instance: {
          receive: function () {}
        },
        events: {
          on: function () {}
        }
      }
    },
    document: {
      getElementById: function () {
        return { innerHTML: '' };
      }
    },
    app: {
      initialized: function () {
        return Promise.resolve(defaults.window.client);
      }
    },
    fetch: function () {
      return Promise.resolve({
        json: function () { return Promise.resolve({}); }
      });
    }
  };

  if (overrides) {
    Object.keys(overrides).forEach(function (k) {
      defaults[k] = overrides[k];
    });
  }

  return vm.createContext(defaults);
}

// Load all frontend scripts in dependency order into a sandbox
var LOGGER_VARS = ['logger', 'initDebug', 'LogWrite'];
var I18N_VARS = ['i18n', 'initI18n', 't'];
var CHATGPT_VARS = ['callChatGPT', 'OPENAI_ERROR_KEYS', 'extractOpenAIMessage', 'parseOpenAIError'];
var UIRENDERER_VARS = ['escapeHtml', 'formatResponse', 'renderUI', 'renderLoadingSpinner', 'renderError'];
var TICKET_VARS = ['extractResponseText', 'addResponseToTicket'];
var MODAL_VARS = ['showOtraModal', 'handleTextoAdicional'];
var APP_VARS = ['appState', 'initializeApp', 'renderText'];

function loadAllScripts(sandbox) {
  loadInstrumented('app/scripts/logger.js', sandbox, LOGGER_VARS);
  loadInstrumented('app/scripts/i18n.js', sandbox, I18N_VARS);
  loadInstrumented('app/scripts/chatgpt-service.js', sandbox, CHATGPT_VARS);
  loadInstrumented('app/scripts/ui-renderer.js', sandbox, UIRENDERER_VARS);
  loadInstrumented('app/scripts/ticket-handler.js', sandbox, TICKET_VARS);
  loadInstrumented('app/scripts/modal-handler.js', sandbox, MODAL_VARS);
}

// =========================================================
// LOGGER.JS TESTS
// =========================================================
describe('logger.js', function () {

  it('initDebug should set debug from iparams', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.initDebug().then(function () {
      assert.strictEqual(ctx.logger.enabled, true);
      mergeCoverage(ctx);
      done();
    });
  });

  it('initDebug should handle missing client gracefully', function (done) {
    const ctx = createAppSandbox({ window: {} });
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.initDebug().then(function () {
      assert.strictEqual(ctx.logger.enabled, false);
      mergeCoverage(ctx);
      done();
    });
  });

  it('initDebug should handle client without iparams', function (done) {
    const ctx = createAppSandbox({ window: { client: {} } });
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.initDebug().then(function () {
      assert.strictEqual(ctx.logger.enabled, false);
      mergeCoverage(ctx);
      done();
    });
  });

  it('initDebug should catch iparams.get errors', function (done) {
    const ctx = createAppSandbox({
      window: {
        client: {
          iparams: {
            get: function () { return Promise.reject(new Error('fail')); }
          }
        }
      }
    });
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.initDebug().then(function () {
      assert.strictEqual(ctx.logger.enabled, false);
      mergeCoverage(ctx);
      done();
    });
  });

  it('initDebug should default to false when debug_enabled is falsy', function (done) {
    const ctx = createAppSandbox();
    ctx.window.client.iparams.get = function () {
      return Promise.resolve({ debug_enabled: false });
    };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.initDebug().then(function () {
      assert.strictEqual(ctx.logger.enabled, false);
      mergeCoverage(ctx);
      done();
    });
  });

  it('LogWrite should log when enabled', function () {
    const ctx = createAppSandbox();
    const logged = [];
    ctx.console = { log: function (msg) { logged.push(msg); } };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = true;
    ctx.LogWrite('test message');
    assert.strictEqual(logged.length, 1);
    assert.ok(logged[0].includes('test message'));
    mergeCoverage(ctx);
  });

  it('LogWrite should not log when disabled', function () {
    const ctx = createAppSandbox();
    const logged = [];
    ctx.console = { log: function (msg) { logged.push(msg); } };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    ctx.LogWrite('test message');
    assert.strictEqual(logged.length, 0);
    mergeCoverage(ctx);
  });
});

// =========================================================
// I18N.JS TESTS
// =========================================================
describe('i18n.js', function () {

  it('initI18n should load translations', function (done) {
    const ctx = createAppSandbox();
    ctx.XMLHttpRequest = function () {
      this.open = function () {};
      this.send = function () {
        this.responseText = JSON.stringify({ btnAdd: 'Add' });
        this.onload();
      };
    };
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.initI18n().then(function () {
      assert.strictEqual(ctx.t('btnAdd'), 'Add');
      mergeCoverage(ctx);
      done();
    });
  });

  it('initI18n should fallback to English when app_language is missing', function (done) {
    const ctx = createAppSandbox();
    ctx.window.client.iparams.get = function () {
      return Promise.resolve({ debug_enabled: false });
    };
    let requestedUrl;
    ctx.XMLHttpRequest = function () {
      this.open = function (_method, url) { requestedUrl = url; };
      this.send = function () {
        this.responseText = JSON.stringify({ key: 'val' });
        this.onload();
      };
    };
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.initI18n().then(function () {
      assert.ok(requestedUrl.includes('English'));
      mergeCoverage(ctx);
      done();
    });
  });

  it('initI18n should reject when XHR fails', function (done) {
    const ctx = createAppSandbox();
    ctx.XMLHttpRequest = function () {
      this.open = function () {};
      this.send = function () {
        this.onerror();
      };
    };
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.initI18n().then(
      function () { assert.fail('Should have rejected'); },
      function (err) {
        assert.ok(err.message.includes('Failed to load i18n'));
        mergeCoverage(ctx);
        done();
      }
    );
  });

  it('t() should return key when string not found', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    assert.strictEqual(ctx.t('nonExistentKey'), 'nonExistentKey');
    mergeCoverage(ctx);
  });
});

// =========================================================
// UI-RENDERER.JS TESTS
// =========================================================
describe('ui-renderer.js', function () {

  it('formatResponse should parse and format JSON response', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { btnAdd: 'Add', btnOther: 'Other', btnAddTitle: 'Add', btnOtherTitle: 'Other' };
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const json = JSON.stringify({ status: { emoji: '✅', status: 'OK' }, response: 'Hello' });
    const result = ctx.formatResponse(json);
    assert.ok(result.includes('✅'));
    assert.ok(result.includes('Hello'));
    mergeCoverage(ctx);
  });

  it('renderUI should include buttons', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { btnAdd: 'Add', btnOther: 'Other', btnAddTitle: 'Add Title', btnOtherTitle: 'Other Title' };
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const result = ctx.renderUI('<p>test</p>');
    assert.ok(result.includes('fw-button'));
    assert.ok(result.includes('Add'));
    mergeCoverage(ctx);
  });

  it('renderLoadingSpinner should render spinner', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const result = ctx.renderLoadingSpinner('Loading...');
    assert.ok(result.includes('fw-spinner'));
    assert.ok(result.includes('Loading...'));
    mergeCoverage(ctx);
  });

  it('renderError should render error message', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const result = ctx.renderError('Something failed');
    assert.ok(result.includes('Something failed'));
    assert.ok(result.includes('error'));
    mergeCoverage(ctx);
  });

  it('escapeHtml should escape HTML special characters', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const result = ctx.escapeHtml('<script>"xss"&\'test\'</script>');
    assert.ok(result.includes('&lt;'));
    assert.ok(result.includes('&gt;'));
    assert.ok(result.includes('&quot;'));
    assert.ok(result.includes('&#039;'));
    assert.ok(result.includes('&amp;'));
    assert.ok(!result.includes('<script>'));
    mergeCoverage(ctx);
  });

  it('escapeHtml should return empty string for non-string input', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    assert.strictEqual(ctx.escapeHtml(null), '');
    assert.strictEqual(ctx.escapeHtml(undefined), '');
    assert.strictEqual(ctx.escapeHtml(123), '');
    mergeCoverage(ctx);
  });

  it('renderError should escape HTML in error messages', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const result = ctx.renderError('<img onerror=alert(1)>');
    assert.ok(!result.includes('<img'));
    assert.ok(result.includes('&lt;img'));
    mergeCoverage(ctx);
  });

  it('formatResponse should escape HTML in response fields', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { btnAdd: 'Add', btnOther: 'Other', btnAddTitle: 'Add', btnOtherTitle: 'Other' };
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    const json = JSON.stringify({ status: { emoji: '✅', status: '<b>bold</b>' }, response: 'line1\nline2' });
    const result = ctx.formatResponse(json);
    assert.ok(result.includes('&lt;b&gt;'));
    assert.ok(result.includes('<br>'));
    assert.ok(!result.includes('<b>bold</b>'));
    mergeCoverage(ctx);
  });
});

// =========================================================
// CHATGPT-SERVICE.JS TESTS
// =========================================================
describe('chatgpt-service.js', function () {

  it('callChatGPT should return parsed response', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { promptSubject: 'Subject', promptBody: 'Body' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    ctx.callChatGPT('Test', 'Test body').then(function (result) {
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.status.emoji, '✅');
      mergeCoverage(ctx);
      done();
    });
  });

  it('callChatGPT with additionalInfo should append to prompt', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { promptSubject: 'Subject', promptBody: 'Body', errorAdditionalInfo: 'Additional' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    ctx.callChatGPT('Test', 'Test body', 'Extra info').then(function (result) {
      assert.ok(result);
      mergeCoverage(ctx);
      done();
    });
  });

  it('callChatGPT should strip markdown code blocks', function (done) {
    const ctx = createAppSandbox();
    ctx.window.client.request.invokeTemplate = function () {
      return Promise.resolve({
        response: JSON.stringify({
          choices: [{ message: { content: '```json\n{"status":{"emoji":"✅","status":"OK"},"response":"Test"}\n```' } }]
        })
      });
    };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { promptSubject: 'Subject', promptBody: 'Body' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    ctx.callChatGPT('Test', 'Desc').then(function (result) {
      assert.ok(!result.includes('```'));
      mergeCoverage(ctx);
      done();
    });
  });

  it('callChatGPT should throw on API error', function (done) {
    const ctx = createAppSandbox();
    ctx.window.client.request.invokeTemplate = function () {
      return Promise.reject({ status: 401, message: 'Unauthorized' });
    };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = {
      promptSubject: 'Subject', promptBody: 'Body',
      errorApiKey: 'Invalid API key', errorUnknown: 'Unknown error'
    };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    ctx.callChatGPT('Test', 'Desc').then(
      function () { assert.fail('Should have thrown'); },
      function (err) {
        assert.ok(err.message);
        mergeCoverage(ctx);
        done();
      }
    );
  });

  it('parseOpenAIError should return translated message for known status', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = {
      errorApiKey: 'Invalid key',
      errorRateLimit: 'Rate limit',
      errorServer500: 'Server 500',
      errorServer503: 'Server 503',
      errorUnknown: 'Unknown'
    };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    assert.strictEqual(ctx.parseOpenAIError({ status: 401 }), 'Invalid key');
    assert.strictEqual(ctx.parseOpenAIError({ status: 429 }), 'Rate limit');
    assert.strictEqual(ctx.parseOpenAIError({ status: 500 }), 'Server 500');
    assert.strictEqual(ctx.parseOpenAIError({ status: 503 }), 'Server 503');
    mergeCoverage(ctx);
  });

  it('parseOpenAIError should extract message from response JSON', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { errorUnknown: 'Unknown' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.parseOpenAIError({
      status: 0,
      response: JSON.stringify({ error: { message: 'Detailed error' } })
    });
    assert.strictEqual(result, 'Detailed error');
    mergeCoverage(ctx);
  });

  it('parseOpenAIError should fall back to err.message if response is not JSON', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { errorUnknown: 'Unknown' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.parseOpenAIError({
      status: 0,
      response: 'not json',
      message: 'Fallback message'
    });
    assert.strictEqual(result, 'Fallback message');
    mergeCoverage(ctx);
  });

  it('parseOpenAIError should fall back to t(errorUnknown) when nothing else matches', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { errorUnknown: 'Unknown error' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.parseOpenAIError({ status: 0 });
    assert.strictEqual(result, 'Unknown error');
    mergeCoverage(ctx);
  });

  it('extractOpenAIMessage should return message from parsed response', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.extractOpenAIMessage({ error: { message: 'test msg' } });
    assert.strictEqual(result, 'test msg');
    mergeCoverage(ctx);
  });

  it('extractOpenAIMessage should return null when no error message', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    assert.strictEqual(ctx.extractOpenAIMessage({}), null);
    assert.strictEqual(ctx.extractOpenAIMessage({ error: {} }), null);
    mergeCoverage(ctx);
  });

  it('extractOpenAIMessage should parse a string response', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.extractOpenAIMessage(JSON.stringify({ error: { message: 'from string' } }));
    assert.strictEqual(result, 'from string');
    mergeCoverage(ctx);
  });

  it('extractOpenAIMessage should return null for null input', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    assert.strictEqual(ctx.extractOpenAIMessage(null), null);
    assert.strictEqual(ctx.extractOpenAIMessage(undefined), null);
    mergeCoverage(ctx);
  });

  it('parseOpenAIError should fall back when response JSON has no error message', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { errorUnknown: 'Unknown error' };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);

    const result = ctx.parseOpenAIError({
      status: 0,
      response: JSON.stringify({ data: 'no error field' }),
      message: 'Fallback'
    });
    assert.strictEqual(result, 'Fallback');
    mergeCoverage(ctx);
  });
});

// =========================================================
// TICKET-HANDLER.JS TESTS
// =========================================================
describe('ticket-handler.js', function () {

  it('extractResponseText should return response field', function () {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);

    const json = JSON.stringify({ response: 'Hello customer' });
    assert.strictEqual(ctx.extractResponseText(json), 'Hello customer');
    mergeCoverage(ctx);
  });

  it('addResponseToTicket should trigger reply and notify', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { notifyResponseInserted: 'Inserted!' };
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);

    ctx.appState = {
      lastChatGPTResponse: JSON.stringify({ response: 'reply text' }),
      client: {
        interface: {
          trigger: function () { return Promise.resolve(); }
        }
      }
    };
    ctx.addResponseToTicket().then(function () {
      mergeCoverage(ctx);
      done();
    });
  });
});

// =========================================================
// MODAL-HANDLER.JS TESTS
// =========================================================
describe('modal-handler.js', function () {

  it('showOtraModal should trigger showModal', function () {
    const ctx = createAppSandbox();
    let triggered = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = { modalTitle: 'Additional Info' };
    ctx.appState = {
      client: {
        interface: {
          trigger: function (action, opts) {
            triggered = true;
            assert.strictEqual(action, 'showModal');
            assert.ok(opts.title);
          }
        }
      }
    };
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    ctx.showOtraModal();
    assert.ok(triggered);
    mergeCoverage(ctx);
  });

  it('handleTextoAdicional should return early when no ticket data', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    ctx.console = { warn: function () {} };
    ctx.appState = { currentTicketData: null };
    ctx.handleTextoAdicional('some text').then(function () {
      mergeCoverage(ctx);
      done();
    });
  });

  it('handleTextoAdicional should return early when text is empty', function (done) {
    const ctx = createAppSandbox();
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    ctx.console = { warn: function () {} };
    ctx.appState = { currentTicketData: { subject: 'S', description: 'D' } };
    ctx.handleTextoAdicional('   ').then(function () {
      mergeCoverage(ctx);
      done();
    });
  });

  it('handleTextoAdicional should generate new response with additional text', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = {
      loadingNewResponse: 'Generating...',
      btnAdd: 'Add', btnOther: 'Other',
      btnAddTitle: 'Add', btnOtherTitle: 'Other',
      promptSubject: 'Subject', promptBody: 'Body'
    };
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    ctx.appState = {
      currentTicketData: { subject: 'Test', description: 'Desc' },
      lastChatGPTResponse: null
    };

    ctx.handleTextoAdicional('more context').then(function () {
      assert.ok(textEl.innerHTML.includes('fw-button'));
      mergeCoverage(ctx);
      done();
    });
  });

  it('handleTextoAdicional should render error on failure', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.window.client.request.invokeTemplate = function () {
      return Promise.reject({ status: 500, message: 'Server error' });
    };
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.i18n.strings = {
      loadingNewResponse: 'Generating...',
      promptSubject: 'Subject', promptBody: 'Body',
      errorServer500: 'Server error', errorUnknown: 'Unknown'
    };
    ctx.console = { error: function () {} };
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    ctx.appState = {
      currentTicketData: { subject: 'Test', description: 'Desc' },
      lastChatGPTResponse: null
    };

    ctx.handleTextoAdicional('more context').then(function () {
      assert.ok(textEl.innerHTML.includes('error'));
      mergeCoverage(ctx);
      done();
    });
  });
});

// =========================================================
// APP.JS TESTS
// =========================================================
describe('app.js', function () {
  this.timeout(5000);

  it('initializeApp should load and set up the app on success', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };

    // Load dependencies first (app.js depends on all of them)
    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    ctx.fetch = function () {
      return Promise.resolve({
        json: function () {
          return Promise.resolve({
            btnAdd: 'Add', btnOther: 'Other', loading: 'Loading...',
            btnAddTitle: 'Add', btnOtherTitle: 'Other',
            promptSubject: 'Subject', promptBody: 'Body'
          });
        }
      });
    };
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    // Load app.js - it calls initializeApp() immediately
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    // Give promises time to resolve (initializeApp is async)
    setTimeout(function () {
      assert.ok(ctx.appState.client);
      mergeCoverage(ctx);
      done();
    }, 200);
  });

  it('initializeApp catch should render error when app.initialized fails', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.app = {
      initialized: function () {
        return Promise.reject(new Error('Init failed'));
      }
    };
    ctx.console = { error: function () {} };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      assert.ok(textEl.innerHTML.includes('Init failed'));
      mergeCoverage(ctx);
      done();
    }, 200);
  });

  it('initializeApp catch should handle string errors', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.app = {
      initialized: function () {
        return Promise.reject('string error');
      }
    };
    ctx.console = { error: function () {} };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      assert.ok(textEl.innerHTML.includes('string error'));
      mergeCoverage(ctx);
      done();
    }, 200);
  });

  it('initializeApp catch should handle object errors via JSON.stringify', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.app = {
      initialized: function () {
        return Promise.reject({ code: 42 });
      }
    };
    ctx.console = { error: function () {} };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      assert.ok(textEl.innerHTML.includes('42'));
      mergeCoverage(ctx);
      done();
    }, 200);
  });

  it('initializeApp catch should handle null textElement', function (done) {
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return null; } };
    ctx.app = {
      initialized: function () {
        return Promise.reject(new Error('Init failed'));
      }
    };
    ctx.console = { error: function () {} };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      // No crash even if textElement is null
      mergeCoverage(ctx);
      done();
    }, 200);
  });

  it('renderText should handle object error without message property', function (done) {
    const textEl = { innerHTML: '' };
    const failingClient = {
      iparams: { get: function () { return Promise.resolve({ app_language: 'English', debug_enabled: false }); } },
      request: { invokeTemplate: function () { return Promise.resolve({ response: '{}' }); } },
      interface: { trigger: function () { return Promise.resolve(); } },
      data: { get: function () { return Promise.reject({ code: 'NETWORK' }); } },
      instance: { receive: function () {} },
      events: { on: function () {} }
    };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.console = { error: function () {}, log: function () {}, warn: function () {} };
    ctx.fetch = function () {
      return Promise.resolve({
        json: function () { return Promise.resolve({ loading: 'Loading...' }); }
      });
    };
    ctx.app = { initialized: function () { return Promise.resolve(failingClient); } };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    ctx.appState = { client: failingClient, currentTicketData: null, lastChatGPTResponse: null };
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      ctx.appState.client = failingClient;
      ctx.renderText();
      setTimeout(function () {
        assert.ok(textEl.innerHTML.includes('NETWORK'));
        mergeCoverage(ctx);
        done();
      }, 500);
    }, 500);
  });

  it('renderText should show response on success', function (done) {
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.fetch = function () {
      return Promise.resolve({
        json: function () {
          return Promise.resolve({
            btnAdd: 'Add', btnOther: 'Other', loading: 'Loading...',
            btnAddTitle: 'Add', btnOtherTitle: 'Other',
            promptSubject: 'Subject', promptBody: 'Body'
          });
        }
      });
    };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    // Don't load app.js (it auto-calls initializeApp). Set up appState manually.
    ctx.appState = { client: ctx.window.client, currentTicketData: null, lastChatGPTResponse: null };

    // Load app.js (calls initializeApp() on load)
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    // Wait for initializeApp() promises + then call renderText
    setTimeout(function () {
      ctx.renderText().then(function () {
        assert.ok(textEl.innerHTML.includes('fw-button'));
        assert.ok(ctx.appState.lastChatGPTResponse);
        mergeCoverage(ctx);
        done();
      });
    }, 200);
  });

  it('renderText should render error when ticket data fetch fails', function (done) {
    const textEl = { innerHTML: '' };
    const failingClient = {
      iparams: { get: function () { return Promise.resolve({ app_language: 'English', debug_enabled: false }); } },
      request: { invokeTemplate: function () { return Promise.resolve({ response: '{}' }); } },
      interface: { trigger: function () { return Promise.resolve(); } },
      data: { get: function () { return Promise.reject(new Error('Ticket fetch failed')); } },
      instance: { receive: function () {} },
      events: { on: function () {} }
    };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.console = { error: function () {}, log: function () {}, warn: function () {} };
    ctx.fetch = function () {
      return Promise.resolve({
        json: function () { return Promise.resolve({ loading: 'Loading...' }); }
      });
    };
    // Override app.initialized to return our failing client
    ctx.app = {
      initialized: function () { return Promise.resolve(failingClient); }
    };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    // Set up appState manually (don't load app.js which auto-calls initializeApp)
    ctx.appState = { client: failingClient, currentTicketData: null, lastChatGPTResponse: null };

    // Load app.js to get instrumented renderText, then call it after init completes
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    // initializeApp runs, sets appState.client = failingClient.
    // Then we call renderText which will fail on data.get
    setTimeout(function () {
      // Ensure appState.client points to failingClient
      ctx.appState.client = failingClient;
      ctx.renderText();
      setTimeout(function () {
        assert.ok(textEl.innerHTML.includes('Ticket fetch failed'), 'Expected error message in innerHTML, got: ' + textEl.innerHTML);
        mergeCoverage(ctx);
        done();
      }, 500);
    }, 500);
  });

  it('renderText should render error when ChatGPT call fails', function (done) {
    const failingClient = {
      iparams: { get: function () { return Promise.resolve({ app_language: 'English', system_prompt: 'test', debug_enabled: false }); } },
      request: { invokeTemplate: function () { return Promise.reject({ status: 500, message: 'API down' }); } },
      interface: { trigger: function () { return Promise.resolve(); } },
      data: { get: function () { return Promise.resolve({ ticket: { subject: 'S', description: 'D' } }); } },
      instance: { receive: function () {} },
      events: { on: function () {} }
    };
    const textEl = { innerHTML: '' };
    const ctx = createAppSandbox();
    ctx.document = { getElementById: function () { return textEl; } };
    ctx.console = { error: function () {}, log: function () {}, warn: function () {} };
    ctx.fetch = function () {
      return Promise.resolve({
        json: function () {
          return Promise.resolve({
            loading: 'Loading...', errorServer500: 'Server down',
            promptSubject: 'Subject', promptBody: 'Body',
            errorUnknown: 'Unknown'
          });
        }
      });
    };
    ctx.app = {
      initialized: function () { return Promise.resolve(failingClient); }
    };

    loadInstrumented('app/scripts/logger.js', ctx, LOGGER_VARS);
    ctx.logger.enabled = false;
    loadInstrumented('app/scripts/i18n.js', ctx, I18N_VARS);
    loadInstrumented('app/scripts/chatgpt-service.js', ctx, CHATGPT_VARS);
    loadInstrumented('app/scripts/ui-renderer.js', ctx, UIRENDERER_VARS);
    loadInstrumented('app/scripts/ticket-handler.js', ctx, TICKET_VARS);
    loadInstrumented('app/scripts/modal-handler.js', ctx, MODAL_VARS);

    ctx.appState = { client: failingClient, currentTicketData: null, lastChatGPTResponse: null };
    loadInstrumented('app/scripts/app.js', ctx, APP_VARS);

    setTimeout(function () {
      ctx.appState.client = failingClient;
      ctx.renderText();
      setTimeout(function () {
        assert.ok(textEl.innerHTML.includes('error'), 'Expected error in innerHTML, got: ' + textEl.innerHTML);
        mergeCoverage(ctx);
        done();
      }, 500);
    }, 500);
  });
});
