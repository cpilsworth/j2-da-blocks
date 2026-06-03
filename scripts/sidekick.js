/* eslint-disable import/no-cycle */
import { NX_ORIGIN } from './scripts.js';

let expMod;
const DA_EXP = '/public/plugins/exp/exp.js';
const LIVE_DOMAINS = {
  retail: 'retail.diffatech.co.uk',
  trade: 'trade.diffatech.co.uk',
};
const LIVE_DOMAIN_PLUGINS = [
  {
    id: 'open-retail-live',
    title: 'Open Retail Site',
    event: 'open-retail-live',
    host: LIVE_DOMAINS.retail,
  },
  {
    id: 'open-trade-live',
    title: 'Open Trade Site',
    event: 'open-trade-live',
    host: LIVE_DOMAINS.trade,
  },
];

async function toggleExp() {
  const exists = document.querySelector('#aem-sidekick-exp');

  // If it doesn't exist, let module side effects run
  if (!exists) {
    expMod = await import(`${NX_ORIGIN}${DA_EXP}`);
    return;
  }

  // Else, cache the module here and toggle it.
  if (!expMod) expMod = await import(`${NX_ORIGIN}${DA_EXP}`);
  expMod.default();
}

function openLiveDomain(hostname) {
  const url = new URL(window.location.href);
  url.protocol = 'https:';
  url.hostname = hostname;
  url.port = '';
  window.location.assign(url.href);
}

function getLiveDomainPlugins() {
  const { hostname } = window.location;
  if (hostname === LIVE_DOMAINS.retail) {
    return LIVE_DOMAIN_PLUGINS.filter((plugin) => plugin.host === LIVE_DOMAINS.trade);
  }
  if (hostname === LIVE_DOMAINS.trade) {
    return LIVE_DOMAIN_PLUGINS.filter((plugin) => plugin.host === LIVE_DOMAINS.retail);
  }
  return LIVE_DOMAIN_PLUGINS;
}

function removeCurrentLiveDomainPlugin(sk) {
  if (typeof sk.remove !== 'function') return;

  const currentDomainPlugin = LIVE_DOMAIN_PLUGINS.find((plugin) => (
    plugin.host === window.location.hostname
  ));
  if (currentDomainPlugin && typeof sk.get === 'function' && sk.get(currentDomainPlugin.id)) {
    sk.remove(currentDomainPlugin.id);
  }
}

function syncLiveDomainPlugins(sk) {
  removeCurrentLiveDomainPlugin(sk);
  if (typeof sk.add !== 'function') return;

  getLiveDomainPlugins().forEach((plugin) => {
    if (typeof sk.get === 'function' && sk.get(plugin.id)) return;
    sk.add({
      id: plugin.id,
      title: plugin.title,
      event: plugin.event,
    });
  });
}

(async function sidekick() {
  const sk = document.querySelector('aem-sidekick');
  if (!sk) return;
  sk.addEventListener('custom:experimentation', toggleExp);
  LIVE_DOMAIN_PLUGINS.forEach((plugin) => {
    sk.addEventListener(`custom:${plugin.event}`, () => openLiveDomain(plugin.host));
  });
  syncLiveDomainPlugins(sk);
}());
