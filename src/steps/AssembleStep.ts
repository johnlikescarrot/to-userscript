import { Step } from '../core/Step.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { PolyfillService } from '../services/PolyfillService.js';
import { TemplateService } from '../services/TemplateService.js';
import { IconService } from '../services/IconService.js';
import { AssetMap, ResourceResult } from '../core/types.js';
import { NormalizedManifest } from '../schemas/ManifestSchema.js';
import fs from 'fs-extra';
import { normalizePath } from '../utils/PathUtils.js';
import * as RegexUtils from '../utils/RegexUtils.js';

export class AssembleStep extends Step {
  readonly name = 'Assemble Final Script';

  private static PERMISSION_GRANT_MAP: Record<string, string[]> = {
    'storage': ['GM_getValue', 'GM_setValue', 'GM_listValues', 'GM_deleteValue', 'GM_addValueChangeListener', 'GM_removeValueChangeListener'],
    'notifications': ['GM_notification'],
    'clipboardWrite': ['GM_setClipboard'],
    'cookies': ['GM_cookie'],
    'tabs': ['GM_openInTab'],
    'webRequest': ['GM_xmlhttpRequest']
  };

  async run(context: ConversionContext): Promise<void> {
    const manifest = context.get<NormalizedManifest>('manifest');
    const assetMap = context.get<AssetMap>('assetMap');
    const resources = context.get<ResourceResult>('resources');
    const { target, outputFile, inputDir } = context.config;

    const iconBase64 = await IconService.getBestIconBase64(inputDir, manifest.icons);
    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest.raw);
    const orchestrationTemplate = await TemplateService.load('orchestration');

    const grants = new Set<string>(['GM_info']);
    const permissions = manifest.raw.permissions || [];
    const hostPermissions = manifest.raw.host_permissions || [];

    // Standard permissions -> @grant
    for (const p of permissions) {
        const mapped = AssembleStep.PERMISSION_GRANT_MAP[p];
        if (mapped) mapped.forEach(g => grants.add(g));
    }

    // Always include storage for internal sync if userscript AND declared in manifest
    if (target === 'userscript' && permissions.includes('storage')) {
        AssembleStep.PERMISSION_GRANT_MAP['storage'].forEach(g => grants.add(g));
    }

    const metadataLines = [
        '// ==UserScript==',
        `// @name        ${manifest.name}`,
        `// @namespace   to-userscript`,
        `// @version     ${manifest.version}`,
        `// @description ${(manifest.description || '').replace(/\n/g, ' ')}`,
        `// @author      johnlikescarrot/to-userscript`,
    ];

    if (iconBase64) {
        metadataLines.push(`// @icon        ${iconBase64}`);
    }

    const allMatches = new Set<string>();
    manifest.content_scripts.forEach(cs => cs.matches?.forEach(m => allMatches.add(m)));
    allMatches.forEach(m => metadataLines.push(`// @match       ${m}`));

    // Host permissions -> @connect
    hostPermissions.forEach(p => metadataLines.push(`// @connect     ${p}`));

    grants.forEach(g => metadataLines.push(`// @grant       ${g}`));
    metadataLines.push('// ==/UserScript==');

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

    const finalScriptBody = TemplateService.replace(orchestrationTemplate, {
      '{{INJECTED_MANIFEST}}': JSON.stringify(manifest.raw),
      '{{EXTENSION_CSS_DATA}}': JSON.stringify(resources.cssContents),
      '{{COMBINED_EXECUTION_LOGIC}}': combinedExecutionLogic,
      '{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}': JSON.stringify(manifest.content_scripts),
      '{{OPTIONS_PAGE_PATH}}': JSON.stringify(manifest.options_page || null),
      '{{POPUP_PAGE_PATH}}': JSON.stringify(manifest.action.default_popup || null),
      '{{EXTENSION_ICON}}': JSON.stringify(iconBase64),
      '{{LOCALE}}': '{}',
      '{{USED_LOCALE}}': JSON.stringify(context.config.locale || 'en')
    });

    const metadataPart = target === 'userscript' ? metadataLines.join('\n') + '\n\n' : '';

    const wrapper = `${metadataPart}(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    // --- Utils
    const escapeRegex = ${RegexUtils.escapeRegex.toString()};
    const convertMatchPatternToRegExpString = ${RegexUtils.convertMatchPatternToRegExpString.toString()};
    const convertMatchPatternToRegExp = ${RegexUtils.convertMatchPatternToRegExp.toString()};

    // --- Polyfill & Logic
    ${mainPolyfill}

    // --- Assets Map
    const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap)};

    // --- Logic
    ${finalScriptBody}

    main().catch(e => _error('Initialization error', e));
})();`;

    await fs.outputFile(outputFile, wrapper);
  }
}
