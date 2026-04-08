function buildPolyfill({ isBackground = false, bus = null } = {}) {
  const BUS = bus || createEventBus("{{SCRIPT_ID}}");
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

  // --- DNR Engine (Industrial Grade)
  let _dynamicRules = [];
  let _enabledRulesetIds = ["default"];
  let _staticRulesets = {{STATIC_DNR_CONFIGS}} || [];
  let _allStaticRules = {{STATIC_DNR_RULES}} || {};
  let _cachedSortedRules = null;

  function _recomputeDnrCache() {
    let allRules = [..._dynamicRules];
    _enabledRulesetIds.forEach(id => {
      const rules = _allStaticRules[id] || [];
      allRules = allRules.concat(rules);
    });

    // P1: Priority-based sorting (Industrial Spec: Higher Priority > Lower Priority)
    // Action Precedence: allow > block > redirect > upgradeScheme
    const actionOrder = { "allow": 0, "block": 1, "redirect": 2, "upgradeScheme": 3 };

    _cachedSortedRules = allRules.sort((a, b) => {
      if (a.priority !== b.priority) return (b.priority || 1) - (a.priority || 1);
      return (actionOrder[a.action.type] || 99) - (actionOrder[b.action.type] || 99);
    });

    // P2: Synchronize with GM_webRequest if available
    if (typeof GM_webRequest === "function") {
      const mapped = _cachedSortedRules.map(r => ({
        selector: r.condition?.urlFilter || r.condition?.regexFilter || "*",
        action: r.action.type === "block" ? "cancel" : "ok"
      }));
      try { GM_webRequest(mapped, () => {}); } catch(e) {}
    }
  }

  function _evaluateDnrRule(rule, url, resourceType, initiator) {
    const { condition, action } = rule;
    if (!condition) return false;

    // Resource Type filtering
    if (condition.resourceTypes && !condition.resourceTypes.includes(resourceType)) return false;
    if (condition.excludedResourceTypes && condition.excludedResourceTypes.includes(resourceType)) return false;

    // URL filtering
    if (condition.urlFilter) {
      // P1: Use dedicated DNR URL filter logic
      const regex = dnrUrlFilterToRegex(condition.urlFilter, condition.isUrlFilterCaseSensitive !== false);
      if (!regex.test(url)) return false;
    } else if (condition.regexFilter) {
      // P2: Safety wrap for invalid regex patterns from manifest
      try {
        const regex = new RegExp(condition.regexFilter, condition.isUrlFilterCaseSensitive === false ? 'i' : '');
        if (!regex.test(url)) return false;
      } catch (e) { return false; }
    }

    // Initiator filtering
    if (initiator) {
      if (condition.initiatorDomains && !condition.initiatorDomains.some(d => initiator.includes(d))) return false;
      if (condition.excludedInitiatorDomains && condition.excludedInitiatorDomains.some(d => initiator.includes(d))) return false;
    }

    return true;
  }

  function _applyDnrRules(url, resourceType = "xmlhttprequest", initiator = window.location.origin) {
    if (!_cachedSortedRules) _recomputeDnrCache();

    for (const rule of _cachedSortedRules) {
      if (_evaluateDnrRule(rule, url, resourceType, initiator)) {
        return rule.action;
      }
    }
    return { type: "allow" };
  }

  let _registeredScripts = [];

  const polyfill = {
    runtime: {
      ...RUNTIME,
      getManifest: () => JSON.parse(JSON.stringify(INJECTED_MANIFEST)),
      {{GETURL_IMPL}}
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
          } catch (err) { return Promise.reject(err); }
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
      },
      registerContentScripts: async (scripts) => {
        scripts.forEach(s => {
          _registeredScripts = _registeredScripts.filter(rs => rs.id !== s.id);
          _registeredScripts.push(s);
        });
        return Promise.resolve();
      },
      getRegisteredContentScripts: async (filter) => {
        let scripts = [..._registeredScripts];
        if (filter && filter.ids) scripts = scripts.filter(s => filter.ids.includes(s.id));
        return Promise.resolve(scripts);
      },
      unregisterContentScripts: async (filter) => {
        if (!filter || !filter.ids) _registeredScripts = [];
        else _registeredScripts = _registeredScripts.filter(s => !filter.ids.includes(s.id));
        return Promise.resolve();
      },
      updateContentScripts: async (scripts) => {
        scripts.forEach(s => {
          const existing = _registeredScripts.find(rs => rs.id === s.id);
          if (existing) Object.assign(existing, s);
        });
        return Promise.resolve();
      }
    },
    declarativeNetRequest: {
      updateDynamicRules: async ({ addRules = [], removeRuleIds = [] } = {}) => {
        _dynamicRules = _dynamicRules.filter(r => !removeRuleIds.includes(r.id));
        addRules.forEach(r => {
            _dynamicRules = _dynamicRules.filter(dr => dr.id !== r.id);
            _dynamicRules.push({ ...r });
        });
        _recomputeDnrCache();
      },
      getDynamicRules: () => Promise.resolve([..._dynamicRules]),
      updateEnabledRulesets: async ({ enableRulesetIds = [], disableRulesetIds = [] } = {}) => {
        _enabledRulesetIds = _enabledRulesetIds.filter(id => !disableRulesetIds.includes(id));
        enableRulesetIds.forEach(id => {
          if (!_enabledRulesetIds.includes(id)) _enabledRulesetIds.push(id);
        });
        _recomputeDnrCache();
      },
      getEnabledRulesets: () => Promise.resolve([..._enabledRulesetIds]),
      getMatchedRules: () => Promise.resolve({ rulesMatchedInfo: [] }),
      setExtensionActionOptions: () => Promise.resolve(),
    },
    sidePanel: {
      setOptions: (options) => {
        BUS.emit('__SIDEPANEL_SET_OPTIONS__', options);
        return Promise.resolve();
      },
      open: (options = {}) => {
        BUS.emit('__SIDEPANEL_OPEN__', options);
        return Promise.resolve();
      },
      getOptions: () => Promise.resolve({ enabled: true, path: "" }),
      getPanelBehavior: () => Promise.resolve({ openPanelOnActionClick: false }),
      setPanelBehavior: () => Promise.resolve()
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
        setBadgeText: (d) => { console.log("Badge set:", d.text); return Promise.resolve(); },
        setBadgeBackgroundColor: (d) => { console.log("Badge color set:", d.color); return Promise.resolve(); },
        setTitle: (d) => { console.log("Title set:", d.title); return Promise.resolve(); },
        setIcon: (d) => { console.log("Icon set:", d); return Promise.resolve(); },
        enable: () => Promise.resolve(),
        disable: () => Promise.resolve(),
        // P1: Handle action clicks via event bus
        onClicked: {
          addListener: (l) => BUS.on('__ACTION_CLICKED__', (p) => l(p?.tab || { id: 1 })),
          removeListener: (l) => BUS.off('__ACTION_CLICKED__', l)
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

  polyfill.browserAction = polyfill.action;
  polyfill.pageAction = polyfill.action;
  return polyfill;
}
