import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateService {
  // Use a more robust way to find templates, checking both src (for tests) and dist (for production)
  private static getTemplatesDir(): string {
      // In bundled production, it's relative to the chunk in dist/
      const distPath = path.resolve(__dirname, './templates');
      if (fs.pathExistsSync(distPath)) return distPath;

      // In development/tests, it's in src/templates
      const srcPath = path.resolve(__dirname, '../templates');
      if (fs.pathExistsSync(srcPath)) return srcPath;

      // Fallback
      return srcPath;
  }

  static async load(name: string): Promise<string> {
    const templatesDir = this.getTemplatesDir();
    const filePath = path.join(templatesDir, name);
    const exists = await fs.pathExists(filePath);
    if (exists) {
        return fs.readFile(filePath, 'utf-8');
    }

    const fallback = path.join(templatesDir, `${name}.template.js`);
    const fallbackExists = await fs.pathExists(fallback);
    if (fallbackExists) {
        return fs.readFile(fallback, 'utf-8');
    }

    throw new Error(`Template not found: ${name} in ${templatesDir}`);
  }

  static replace(content: string, replacements: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      const safeValue = value.replace(/\$/g, '$$$$');
      result = result.replace(regex, safeValue);
    }
    return result;
  }
}
