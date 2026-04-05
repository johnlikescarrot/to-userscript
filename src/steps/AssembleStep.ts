import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { PolyfillService } from '../services/PolyfillService.js';
import { TemplateService } from '../services/TemplateService.js';
import { ManifestService } from '../services/ManifestService.js';
import { AssetService } from '../services/AssetService.js';
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
    const { target, outputFile, inputDir, locale } = context.config;

    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest.raw);
    const orchestrationTemplate = await TemplateService.load('orchestration');

    const requestedLocale = locale || (manifest.raw as any).default_locale || 'en';
    const usedLocale = /^[A-Za-z0-9_]+$/.test(requestedLocale) ? requestedLocale : 'en';
    const localeMessages = await ManifestService.loadLocaleMessages(inputDir, usedLocale);

    const runAtMap: Record<string, string[]> = {
      'document-start': [], 'document-end': [], 'document-idle': []
    };

    if (manifest.content_scripts) {
      for (const cs of manifest.content_scripts) {
        const runAt = (cs.run_at?.replace('_', '-') || 'document-idle');
        if (cs.js) {
          for (const js of cs.js) {
            const normalized = normalizePath(js);
            if (resources.jsContents[normalized]) {
              runAtMap[runAt].push(`// --- ${normalized}\n${resources.jsContents[normalized]}`);
            }
          }
        }
      }
    }

    const combinedExecutionLogic = `
async function executeAllScripts(globalThis, extensionCssData) {
    const {chrome, browser, window, self} = globalThis;

    // Inject CSS
    for (const [path, css] of Object.entries(extensionCssData)) {
        try {
            const style = document.createElement('style');
            style.textContent = css;
            style.setAttribute('data-extension-path', path);
            (document.head || document.documentElement).appendChild(style);
        } catch(e) {}
    }

    // --- Document Start
    ${runAtMap['document-start'].join('\n\n')}

    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // --- Document End
    ${runAtMap['document-end'].join('\n\n')}

    if (typeof window.requestIdleCallback === 'function') {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 2000 }));
    } else {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // --- Document Idle
    ${runAtMap['document-idle'].join('\n\n')}

    _log('Phased execution complete.');
}
`;

    const scriptId = ManifestService.getInternalId(manifest);

    const finalPayload = TemplateService.replace(orchestrationTemplate, {
      '{{SCRIPT_ID}}': scriptId,
      '{{INJECTED_MANIFEST}}': JSON.stringify(manifest.raw),
      '{{EXTENSION_CSS_DATA}}': JSON.stringify(resources.cssContents),
      '{{COMBINED_EXECUTION_LOGIC}}': combinedExecutionLogic,
      '{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}': JSON.stringify(manifest.content_scripts),
      '{{OPTIONS_PAGE_PATH}}': JSON.stringify(manifest.options_page || null),
      '{{POPUP_PAGE_PATH}}': JSON.stringify(manifest.action.default_popup || null),
      '{{EXTENSION_ICON}}': 'null',
      '{{LOCALE}}': JSON.stringify(localeMessages),
      '{{USED_LOCALE}}': JSON.stringify(usedLocale),
      '{{EXTENSION_ASSETS_MAP}}': JSON.stringify(assetMap),
      '{{MIME_MAP}}': JSON.stringify(AssetService.MIME_MAP)
    });

    // Metadata generation with @grant detection
    let metadata = [
        '// ==UserScript==',
        `// @name        ${manifest.name}`,
        `// @version     ${manifest.version}`,
        `// @description ${manifest.description || 'Converted extension'}`,
        '// @grant       GM_setValue',
        '// @grant       GM_getValue',
        '// @grant       GM_deleteValue',
        '// @grant       GM_listValues',
        '// @grant       GM_xmlhttpRequest',
        '// @grant       GM_openInTab',
        '// @grant       GM_registerMenuCommand',
        '// @grant       Notification'
    ];

    const combinedCode = mainPolyfill + finalPayload;
    if (combinedCode.includes('GM_webRequest')) {
        metadata.push('// @grant       GM_webRequest');
    }
    if (combinedCode.includes('GM_cookie')) {
        metadata.push('// @grant       GM_cookie');
    }

    // Generate matches
    const matches = new Set<string>();
    manifest.content_scripts.forEach(cs => cs.matches?.forEach(m => matches.add(m)));
    if (matches.size > 0) {
        matches.forEach(m => metadata.push(`// @match       ${m}`));
    } else {
        metadata.push('// @match       *://*/*');
    }

    metadata.push('// ==/UserScript==');

    const wrapper = `
${metadata.join('\n')}

(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    // --- Utils
    const escapeRegex = ${RegexUtils.escapeRegex.toString()};
    const convertMatchPatternToRegExpString = ${RegexUtils.convertMatchPatternToRegExpString.toString()};
    const convertMatchPatternToRegExp = ${RegexUtils.convertMatchPatternToRegExp.toString()};

    // --- Scoped Assets
    window.EXTENSION_ASSETS_MAPS = window.EXTENSION_ASSETS_MAPS || {};

    // --- Polyfill & Logic
    ${mainPolyfill}

    // --- Logic
    ${finalPayload}

    main().catch(e => _error('Initialization error', e));
})();
`;

    await fs.outputFile(outputFile, wrapper);
  }
}
