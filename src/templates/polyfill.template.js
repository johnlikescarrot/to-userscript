function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

  // Global assets map injected during assembly
  window.EXTENSION_ASSETS_MAP = window.EXTENSION_ASSETS_MAP || {{EXTENSION_ASSETS_MAP}};

  const storageChangeListeners = new Set();
  function broadcastStorageChange(changes, areaName) {
    const changeRecords = {};
    for (const [key, newValue] of Object.entries(changes)) {
        changeRecords[key] = { newValue };
    }
    storageChangeListeners.forEach((listener) => {
      try { listener(changeRecords, areaName); } catch(e) {}
    });
  }

  // Stateful DNR Rule Management
  let dynamicRules = [];

  const polyfill = {
    runtime: {
      ...RUNTIME,
      getManifest: () => JSON.parse(JSON.stringify(INJECTED_MANIFEST)),
      getURL: (path) => _createAssetUrl(path),
      openOptionsPage: () => {
        if (OPTIONS_PAGE_PATH) _openTab(_createAssetUrl(OPTIONS_PAGE_PATH), true);
        else console.warn("[to-userscript] No options page defined.");
      },
      id: "{{SCRIPT_ID}}"
    },
    i18n: {
      getMessage: (key, subs = []) => {
        let msg = LOCALE_KEYS[key]?.message || key;
        (Array.isArray(subs) ? subs : [subs]).forEach((s, i) => msg = msg.replace(`$${i+1}`, s));
        return msg;
      },
      getUILanguage: () => USED_LOCALE || "en"
    },
    storage: {
      local: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => { const p = _storageSet(i).then(() => broadcastStorageChange(i, "local")); if (cb) p.then(cb); return p; },
        remove: (k, cb) => { const p = _storageRemove(k).then(() => broadcastStorageChange({}, "local")); if (cb) p.then(cb); return p; },
        clear: (cb) => { const p = _storageClear().then(() => broadcastStorageChange({}, "local")); if (cb) p.then(cb); return p; },
        onChanged: { addListener: (l) => storageChangeListeners.add(l), removeListener: (l) => storageChangeListeners.delete(l) }
      },
      sync: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => { const p = _storageSet(i).then(() => broadcastStorageChange(i, "sync")); if (cb) p.then(cb); return p; }
      },
      onChanged: {
        addListener: (l) => storageChangeListeners.add(l),
        removeListener: (l) => storageChangeListeners.delete(l)
      }
    },
    tabs: {
      create: (props) => { _openTab(props.url, props.active !== false); return Promise.resolve({ id: 1 }); },
      query: () => Promise.resolve([{ id: 1, url: CURRENT_LOCATION, active: true }]),
      sendMessage: (id, msg) => RUNTIME.sendMessage(msg)
    },
    scripting: {
      executeScript: async (details = {}) => {
          const { func, files, args } = details;
          try {
              if (func) {
                  const res = await func(...(args || []));
                  return [{ result: res, frameId: 0 }];
              }
              if (files) {
                  let lastRes = undefined;
                  for (const file of files) {
                      const cleanPath = file.startsWith("/") ? file.slice(1) : file;
                      const content = window.EXTENSION_ASSETS_MAP[cleanPath];
                      if (content) {
                          lastRes = eval(content);
                      } else {
                          console.error(`[to-userscript] Script file not found in assets: ${file}`);
                      }
                  }
                  return [{ result: lastRes, frameId: 0 }];
              }
              return [];
          } catch (err) {
              throw err;
          }
      },
      insertCSS: async ({ css, files } = {}) => {
          if (css) {
              const style = document.createElement('style');
              style.textContent = css;
              style.setAttribute('data-scripting-css', '');
              (document.head || document.documentElement).appendChild(style);
          }
          if (files) {
              for (const file of files) {
                  const cleanPath = file.startsWith("/") ? file.slice(1) : file;
                  const content = window.EXTENSION_ASSETS_MAP[cleanPath];
                  if (content) {
                      const style = document.createElement('style');
                      style.textContent = content;
                      style.setAttribute('data-scripting-file', file);
                      (document.head || document.documentElement).appendChild(style);
                  }
              }
          }
      },
      removeCSS: async ({ css, files } = {}) => {
          if (css) {
              const styles = document.querySelectorAll('style[data-scripting-css]');
              for (const s of styles) if (s.textContent === css) s.remove();
          }
          if (files) {
              for (const file of files) {
                  const styles = document.querySelectorAll('style[data-scripting-file]');
                  for (const s of styles) if (s.getAttribute('data-scripting-file') === file) s.remove();
              }
          }
      }
    },
    declarativeNetRequest: {
        updateDynamicRules: ({ addRules, removeRuleIds } = {}) => {
            if (removeRuleIds && removeRuleIds.length > 0) {
                dynamicRules = dynamicRules.filter(r => !removeRuleIds.includes(r.id));
            }
            if (addRules && addRules.length > 0) {
                const newIds = addRules.map(r => r.id);
                dynamicRules = dynamicRules.filter(r => !newIds.includes(r.id));
                dynamicRules = [...dynamicRules, ...addRules];
            }

            if (typeof GM_webRequest !== 'undefined') {
                const mappedRules = dynamicRules.map(r => {
                    let selector = r.condition?.urlFilter || '*';
                    if (selector.startsWith('||')) {
                        selector = '*' + selector.slice(2);
                    }
                    return {
                        selector: selector,
                        action: r.action?.type === 'block' ? 'cancel' : 'allow'
                    };
                });
                GM_webRequest(mappedRules, () => {});
            }
            return Promise.resolve();
        },
        getDynamicRules: () => Promise.resolve([...dynamicRules])
    },
    sidePanel: {
        setOptions: () => Promise.resolve(),
        setPanelBehavior: () => Promise.resolve(),
        open: () => { console.warn("[to-userscript] sidePanel.open is not supported in userscript context."); return Promise.resolve(); }
    },
    cookies: {
      get: (d) => _cookieList(d).then(c => c[0] || null),
      getAll: (d) => _cookieList(d),
      set: (d) => _cookieSet(d),
      remove: (d) => _cookieDelete(d)
    },
    notifications: {
      create: (arg1, arg2, cb) => {
        const id = typeof arg1 === 'string' ? arg1 : Math.random().toString();
        const opts = typeof arg1 === 'object' ? arg1 : arg2;
        const callback = typeof arg2 === 'function' ? arg2 : cb;
        if (Notification.permission === "granted") new Notification(opts.title, { body: opts.message });
        if (callback) callback(id);
        return Promise.resolve(id);
      }
    },
    permissions: {
      contains: () => Promise.resolve(true),
      request: () => Promise.resolve(true)
    },
    contextMenus: {
      create: (props) => { _registerMenuCommand(props.title, props.onclick); return props.id || 1; },
      removeAll: () => {}
    },
    action: {
        setBadgeText: (d) => { console.log("[to-userscript] Badge set:", d.text); return Promise.resolve(); },
        setBadgeBackgroundColor: () => Promise.resolve(),
        setIcon: () => Promise.resolve(),
        setTitle: () => Promise.resolve()
    }
  };

  // Full backward compatibility aliases for Manifest V2
  polyfill.browserAction = polyfill.action;
  polyfill.pageAction = polyfill.action;
  return polyfill;
}
