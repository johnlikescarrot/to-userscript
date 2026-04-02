import fs from 'fs-extra';
import path from 'path';
import { AssetMap } from '../core/types.js';
import { Manifest } from '../schemas/ManifestSchema.js';
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
      /* v8 ignore next 3 */
      if (!cleanRelPath) {
          return;
      }
      const normalized = normalizePath(cleanRelPath);
      /* v8 ignore next 3 */
      if (processedFiles.has(normalized)) {
          return;
      }

      const fullPath = path.join(extensionRoot, normalized);
      const exists = await fs.pathExists(fullPath);
      /* v8 ignore next 3 */
      if (!exists) {
          return;
      }

      processedFiles.add(normalized);

      const ext = path.extname(normalized).toLowerCase();
      const isText = ['.html', '.htm', '.css', '.js', '.json', '.svg'].includes(ext);

      if (isText) {
        let textContent = await fs.readFile(fullPath, 'utf-8');
        if (ext === '.html' || ext === '.htm' || ext === '.css') {
          const type: 'CSS' | 'HTML' = ext === '.css' ? 'CSS' : 'HTML';
          const pattern = type === 'CSS' ? this.REGEX_PATTERNS.CSS_ASSETS : this.REGEX_PATTERNS.HTML_ASSETS;
          pattern.lastIndex = 0;

          let match;
          while ((match = pattern.exec(textContent)) !== null) {
            const url = type === 'HTML' ? (match[2] || match[3]) : match[1];
            if (url && !this.REGEX_PATTERNS.EXTERNAL_URLS.test(url)) {
                const assetRelPath = path.join(path.dirname(normalized), url);
                await processFile(assetRelPath);
            }
          }
        }
        assetMap[normalized] = textContent;
      } else {
        const buffer = await fs.readFile(fullPath);
        assetMap[normalized] = buffer.toString('base64');
      }
    };

    const initialFiles = new Set<string>();
    if (manifest.manifest_version === 2) {
      if (manifest.options_ui?.page) initialFiles.add(manifest.options_ui.page);
      if (manifest.options_page) initialFiles.add(manifest.options_page);
      if (manifest.browser_action?.default_popup) initialFiles.add(manifest.browser_action.default_popup);
      if (manifest.page_action?.default_popup) initialFiles.add(manifest.page_action.default_popup);
    } else {
      if (manifest.options_ui?.page) initialFiles.add(manifest.options_ui.page);
      if (manifest.action?.default_popup) initialFiles.add(manifest.action.default_popup);
      const sidePanel = (manifest as any).side_panel;
      if (sidePanel?.default_path) initialFiles.add(sidePanel.default_path);
    }

    for (const f of initialFiles) {
        await processFile(f);
    }
    if (manifest.web_accessible_resources) {
      for (const res of manifest.web_accessible_resources) {
        if (typeof res === 'string') {
          await processFile(res);
        } else {
          for (const rp of res.resources) {
              await processFile(rp);
          }
        }
      }
    }

    return assetMap;
  }

  static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mime = this.MIME_MAP[ext];
    /* v8 ignore next */
    if (mime) return mime;
    return 'application/octet-stream';
  }
}
