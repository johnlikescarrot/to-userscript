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

  const actionState = {
    badgeText: "",
    badgeBackgroundColor: "",
    title: {{INJECTED_MANIFEST}}.name,
    popup: {{INJECTED_MANIFEST}}.action?.default_popup || ""
  };

  const dynamicRules = [];

  return {
    runtime: {
      ...RUNTIME,
      getManifest: () => JSON.parse(JSON.stringify({{INJECTED_MANIFEST}})),
      getURL: (path) => _createAssetUrl(path),
      openOptionsPage: () => {
        if (OPTIONS_PAGE_PATH) _openTab(_createAssetUrl(OPTIONS_PAGE_PATH), true);
        else _warn("No options page defined.");
      },
      id: "{{SCRIPT_ID}}"
    },
    action: {
      setTitle: (details) => { actionState.title = details.title; return Promise.resolve(); },
      getTitle: (details, cb) => { if (cb) cb(actionState.title); return Promise.resolve(actionState.title); },
      setBadgeText: (details) => { actionState.badgeText = details.text; return Promise.resolve(); },
      getBadgeText: (details, cb) => { if (cb) cb(actionState.badgeText); return Promise.resolve(actionState.badgeText); },
      setBadgeBackgroundColor: (details) => { actionState.badgeBackgroundColor = details.color; return Promise.resolve(); },
      getBadgeBackgroundColor: (details, cb) => { if (cb) cb(actionState.badgeBackgroundColor); return Promise.resolve(actionState.badgeBackgroundColor); },
      setPopup: (details) => { actionState.popup = details.popup; return Promise.resolve(); },
      getPopup: (details, cb) => { if (cb) cb(actionState.popup); return Promise.resolve(actionState.popup); },
      onClicked: { addListener: (l) => BUS.on('action.onClicked', l), removeListener: () => {} }
    },
    scripting: {
      executeScript: async (details) => {
        if (details.func) {
          const result = await details.func(...(details.args || []));
          return [{ result }];
        }
        if (details.files) {
          for (const file of details.files) {
            const content = EXTENSION_ASSETS_MAP[file];
            if (content) (0, eval)(content);
          }
        }
        return [];
      },
      insertCSS: async (details) => {
        if (details.css) {
          const style = document.createElement('style');
          style.textContent = details.css;
          (document.head || document.documentElement).appendChild(style);
        }
        return Promise.resolve();
      },
      removeCSS: () => Promise.resolve()
    },
    sidePanel: {
      setOptions: (options) => { return Promise.resolve(); },
      open: (options) => {
        if (SIDE_PANEL_PATH) _toggleSidePanel(SIDE_PANEL_PATH);
        return Promise.resolve();
      },
      setPanelBehavior: () => Promise.resolve()
    },
    declarativeNetRequest: {
      updateDynamicRules: async (options) => {
        if (typeof GM_webRequest !== 'function') {
            _warn('GM_webRequest not supported in this userscript manager.');
            return;
        }

        if (options.addRules) {
            const gmRules = options.addRules.map(rule => {
                const gmRule = { selector: rule.condition.urlFilter, action: rule.action.type };
                if (rule.action.type === 'redirect') {
                    gmRule.action = { redirect: rule.action.redirect.url };
                }
                return gmRule;
            });
            GM_webRequest(gmRules, (info, message, details) => {
                _log('Rule matched:', info, message, details);
            });
            dynamicRules.push(...options.addRules);
        }
        return Promise.resolve();
      },
      getDynamicRules: () => Promise.resolve(dynamicRules)
    },
    offscreen: {
      createDocument: async (details) => {
          const iframe = document.createElement('iframe');
          iframe.id = 'offscreen-doc';
          iframe.style.display = 'none';
          iframe.src = _createAssetUrl(details.url);
          document.body.appendChild(iframe);
          return Promise.resolve();
      },
      closeDocument: async () => {
          document.getElementById('offscreen-doc')?.remove();
          return Promise.resolve();
      }
    },
    i18n: {
      getMessage: (key, subs = []) => {
        let msg = LOCALE_KEYS[key]?.message || key;
        (Array.isArray(subs) ? subs : [subs]).forEach((s, i) => {
           msg = msg.replace(new RegExp('\\$' + (i + 1), 'g'), s);
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
      session: {
        get: (k, cb) => { const res = {}; const p = Promise.resolve(res); if (cb) cb(res); return p; },
        set: (i, cb) => { if (cb) cb(); return Promise.resolve(); }
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
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") new Notification(opts.title, { body: opts.message });
            });
        }
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
    }
  };
}
