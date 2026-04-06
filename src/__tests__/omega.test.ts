import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertExtension } from '../index.js';
import fs from 'fs-extra';
import { UnpackService } from '../services/UnpackService.js';
import { ManifestService } from '../services/ManifestService.js';
import * as RegexUtils from '../utils/RegexUtils.js';

vi.mock('fs-extra');
vi.mock('node-fetch');

describe('Industrial Transformation: Elite Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock behavior for fs
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);
    vi.mocked(fs.readdir).mockResolvedValue([]);
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
        if (p.includes('template')) {
            return `
// Realistic Template Snippet
const SCRIPT_ID = "{{SCRIPT_ID}}";
const ASSETS = {{EXTENSION_ASSETS_MAP}};
const MANIFEST = {{INJECTED_MANIFEST}};
const LOCALE = {{LOCALE}};
const MIMES = {{MIME_MAP}};
{{COMBINED_EXECUTION_LOGIC}}
`;
        }
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

    // Robust, order-independent output detection with existence assertion
    const outputCall = vi.mocked(fs.outputFile).mock.calls.find(c => c[0].endsWith('industrial.user.js'));
    expect(outputCall).toBeDefined();
    const output = outputCall![1] as string;

    expect(output).toContain('// ==UserScript==');
    expect(output).toContain('// @name        Industrial Test');
    expect(output).toContain('// @version     1.2.3');
    expect(output).toContain('// @match       *://test.com/*');
    // Verify that the REAL bootstrap logic was injected
    expect(output).toContain('window.EXTENSION_ASSETS_MAPS');
    expect(output).toContain('Industrial Test');

    expect(fs.remove).toHaveBeenCalled();
  });

  it('Index: cleanup-resilience when removal fails', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/cleanup-test');
    vi.mocked(fs.remove).mockRejectedValueOnce(new Error('cleanup-fail'));

    const result = await convertExtension({
        inputDir: 'a.crx',
        outputFile: 'o.js',
        target: 'userscript'
    });

    // Explicitly assert success despite cleanup failure
    expect(result).toMatchObject({ success: true });
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
      // Test success path
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockResolvedValueOnce({ hello: { message: "industrial-world" } });
      const msg = await ManifestService.loadLocaleMessages('.', 'en');
      expect(msg).toEqual({ hello: { message: "industrial-world" } });

      // Test error path (JSON parse error fallback to empty object)
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('malformed-json'));
      const fallback = await ManifestService.loadLocaleMessages('.', 'en');
      expect(fallback).toEqual({});
  });

  it('Utils: Regex edge cases and high-fidelity matching', () => {
      expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');

      const re = RegexUtils.convertMatchPatternToRegExp('*://google.com/*');
      expect(re.test('https://google.com/')).toBe(true);
  });
});
