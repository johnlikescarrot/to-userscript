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

{{COMBINED_EXECUTION_LOGIC}}

async function main() {
  _log("Initializing userscript...");

  if (typeof _initStorage === "function") await _initStorage();

  const currentUrl = window.location.href;
  const polyfill = buildPolyfill();
  window.chrome = polyfill;
  window.browser = polyfill;

  for (const config of (CONTENT_SCRIPT_CONFIGS || [])) {
    const matches = (config.matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));
    const excluded = (config.exclude_matches || []).some(p => convertMatchPatternToRegExp(p).test(currentUrl));

    if (matches && !excluded) {
      await executeConfigScripts(config, polyfill, EXTENSION_CSS_MAP);
    }
  }
}
