/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { JSDOM } = require('jsdom');
const loader = require('./helpers/load-ts.cjs');
const dom = new JSDOM('<div id="root"></div>');
for (const name of ['window', 'document', 'navigator']) Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom.window : dom.window[name] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('event connection verifies the session, uses cookies, refreshes and closes on tenant change', async () => {
  const sources = [], calls = []; let changes = 0;
  class Source {
    constructor(url, options) { this.url = url; this.options = options; this.listeners = {}; sources.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    close() { this.closed = true; }
  }
  const load = loader({ '@/lib/api': { API_URL: 'https://api-dev.kalend.tech', tenantApi: async (...args) => { calls.push(args); } } }, { EventSource: Source });
  const { useBookingEvents } = load('components/bookings/use-booking-events.ts');
  const onChange = () => changes++;
  function Consumer({ companyId }) { const connected = useBookingEvents(companyId, 'user', onChange); return React.createElement('p', null, connected ? 'connected' : 'pending'); }
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => { root.render(React.createElement(Consumer, { companyId: 'A' })); await tick(); });
    assert.deepEqual(calls[0], ['A', '/auth/me', undefined, 'user']);
    assert.equal(sources[0].url, 'https://api-dev.kalend.tech/booking/events'); assert.equal(sources[0].options.withCredentials, true);
    await React.act(async () => { sources[0].onopen(); sources[0].listeners['booking-change'](); });
    assert.equal(changes, 1); assert.equal(document.querySelector('p').textContent, 'connected');
    await React.act(async () => { root.render(React.createElement(Consumer, { companyId: 'B' })); await tick(); });
    assert.equal(sources[0].closed, true); assert.equal(calls.at(-1)[0], 'B');
  } finally { await React.act(async () => root.unmount()); dom.window.close(); }
  assert.equal(sources.at(-1).closed, true);
});
