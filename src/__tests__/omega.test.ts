import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import yauzl from 'yauzl';
import { EventEmitter } from 'events';
import path from 'path';
import { pathToFileURL } from 'url';

// CORE LOGIC
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
vi.mock('yauzl');
vi.mock('node-fetch');
vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
    }))
}));

describe('Coverage Omega Strike', () => {
    const originalArgv = process.argv;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(`exit:${code}`); });

        vi.mocked(fs.pathExists).mockResolvedValue(true);
        vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);
        vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
            const p = filePath.toString();
            if (p.endsWith('manifest.json')) return JSON.stringify({ manifest_version: 3, name: 'test', version: '1' });
            if (p.includes('templates/')) {
                return `executeScript: async (details = {}) => { try { const res = await func(...(args || [])); } catch(err) { throw err; } } ... updateDynamicRules: ({ addRules, removeRuleIds } = {}) => { dynamicRules = dynamicRules.filter(r => !removeRuleIds.includes(r.id)); } ... {{SCRIPT_ID}} {{LOCALE}} {{INJECTED_MANIFEST}} target:${p}`;
            }
            if (p.endsWith('.html')) return '<html><link href="?#"><script src="data:123"></script></html>';
            return 'content';
        });
        vi.mocked(fs.outputFile).mockResolvedValue(undefined);
        vi.mocked(fs.remove).mockResolvedValue(undefined);

        process.argv = originalArgv;
    });

    it('Index: covers all branches', async () => {
        vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
        vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/u');
        await convertExtension({ inputDir: 'a.crx', outputFile: 'o.js', target: 'userscript' });

        vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
        vi.mocked(fs.remove).mockRejectedValueOnce(new Error('fail'));
        await convertExtension({ inputDir: 'a.crx', outputFile: 'o.js', target: 'userscript' });

        vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
        await convertExtension({ inputDir: 'none', outputFile: 'o.js', target: 'userscript' });
    });

    it('CLI: comprehensive coverage', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('d') } as any);
        const extId = 'abcdefghijklmnopqrstuvwxyz123456';

        await Cli.runCli(['convert', `https://chromewebstore.google.com/detail/${extId}`, '-o', 'o.js']);
        await Cli.runCli(['convert', 'http://direct.zip', '-o', 'o.js']);
        await Cli.runCli(['download', extId]);
        await Cli.runCli(['require', 's.js']);

        process.argv = ['node', 'index.js', 'convert', 'http://fail'];
        vi.mocked(fetch).mockRejectedValueOnce(new Error('fail'));
        await expect(Cli.bootstrap()).rejects.toThrow('exit:1');

        const cliPath = path.resolve('src/cli/index.ts');
        expect(Cli.isMain(pathToFileURL(cliPath).href, 'src/cli/index.ts')).toBe(true);
        expect(Cli.isMain('invalid', 'path')).toBe(false);
    });

    it('Services: Manifest and Assets fallbacks', async () => {
        vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({
            manifest_version: 2, name: 'n', version: '1',
            page_action: { default_popup: 'p.html' },
            browser_action: { default_icon: 'i.png' },
            background: { scripts: ['bg.js'] }
        }));
        await ManifestService.load('m.json');

        vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('e'));
        await ManifestService.loadLocaleMessages('.', 'en');

        const assetMap = await AssetService.generateAssetMap('r', {
            manifest_version: 3,
            action: { default_popup: 'p.html' },
            web_accessible_resources: [{ resources: ['res.png'] }]
        } as any);
        expect(assetMap).toHaveProperty('p.html');
    });

    it('Polyfill and Steps diversity', async () => {
        const p = await PolyfillService.build('postmessage', {}, { manifest_version: 3, name: 'n', version: '1' } as any);
        expect(p).toContain('postmessage');
        expect(p).toContain('executeScript: async');

        const ctx = new ConversionContext({ inputDir: '.', outputFile: 'o.js', target: 'userscript' });
        ctx.set('manifest', { name: 'n', raw: { manifest_version: 3, name: 'n' }, content_scripts: [{ matches: ['*'], js: ['s.js'], run_at: 'document_start' }], action: { default_popup: 'p.html' } });
        ctx.set('assetMap', {});
        ctx.set('resources', { jsContents: { 's.js': 'c' }, cssContents: {} });

        const loadSpy = vi.spyOn(TemplateService, 'load').mockImplementation(async (name: string) => {
            if (name === 'orchestration') return '{{LOCALE}} {{INJECTED_MANIFEST}} {{COMBINED_EXECUTION_LOGIC}}';
            return '{{SCRIPT_ID}}';
        });
        await new AssembleStep().execute(ctx);
        loadSpy.mockRestore();
    });

    it('Utils and Errors', () => {
        const logger = new Logger('t');
        logger.info('i'); logger.success('s'); logger.warn('w'); logger.error('e');
        logger.stopSpinner(false); logger.stopSpinner(true);

        expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
        expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');
        expect(RegexUtils.convertMatchPatternToRegExp('[')).toBeDefined();
        expect(RegexUtils.matchGlobPattern('[', 'a')).toBe(false);

        const ctx = new ConversionContext({ inputDir: '.', outputFile: 'o', target: 'userscript' });
        expect(() => ctx.get('missing')).toThrow();
    });
});
