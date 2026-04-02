import fs from 'fs-extra';
import path from 'path';

export class IconService {
  /**
   * Finds the highest resolution icon from the manifest and converts it to a Base64 string.
   */
  static async getBestIconBase64(extensionRoot: string, icons: Record<string, string> | string | undefined): Promise<string | null> {
    if (!icons) return null;

    let bestPath: string | null = null;

    if (typeof icons === 'string') {
      bestPath = icons;
    } else {
      const sizes = Object.keys(icons)
        .map(s => parseInt(s, 10))
        .filter(s => !isNaN(s))
        .sort((a, b) => b - a);

      if (sizes.length > 0) {
        bestPath = icons[sizes[0].toString()];
      } else {
        const keys = Object.keys(icons);
        if (keys.length > 0) bestPath = icons[keys[0]];
      }
    }

    if (!bestPath) return null;

    const resolvedRoot = path.resolve(extensionRoot);
    const fullPath = path.resolve(path.join(resolvedRoot, bestPath));

    // Robust path traversal protection: use path.relative
    const rel = path.relative(resolvedRoot, fullPath);
    const isOutside = rel.startsWith('..') || path.isAbsolute(rel);
    if (isOutside) return null;

    if (!(await fs.pathExists(fullPath))) return null;

    try {
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(bestPath).toLowerCase().replace('.', '');

      const mimeMap: Record<string, string> = {
        svg: 'image/svg+xml',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        ico: 'image/x-icon',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/png';

      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (e) {
      return null;
    }
  }
}
