function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

  const storageChangeListeners = new Set();
  async function broadcastStorageChange(changes, areaName, oldValues = {}) {
    const changeRecords = {};
    for (const [key, newValue] of Object.entries(changes)) {
        changeRecords[key] = { oldValue: oldValues[key], newValue };
    }
    storageChangeListeners.forEach((listener) => {
      try { listener(changeRecords, areaName); } catch(e) {}
    });
  }

  const _closeTab = () => {
    if (typeof window.close === "function") {
      window.close();
    } else {
      _warn("Cannot close tab: window.close() not available.");
    }
  };

  return {
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
        const subList = Array.isArray(subs) ? subs : [subs];
        subList.forEach((s, i) => {
          msg = msg.split('$' + (i + 1)).join(s);
        });
        return msg;
      },
      getUILanguage: () => USED_LOCALE || "en"
    },
    storage: {
      local: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => {
          const keys = Object.keys(i);
          const p = _storageGet(keys).then(old => _storageSet(i).then(() => broadcastStorageChange(i, "local", old)));
          if (cb) p.then(cb);
          return p;
        },
        remove: (k, cb) => {
          const p = _storageGet(k).then(old => _storageRemove(k).then(() => {
            const changes = {};
            (Array.isArray(k) ? k : [k]).forEach(key => changes[key] = undefined);
            return broadcastStorageChange(changes, "local", old);
          }));
          if (cb) p.then(cb);
          return p;
        },
        clear: (cb) => {
          const p = _storageGet(null).then(old => _storageClear().then(() => {
            const changes = {};
            Object.keys(old).forEach(key => changes[key] = undefined);
            return broadcastStorageChange(changes, "local", old);
          }));
          if (cb) p.then(cb);
          return p;
        },
        onChanged: { addListener: (l) => storageChangeListeners.add(l), removeListener: (l) => storageChangeListeners.delete(l) }
      },
      sync: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => {
          const keys = Object.keys(i);
          const p = _storageGet(keys).then(old => _storageSet(i).then(() => broadcastStorageChange(i, "sync", old)));
          if (cb) p.then(cb);
          return p;
        }
      },
      onChanged: {
        addListener: (l) => storageChangeListeners.add(l),
        removeListener: (l) => storageChangeListeners.delete(l)
      }
    },
    alarms: {
        create: (name, props) => { _log("Alarm created (stub):", name, props); },
        get: (name, cb) => { if (cb) cb(null); return Promise.resolve(null); },
        clear: (name, cb) => { if (cb) cb(true); return Promise.resolve(true); },
        onAlarm: { addListener: () => {}, removeListener: () => {} }
    },
    webNavigation: {
        onCompleted: { addListener: () => {}, removeListener: () => {} },
        onBeforeNavigate: { addListener: () => {}, removeListener: () => {} },
        onCommitted: { addListener: () => {}, removeListener: () => {} }
    },
    tabs: {
      create: (props) => { _openTab(props.url, props.active !== false); return Promise.resolve({ id: 1 }); },
      query: () => Promise.resolve([{ id: 1, url: CURRENT_LOCATION, active: true }]),
      get: (id) => Promise.resolve({ id: 1, url: CURRENT_LOCATION, active: true }),
      /** Single-tab polyfill: id is ignored, behavior is uniform */
      update: (id, props) => {
        if (props && props.url) {
            window.location.href = props.url;
        }
        return Promise.resolve({ id: 1, url: (props && props.url) || CURRENT_LOCATION, active: true });
      },
      /** Single-tab polyfill: id is ignored, only close if id is 1 */
      remove: (id) => {
        if (id === 1) _closeTab();
        return Promise.resolve();
      },
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
        const id = typeof arg1 === "string" ? arg1 : Math.random().toString();
        const opts = typeof arg1 === "object" ? arg1 : arg2;
        const callback = typeof arg2 === "function" ? arg2 : cb;

        const details = {
          text: opts.message,
          title: opts.title,
          image: opts.iconUrl,
          onclick: opts.onclick,
          ondone: () => { if (callback) callback(id); }
        };

        if (typeof GM_notification === "function") {
          GM_notification(details);
        } else if (typeof Notification === "function" && Notification.permission === "granted") {
          const n = new Notification(opts.title, { body: opts.message, icon: opts.iconUrl });
          if (opts.onclick) n.onclick = opts.onclick;
          setTimeout(() => { if (callback) callback(id); }, 0);
        } else {
          _warn("Notifications not supported or permission denied.");
          if (callback) callback(id);
        }
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
