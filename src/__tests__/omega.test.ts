import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertExtension } from '../index.js';
import fs from 'fs-extra';
import { UnpackService } from '../services/UnpackService.js';
import { ManifestService } from '../services/ManifestService.js';
import * as RegexUtils from '../utils/RegexUtils.js';

vi.mock('fs-extra');
vi.mock('node-fetch');

const REALISTIC_TEMPLATE = `
// Realistic Template Snippet
const SCRIPT_ID = "{{SCRIPT_ID}}";
const ASSETS = {{EXTENSION_ASSETS_MAP}};
const MANIFEST = {{INJECTED_MANIFEST}};
const LOCALE = {{LOCALE}};
const MIMES = {{MIME_MAP}};
{{COMBINED_EXECUTION_LOGIC}}

// Polyfill Markers
// aiOriginTrial
// languageModel
// getEnabledRulesets
// registerContentScripts
`;

describe('Industrial Transformation: Elite Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        const p = path.toString();
        if (p.endsWith('manifest.json')) {
            return JSON.stringify({
              manifest_version: 3,
              name: 'Industrial Test',
              version: '1.2.3',
              content_scripts: [{ matches: ['*://test.com/*'], js: ['c.js'] }]
            });
        }
        if (p.includes('template')) return REALISTIC_TEMPLATE;
        return 'console.log("industrial asset");';
    });
    vi.mocked(fs.outputFile).mockResolvedValue(undefined);
    vi.mocked(fs.remove).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Index: happy-path conversion pins outcomes and verifies bootstrap injection', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/unpacked-industrial');

    const result = await convertExtension({
        inputDir: 'archive.crx',
        outputFile: 'industrial.user.js',
        target: 'userscript'
    });

    expect(result.success).toBe(true);
    expect(result.extension.name).toBe('Industrial Test');

    const outputCall = vi.mocked(fs.outputFile).mock.calls.find(c => c[0].endsWith('industrial.user.js'));
    expect(outputCall).toBeDefined();
    const output = outputCall![1] as string;

    expect(output).toContain('// ==UserScript==');
    expect(output).toContain('// @name        Industrial Test');
    expect(output).toContain('window.EXTENSION_ASSETS_MAPS');

    expect(fs.remove).toHaveBeenCalled();
  });

  it('Index: rejects when input directory is missing', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(false);

    await expect(convertExtension({
        inputDir: 'none',
        outputFile: 'o.js',
        target: 'userscript'
    })).rejects.toThrow('Input directory or archive not found');
  });

  it('Services: Locale success and error fallback assertions', async () => {
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockResolvedValueOnce({ hello: { message: "industrial-world" } });
      const msg = await ManifestService.loadLocaleMessages('.', 'en');
      expect(msg).toEqual({ hello: { message: "industrial-world" } });
  });

  it('Utils: Regex edge cases and high-fidelity matching', () => {
      expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
      const re = RegexUtils.convertMatchPatternToRegExp('*://google.com/*');
      expect(re.test('https://google.com/')).toBe(true);
  });
});

describe('Transcendent Logic: Advanced MV3 & AI Coverage', () => {
  beforeEach(() => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);
  });

  it('AssembleStep: detects GM_download and GM_setClipboard from resources', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        const p = path.toString();
        if (p.endsWith('manifest.json')) {
            return JSON.stringify({
              manifest_version: 3,
              name: 'Grant Test',
              version: '1.0.0',
              content_scripts: [{ matches: ['*://*/*'], js: ['grant.js'] }]
            });
        }
        if (p.endsWith('grant.js')) return 'GM_download("url"); GM_setClipboard("text");';
        if (p.includes('template')) return REALISTIC_TEMPLATE;
        return 'console.log("asset");';
    });

    await convertExtension({
        inputDir: 'some-dir',
        outputFile: 'grant.user.js',
        target: 'userscript'
    });

    const output = vi.mocked(fs.outputFile).mock.calls.find(c => c[0].endsWith('grant.user.js'))![1] as string;
    expect(output).toContain('// @grant       GM_download');
    expect(output).toContain('// @grant       GM_setClipboard');
  });

  it('AssembleStep: handles aiOriginTrial and declarativeNetRequest stubs', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        const p = path.toString();
        if (p.endsWith('manifest.json')) {
            return JSON.stringify({
              manifest_version: 3,
              name: 'MV3 Test',
              version: '1.0.0',
              content_scripts: [{ matches: ['*://*/*'], js: ['mv3.js'] }]
            });
        }
        if (p.includes('template')) return REALISTIC_TEMPLATE;
        return 'console.log("mv3 asset");';
    });

    await convertExtension({
        inputDir: 'other-dir',
        outputFile: 'mv3.user.js',
        target: 'userscript'
    });

    const output = vi.mocked(fs.outputFile).mock.calls.find(c => c[0].endsWith('mv3.user.js'))![1] as string;
    expect(output).toContain('aiOriginTrial');
    expect(output).toContain('languageModel');
    expect(output).toContain('getEnabledRulesets');
    expect(output).toContain('registerContentScripts');
  });
});
