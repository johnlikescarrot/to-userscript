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

describe('Ultimate Omega Mastery: 100% Coverage', () => {
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
            // Return content that identifies the template file
            return `template:${path.basename(p)} {{SCRIPT_ID}} {{LOCALE}} {{INJECTED_MANIFEST}} {{EXTENSION_ASSETS_MAP}} {{COMBINED_EXECUTION_LOGIC}}`;
        }
        if (p.endsWith('.html')) return '<html><link href="?#"></html>';
        return 'content';
    });

    process.argv = originalArgv;
  });

  it('Index: covers all branches and verify outputs', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/u');
    vi.mocked(fs.outputFile).mockResolvedValue(undefined);

    await convertExtension({ inputDir: 'a.crx', outputFile: 'o.user.js', target: 'userscript' });
    expect(fs.outputFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('n'));
    expect(fs.remove).toHaveBeenCalled();

    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.mocked(fs.remove).mockRejectedValueOnce(new Error('fail-remove'));
    await expect(convertExtension({ inputDir: 'a.crx', outputFile: 'o.user.js', target: 'userscript' })).resolves.not.toThrow();

    vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
    await convertExtension({ inputDir: 'none', outputFile: 'o.user.js', target: 'userscript' });
  });

  it('CLI: comprehensive coverage and isMain', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('d') } as any);
      vi.mocked(fs.outputFile).mockResolvedValue(undefined);

      const extensionId = 'abcdefghijklmnopqrstuvwxyz123456';
      await Cli.runCli(['convert', `https://chromewebstore.google.com/detail/${extensionId}`, '-o', 'o.js']);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(extensionId));

      process.argv = ['node', 'index.js', 'convert', 'http://fail'];
      vi.mocked(fetch).mockRejectedValueOnce(new Error('dl-fail'));
      await expect(Cli.bootstrap()).rejects.toThrow('exit:1');

      const cliFilePath = path.resolve('src/cli/index.ts');
      const cliUrl = pathToFileURL(cliFilePath).href;
      expect(Cli.isMain(cliUrl, 'src/cli/index.ts')).toBe(true);
  });

  it('Services: Manifest, Assets, and Locale success/fail', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({
          manifest_version: 2, name: 'n', version: '1',
          page_action: { default_popup: 'p.html' },
          browser_action: { default_icon: { "16": "i.png" } }
      }));
      await ManifestService.load('m.json');

      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockResolvedValueOnce({ hello: { message: "world" } });
      const msg = await ManifestService.loadLocaleMessages('.', 'en');
      expect(msg).toEqual({ hello: { message: "world" } });

      vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('e'));
      await ManifestService.loadLocaleMessages('.', 'en');

      await AssetService.generateAssetMap('r', {
          manifest_version: 3,
          action: { default_popup: 'p.html' },
          web_accessible_resources: [{ resources: ['res.png'] }]
      } as any);

      const p = await PolyfillService.build('postmessage', {}, { manifest_version: 3, name: 'n', version: '1' } as any);
      expect(p).toContain('postmessage');
  });

  it('Utils and Core error paths', async () => {
      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'o', target: 'userscript' });
      expect(() => ctx.get('missing')).toThrow();

      const logger = new Logger('test');
      logger.stopSpinner(false, 'f');
      logger.stopSpinner(true);

      expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExp('[')).toBeDefined();
  });
});
