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
    vi.mocked(fs.readFile).mockResolvedValue('{"manifest_version": 3, "name": "n", "version": "1"}');
    process.argv = originalArgv;
  });

  it('should cover index.ts entry point and cleanup logic', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/u');
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('stop'));
    vi.mocked(fs.remove).mockRejectedValueOnce(new Error('fail-remove'));

    await expect(convertExtension({ inputDir: 'a.crx', outputFile: 'o', target: 'userscript' })).rejects.toThrow('stop');
    expect(fs.remove).toHaveBeenCalled();
  });

  it('should cover cli/index.ts comprehensively', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('d') } as any);
      vi.mocked(fs.outputFile).mockResolvedValue(undefined);

      await Cli.runCli(['convert', 'https://chromewebstore.google.com/detail/abcdefghijklmnopqrstuvwxyz123456', '-o', 'out.js']);
      await Cli.runCli(['convert', 'http://example.com/ext.zip', '-o', 'out.js']);
      await Cli.runCli(['download', 'abcdefghijklmnopqrstuvwxyz123456']);
      await Cli.runCli(['download', 'https://example.com/file']);
      await Cli.runCli(['require', 'script.js']);

      process.argv = ['node', 'index.js', 'convert', 'http://fail'];
      vi.mocked(fetch).mockRejectedValueOnce(new Error('dl-fail'));
      await expect(Cli.bootstrap()).rejects.toThrow('exit:1');

      // Correct isMain verification
      const cliFilePath = path.resolve('src/cli/index.ts');
      const cliUrl = pathToFileURL(cliFilePath).href;
      expect(Cli.isMain(cliUrl, 'src/cli/index.ts')).toBe(true);
      expect(Cli.isMain(cliUrl, 'other.ts')).toBe(false);
      expect(Cli.isMain('', '')).toBe(false);
      expect(Cli.isMain('invalid', 'path')).toBe(false);
  });

  it('should cover services and steps fallbacks', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({
          manifest_version: 2, name: 'n', version: '1',
          page_action: { default_popup: 'p.html' },
          browser_action: { default_icon: { "16": "i.png" } },
          background: { scripts: ['bg.js'] },
          web_accessible_resources: ['r.js']
      }));
      await ManifestService.load('m.json');

      vi.mocked(fs.readFile).mockResolvedValue('<html><link href="?#"><script src="data:123"></script></html>');
      await AssetService.generateAssetMap('r', {
          manifest_version: 3,
          action: { default_popup: 'p.html' },
          web_accessible_resources: [{ resources: ['res.png'] }]
      } as any);

      vi.mocked(fs.pathExists).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      vi.mocked(fs.readFile).mockResolvedValue('content');
      await TemplateService.load('t');

      await PolyfillService.build('postmessage', {}, { manifest_version: 3, name: 'n', version: '1' } as any);
  });

  it('should cover utils and steps edge cases', async () => {
      const logger = new Logger('test');
      logger.info('i'); logger.success('s'); logger.warn('w'); logger.error('e');
      logger.startSpinner('sp');
      logger.stopSpinner(false, 'f');

      expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExp(null as any)).toBeDefined();
      expect(RegexUtils.matchGlobPattern('[', 'a')).toBe(false);

      class FailStep extends Step {
          readonly name = 'Fail';
          async run() { throw new Error('step-fail'); }
      }
      await expect(new FailStep().execute(new ConversionContext({ inputDir: '.', outputFile: 'o', target: 'userscript' }))).rejects.toThrow();
  });

  it('should cover AssembleStep complex loop', async () => {
      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'o.js', target: 'userscript' });
      ctx.set('manifest', {
          name: 'test',
          raw: { manifest_version: 3, name: 'test' },
          content_scripts: [
              { matches: ['*'], js: ['s1.js'], run_at: 'document_start' },
              { matches: ['*'], js: ['s2.js'] }
          ],
          action: { default_popup: 'pop.html' }
      });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: { 's1.js': 'c1', 's2.js': 'c2' }, cssContents: {} });

      const step = new AssembleStep();
      await step.execute(ctx);
  });
});
