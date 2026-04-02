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
      // Pick the largest numeric key
      const sizes = Object.keys(icons)
        .map(s => parseInt(s, 10))
        .filter(s => !isNaN(s))
        .sort((a, b) => b - a);

      if (sizes.length > 0) {
        bestPath = icons[sizes[0].toString()];
      } else {
        // Fallback to the first available key if none are numeric
        const keys = Object.keys(icons);
        if (keys.length > 0) bestPath = icons[keys[0]];
      }
    }

    if (!bestPath) return null;

    const fullPath = path.join(extensionRoot, bestPath);
    if (!(await fs.pathExists(fullPath))) return null;

    try {
      const buffer = await fs.readFile(fullPath);
      const ext = path.extname(bestPath).toLowerCase().replace('.', '');
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'png'}`;
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (e) {
      return null;
    }
  }
}
