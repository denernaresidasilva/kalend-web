/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/load-ts.cjs');

for (const pathname of ['/planos', '/lp', '/termos', '/privacidade', '/conta']) {
  test(`expired anonymous session preserves public catalog and protects account: ${pathname}`, async () => {
    const redirects = [];
    const load = loader({}, {
      window: { location: { pathname, replace: value => redirects.push(value) }, dispatchEvent() {} },
      navigator: {}, Event: class {},
      fetch: async () => ({ ok: false, status: 401, json: async () => ({}) }),
    });
    const client = load('lib/api.ts');
    await assert.rejects(client.api('/auth/me'), error => error.status === 401);
    assert.deepEqual(redirects, ['/planos', '/lp', '/termos', '/privacidade'].includes(pathname) ? [] : ['/']);
  });
}
