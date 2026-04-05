import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateService {
  private static templatesDirCache: string | null = null;

  private static async getTemplatesDir(): Promise<string> {
      if (this.templatesDirCache) {
          return this.templatesDirCache;
      }

      // In bundled production, it's relative to the chunk in dist/
      const distPath = path.resolve(__dirname, './templates');
      if (await fs.pathExists(distPath)) {
          this.templatesDirCache = distPath;
          return distPath;
      }

      // In development/tests, it's in src/templates
      const srcPath = path.resolve(__dirname, '../templates');
      this.templatesDirCache = srcPath;
      return srcPath;
  }

  static async load(name: string): Promise<string> {
    const templatesDir = await this.getTemplatesDir();
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
