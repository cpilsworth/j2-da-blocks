/* eslint-disable import/no-cycle, no-console */
import { NX_ORIGIN } from './scripts.js';

let expMod;
const DA_EXP = '/public/plugins/exp/exp.js';
const DEBUG_PREFIX = '[sidekick-domain-switcher]';
const LIVE_DOMAINS = {
  retail: 'retail.diffatech.co.uk',
  trade: 'trade.diffatech.co.uk',
};
const LIVE_DOMAIN_CONTAINER = {
  id: 'live-domain-switcher',
  title: 'Live Site',
  isContainer: true,
};
const LIVE_DOMAIN_PLUGINS = [
  {
    containerId: LIVE_DOMAIN_CONTAINER.id,
    id: 'open-retail-live',
    title: 'Retail',
    event: 'open-retail-live',
    host: LIVE_DOMAINS.retail,
  },
  {
    containerId: LIVE_DOMAIN_CONTAINER.id,
    id: 'open-trade-live',
    title: 'Trade',
    event: 'open-trade-live',
    host: LIVE_DOMAINS.trade,
  },
];

function debugDomainSwitch(message, data = {}) {
  console.log(DEBUG_PREFIX, message, data);
}

function errorDomainSwitch(message, error, data = {}) {
  console.error(DEBUG_PREFIX, message, { ...data, error });
}

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

function openLiveDomain(hostname, source = 'unknown') {
  try {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.protocol = 'https:';
    url.hostname = hostname;
    url.port = '';
    debugDomainSwitch('navigating to live domain', {
      source,
      currentUrl,
      targetHost: hostname,
      targetUrl: url.href,
    });
    window.location.assign(url.href);
  } catch (error) {
    errorDomainSwitch('failed to switch live domain', error, {
      source,
      currentUrl: window.location.href,
      targetHost: hostname,
    });
  }
}

function getPluginId(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';
  return payload.id || payload.data?.id || '';
}

function openPluginLiveDomain({ detail } = {}) {
  const pluginId = getPluginId(detail);
  const plugin = LIVE_DOMAIN_PLUGINS.find(({ id }) => id === pluginId);
  debugDomainSwitch('plugin-used event received', { pluginId, detail });
  if (plugin) {
    openLiveDomain(plugin.host, 'plugin-used');
    return;
  }
  debugDomainSwitch('plugin-used event ignored', { pluginId, detail });
}

function isLiveDomain() {
  return Object.values(LIVE_DOMAINS).includes(window.location.hostname);
}

function getLiveDomainPlugins() {
  const { hostname } = window.location;
  if (hostname === LIVE_DOMAINS.retail) {
    return LIVE_DOMAIN_PLUGINS.filter((plugin) => plugin.host === LIVE_DOMAINS.trade);
  }
  if (hostname === LIVE_DOMAINS.trade) {
    return LIVE_DOMAIN_PLUGINS.filter((plugin) => plugin.host === LIVE_DOMAINS.retail);
  }
  return [];
}

function removeLiveDomainPlugin(sk, pluginId) {
  if (typeof sk.remove !== 'function') return;
  if (typeof sk.get === 'function' && sk.get(pluginId)) sk.remove(pluginId);
}

function removeLiveDomainPlugins(sk) {
  LIVE_DOMAIN_PLUGINS.forEach((plugin) => removeLiveDomainPlugin(sk, plugin.id));
  removeLiveDomainPlugin(sk, LIVE_DOMAIN_CONTAINER.id);
}

function removeCurrentLiveDomainPlugin(sk) {
  const currentDomainPlugin = LIVE_DOMAIN_PLUGINS.find((plugin) => (
    plugin.host === window.location.hostname
  ));
  if (currentDomainPlugin) removeLiveDomainPlugin(sk, currentDomainPlugin.id);
}

function syncLiveDomainPlugins(sk) {
  debugDomainSwitch('syncing live domain plugins', {
    hostname: window.location.hostname,
    isLiveDomain: isLiveDomain(),
    sidekickHasAdd: typeof sk.add === 'function',
    sidekickHasGet: typeof sk.get === 'function',
    sidekickHasRemove: typeof sk.remove === 'function',
  });

  if (!isLiveDomain()) {
    removeLiveDomainPlugins(sk);
    return;
  }

  removeCurrentLiveDomainPlugin(sk);
  if (typeof sk.add !== 'function') return;

  if (typeof sk.get === 'function' && !sk.get(LIVE_DOMAIN_CONTAINER.id)) {
    sk.add(LIVE_DOMAIN_CONTAINER);
  }

  getLiveDomainPlugins().forEach((plugin) => {
    if (typeof sk.get === 'function' && sk.get(plugin.id)) return;
    sk.add({
      containerId: plugin.containerId,
      id: plugin.id,
      title: plugin.title,
      event: plugin.event,
    });
  });
}

(async function sidekick() {
  const sk = document.querySelector('aem-sidekick');
  if (!sk) return;
  try {
    sk.addEventListener('custom:experimentation', toggleExp);
    LIVE_DOMAIN_PLUGINS.forEach((plugin) => {
      sk.addEventListener(`custom:${plugin.event}`, ({ detail } = {}) => {
        debugDomainSwitch('custom live domain event received', {
          event: `custom:${plugin.event}`,
          detail,
        });
        openLiveDomain(plugin.host, `custom:${plugin.event}`);
      });
    });
    sk.addEventListener('plugin-used', openPluginLiveDomain);
    sk.addEventListener('pluginused', openPluginLiveDomain);
    syncLiveDomainPlugins(sk);
  } catch (error) {
    errorDomainSwitch('failed to initialize sidekick domain switcher', error, {
      hostname: window.location.hostname,
    });
  }
}());
