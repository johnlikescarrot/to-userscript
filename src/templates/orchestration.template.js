const INJECTED_MANIFEST = {{INJECTED_MANIFEST}};
const CONTENT_SCRIPT_CONFIGS = {{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}};
const OPTIONS_PAGE_PATH = {{OPTIONS_PAGE_PATH}};
const POPUP_PAGE_PATH = {{POPUP_PAGE_PATH}};
const EXTENSION_ICON = {{EXTENSION_ICON}};
const EXTENSION_CSS_MAP = {{EXTENSION_CSS_DATA}};

const LOCALE_KEYS = {{LOCALE}};
const USED_LOCALE = {{USED_LOCALE}};
const CURRENT_LOCATION = window.location.href;

// Scoped asset map to prevent cross-script collisions
if (typeof window.EXTENSION_ASSETS_MAPS !== "object" || window.EXTENSION_ASSETS_MAPS === null) {
    window.EXTENSION_ASSETS_MAPS = {};
}
window.EXTENSION_ASSETS_MAPS["{{SCRIPT_ID}}"] = {{EXTENSION_ASSETS_MAP}};

function _base64ToBlob(base64, mimeType = "application/octet-stream") {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function _createAssetUrl(path = "") {
  if (path.startsWith("/")) path = path.slice(1);
  const assets = window.EXTENSION_ASSETS_MAPS["{{SCRIPT_ID}}"] || {};
  const assetData = assets[path];
  if (typeof assetData === "undefined") return path;

  const ext = "." + (path.split(".").pop() || "").toLowerCase();
  const mimeMap = {{MIME_MAP}};
  const mimeType = mimeMap[ext] || "application/octet-stream";

  const isText = [".html", ".htm", ".js", ".css", ".json", ".svg"].includes(ext);

  if (isText) return URL.createObjectURL(new Blob([assetData], { type: mimeType }));
  return URL.createObjectURL(_base64ToBlob(assetData, mimeType));
}

function _createSidePanelUI(title = "Extension") {
  const panelId = \`extension-sidepanel-{{SCRIPT_ID}}\`;
  if (document.getElementById(panelId)) return document.getElementById(panelId);

  const container = document.createElement('div');
  container.id = panelId;
  container.style.cssText = \`position: fixed; top: 0; right: -400px; width: 400px; height: 100vh; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.2); z-index: 2147483647; transition: right 0.3s ease-in-out; display: flex; flex-direction: column; font-family: system-ui, sans-serif;\`;

  const header = document.createElement('div');
  header.style.cssText = \`padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f9f9f9;\`;
  header.innerHTML = \`<b style="color: #333">\${title}</b>\`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = \`background: none; border: none; cursor: pointer; font-size: 18px; color: #999; padding: 5px;\`;
  closeBtn.onclick = () => { container.style.right = '-400px'; };
  header.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = \`flex: 1; border: none; width: 100%; height: 100%;\`;
  iframe.id = \`\${panelId}-iframe\`;

  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);
  return container;
}

const _sidePanelState = { options: { enabled: true, path: '' } };

{{COMBINED_EXECUTION_LOGIC}}

// --- Shared Communication Bus
const BUS = createEventBus("{{SCRIPT_ID}}");

async function main() {
  const SCRIPT_NAME = INJECTED_MANIFEST.name || "Extension";
  const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
  const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
  const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

  _log("Initializing userscript context...");

  if (typeof _initStorage === "function") await _initStorage();

  // P2: Initialize Polyfill with Shared BUS
  const polyfill = buildPolyfill({ bus: BUS });
  window.chrome = polyfill;
  window.browser = polyfill;

  const currentUrl = window.location.href;

  // UI Event Handlers
  BUS.on('__SIDEPANEL_OPEN__', (payload) => {
    const container = _createSidePanelUI(SCRIPT_NAME);
    const iframe = document.getElementById(\`\${container.id}-iframe\`);
    const path = payload?.path || _sidePanelState.options.path || OPTIONS_PAGE_PATH;
    if (path) {
      iframe.src = _createAssetUrl(path);
      container.style.right = '0';
    } else {
      _warn("Cannot open side panel: No path specified and no default path available.");
    }
  });

  BUS.on('__SIDEPANEL_SET_OPTIONS__', (options) => {
    Object.assign(_sidePanelState.options, options);
  });

  const executeScripts = async (configs, cssMap) => {
    for (const config of (configs || [])) {
      const matches = (config.matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));
      const excluded = (config.exclude_matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));

      if (matches && !excluded) {
        await executeConfigScripts(config, polyfill, cssMap);
      }
    }
  };

  // Initial Content Scripts
  await executeScripts(CONTENT_SCRIPT_CONFIGS || [], EXTENSION_CSS_MAP);

  // Dynamic Content Scripts
  const dynamicScripts = await polyfill.scripting.getRegisteredContentScripts();
  await executeScripts(dynamicScripts, EXTENSION_CSS_MAP);

  // Patch registerContentScripts for automatic bootstrapping
  const originalRegister = polyfill.scripting.registerContentScripts;
  polyfill.scripting.registerContentScripts = async (scripts) => {
    await originalRegister(scripts);
    _log('Dynamic scripts registered, bootstrapping execution...');
    await executeScripts(scripts, EXTENSION_CSS_MAP);
  };

  // Handle Action Clicks (Industrial Spec)
  // P1: Establish cross-instance listener
  if (polyfill.action && polyfill.action.onClicked) {
    polyfill.action.onClicked.addListener(async (tab) => {
      const behavior = await polyfill.sidePanel.getPanelBehavior();
      if (behavior && behavior.openPanelOnActionClick) {
        polyfill.sidePanel.open();
      } else if (POPUP_PAGE_PATH) {
         _log("Action click: opening popup emulator");
         polyfill.sidePanel.open({ path: POPUP_PAGE_PATH });
      }
    });

    // P2: Link Userscript Menu to Action Click
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand("Open Action Interface", () => {
        BUS.emit("__ACTION_CLICKED__", { tab: { id: 1, url: CURRENT_LOCATION } });
      });
    }
  }
}
