function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);

  const storageChangeListeners = new Set();
  function broadcastStorageChange(areaName, changes) {
    storageChangeListeners.forEach((listener) => {
      try { listener(changes, areaName); } catch(e) {}
    });
  }

  const actionState = {
    badgeText: "",
    badgeBackgroundColor: "",
    title: {{INJECTED_MANIFEST}}.name,
    popup: {{INJECTED_MANIFEST}}.action?.default_popup || ""
  };

  // Persistent stores for the session
  let dynamicRules = [];
  const sessionStore = {};
  const sidePanelOptions = { path: SIDE_PANEL_PATH, enabled: true };
  const injectedStyleIds = new Set();

  const syncDnr = () => {
    if (typeof GM_webRequest !== 'function') return;
    const gmRules = dynamicRules.map(rule => {
        const gmRule = { selector: rule.condition.urlFilter, action: rule.action.type === "block" ? "cancel" : "redirect" };
        if (rule.action.type === "redirect") {
            gmRule.action = { redirect: rule.action.redirect.url };
        }
        return gmRule;
    });
    GM_webRequest(gmRules, (info, message, details) => {
        _log("Rule matched:", info, message, details);
    });
  };

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
      onClicked: {
        addListener: (l) => BUS.on('action.onClicked', l),
        removeListener: () => {}
      }
    },
    scripting: {
      executeScript: async (details) => {
        if (details.func) {
          const result = await details.func(...(details.args || []));
          return [{ result }];
        }
        if (details.files) {
          const results = [];
          for (const file of details.files) {
            const content = EXTENSION_ASSETS_MAP[file];
            if (content) {
                const result = (0, eval)(content);
                results.push({ result });
            }
          }
          return results;
        }
        return [];
      },
      insertCSS: async (details) => {
        let css = details.css;
        if (details.files) {
            css = details.files.map(f => EXTENSION_ASSETS_MAP[f] || "").join("\n");
        }
        if (css) {
          const style = document.createElement('style');
          style.textContent = css;
          const id = 'ts-injected-css-' + Math.random().toString(36).slice(2);
          style.id = id;
          injectedStyleIds.add(id);
          (document.head || document.documentElement).appendChild(style);
        }
        return Promise.resolve();
      },
      removeCSS: async (details) => {
          // Simplistic removal for the userscript context
          injectedStyleIds.forEach(id => {
              document.getElementById(id)?.remove();
          });
          injectedStyleIds.clear();
          return Promise.resolve();
      }
    },
    sidePanel: {
      setOptions: (options) => {
          Object.assign(sidePanelOptions, options);
          return Promise.resolve();
      },
      open: (options) => {
        const path = options?.path || sidePanelOptions.path;
        if (path && sidePanelOptions.enabled) showUI(path, "sidepanel");
        return Promise.resolve();
      },
      setPanelBehavior: (behavior) => {
          _log('sidePanel.setPanelBehavior', behavior);
          return Promise.resolve();
      }
    },
    declarativeNetRequest: {
      updateDynamicRules: async (options) => {
        if (typeof GM_webRequest !== 'function') {
            _warn('GM_webRequest not supported in this userscript manager.');
            return;
        }
        if (options.removeRuleIds) {
            dynamicRules = dynamicRules.filter(r => !options.removeRuleIds.includes(r.id));
        }
        if (options.addRules) {
            dynamicRules.push(...options.addRules);
        }
        syncDnr();
        return Promise.resolve();
      },
      getDynamicRules: () => Promise.resolve(JSON.parse(JSON.stringify(dynamicRules)))
    },
    offscreen: {
      createDocument: async (details) => {
          if (document.getElementById('offscreen-doc')) return Promise.resolve();
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
        const subArr = Array.isArray(subs) ? subs : [subs];
        subArr.forEach((s, i) => {
           msg = msg.replace(new RegExp('\\\\$' + (i + 1), 'g'), s);
        });
        return msg;
      },
      getUILanguage: () => USED_LOCALE || "en"
    },
    storage: {
      local: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => {
            const p = _storageSet(i).then(() => {
                const changes = {};
                for (const [key, val] of Object.entries(i)) changes[key] = { newValue: val };
                broadcastStorageChange("local", changes);
            });
            if (cb) p.then(cb); return p;
        },
        remove: async (k, cb) => {
            const keys = Array.isArray(k) ? k : [k];
            const changes = {};
            for (const key of keys) {
                const oldValue = await _storageGet(key).then(r => r[key]);
                changes[key] = { oldValue, newValue: undefined };
            }
            await _storageRemove(k);
            broadcastStorageChange("local", changes);
            if (cb) cb();
        },
        clear: async (cb) => {
            const all = await _storageGet(null);
            const changes = {};
            for (const k of Object.keys(all)) changes[k] = { oldValue: all[k], newValue: undefined };
            await _storageClear();
            broadcastStorageChange("local", changes);
            if (cb) cb();
        },
        onChanged: { addListener: (l) => storageChangeListeners.add(l), removeListener: (l) => storageChangeListeners.delete(l) }
      },
      sync: {
        get: (k, cb) => { const p = _storageGet(k); if (cb) p.then(cb); return p; },
        set: (i, cb) => {
            const p = _storageSet(i).then(() => {
                const changes = {};
                for (const [key, val] of Object.entries(i)) changes[key] = { newValue: val };
                broadcastStorageChange("sync", changes);
            });
            if (cb) p.then(cb); return p;
        },
        remove: async (k, cb) => {
            const keys = Array.isArray(k) ? k : [k];
            const changes = {};
            for (const key of keys) {
                const oldValue = await _storageGet(key).then(r => r[key]);
                changes[key] = { oldValue, newValue: undefined };
            }
            await _storageRemove(k);
            broadcastStorageChange("sync", changes);
            if (cb) cb();
        },
        clear: async (cb) => {
            const all = await _storageGet(null);
            const changes = {};
            for (const k of Object.keys(all)) changes[k] = { oldValue: all[k], newValue: undefined };
            await _storageClear();
            broadcastStorageChange("sync", changes);
            if (cb) cb();
        }
      },
      session: {
        get: (k, cb) => {
            const res = k === null ? { ...sessionStore } : (typeof k === "string" ? { [k]: sessionStore[k] } : (Array.isArray(k) ? k.reduce((a, b) => ({ ...a, [b]: sessionStore[b] }), {}) : Object.keys(k).reduce((a, b) => ({ ...a, [b]: sessionStore[b] !== undefined ? sessionStore[b] : k[b] }), {})));
            if (cb) cb(res);
            return Promise.resolve(JSON.parse(JSON.stringify(res)));
        },
        set: (items, cb) => {
            const changes = {};
            for (const [k, v] of Object.entries(items)) {
                changes[k] = { oldValue: sessionStore[k], newValue: v };
                sessionStore[k] = v;
            }
            broadcastStorageChange("session", changes);
            if (cb) cb();
            return Promise.resolve();
        }
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
