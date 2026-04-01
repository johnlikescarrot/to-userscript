import { TemplateService } from './TemplateService.js';
import { AssetMap } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
import { ManifestService } from './ManifestService.js';

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

    // Decoding helper for userscript context
    const decodingHelper = `
function _base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;

    // High-fidelity getURL implementation
    const getURLImpl = `
      getURL: (path) => {
        if (!path) return "";
        let cleanPath = path.startsWith("/") ? path.substring(1) : path;
        const data = EXTENSION_ASSETS_MAP[cleanPath];
        if (!data) return path;

        const isText = ["html", "htm", "js", "css", "json", "svg"].some(ext => cleanPath.endsWith(ext));
        const blob = isText ? new Blob([data], { type: "text/plain" }) : new Blob([_base64ToUint8Array(data)]);
        return URL.createObjectURL(blob);
      }
    `;

    let combined = `
${decodingHelper}
${messaging}
${abstraction}

${polyfillTemplate
  .replace('{{IS_IFRAME}}', target === 'postmessage' ? 'true' : 'false')
  .replace('{{SCRIPT_ID}}', internalId)
  .replace(/getURL: \(path\) => .*,/, getURLImpl + ',')}
`;

    return combined;
  }
}
