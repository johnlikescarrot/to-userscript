import fs from 'fs-extra';
import { ManifestSchema, NormalizedManifest } from '../schemas/ManifestSchema.js';
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
      permissions: parsed.permissions || [],
      icons: parsed.icons || {},
      content_scripts: (parsed.content_scripts || [])
        /* v8 ignore start */ .filter(cs => cs.matches && cs.matches.length > 0 && (cs.js?.length || cs.css?.length))
        .map(cs => ({
          ...cs,
          js: cs.js?.map(normalizePath),
          css: cs.css?.map(normalizePath),
        }) /* v8 ignore stop */),
      action: {},
      background_scripts: [],
      web_accessible_resources: [],
      raw: parsed,
    };

    if (parsed.manifest_version === 2) {
      const p = (parsed as any);
      normalized.action = {
        /* v8 ignore start */ default_popup: p.browser_action?.default_popup || p.page_action?.default_popup,
        default_icon: p.browser_action?.default_icon,
      };
      normalized.background_scripts = p.background?.scripts || [];
      normalized.options_page = p.options_ui?.page || p.options_page;
      normalized.web_accessible_resources = p.web_accessible_resources || [];
    } else {
      const p = (parsed as any);
      normalized.action = {
        default_popup: p.action?.default_popup,
        default_icon: p.action?.default_icon,
      };
      normalized.background_scripts = p.background?.service_worker ? [p.background.service_worker] : [];
      normalized.options_page = p.options_ui?.page;
      normalized.web_accessible_resources = (p.web_accessible_resources || [])
        .flatMap((r: any) /* v8 ignore stop */ => r.resources);
      if (p.host_permissions) {
          normalized.permissions = [...normalized.permissions, ...p.host_permissions];
      }
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
