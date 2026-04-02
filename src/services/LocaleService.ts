import fs from 'fs-extra';
import path from 'path';

export interface ChromeLocaleMessage {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string }>;
}

export interface ChromeLocaleMessageMap {
  [key: string]: ChromeLocaleMessage;
}

export class LocaleService {
  /**
   * Loads the messages for a given locale from the extension's _locales directory.
   */
  static async loadMessages(extensionRoot: string, locale: string): Promise<ChromeLocaleMessageMap> {
    const localePath = path.join(extensionRoot, '_locales', locale, 'messages.json');
    if (!(await fs.pathExists(localePath))) {
      return {};
    }
    try {
      return await fs.readJson(localePath);
    } catch (e) {
      return {};
    }
  }

  /**
   * Replaces __MSG_messagename__ placeholders in a string.
   */
  static replacePlaceholders(content: string, messages: ChromeLocaleMessageMap): string {
    return content.replace(/__MSG_([A-Za-z0-9_@]+)__/g, (match, key) => {
      const message = messages[key];
      if (message && typeof message.message === 'string') {
        return message.message;
      }
      return match;
    });
  }

  /**
   * Recursively replaces placeholders in an object (e.g., a manifest).
   */
  static replaceInObject(obj: any, messages: ChromeLocaleMessageMap): any {
    if (typeof obj === 'string') {
      return this.replacePlaceholders(obj, messages);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceInObject(item, messages));
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.replaceInObject(obj[key], messages);
      }
      return result;
    }
    return obj;
  }
}
