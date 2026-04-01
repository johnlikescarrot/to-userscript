import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateService {
  private static templatesDir = path.resolve(__dirname, '../templates');

  static async load(name: string): Promise<string> {
    const filePath = path.join(this.templatesDir, name);
    if (!(await fs.pathExists(filePath))) {
      const fallback = path.join(this.templatesDir, `${name}.template.js`);
      if (await fs.pathExists(fallback)) return fs.readFile(fallback, 'utf-8');
      throw new Error(`Template not found: ${name}`);
    }
    return fs.readFile(filePath, 'utf-8');
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
