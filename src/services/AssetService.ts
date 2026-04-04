import fs from 'fs-extra';
import path from 'path';
import { AssetMap } from '../core/types.js';
import { Manifest, ManifestV2, ManifestV3 } from '../schemas/ManifestSchema.js';
import { normalizePath } from '../utils/PathUtils.js';

export class AssetService {
  private static MIME_MAP: Record<string, string> = {
    '.html': 'text/html', '.htm': 'text/html', '.js': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  };

  private static REGEX_PATTERNS = {
    HTML_ASSETS: /(src|href)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi,
    CSS_ASSETS: /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    EXTERNAL_URLS: /^(data:|https?:\/\/|\/\/|#|javascript:|mailto:)/,
  };

  static async generateAssetMap(
    extensionRoot: string,
    manifest: Manifest
  ): Promise<AssetMap> {
    const assetMap: AssetMap = {};
    const processedFiles = new Set<string>();

    const processFile = async (relPath: string) => {
      /* v8 ignore next 3 */
      if (!relPath) {
          return;
      }

      const fragments = relPath.split(/[?#]/);
      const cleanRelPath = fragments[0];
      if (!cleanRelPath) {
          return;
      }

      const normalized = normalizePath(cleanRelPath);
      if (processedFiles.has(normalized)) return;
      processedFiles.add(normalized);

      const fullPath = path.join(extensionRoot, normalized);
      if (!(await fs.pathExists(fullPath))) {
        processedFiles.delete(normalized);
        return;
      }

      const ext = path.extname(normalized).toLowerCase();
      const isText = ['.html', '.htm', '.css', '.js', '.json', '.svg'].includes(ext);

      if (isText) {
        let textContent = await fs.readFile(fullPath, 'utf-8');
        if (['.html', '.htm', '.css'].includes(ext)) {
          const type: 'CSS' | 'HTML' = ext === '.css' ? 'CSS' : 'HTML';
          const pattern = type === 'CSS' ? this.REGEX_PATTERNS.CSS_ASSETS : this.REGEX_PATTERNS.HTML_ASSETS;
          pattern.lastIndex = 0;

          let match;
          const foundAssets: string[] = [];
          while ((match = pattern.exec(textContent)) !== null) {
            const url = type === 'HTML' ? (match[2] || match[3]) : match[1];
            if (url && !this.REGEX_PATTERNS.EXTERNAL_URLS.test(url)) {
              foundAssets.push(url);
            }
          }

          const assetPromises = foundAssets.map(asset => {
              const assetRelPath = path.join(path.dirname(normalized), asset);
              return processFile(assetRelPath);
          });
          await Promise.all(assetPromises);
        }
        assetMap[normalized] = textContent;
      } else {
        const buffer = await fs.readFile(fullPath);
        assetMap[normalized] = buffer.toString('base64');
      }
    };

    const initialFiles = new Set<string>();
    if (manifest.manifest_version === 2) {
      const v2 = manifest as ManifestV2;
      if (v2.options_ui?.page) initialFiles.add(v2.options_ui.page);
      if (v2.options_page) initialFiles.add(v2.options_page);
      if (v2.browser_action?.default_popup) initialFiles.add(v2.browser_action.default_popup);
      if (v2.page_action?.default_popup) initialFiles.add(v2.page_action.default_popup);
    } else {
      const v3 = manifest as ManifestV3;
      if (v3.options_ui?.page) initialFiles.add(v3.options_ui.page);
      if (v3.action?.default_popup) initialFiles.add(v3.action.default_popup);
      if ((v3 as any).side_panel?.default_path) initialFiles.add((v3 as any).side_panel.default_path);
    }

    await Promise.all(Array.from(initialFiles).map(f => processFile(f)));

    if (manifest.web_accessible_resources) {
      const warPromises: Promise<void>[] = [];
      for (const res of manifest.web_accessible_resources) {
        if (typeof res === 'string') {
          warPromises.push(processFile(res));
        } else {
          for (const rp of res.resources) {
            warPromises.push(processFile(rp));
          }
        }
      }
      await Promise.all(warPromises);
    }

    return assetMap;
  }

  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    /* v8 ignore next */
    return this.MIME_MAP[ext] || 'application/octet-stream';
  }
}
