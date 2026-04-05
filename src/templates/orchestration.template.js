const INJECTED_MANIFEST = {{INJECTED_MANIFEST}};
const CONTENT_SCRIPT_CONFIGS_FOR_MATCHING = {{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}};
const OPTIONS_PAGE_PATH = {{OPTIONS_PAGE_PATH}};
const POPUP_PAGE_PATH = {{POPUP_PAGE_PATH}};
const SIDE_PANEL_PATH = {{SIDE_PANEL_PATH}};
const EXTENSION_ICON = {{EXTENSION_ICON}};
const extensionCssData = {{EXTENSION_CSS_DATA}};

const LOCALE_KEYS = {{LOCALE}};
const USED_LOCALE = {{USED_LOCALE}};
const CURRENT_LOCATION = window.location.href;

function _getMimeType(path) {
  const ext = (path.split('.').pop() || '').toLowerCase();
  const map = {
    'html': 'text/html', 'htm': 'text/html', 'js': 'text/javascript',
    'css': 'text/css', 'json': 'application/json', 'png': 'image/png',
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'svg': 'image/svg+xml', 'webp': 'image/webp', 'ico': 'image/x-icon',
    'woff': 'font/woff', 'woff2': 'font/woff2', 'ttf': 'font/ttf'
  };
  return map[ext] || 'application/octet-stream';
}

function _base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function _createAssetUrl(path = "") {
  if (path.startsWith("/")) path = path.slice(1);
  const assetData = EXTENSION_ASSETS_MAP[path];
  if (typeof assetData === "undefined") return path;

  const mime = _getMimeType(path);
  const isText = ["html", "htm", "js", "css", "json", "svg"].includes((path.split('.').pop() || '').toLowerCase());

  if (isText) return URL.createObjectURL(new Blob([assetData], { type: mime }));
  return URL.createObjectURL(_base64ToBlob(assetData, mime));
}

let _hudRoot = null;
function _getHUD() {
    if (_hudRoot) return _hudRoot;
    const container = document.createElement('div');
    container.id = 'extension-hud-root';
    container.style.cssText = 'position:fixed;top:0;right:0;z-index:2147483647;pointer-events:none;';
    const shadow = container.attachShadow({ mode: 'closed' });
    _hudRoot = shadow;
    (document.body || document.documentElement).appendChild(container);
    return shadow;
}

function _showUI(path, type = 'popup') {
    const shadow = _getHUD();
    const url = _createAssetUrl(path);
    const existing = shadow.querySelector(`iframe[data-type="${type}"]`);
    if (existing) {
        existing.style.display = 'block';
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.dataset.type = type;
    iframe.style.cssText = 'pointer-events:auto;border:none;background:white;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-radius:8px;position:fixed;';

    if (type === 'popup') {
        iframe.style.cssText += 'top:10px;right:10px;width:320px;height:480px;';
    } else if (type === 'sidePanel') {
        iframe.style.cssText += 'top:0;right:0;width:400px;height:100%;border-radius:0;';
    }

    shadow.appendChild(iframe);
}

{{COMBINED_EXECUTION_LOGIC}}

async function main() {
  _log("Initializing Transcendent Userscript...");
  if (typeof _initStorage === "function") await _initStorage();

  const currentUrl = window.location.href;
  const matched = CONTENT_SCRIPT_CONFIGS_FOR_MATCHING.some(config =>
    config.matches && config.matches.some(p => {
        try { return convertMatchPatternToRegExp(p).test(currentUrl); } catch(e) { return false; }
    })
  );

  const polyfill = buildPolyfill();
  window.chrome = polyfill;
  window.browser = polyfill;

  if (matched) {
    await executeAllScripts(polyfill, extensionCssData);
  }

  // Register UI commands via Tampermonkey menu
  /* v8 ignore next 5 */ if (OPTIONS_PAGE_PATH) _registerMenuCommand(chrome.i18n.getMessage("options_page") || "Options", () => chrome.runtime.openOptionsPage());
  if (POPUP_PAGE_PATH) _registerMenuCommand(chrome.i18n.getMessage("popup") || "Open Extension Popup", () => _showUI(POPUP_PAGE_PATH, 'popup'));
}
