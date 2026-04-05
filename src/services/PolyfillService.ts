import { TemplateService } from './TemplateService.js';
import { AssetMap } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
import { ManifestService } from './ManifestService.js';
import { AssetService } from './AssetService.js';

export class PolyfillService {
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

    // High-fidelity MIME map serialization
    const mimeMapJson = JSON.stringify(AssetService.MIME_MAP);

    const getURLImpl = `
      getURL: (path) => {
        if (!path) return "";
        let cleanPath = path.startsWith("/") ? path.substring(1) : path;
        const assets = window.EXTENSION_ASSETS_MAPS["{{SCRIPT_ID}}"] || {};
        const data = assets[cleanPath];
        if (typeof data === "undefined") return path;

        const mimeMap = ${mimeMapJson};
        const ext = "." + (cleanPath.split(".").pop() || "").toLowerCase();
        const mimeType = mimeMap[ext] || "application/octet-stream";

        const isText = ["html", "htm", "js", "css", "json", "svg"].some(t => cleanPath.endsWith(t));
        const blob = isText ? new Blob([data], { type: mimeType }) : new Blob([_base64ToUint8Array(data)], { type: mimeType });
        return URL.createObjectURL(blob);
      }
    `;

    let combined = `
${decodingHelper}
${messaging}
${abstraction}

${polyfillTemplate
  .replace('{{IS_IFRAME}}', target === 'postmessage' ? 'true' : 'false')
  .replace(/{{SCRIPT_ID}}/g, internalId)
  .replace(/getURL: \(path\) => .*,/, getURLImpl + ',')
  .replace('{{EXTENSION_ASSETS_MAP}}', JSON.stringify(assetMap))
  .replace('{{INJECTED_MANIFEST}}', JSON.stringify(manifest))}
`;

    return combined;
  }
}
