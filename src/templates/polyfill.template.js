function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

  const assetsMap = window.EXTENSION_ASSETS_MAPS["{{SCRIPT_ID}}"] || {};

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

  // Stateful DNR rule management
  let _dynamicRules = [];

  const polyfill = {
    runtime: {
      ...RUNTIME,
      getManifest: () => JSON.parse(JSON.stringify(INJECTED_MANIFEST)),
      getURL: (path) => _createAssetUrl(path),
      openOptionsPage: () => {
        if (OPTIONS_PAGE_PATH) _openTab(_createAssetUrl(OPTIONS_PAGE_PATH), true);
        else _warn("No options page defined.");
      },
      id: "{{SCRIPT_ID}}"
    },
    i18n: {
      getMessage: (key, subs = []) => {
        let msg = LOCALE_KEYS[key]?.message || key;
        const subList = (Array.isArray(subs) ? subs : [subs]);
        subList.forEach((s, i) => {
            msg = msg.replace(new RegExp(`\\$${i+1}`, 'g'), s);
        });
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
    scripting: {
      executeScript: async ({ target, func, files, args } = {}) => {
          if (func) {
              try {
                  const isolatedFunc = new Function('args', `return (${func.toString()})(...args)`);
                  const res = isolatedFunc(args || []);
                  return [{ result: await res, frameId: 0 }];
              } catch (err) {
                  return Promise.reject(err);
              }
          }
          if (files) {
              const results = [];
              for (const file of files) {
                  const cleanPath = file.startsWith("/") ? file.slice(1) : file;
                  const content = assetsMap[cleanPath];
                  if (content) {
                      try {
                          const res = new Function(content)();
                          results.push({ result: await res, frameId: 0 });
                      } catch (e) { _error("executeScript file error:", e); }
                  }
              }
              return results;
          }
          return [];
      },
      insertCSS: async ({ target, css, files } = {}) => {
          if (css) {
              const style = document.createElement('style');
              style.textContent = css;
              style.setAttribute('data-scripting-css', 'true');
              (document.head || document.documentElement).appendChild(style);
          }
          if (files) {
              for (const file of files) {
                  const cleanPath = file.startsWith("/") ? file.slice(1) : file;
                  const content = assetsMap[cleanPath];
                  if (content) {
                      const style = document.createElement('style');
                      style.textContent = content;
                      style.setAttribute('data-scripting-file', cleanPath);
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
                  const cleanPath = file.startsWith("/") ? file.slice(1) : file;
                  const styles = document.querySelectorAll(`style[data-scripting-file="${CSS.escape(cleanPath)}"]`);
                  for (const s of styles) s.remove();
              }
          }
      }
    },
    declarativeNetRequest: {
      updateDynamicRules: ({ addRules = [], removeRuleIds = [] } = {}) => {
        _dynamicRules = _dynamicRules.filter(r => !removeRuleIds.includes(r.id));
        addRules.forEach(r => {
            _dynamicRules = _dynamicRules.filter(dr => dr.id !== r.id);
            _dynamicRules.push({ ...r });
        });

        const mappedRules = _dynamicRules.map(r => ({
            selector: r.condition?.urlFilter || "*",
            action: r.action?.type === "block" ? "cancel" : "ok"
        }));

        if (typeof GM_webRequest === "function") {
            try { GM_webRequest(mappedRules, () => {}); } catch(e) { _warn("DNR/GM_webRequest error:", e); }
        }
        return Promise.resolve();
      },
      getDynamicRules: () => Promise.resolve([..._dynamicRules])
    },
    sidePanel: {
        setOptions: () => Promise.resolve(),
        open: () => { _warn("sidePanel.open is not supported in userscripts."); return Promise.resolve(); }
    },
    tabs: {
      create: (props) => { _openTab(props.url, props.active !== false); return Promise.resolve({ id: 1 }); },
      query: () => Promise.resolve([{ id: 1, url: CURRENT_LOCATION, active: true }]),
      sendMessage: (id, msg) => RUNTIME.sendMessage(msg)
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
    action: {
        setBadgeText: (d) => { _log("Badge set:", d.text); return Promise.resolve(); },
        setBadgeBackgroundColor: (d) => { _log("Badge color set:", d.color); return Promise.resolve(); },
        setTitle: (d) => { _log("Title set:", d.title); return Promise.resolve(); },
        setIcon: (d) => { _log("Icon set:", d); return Promise.resolve(); },
        enable: () => Promise.resolve(),
        disable: () => Promise.resolve()
    },
    permissions: {
      contains: () => Promise.resolve(true),
      request: () => Promise.resolve(true)
    },
    contextMenus: {
      create: (props) => { _registerMenuCommand(props.title, props.onclick); return props.id || 1; },
      removeAll: () => {}
    }
  };

  polyfill.browserAction = polyfill.action;
  polyfill.pageAction = polyfill.action;
  return polyfill;
}
