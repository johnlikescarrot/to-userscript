import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import yauzl from 'yauzl';
import path from 'path';
import { pathToFileURL } from 'url';

// Internal imports
import { convertExtension } from '../index.js';
import * as Cli from '../cli/index.js';
import { ManifestService } from '../services/ManifestService.js';
import { AssetService } from '../services/AssetService.js';
import { TemplateService } from '../services/TemplateService.js';
import { UnpackService } from '../services/UnpackService.js';
import { PolyfillService } from '../services/PolyfillService.js';
import { Logger } from '../utils/Logger.js';
import * as RegexUtils from '../utils/RegexUtils.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { Step } from '../core/Step.js';
import { AssembleStep } from '../steps/AssembleStep.js';

vi.mock('fs-extra');
vi.mock('node-fetch');
vi.mock('yauzl');

vi.mock('ora', () => {
    const mockOraInstance = {
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
    };
    return { default: vi.fn(() => mockOraInstance) };
});

describe('Ultimate Omega Mastery: Final Logic Verification', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(`exit:${code}`); });
    vi.mocked(fs.remove).mockResolvedValue(undefined);
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

    vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const p = filePath.toString();
        if (p.endsWith('manifest.json')) return '{"manifest_version": 3, "name": "n", "version": "1"}';
        if (p.includes('templates/')) {
            return `template:${path.basename(p)} {{SCRIPT_ID}} {{LOCALE}} {{INJECTED_MANIFEST}} {{EXTENSION_ASSETS_MAP}} {{COMBINED_EXECUTION_LOGIC}}`;
        }
        if (p.endsWith('.html')) return '<html><link href="?#"></html>';
        return 'content';
    });

    process.argv = originalArgv;
  });

  it('Index: ensures failure on missing input', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
    await expect(convertExtension({ inputDir: 'none', outputFile: 'o.js', target: 'userscript' })).rejects.toThrow('Input directory or archive not found');
  });

  it('Services: locale ingestion error fallback returns empty object', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('malformed-json'));
      const fallback = await ManifestService.loadLocaleMessages('.', 'en');
      expect(fallback).toEqual({});
  });

  it('CLI: comprehensive outcome pinning', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('d') } as any);
      vi.mocked(fs.outputFile).mockResolvedValue(undefined);

      const extId = 'abcdefghijklmnopqrstuvwxyz123456';
      await Cli.runCli(['convert', `https://chromewebstore.google.com/detail/${extId}`, '-o', 'o.js']);

      // Pinning observable outcomes
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(extId));
      expect(fs.outputFile).toHaveBeenCalledWith(path.resolve('o.js'), expect.any(String));
  });
});
