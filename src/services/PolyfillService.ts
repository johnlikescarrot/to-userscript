import { TemplateService } from './TemplateService.js';
import { AssetMap } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
import { AssetService } from './AssetService.js';

export class PolyfillService {
  static async build(
    target: 'userscript' | 'vanilla' | 'postmessage',
    assetMap: AssetMap,
    manifest: Manifest,
    scriptId: string,
    dnrRules: Record<string, any[]> = {},
    enabledRulesetIds: string[] = ["default"]
  ): Promise<string> {
    const messaging = await TemplateService.load('messaging');
    const abstraction = await TemplateService.load(`abstractionLayer.${target === 'userscript' ? 'userscript' : target === 'vanilla' ? 'vanilla' : 'postmessage'}`);
    const polyfillTemplate = await TemplateService.load('polyfill');

    const internalId = scriptId;

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
        const assets = window.EXTENSION_ASSETS_MAPS["${internalId}"] || {};
        const data = assets[cleanPath];
        if (typeof data === "undefined") return path;

        const mimeMap = ${mimeMapJson};
        const ext = "." + (cleanPath.split(".").pop() || "").toLowerCase();
        const mimeType = mimeMap[ext] || "application/octet-stream";

        // High-fidelity extension match matching orchestration template
        const isText = [".html", ".htm", ".js", ".css", ".json", ".svg"].includes(ext);
        const blob = isText ? new Blob([data], { type: mimeType }) : new Blob([_base64ToUint8Array(data)], { type: mimeType });
        return URL.createObjectURL(blob);
      }
    `;

    // Replacement pass: replace getURL implementation and internal identifiers
    // P1: Robust replacement for all template tokens including DNR
    let polyfillBody = polyfillTemplate
      .replace(/{{IS_IFRAME}}/g, target === 'postmessage' ? 'true' : 'false')
      .replace(/{{SCRIPT_ID}}/g, internalId)
      .replace(/{{GETURL_IMPL}}/g, getURLImpl)
      .replace(/{{INJECTED_MANIFEST}}/g, JSON.stringify(manifest))
      .replace(/{{STATIC_DNR_RULES}}/g, JSON.stringify(dnrRules))
      .replace(/{{STATIC_DNR_CONFIGS}}/g, JSON.stringify(enabledRulesetIds));

    let combined = `
${decodingHelper}
${messaging}
${abstraction}

${polyfillBody}
`;

    return combined;
  }
}
