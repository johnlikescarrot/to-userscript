import { Manifest } from '../schemas/ManifestSchema.js';

export interface AssetMap {
  [path: string]: string;
}

export interface ScriptContents {
  [path: string]: string;
}

export interface ResourceResult {
  jsContents: ScriptContents;
  cssContents: ScriptContents;
}

export interface ConversionResult {
  success: boolean;
  outputFile: string;
  target: string;
  extension: {
    name: string;
    version: string;
    description?: string;
  };
  stats: {
    jsFiles: number;
    cssFiles: number;
    backgroundScripts: number;
    outputSize: number;
    assets: number; // Added assets count
  };
}
