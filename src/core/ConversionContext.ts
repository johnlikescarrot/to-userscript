import { Logger } from '../utils/Logger.js';

export interface ConversionConfig {
  inputDir: string;
  outputFile: string;
  target: 'userscript' | 'vanilla';
  locale?: string;
  ignoredAssets?: string;
  minify?: boolean;
  beautify?: boolean;
  force?: boolean;
}

export class ConversionContext {
  public readonly logger: Logger;
  public state: Record<string, any> = {};

  constructor(public readonly config: ConversionConfig) {
    this.logger = new Logger(config.target);
  }

  set<T>(key: string, value: T): void {
    this.state[key] = value;
  }

  get<T>(key: string): T {
    if (!(key in this.state)) {
      throw new Error(`State key "${key}" not found in ConversionContext.`);
    }
    return this.state[key];
  }
}
