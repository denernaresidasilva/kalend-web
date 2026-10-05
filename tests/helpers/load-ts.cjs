/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// One module cache per mounted test tree: editor and navigation share the actual guard registry.
module.exports = function loader(mocks = {}, globals = {}) {
  const root = path.resolve(__dirname, '../..');
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loaded = { exports: {} }; cache.set(absolute, loaded);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(absolute), id);
        return load(['.ts', '.tsx', '.cjs'].map(ext => base + ext).find(candidate => fs.existsSync(candidate)));
      }
      return require(id);
    }, process: { env: { NEXT_PUBLIC_API_URL: 'https://web.test' } }, console, setTimeout, clearTimeout,
    URL, AbortController, Buffer, ...globals }, { filename: absolute });
    return loaded.exports;
  }
  return load;
};
