import fs from 'fs-extra';
import { ManifestSchema, Manifest } from '../schemas/ManifestSchema.js';
import { normalizePath } from '../utils/PathUtils.js';

export class ManifestService {
  static async load(manifestPath: string): Promise<Manifest> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const raw = JSON.parse(content);
    const parsed = ManifestSchema.parse(raw);

    if (parsed.content_scripts) {
      parsed.content_scripts = parsed.content_scripts
        .filter(cs => cs.matches && (cs.js || cs.css))
        .map(cs => ({
          ...cs,
          js: cs.js?.map(normalizePath),
          css: cs.css?.map(normalizePath),
        }));
    }

    return parsed;
  }

  static getInternalId(manifest: Manifest): string {
    return manifest.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-+$/, '')
      .replace(/^-+/, '')
      .toLowerCase();
  }
}
