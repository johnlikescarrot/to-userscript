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

function _base64ToBlob(base64, mimeType = "application/octet-stream") {
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

  const ext = (path.split(".").pop() || "").toLowerCase();
  const mimeMap = {
      'html': 'text/html', 'htm': 'text/html',
      'js': 'text/javascript', 'css': 'text/css',
      'json': 'application/json', 'svg': 'image/svg+xml'
  };
  const mime = mimeMap[ext] || "application/octet-stream";

  if (mime.startsWith("text/") || mime === "application/json" || mime === "image/svg+xml") {
      return URL.createObjectURL(new Blob([assetData], { type: mime }));
  }
  return URL.createObjectURL(_base64ToBlob(assetData, mime));
}

{{COMBINED_EXECUTION_LOGIC}}

function showUI(path, type = "popup") {
    const url = _createAssetUrl(path);
    const container = document.createElement("div");
    container.id = `ext-ui-${type}`;
    const shadow = container.attachShadow({ mode: "closed" });
    const overlay = document.createElement("div");
    overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;";
    overlay.onclick = () => container.remove();
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style = "width:80%;height:80%;border:none;border-radius:8px;background:white;box-shadow:0 4px 20px rgba(0,0,0,0.25);";
    iframe.sandbox = "allow-scripts allow-forms allow-popups allow-modals";
    overlay.appendChild(iframe);
    shadow.appendChild(overlay);
    document.body.appendChild(container);
}

async function main() {
  _log("Initializing userscript...");
  try {
      if (typeof _initStorage === "function") await _initStorage();

      const currentUrl = window.location.href;
      let matched = false;

      for (const config of CONTENT_SCRIPT_CONFIGS_FOR_MATCHING) {
        if (config.matches && config.matches.some(p => convertMatchPatternToRegExp(p).test(currentUrl))) {
          matched = true;
          break;
        }
      }

      const polyfill = buildPolyfill();
      const scope = {
          chrome: polyfill, browser: polyfill, window, self: window, globalThis: window, document, location,
          history, navigator, console, setTimeout, setInterval, clearTimeout, clearInterval, fetch: _fetch,
          Image, Audio, Blob, File, FormData, URL, XMLHttpRequest, WebSocket, Notification, Storage,
          localStorage, sessionStorage, indexedDB, alert, confirm, prompt
      };

      if (matched) {
        _log("URL Matched, executing scripts...");
        await executeAllScripts(scope, extensionCssData);
      }

      _log("Registering UI commands...");
      if (OPTIONS_PAGE_PATH) {
          _registerMenuCommand("Extension Options", () => showUI(OPTIONS_PAGE_PATH, "options"));
      }
      if (POPUP_PAGE_PATH) {
          _registerMenuCommand("Extension Popup", () => showUI(POPUP_PAGE_PATH, "popup"));
      }
      if (SIDE_PANEL_PATH) {
          _registerMenuCommand("Extension Side Panel", () => showUI(SIDE_PANEL_PATH, "sidepanel"));
      }
  } catch(e) {
      _error("Main execution failed:", e);
  }
}
