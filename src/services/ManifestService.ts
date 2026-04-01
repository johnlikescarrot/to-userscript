import fs from 'fs-extra';
import { ManifestSchema, Manifest, NormalizedManifest } from '../schemas/ManifestSchema.js';
import { normalizePath } from '../utils/PathUtils.js';

export class ManifestService {
  static async load(manifestPath: string): Promise<NormalizedManifest> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const raw = JSON.parse(content);
    const parsed = ManifestSchema.parse(raw);

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
      normalized.web_accessible_resources = (parsed.web_accessible_resources || [])
        .flatMap(r => r.resources);
    }

    return normalized;
  }

  static getInternalId(manifest: { name: string }): string {
    return manifest.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-+$/, '')
      .replace(/^-+/, '')
      .toLowerCase();
  }
}
