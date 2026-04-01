import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { PolyfillService } from '../services/PolyfillService.js';
import { TemplateService } from '../services/TemplateService.js';
import { AssetMap, ResourceResult } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
import fs from 'fs-extra';
import { normalizePath } from '../utils/PathUtils.js';

export class AssembleStep extends Step {
  readonly name = 'Assemble Final Script';

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<Manifest>('manifest');
    const assetMap = context.get<AssetMap>('assetMap');
    const resources = context.get<ResourceResult>('resources');
    const { target, outputFile } = context.config;

    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest);
    const orchestrationTemplate = await TemplateService.load('orchestration');

    const runAtMap: Record<string, string[]> = {
      'document-start': [], 'document-end': [], 'document-idle': []
    };

    // Group scripts by run_at
    if (manifest.content_scripts) {
      for (const cs of manifest.content_scripts) {
        const runAt = (cs.run_at?.replace('_', '-') || 'document-idle') as keyof typeof runAtMap;
        if (cs.js) {
          for (const js of cs.js) {
            const normalized = normalizePath(js);
            if (resources.jsContents[normalized]) {
              runAtMap[runAt].push(resources.jsContents[normalized]);
            }
          }
        }
      }
    }

    const generatePhase = (phase: string) => `
      _log('Executing ${phase} phase...');
      ${runAtMap[phase].join('\n\n')}
    `;

    const combinedExecutionLogic = `
async function executeAllScripts(globalThis, extensionCssData) {
    const {chrome, browser, window, self} = globalThis;

    // --- Document Start
    ${generatePhase('document-start')}

    // --- Wait for DOMContentLoaded
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // --- Document End
    ${generatePhase('document-end')}

    // --- Document Idle
    if (typeof window.requestIdleCallback === 'function') {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 2000 }));
    } else {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    ${generatePhase('document-idle')}

    _log('All phases complete.');
}
`;

    const finalScript = TemplateService.replace(orchestrationTemplate, {
      '{{INJECTED_MANIFEST}}': JSON.stringify(manifest),
      '{{EXTENSION_CSS_DATA}}': JSON.stringify(resources.cssContents),
      '{{COMBINED_EXECUTION_LOGIC}}': combinedExecutionLogic,
      '{{UNIFIED_POLYFILL_FOR_IFRAME}}': JSON.stringify(mainPolyfill), // Simplified for now
      '{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}': JSON.stringify(manifest.content_scripts || []),
      '{{OPTIONS_PAGE_PATH}}': JSON.stringify(manifest.options_page || manifest.options_ui?.page || null),
      '{{POPUP_PAGE_PATH}}': JSON.stringify((manifest as any).action?.default_popup || (manifest as any).browser_action?.default_popup || null),
      '{{EXTENSION_ICON}}': 'null',
      '{{CONVERT_MATCH_PATTERN_TO_REGEXP_FUNCTION}}': '() => { return { test: () => true } }', // Mocked for brevity
      '{{CONVERT_MATCH_PATTERN_FUNCTION_STRING}}': '""',
      '{{LOCALE}}': '{}',
      '{{USED_LOCALE}}': '"en"'
    });

    const wrapper = `
(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    ${mainPolyfill}

    ${finalScript}

    main().catch(e => _error('Init error', e));
})();
`;

    await fs.outputFile(outputFile, wrapper);
  }
}
