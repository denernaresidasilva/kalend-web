/* eslint-disable @typescript-eslint/no-require-imports */
const { JSDOM } = require('jsdom');

module.exports = function browserNavigation({ nativeNavigation = true } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://web.test/super-admin/comunicacao' });
  const { window } = dom;
  let entries = ['https://web.test/previous', window.location.href, 'https://web.test/next'];
  let index = 1; const calls = []; const prompts = []; let answer = false;
  window.confirm = message => { prompts.push(message); return answer; };
  const tracked = [];
  for (const target of [window, window.document]) {
    const add = target.addEventListener.bind(target); const remove = target.removeEventListener.bind(target);
    target.addEventListener = (name, fn, capture) => { if (name === 'beforeunload' || (name === 'click' && capture === true)) tracked.push([target, name, fn, capture]); add(name, fn, capture); };
    target.removeEventListener = (name, fn, capture) => { const i = tracked.findIndex(item => item[0] === target && item[1] === name && item[2] === fn && item[3] === capture); if (i >= 0) tracked.splice(i, 1); remove(name, fn, capture); };
  }
  const navigation = new window.EventTarget();
  const addNavigationListener = navigation.addEventListener.bind(navigation);
  const removeNavigationListener = navigation.removeEventListener.bind(navigation);
  navigation.addEventListener = (name, fn) => { tracked.push([navigation, name, fn]); addNavigationListener(name, fn); };
  navigation.removeEventListener = (name, fn) => { const i = tracked.findIndex(item => item[0] === navigation && item[1] === name && item[2] === fn); if (i >= 0) tracked.splice(i, 1); removeNavigationListener(name, fn); };
  navigation.entries = () => entries.map((url, index) => ({ url, index }));
  Object.defineProperty(navigation, 'currentEntry', { get: () => ({ url: entries[index], index }) });
  if (nativeNavigation) Object.defineProperty(window, 'navigation', { value: navigation });
  function navigate(type, destination, commit, cancelable = true) {
    if (nativeNavigation) {
      const event = new window.Event('navigate', { cancelable });
      Object.assign(event, { navigationType: type, destination: { url: destination } });
      if (!navigation.dispatchEvent(event)) return false;
    }
    commit(); window.history.replaceState({}, '', entries[index]);
    navigation.dispatchEvent(new window.Event('currententrychange'));
    return true;
  }
  function traverse(delta, cancelable) {
    const next = index + delta; if (!(next in entries)) return false;
    return navigate('traverse', entries[next], () => { index = next; }, cancelable);
  }
  const router = {
    push(url, options) { calls.push(['push', url, options]); const destination = new URL(url, window.location.href).href; return navigate('push', destination, () => { entries = entries.slice(0, index + 1); entries.push(destination); index++; }); },
    replace(url, options) { calls.push(['replace', url, options]); const destination = new URL(url, window.location.href).href; return navigate('replace', destination, () => { entries[index] = destination; }); },
    back() { calls.push(['back']); return traverse(-1); },
    forward() { calls.push(['forward']); return traverse(1); },
    refresh() {}, prefetch() {}, bfcacheId: 'fixture',
  };
  return { dom, window, navigation, router, calls, prompts, tracked, answer(value) { answer = value; },
    snapshot: () => ({ entries: [...entries], index, url: window.location.href }), nativeBack: cancelable => traverse(-1, cancelable), nativeForward: cancelable => traverse(1, cancelable) };
};
