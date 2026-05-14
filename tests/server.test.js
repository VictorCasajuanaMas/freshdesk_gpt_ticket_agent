const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadServer() {
  const code = fs.readFileSync(path.join(process.cwd(), 'server/server.js'), 'utf8');
  const sandbox = {
    exports: {},
    $request: { invokeTemplate: vi.fn(() => Promise.resolve({})) },
    renderData: vi.fn(),
    JSON: JSON,
    Object: Object,
    Array: Array,
    Error: Error,
    Promise: Promise,
    setTimeout: setTimeout,
    console: console
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx);
  return ctx;
}

describe('server.js - Coverage Tests', function() {
  test('onAppInstallHandler should exist and be a function', function() {
    const ctx = loadServer();
    expect(ctx.exports.onAppInstallHandler).toBeDefined();
    expect(typeof ctx.exports.onAppInstallHandler).toBe('function');
  });

  test('server exports should be an object', function() {
    const ctx = loadServer();
    expect(typeof ctx.exports).toBe('object');
    expect(ctx.exports).not.toBeNull();
  });
});
