/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const browserNavigation = require('./helpers/browser-navigation.cjs');
const loader = require('./helpers/load-ts.cjs');
function setup(options) {
  const browser = browserNavigation(options);
  const guard = loader({}, { window: browser.window, document: browser.window.document, Element: browser.window.Element })('lib/email-leave-guard.ts');
  let dirty = false;
  const cleanup = guard.installEmailLeaveGuard(() => dirty);
  return { ...browser, guard, cleanup, dirty(value) { dirty = value; }, guarded: guard.guardEmailRouter(browser.router) };
}
for (const method of ['push', 'replace']) {
  for (const [label, dirty, answer, allowed] of [['clean', false, false, true], ['confirmed', true, true, true], ['cancelled', true, false, false]]) {
    test(`navigation ${method}: ${label}`, () => {
      const b = setup(); try {
        b.dirty(dirty); b.answer(answer); const before = b.snapshot();
        b.guarded[method]('/conta', { scroll: false });
        assert.equal(b.calls.length, allowed ? 1 : 0);
        assert.equal(b.prompts.length, dirty ? 1 : 0);
        if (!allowed) assert.deepEqual(b.snapshot(), before);
        else { assert.equal(b.snapshot().url, 'https://web.test/conta'); assert.equal(b.snapshot().entries.length, before.entries.length); }
      } finally { b.cleanup(); b.dom.window.close(); }
    });
  }
}
for (const method of ['back', 'forward']) for (const confirmed of [false, true]) {
  test(`native ${method}: ${confirmed ? 'confirmed' : 'cancelled'} without modifying history entries`, () => {
    const b = setup(); try {
      b.dirty(true); b.answer(confirmed); const before = b.snapshot();
      b[method === 'back' ? 'nativeBack' : 'nativeForward']();
      assert.equal(b.prompts.length, 1); assert.deepEqual(b.snapshot().entries, before.entries);
      assert.equal(b.snapshot().index, confirmed ? before.index + (method === 'back' ? -1 : 1) : before.index);
      if (!confirmed) assert.deepEqual(b.snapshot(), before);
    } finally { b.cleanup(); b.dom.window.close(); }
  });
  test(`router.${method}: ${confirmed ? 'confirmed' : 'cancelled'} asks once`, () => {
    const b = setup(); try {
      b.dirty(true); b.answer(confirmed); const before = b.snapshot(); b.guarded[method]();
      assert.equal(b.calls.length, confirmed ? 1 : 0); assert.equal(b.prompts.length, 1);
      assert.deepEqual(b.snapshot().entries, before.entries);
      if (!confirmed) assert.deepEqual(b.snapshot(), before);
    } finally { b.cleanup(); b.dom.window.close(); }
  });
}
test('multiple attempts and guard registrations do not accumulate listeners or synthetic entries', () => {
  const b = setup(); try {
    b.dirty(true); const before = b.snapshot(); const listeners = b.tracked.length;
    for (let i = 0; i < 8; i++) { b.guarded.push('/conta'); b.nativeBack(); b.nativeForward(); }
    assert.deepEqual(b.snapshot(), before); assert.equal(b.tracked.length, listeners);
    const extra = b.guard.installEmailLeaveGuard(() => false); assert.equal(b.tracked.length, listeners); extra();
    b.cleanup(); assert.equal(b.tracked.length, 0); b.cleanup(); assert.equal(b.tracked.length, 0);
    assert.doesNotMatch(fs.readFileSync('lib/email-leave-guard.ts', 'utf8'), /history\.(pushState|replaceState|go)|addEventListener\('popstate'/);
  } finally { b.cleanup(); b.dom.window.close(); }
});
test('without Navigation API, programmatic traversal is protected and native SPA traversal remains unsupported', () => {
  const b = setup({ nativeNavigation: false }); try {
    b.dirty(true); const before = b.snapshot(); b.guarded.back(); b.guarded.forward(); b.guarded.push('/conta'); b.guarded.replace('/conta');
    assert.deepEqual(b.snapshot(), before); assert.equal(b.calls.length, 0);
    b.nativeBack(); assert.equal(b.snapshot().index, before.index - 1); // Explicit platform limitation; never fabricate history.
  } finally { b.cleanup(); b.dom.window.close(); }
});
test('non-cancelable native traversal is left intact rather than restored with synthetic history', () => {
  const b = setup(); try {
    b.dirty(true); const before = b.snapshot(); b.nativeBack(false);
    assert.equal(b.snapshot().index, before.index - 1); assert.deepEqual(b.snapshot().entries, before.entries);
  } finally { b.cleanup(); b.dom.window.close(); }
});
test('reload/close use beforeunload only for dirty forms', () => {
  const b = setup(); try {
    let event = new b.window.Event('beforeunload', { cancelable: true }); assert.equal(b.window.dispatchEvent(event), true);
    b.dirty(true); event = new b.window.Event('beforeunload', { cancelable: true }); assert.equal(b.window.dispatchEvent(event), false);
    b.dirty(false); event = new b.window.Event('beforeunload', { cancelable: true }); assert.equal(b.window.dispatchEvent(event), true);
  } finally { b.cleanup(); b.dom.window.close(); }
});
test('internal link and logout button can be cancelled or confirmed', () => {
  const b = setup(); try {
    const a = b.window.document.createElement('a'); a.href = '/conta';
    const logout = b.window.document.createElement('button'); logout.setAttribute('aria-label', 'Sair');
    b.window.document.body.append(a, logout); b.dirty(true); let logouts = 0;
    logout.addEventListener('click', () => logouts++);
    assert.equal(a.dispatchEvent(new b.window.MouseEvent('click', { bubbles: true, cancelable: true })), false);
    logout.click(); assert.equal(logouts, 0);
    b.answer(true); logout.click(); assert.equal(logouts, 1); assert.equal(b.prompts.length, 3);
  } finally { b.cleanup(); b.dom.window.close(); }
});
