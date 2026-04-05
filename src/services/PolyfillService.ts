import { TemplateService } from './TemplateService.js';
import { AssetMap } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
import { ManifestService } from './ManifestService.js';

export class PolyfillService {
  private static MIME_MAP: Record<string, string> = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "json": "application/json",
    "webp": "image/webp",
    "ico": "image/x-icon",
    "woff": "font/woff",
    "woff2": "font/woff2",
    "ttf": "font/ttf"
  };

  static async build(
    target: 'userscript' | 'vanilla' | 'postmessage',
    assetMap: AssetMap,
    manifest: Manifest
  ): Promise<string> {
    const messaging = await TemplateService.load('messaging');
    const abstraction = await TemplateService.load(`abstractionLayer.${target === 'userscript' ? 'userscript' : target === 'vanilla' ? 'vanilla' : 'postmessage'}`);
    const polyfillTemplate = await TemplateService.load('polyfill');

    const internalId = ManifestService.getInternalId(manifest);

    const decodingHelper = `
function _base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;

    const getURLImpl = `
      getURL: (path) => {
        if (!path) return "";
        let cleanPath = path.startsWith("/") ? path.substring(1) : path;
        const data = window.EXTENSION_ASSETS_MAP[cleanPath];
        if (!data) return path;

        const ext = (cleanPath.split(".").pop() || "").toLowerCase();
        const isText = ["html", "htm", "js", "css", "json", "svg"].includes(ext);

        const mimeMap = ${JSON.stringify(this.MIME_MAP)};
        const mime = isText ? "text/plain" : (mimeMap[ext] || "application/octet-stream");

        const blob = isText ? new Blob([data], { type: mime }) : new Blob([_base64ToUint8Array(data)], { type: mime });
        return URL.createObjectURL(blob);
      }
    `;

    // Ensure all placeholders are replaced, especially INJECTED_MANIFEST and EXTENSION_ASSETS_MAP
    let combined = `
${decodingHelper}
${messaging}
${abstraction}

${polyfillTemplate
  .replace('{{IS_IFRAME}}', target === 'postmessage' ? 'true' : 'false')
  .replace('{{SCRIPT_ID}}', internalId)
  .replace('{{EXTENSION_ASSETS_MAP}}', JSON.stringify(assetMap))
  .replace(/getURL: \(path\) => .*,/, getURLImpl + ',')
  .replace('{{INJECTED_MANIFEST}}', JSON.stringify(manifest))}
`;

    return combined;
  }
}
