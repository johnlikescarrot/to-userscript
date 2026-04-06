const INJECTED_MANIFEST = {{INJECTED_MANIFEST}};
const CONTENT_SCRIPT_CONFIGS = {{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}};
const OPTIONS_PAGE_PATH = {{OPTIONS_PAGE_PATH}};
const POPUP_PAGE_PATH = {{POPUP_PAGE_PATH}};
const EXTENSION_ICON = {{EXTENSION_ICON}};
const EXTENSION_CSS_MAP = {{EXTENSION_CSS_DATA}};

const LOCALE_KEYS = {{LOCALE}};
const USED_LOCALE = {{USED_LOCALE}};
const CURRENT_LOCATION = window.location.href;

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

function _createSidePanelUI() {
  const panelId = `extension-sidepanel-{{SCRIPT_ID}}`;
  if (document.getElementById(panelId)) return document.getElementById(panelId);

  const container = document.createElement('div');
  container.id = panelId;
  container.style.cssText = `position: fixed; top: 0; right: -400px; width: 400px; height: 100vh; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.2); z-index: 2147483647; transition: right 0.3s ease-in-out; display: flex; flex-direction: column;`;
  const header = document.createElement('div');
  header.style.cssText = `padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;`;
  header.innerHTML = `<b style="color: #333">${SCRIPT_NAME}</b>`;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `background: none; border: none; cursor: pointer; font-size: 18px; color: #999;`;
  closeBtn.onclick = () => { container.style.right = '-400px'; };
  header.appendChild(closeBtn);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `flex: 1; border: none; width: 100%; height: 100%;`;
  iframe.id = `${panelId}-iframe`;
  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);
  return container;
}

const _sidePanelState = { options: { enabled: true, path: '' } };

{{COMBINED_EXECUTION_LOGIC}}

async function main() {
  _log("Initializing userscript...");
  if (typeof _initStorage === "function") await _initStorage();

  const currentUrl = window.location.href;
  const polyfill = buildPolyfill();
  window.chrome = polyfill;
  window.browser = polyfill;

  const BUS = createEventBus("{{SCRIPT_ID}}");
  BUS.on('__SIDEPANEL_OPEN__', (payload) => {
    const container = _createSidePanelUI();
    const iframe = document.getElementById(`${container.id}-iframe`);
    const path = payload.path || _sidePanelState.options.path;
    if (path) iframe.src = _createAssetUrl(path);
    container.style.right = '0';
  });
  BUS.on('__SIDEPANEL_SET_OPTIONS__', (options) => { Object.assign(_sidePanelState.options, options); });

  const executeScripts = async (configs, cssMap) => {
    for (const config of configs) {
      const matches = (config.matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));
      const excluded = (config.exclude_matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));
      if (matches && !excluded) await executeConfigScripts(config, polyfill, cssMap);
    }
  };

  await executeScripts(CONTENT_SCRIPT_CONFIGS || [], EXTENSION_CSS_MAP);

  const dynamicScripts = await polyfill.scripting.getRegisteredContentScripts();
  await executeScripts(dynamicScripts, EXTENSION_CSS_MAP);

  if (polyfill.action && typeof polyfill.action.onClicked !== 'undefined') {
    polyfill.action.onClicked.addListener(async (tab) => {
      const behavior = await polyfill.sidePanel.getPanelBehavior();
      if (behavior && behavior.openPanelOnActionClick) polyfill.sidePanel.open();
    });
  }

  const originalRegister = polyfill.scripting.registerContentScripts;
  polyfill.scripting.registerContentScripts = async (scripts) => {
    await originalRegister(scripts);
    _log('Dynamic scripts registered, bootstrapping execution...');
    await executeScripts(scripts, EXTENSION_CSS_MAP);
  };
}
