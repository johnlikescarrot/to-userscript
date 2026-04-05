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

  // Managed Offscreen System
  let offscreenDoc = null;

  // Dynamic userScripts Registry
  const registeredUserScripts = new Map();

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
        setTitle: ({ title }) => _log('Action title set:', title),
        setBadgeText: ({ text }) => _log('Badge text set:', text),
        setBadgeBackgroundColor: ({ color }) => _log('Badge color set:', color),
        setIcon: (details) => _log('Action icon set'),
        onClicked: { addListener: (fn) => BUS.on('action-click', fn) }
    },
    scripting: {
        executeScript: ({ target, func, files, args }) => {
            _log('Scripting.executeScript called for target:', target);
            if (func) {
                const code = `(${func.toString()})(...${JSON.stringify(args || [])})`;
                return Promise.resolve([{ result: eval(code) }]);
            }
            return Promise.resolve([]);
        },
        insertCSS: ({ target, css, files }) => {
            _log('Scripting.insertCSS called');
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
            }
            return Promise.resolve();
        }
    },
    offscreen: {
        createDocument: ({ url, reasons, justification }) => {
            if (offscreenDoc) return Promise.reject(new Error('Offscreen document already exists'));
            _log('Creating offscreen document:', url);
            const container = document.createElement('div');
            container.style.display = 'none';
            const shadow = container.attachShadow({ mode: 'closed' });
            const iframe = document.createElement('iframe');
            iframe.src = _createAssetUrl(url);
            shadow.appendChild(iframe);
            document.body.appendChild(container);
            offscreenDoc = { container, iframe };
            return Promise.resolve();
        },
        closeDocument: () => {
            if (offscreenDoc) {
                offscreenDoc.container.remove();
                offscreenDoc = null;
            }
            return Promise.resolve();
        },
        hasDocument: () => Promise.resolve(!!offscreenDoc)
    },
    userScripts: {
        register: (scripts) => {
            scripts.forEach(s => registeredUserScripts.set(s.id, s));
            _log('User scripts registered:', scripts.map(s => s.id));
            return Promise.resolve();
        },
        getScripts: ({ ids } = {}) => {
            const all = Array.from(registeredUserScripts.values());
            if (ids) return Promise.resolve(all.filter(s => ids.includes(s.id)));
            return Promise.resolve(all);
        },
        unregister: ({ ids } = {}) => {
            if (ids) ids.forEach(id => registeredUserScripts.delete(id));
            else registeredUserScripts.clear();
            return Promise.resolve();
        }
    },
    identity: {
        getAuthToken: () => Promise.resolve('simulated-token'),
        launchWebAuthFlow: ({ url, interactive }) => {
            _log('Identity web auth flow launched:', url);
            return new Promise((resolve) => {
                const win = window.open(url, '_blank', 'width=500,height=600');
                // In a real userscript we'd listen for redirects here
                resolve(url + '#access_token=simulated');
            });
        }
    },
    declarativeNetRequest: {
        updateDynamicRules: ({ addRules, removeRuleIds }) => {
            _log("DNR updateDynamicRules called");
            return Promise.resolve();
        },
        getDynamicRules: () => Promise.resolve([]),
        updateSessionRules: () => Promise.resolve(),
        getSessionRules: () => Promise.resolve([])
    },
    alarms: {
        create: (name, details) => {
            _log('Alarm created:', name, details);
            const delay = details.delayInMinutes ? details.delayInMinutes * 60000 : 0;
            setTimeout(() => BUS.emit('alarm', { name }), delay);
        },
        onAlarm: { addListener: (fn) => BUS.on('alarm', fn) }
    }
  };

  return polyfill;
}
