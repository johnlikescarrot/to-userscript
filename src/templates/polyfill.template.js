function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

  return {
    runtime: {
      ...RUNTIME,
      getManifest: () => JSON.parse(JSON.stringify(INJECTED_MANIFEST)),
      getURL: (path) => _createAssetUrl(path),
      openOptionsPage: () => { _log("Opening options page..."); }
    },
    i18n: {
      getMessage: (key) => LOCALE_KEYS[key]?.message || key,
      getUILanguage: () => USED_LOCALE
    },
    storage: {
      local: {
        get: (keys, cb) => {
          const p = _storageGet(keys);
          if (cb) p.then(cb);
          return p;
        },
        set: (items, cb) => {
          const p = _storageSet(items);
          if (cb) p.then(cb);
          return p;
        },
        remove: (k, cb) => {
          const p = _storageRemove(k);
          if (cb) p.then(cb);
          return p;
        },
        clear: (cb) => {
          const p = _storageClear();
          if (cb) p.then(cb);
          return p;
        },
        onChanged: { addListener: () => {}, removeListener: () => {} }
      },
      sync: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => { const p = _storageSet(i); if (cb) p.then(cb); return p; }
      }
    },
    tabs: {
      create: (props) => _openTab(props.url),
      query: () => Promise.resolve([{ id: 1, url: CURRENT_LOCATION, active: true }]),
      sendMessage: (id, msg) => RUNTIME.sendMessage(msg)
    },
    notifications: {
      create: (id, opts) => Promise.resolve(id)
    },
    permissions: {
      contains: () => Promise.resolve(true),
      request: () => Promise.resolve(true)
    },
    contextMenus: {
      create: (props) => _registerMenuCommand(props.title, props.onclick),
      removeAll: () => {}
    }
  };
}
