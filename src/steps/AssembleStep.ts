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

    const runAtMap: Record<string, string[]> = {
      'document-start': [], 'document-end': [], 'document-idle': []
    };

    const matches = new Set<string>();
    const excludeMatches = new Set<string>();

    if (manifest.content_scripts) {
      for (const cs of manifest.content_scripts) {
        if (cs.matches) {
            cs.matches.forEach(m => matches.add(m));
        }
        // Exclude matches aren't explicitly in our current schema but good for future-proofing
        const runAtRaw = cs.run_at || 'document-idle';
        const runAt = runAtRaw.replace('_', '-');

        if (cs.js) {
          for (const js of cs.js) {
            const normalized = normalizePath(js);
            const content = resources.jsContents[normalized];
            if (content) {
              runAtMap[runAt].push(`// --- ${normalized}\n${content}`);
            }
          }
        }
      }
    }

    // Default to *://*/* only if no matches found
    if (matches.size === 0) {
        matches.add('*://*/*');
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

    const finalScript = TemplateService.replace(orchestrationTemplate, {
      '{{INJECTED_MANIFEST}}': JSON.stringify(manifest.raw),
      '{{EXTENSION_CSS_DATA}}': JSON.stringify(resources.cssContents),
      '{{COMBINED_EXECUTION_LOGIC}}': combinedExecutionLogic,
      '{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}': JSON.stringify(manifest.content_scripts),
      '{{OPTIONS_PAGE_PATH}}': JSON.stringify(manifest.options_page || null),
      '{{POPUP_PAGE_PATH}}': JSON.stringify(manifest.action.default_popup || null),
      '{{SIDE_PANEL_PATH}}': JSON.stringify(manifest.side_panel?.default_path || null),
      '{{EXTENSION_ICON}}': 'null',
      '{{LOCALE}}': '{}',
      '{{USED_LOCALE}}': JSON.stringify(context.config.locale || 'en')
    });

    const matchHeaders = Array.from(matches).map(m => `// @match       ${m}`).join('\n');
    const excludeMatchHeaders = Array.from(excludeMatches).map(m => `// @exclude-match ${m}`).join('\n');

    const wrapper = `
// ==UserScript==
// @name        ${manifest.name}
// @namespace   to-userscript
// @version     ${manifest.version}
// @description ${manifest.description || 'Converted with to-userscript'}
${matchHeaders}
${excludeMatchHeaders}
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// @grant       GM_openInTab
// @grant       GM_notification
// @grant       GM_cookie
// @grant       GM_webRequest
// @grant       GM_addElement
// @connect     *
// @run-at      document-start
// @sandbox     JavaScript
// ==/UserScript==

(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log("[" + SCRIPT_NAME + "]", ...args);
    const _warn = (...args) => console.warn("[" + SCRIPT_NAME + "]", ...args);
    const _error = (...args) => console.error("[" + SCRIPT_NAME + "]", ...args);

    // --- Utils
    const escapeRegex = ${RegexUtils.escapeRegex.toString()};
    const convertMatchPatternToRegExpString = ${RegexUtils.convertMatchPatternToRegExpString.toString()};
    const convertMatchPatternToRegExp = ${RegexUtils.convertMatchPatternToRegExp.toString()};

    const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap)};

    // --- Polyfill & Logic
    ${mainPolyfill}

    // --- Logic
    ${finalScript}

    main().catch(e => _error('Initialization error', e));
})();
`;

    await fs.outputFile(outputFile, wrapper);
  }
}
