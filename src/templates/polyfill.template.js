function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

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
      executeScript: ({ target, func, files, args }) => {
          if (func) {
              const res = func(...(args || []));
              return Promise.resolve([{ result: res, frameId: 0 }]);
          }
          if (files) {
              _warn("scripting.executeScript with files is not supported in userscript context.");
          }
          return Promise.resolve([]);
      },
      insertCSS: () => Promise.resolve(),
      removeCSS: () => Promise.resolve()
    },
    declarativeNetRequest: {
        updateDynamicRules: ({ addRules, removeRuleIds }) => {
            if (typeof GM_webRequest !== 'undefined') {
                const mappedRules = (addRules || []).map(r => ({
                    selector: r.condition?.urlFilter || '*',
                    action: r.action?.type === 'block' ? 'cancel' : 'allow'
                }));
                GM_webRequest(mappedRules, () => {});
            }
            return Promise.resolve();
        },
        getDynamicRules: () => Promise.resolve([])
    },
    sidePanel: {
        setOptions: () => Promise.resolve(),
        setPanelBehavior: () => Promise.resolve(),
        open: () => { _warn("sidePanel.open is not supported in userscript context."); return Promise.resolve(); }
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
        setBadgeText: (d) => { _log("Badge set:", d.text); return Promise.resolve(); },
        setBadgeBackgroundColor: () => Promise.resolve(),
        setIcon: () => Promise.resolve(),
        setTitle: () => Promise.resolve()
    }
  };

  polyfill.browserAction = polyfill.action;
  return polyfill;
}
