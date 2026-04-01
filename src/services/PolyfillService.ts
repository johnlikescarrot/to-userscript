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
    const polyfill = await TemplateService.load('polyfill');

    const internalId = ManifestService.getInternalId(manifest);

    let combined = `
${messaging}

${abstraction}

const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap, null, 2)};

${polyfill
  .replace('{{IS_IFRAME}}', target === 'postmessage' ? 'true' : 'false')
  .replace('{{SCRIPT_ID}}', internalId)}

if (typeof window !== 'undefined') {
    (window as any).buildPolyfill = (buildPolyfill as any);
}
`;

    return combined;
  }
}
