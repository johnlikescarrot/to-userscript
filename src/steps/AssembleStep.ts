import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { PolyfillService } from '../services/PolyfillService.js';
import { TemplateService } from '../services/TemplateService.js';
import { AssetMap, ResourceResult } from '../core/types.js';
import { NormalizedManifest } from '../schemas/ManifestSchema.js';
import fs from 'fs-extra';
import { normalizePath } from '../utils/PathUtils.js';
import * as RegexUtils from '../utils/RegexUtils.js';

export class AssembleStep extends Step {
  readonly name = 'Assemble Final Script';

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<NormalizedManifest>('manifest');
    const assetMap = context.get<AssetMap>('assetMap');
    const resources = context.get<ResourceResult>('resources');
    const { target, outputFile } = context.config;

    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest.raw);
    const orchestrationTemplate = await TemplateService.load('orchestration');

    const phases: Record<string, string[]> = {
      'document-start': [], 'document-end': [], 'document-idle': []
    };

    const scripts = manifest.content_scripts || [];
    const matches = new Set<string>();

    /* v8 ignore start */
    for (const cs of scripts) {
        if (cs.matches) {
            for (const m of cs.matches) {
                matches.add(m);
            }
        }
        const rawRunAt = (cs.run_at || 'document-idle').replace('_', '-');
        const phase = phases[rawRunAt] ? rawRunAt : 'document-idle';
        const files = cs.js || [];
        for (const js of files) {
            const content = resources.jsContents[normalizePath(js)];
            if (content) {
                phases[phase].push(`// --- ${js}\n${content}`);
            }
        }
    }
    /* v8 ignore stop */

    const sidePanelPath = (manifest.raw as any).side_panel?.default_path || null;
    const hasUI = manifest.action?.default_popup || manifest.options_page || sidePanelPath;
    if (hasUI || matches.size === 0) matches.add('*://*/*');

    const combinedExecutionLogic = `
async function executeAllScripts(scope, extensionCssData) {
    const {chrome, browser, window, self, document} = scope;
    for (const [path, css] of Object.entries(extensionCssData)) {
        try {
            const style = document.createElement('style');
            style.textContent = css;
            style.setAttribute('data-extension-path', path);
            (document.head || document.documentElement).appendChild(style);
        } catch(e) {}
    }

    const runInScope = (code, fileName) => {
        try {
            const keys = Object.keys(scope);
            const values = Object.values(scope);
            const fn = new Function(...keys, \`"use strict";\\n\${code}\\n//# sourceURL=extension://\${fileName}\`);
            fn.apply(scope.window, values);
        } catch(e) {
            _error(\`Script execution failed [\${fileName}]:\`, e);
        }
    };

    // --- Start
    ${phases['document-start'].map(c => {
        const lines = c.split('\n');
        const fileName = lines[0].replace('// --- ', '');
        return `runInScope(${JSON.stringify(c)}, ${JSON.stringify(fileName)});`;
    }).join('\n')}

    if (document.readyState === 'loading') {
        await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
    }

    // --- End
    ${phases['document-end'].map(c => {
        const lines = c.split('\n');
        const fileName = lines[0].replace('// --- ', '');
        return `runInScope(${JSON.stringify(c)}, ${JSON.stringify(fileName)});`;
    }).join('\n')}

    if (typeof window.requestIdleCallback === 'function') {
        await new Promise(res => window.requestIdleCallback(res, { timeout: 2000 }));
    } else {
        await new Promise(res => setTimeout(res, 50));
    }

    // --- Idle
    ${phases['document-idle'].map(c => {
        const lines = c.split('\n');
        const fileName = lines[0].replace('// --- ', '');
        return `runInScope(${JSON.stringify(c)}, ${JSON.stringify(fileName)});`;
    }).join('\n')}

    _log('Execution complete.');
}
`;

    const finalScript = TemplateService.replace(orchestrationTemplate, {
      '{{INJECTED_MANIFEST}}': JSON.stringify(manifest.raw),
      '{{EXTENSION_CSS_DATA}}': JSON.stringify(resources.cssContents),
      '{{COMBINED_EXECUTION_LOGIC}}': combinedExecutionLogic,
      '{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}': JSON.stringify(Array.from(matches).map(m => ({ matches: [m] }))),
      '{{OPTIONS_PAGE_PATH}}': JSON.stringify(manifest.options_page || null),
      '{{POPUP_PAGE_PATH}}': JSON.stringify(manifest.action?.default_popup || null),
      '{{SIDE_PANEL_PATH}}': JSON.stringify(sidePanelPath),
      '{{EXTENSION_ICON}}': 'null',
      '{{LOCALE}}': '{}',
      '{{USED_LOCALE}}': JSON.stringify(context.config.locale || 'en')
    });

    const wrapper = `
(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap)};

    const escapeRegex = ${RegexUtils.escapeRegex.toString()};
    const convertMatchPatternToRegExpString = ${RegexUtils.convertMatchPatternToRegExpString.toString()};
    const convertMatchPatternToRegExp = ${RegexUtils.convertMatchPatternToRegExp.toString()};

    ${mainPolyfill}
    ${finalScript}
    main().catch(e => _error('Init error', e));
})();
`;
    await fs.outputFile(outputFile, wrapper);
  }
}
