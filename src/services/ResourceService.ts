import fs from 'fs-extra';
import path from 'path';
import { normalizePath } from '../utils/PathUtils.js';
import { ScriptContents, ResourceResult } from '../core/types.js';
import { ContentScript } from '../schemas/ManifestSchema.js';

export class ResourceService {
  static async readScriptsAndStyles(
    baseDir: string,
    contentScripts: ContentScript[]
  ): Promise<ResourceResult> {
    const jsContents: ScriptContents = {};
    const cssContents: ScriptContents = {};
    const processedJs = new Set<string>();
    const processedCss = new Set<string>();

    for (const config of contentScripts) {
      if (config.js) {
        for (const jsPath of config.js) {
          const rel = normalizePath(jsPath);
          if (!processedJs.has(rel)) {
            const full = path.join(baseDir, rel);
            jsContents[rel] = await fs.readFile(full, 'utf-8');
            processedJs.add(rel);
          }
        }
      }
      if (config.css) {
        for (const cssPath of config.css) {
          const rel = normalizePath(cssPath);
          if (!processedCss.has(rel)) {
            const full = path.join(baseDir, rel);
            cssContents[rel] = await fs.readFile(full, 'utf-8');
            processedCss.add(rel);
          }
        }
      }
    }

    return { jsContents, cssContents };
  }

  static async readBackgroundScripts(
    baseDir: string,
    scripts: string[]
  ): Promise<ScriptContents> {
    const contents: ScriptContents = {};
    for (const script of scripts) {
      const rel = normalizePath(script);
      const full = path.join(baseDir, rel);
      contents[rel] = await fs.readFile(full, 'utf-8');
    }
    return contents;
  }
}
