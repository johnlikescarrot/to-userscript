import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertExtension } from '../index.js';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { UnpackService } from '../services/UnpackService.js';
import { ManifestService } from '../services/ManifestService.js';
import { AssetService } from '../services/AssetService.js';
import { TemplateService } from '../services/TemplateService.js';
import * as RegexUtils from '../utils/RegexUtils.js';
import yauzl from 'yauzl';
import { EventEmitter } from 'events';

vi.mock('fs-extra');
vi.mock('node-fetch');
vi.mock('yauzl');

describe('Industrial Transformation: Elite Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock behavior for fs
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
        if (path.toString().endsWith('manifest.json')) {
            return JSON.stringify({
              manifest_version: 3,
              name: 't',
              version: '1',
              content_scripts: [{ matches: ['*://test.com/*'], js: ['c.js'] }]
            });
        }
        return '{{SCRIPT_ID}} {{EXTENSION_ASSETS_MAP}} {{LOCALE}} {{INJECTED_MANIFEST}} {{MIME_MAP}}';
    });
    vi.mocked(fs.outputFile).mockResolvedValue(undefined);
    vi.mocked(fs.remove).mockResolvedValue(undefined);
  });

  it('Index: covers all branches and pins outcomes', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.spyOn(UnpackService, 'unpack').mockResolvedValue('/tmp/unpacked');

    const result = await convertExtension({ inputDir: 'a.crx', outputFile: 'o.user.js', target: 'userscript' });

    expect(result.success).toBe(true);
    const output = vi.mocked(fs.outputFile).mock.calls[0][1] as string;

    expect(output).toContain('// ==UserScript==');
    expect(output).toContain('// @match       *://test.com/*');
    expect(output).toContain('window.EXTENSION_ASSETS_MAPS');
    expect(fs.remove).toHaveBeenCalled();

    // Verify BEST-EFFORT cleanup (doesn't throw if remove fails)
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true } as any);
    vi.mocked(fs.remove).mockRejectedValueOnce(new Error('cleanup-fail'));
    await expect(convertExtension({ inputDir: 'a.crx', outputFile: 'o.user.js', target: 'userscript' })).resolves.toBeDefined();

    // Assert missing input directory throws correct error
    vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
    await expect(convertExtension({ inputDir: 'none', outputFile: 'o.user.js', target: 'userscript' }))
        .rejects.toThrow('Input directory or archive not found');
  });

  it('Services: Locale success and error fallback assertions', async () => {
      // Test success path
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockResolvedValueOnce({ hello: { message: "world" } });
      const msg = await ManifestService.loadLocaleMessages('.', 'en');
      expect(msg).toEqual({ hello: { message: "world" } });

      // Test error path (JSON parse error fallback to empty object)
      vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
      vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('malformed-json'));
      const fallback = await ManifestService.loadLocaleMessages('.', 'en');
      expect(fallback).toEqual({});
  });

  it('Security: UnpackService path-traversal guard', async () => {
      const mockZip = new EventEmitter() as any;
      mockZip.readEntry = vi.fn();
      vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => cb(null, mockZip));

      const unpackPromise = UnpackService.unpack('malicious.zip');
      mockZip.emit('entry', { fileName: '../../etc/passwd' });

      await expect(unpackPromise).rejects.toThrow('Potential path traversal attack detected');
  });

  it('Utils: Regex edge cases and high-fidelity matching', () => {
      expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
      expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');

      const re = RegexUtils.convertMatchPatternToRegExp('*://google.com/*');
      expect(re.test('https://google.com/')).toBe(true);
  });
});
