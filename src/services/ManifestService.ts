import fs from 'fs-extra';
import path from 'path';
import { ManifestSchema, NormalizedManifest } from '../schemas/ManifestSchema.js';
import { normalizePath } from '../utils/PathUtils.js';
import { LocaleService } from './LocaleService.js';

export class ManifestService {
  /**
   * Loads, localizes, and normalizes a manifest.json file.
   */
  static async load(manifestPath: string, locale?: string): Promise<NormalizedManifest> {
    const extensionRoot = path.dirname(manifestPath);
    const content = await fs.readFile(manifestPath, 'utf-8');

    // 1. Initial Parse to get default_locale if needed
    let raw = JSON.parse(content);
    const targetLocale = locale || raw.default_locale;

    // 2. Localization
    if (targetLocale) {
      const messages = await LocaleService.loadMessages(extensionRoot, targetLocale);
      raw = LocaleService.replaceInObject(raw, messages);
    }

    // 3. Schema Validation
    const parsed = ManifestSchema.parse(raw);

    // 4. Normalization
    const normalized: NormalizedManifest = {
      manifest_version: parsed.manifest_version,
      name: parsed.name,
      version: parsed.version,
      description: parsed.description || '',
      icons: parsed.icons || {},
      content_scripts: (parsed.content_scripts || [])
        .filter(cs => cs.matches && cs.matches.length > 0 && (cs.js?.length || cs.css?.length))
        .map(cs => ({
          ...cs,
          js: cs.js?.map(normalizePath),
          css: cs.css?.map(normalizePath),
        })),
      action: {},
      background_scripts: [],
      web_accessible_resources: [],
      raw: parsed,
    };

    if (parsed.manifest_version === 2) {
      normalized.action = {
        default_popup: parsed.browser_action?.default_popup || parsed.page_action?.default_popup,
        default_icon: parsed.browser_action?.default_icon,
      };
      normalized.background_scripts = parsed.background?.scripts || [];
      normalized.options_page = parsed.options_ui?.page || parsed.options_page;
      normalized.web_accessible_resources = parsed.web_accessible_resources || [];
    } else {
      normalized.action = {
        default_popup: parsed.action?.default_popup,
        default_icon: parsed.action?.default_icon,
      };
      normalized.background_scripts = parsed.background?.service_worker ? [parsed.background.service_worker] : [];
      normalized.options_page = parsed.options_ui?.page;

      // Robust MV3 resource flattening
      normalized.web_accessible_resources = (parsed.web_accessible_resources || [])
        .flatMap(entry => {
          // P3: Branch simplified - schema validation ensures objects in MV3
          return entry.resources || [];
        })
        .map(normalizePath);
    }

    return normalized;
  }

  /**
   * Generates a consistent internal ID for the extension based on its name.
   */
  static getInternalId(manifest: { name: string }): string {
    return manifest.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-+$/, '')
      .replace(/^-+/, '')
      .toLowerCase();
  }
}
