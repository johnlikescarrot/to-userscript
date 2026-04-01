const INJECTED_MANIFEST = {{INJECTED_MANIFEST}};
const CONTENT_SCRIPT_CONFIGS_FOR_MATCHING = {{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}};
const OPTIONS_PAGE_PATH = {{OPTIONS_PAGE_PATH}};
const POPUP_PAGE_PATH = {{POPUP_PAGE_PATH}};
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
  const isText = ["html", "htm", "js", "css", "json", "svg"].includes(ext);
  const mime = "application/octet-stream"; // Simplified helper

  if (isText) return URL.createObjectURL(new Blob([assetData], { type: "text/plain" }));
  return URL.createObjectURL(_base64ToBlob(assetData, mime));
}

{{COMBINED_EXECUTION_LOGIC}}

async function main() {
  _log("Initializing userscript...");

  if (typeof _initStorage === "function") await _initStorage();

  const currentUrl = window.location.href;
  let matched = false;

  for (const config of CONTENT_SCRIPT_CONFIGS_FOR_MATCHING) {
    if (config.matches && config.matches.some(p => currentUrl.includes(p))) { // Simplified matching
      matched = true;
      break;
    }
  }

  if (matched) {
    const polyfill = buildPolyfill();
    window.chrome = polyfill;
    window.browser = polyfill;
    await executeAllScripts(polyfill, extensionCssData);
  }
}
