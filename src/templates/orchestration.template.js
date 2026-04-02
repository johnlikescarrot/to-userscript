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
  if (!path) return "";
  if (path.startsWith("/")) path = path.slice(1);
  const assetData = EXTENSION_ASSETS_MAP[path];
  if (typeof assetData === "undefined") return path;

  const ext = (path.split(".").pop() || "").toLowerCase();
  const isText = ["html", "htm", "js", "css", "json", "svg"].includes(ext);

  let mime = "application/octet-stream";
  if (ext === "html" || ext === "htm") mime = "text/html";
  else if (ext === "css") mime = "text/css";
  else if (ext === "js") mime = "text/javascript";
  else if (ext === "png") mime = "image/png";
  else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
  else if (ext === "svg") mime = "image/svg+xml";

  if (isText) return URL.createObjectURL(new Blob([assetData], { type: mime }));
  return URL.createObjectURL(_base64ToBlob(assetData, mime));
}

let sidePanelContainer = null;
function _toggleSidePanel(path) {
    if (sidePanelContainer) {
        sidePanelContainer.remove();
        sidePanelContainer = null;
        return;
    }

    sidePanelContainer = document.createElement('div');
    sidePanelContainer.id = 'to-userscript-sidepanel-root';
    const shadow = sidePanelContainer.attachShadow({ mode: 'open' });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 350px;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 5px rgba(0,0,0,0.2);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 10px;
        background: #f1f1f1;
        border-bottom: 1px solid #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const title = document.createElement('strong');
    title.textContent = INJECTED_MANIFEST.name;

    const closeBtn = document.createElement('button');
    closeBtn.id = 'close-sp';
    closeBtn.style.cssText = 'cursor:pointer; border:none; background:none; font-size: 20px;';
    closeBtn.innerHTML = '&times;'; // Safe as it's a static entity
    closeBtn.onclick = () => _toggleSidePanel();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const iframe = document.createElement('iframe');
    iframe.src = _createAssetUrl(path);
    iframe.style.cssText = 'flex: 1; border: none;';

    wrapper.appendChild(header);
    wrapper.appendChild(iframe);
    shadow.appendChild(wrapper);
    document.body.appendChild(sidePanelContainer);
}

{{COMBINED_EXECUTION_LOGIC}}

async function main() {
  _log("Initializing transcendent userscript...");

  if (typeof _initStorage === "function") await _initStorage();

  const currentUrl = window.location.href;
  let matched = false;

  for (const config of CONTENT_SCRIPT_CONFIGS_FOR_MATCHING) {
    if (config.matches) {
       const regexes = config.matches.map(p => convertMatchPatternToRegExp(p));
       if (regexes.some(re => re.test(currentUrl))) {
         matched = true;
         break;
       }
    }
  }

  if (matched) {
    const polyfill = buildPolyfill();
    window.chrome = polyfill;
    window.browser = polyfill;
    await executeAllScripts(polyfill, extensionCssData);
  }

  if (OPTIONS_PAGE_PATH) {
    _registerMenuCommand("⚙️ Open Options", () => {
      _openTab(_createAssetUrl(OPTIONS_PAGE_PATH), true);
    });
  }
  if (POPUP_PAGE_PATH) {
    _registerMenuCommand("✨ Open Popup", () => {
      _openTab(_createAssetUrl(POPUP_PAGE_PATH), true);
    });
  }
  if (SIDE_PANEL_PATH) {
    _registerMenuCommand("📂 Toggle Side Panel", () => {
      _toggleSidePanel(SIDE_PANEL_PATH);
    });
  }
}
