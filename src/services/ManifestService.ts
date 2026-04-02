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
          js: cs.js ? cs.js.map(normalizePath) : undefined,
          css: cs.css ? cs.css.map(normalizePath) : undefined,
        })),
      action: {},
      background_scripts: [],
      web_accessible_resources: [],
      permissions: [],
      raw: parsed,
    };

    if (parsed.permissions) normalized.permissions.push(...parsed.permissions);
    if (parsed.optional_permissions) normalized.permissions.push(...parsed.optional_permissions);
    if (parsed.manifest_version === 3) {
      const v3 = parsed as any;
      if (v3.host_permissions) normalized.permissions.push(...v3.host_permissions);
    }

    if (parsed.manifest_version === 2) {
      const v2 = parsed as any;
      const browserAction = v2.browser_action;
      const pageAction = v2.page_action;
      const popup = browserAction?.default_popup || pageAction?.default_popup;

      normalized.action = {
        default_popup: popup,
        default_icon: browserAction?.default_icon,
      };
      normalized.background_scripts = (v2.background && v2.background.scripts) ? v2.background.scripts : [];
      normalized.options_page = (v2.options_ui && v2.options_ui.page) ? v2.options_ui.page : v2.options_page;
      normalized.web_accessible_resources = v2.web_accessible_resources || [];
    } else {
      const v3 = parsed as any;
      normalized.action = {
        default_popup: v3.action?.default_popup,
        default_icon: v3.action?.default_icon,
      };
      normalized.background_scripts = (v3.background && v3.background.service_worker) ? [v3.background.service_worker] : [];
      normalized.options_page = (v3.options_ui && v3.options_ui.page) ? v3.options_ui.page : undefined;
      normalized.side_panel = v3.side_panel;
      normalized.web_accessible_resources = (v3.web_accessible_resources || [])
        .flatMap((r: any) => r.resources);
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
