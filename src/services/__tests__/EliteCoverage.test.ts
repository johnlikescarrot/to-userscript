import { describe, it, expect, vi } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { AssetService } from '../AssetService.js';
import { ManifestService } from '../ManifestService.js';
import { TemplateService } from '../TemplateService.js';
import { Logger } from '../../utils/Logger.js';
import {
  convertMatchPatternToRegExp,
  convertMatchPatternToRegExpString,
  matchGlobPattern
} from '../../utils/RegexUtils.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('Elite Coverage: Service Branch Perfection', () => {
  it('AssetService: getMimeType fallback', () => {
    expect(AssetService.getMimeType('test.unknown')).toBe('application/octet-stream');
  });

  it('AssetService: generateAssetMap recursive discovery', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockImplementation(async (p: any) => {
        if (p.endsWith('manifest.json')) return JSON.stringify({ manifest_version: 3, name: 't', version: '1', action: { default_popup: 'p.html' } });
        if (p.endsWith('p.html')) return '<img src="a.png">';
        if (p.endsWith('a.png')) return Buffer.from('data');
        return '';
    });
    const map = await AssetService.generateAssetMap('.', { manifest_version: 3, name: 't', version: '1', action: { default_popup: 'p.html' } } as any);
    expect(map['p.html']).toBe('<img src="a.png">');
    expect(map['a.png']).toBeDefined();
  });

  it('ManifestService: loadLocaleMessages handles missing and malformed files', async () => {
    vi.mocked(fs.pathExists).mockResolvedValueOnce(false);
    expect(await ManifestService.loadLocaleMessages('.', 'missing')).toEqual({});

    vi.mocked(fs.pathExists).mockResolvedValueOnce(true);
    vi.mocked(fs.readJson).mockRejectedValueOnce(new Error('fail'));
    expect(await ManifestService.loadLocaleMessages('.', 'bad')).toEqual({});
  });

  it('ManifestService: getInternalId sanitization edge cases', () => {
    expect(ManifestService.getInternalId({ name: '!!!---Test---!!!' } as any)).toBe('test');
    expect(ManifestService.getInternalId({ name: ' ' } as any)).toBe('');
  });

  it('Logger: coverage for all log types', () => {
      const logger = new Logger('test');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.info('info');
      logger.success('success');
      logger.warn('warn');
      logger.error('error', new Error('fail'));

      expect(logSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      logger.startSpinner('spin');
      logger.stopSpinner(true, 'ok');
      logger.startSpinner('spin2');
      logger.stopSpinner(false, 'fail');
  });
});

describe('Elite Coverage: Advanced Utils & Manifest Perfection', () => {
  it('RegexUtils: convertMatchPatternToRegExpString edge cases', () => {
    expect(convertMatchPatternToRegExpString('http://*/path')).toContain('[^/]+');
    expect(convertMatchPatternToRegExpString('file:///foo*')).toContain('file');
    expect(convertMatchPatternToRegExpString('https://*.google.com/')).toContain('google');
    expect(convertMatchPatternToRegExpString('https://google.com')).toContain('google');
  });

  it('RegexUtils: matchGlobPattern edge cases', () => {
    expect(matchGlobPattern('', 'path')).toBe(false);
    expect(matchGlobPattern('path', '')).toBe(false);
    expect(matchGlobPattern('a/b', 'a/b')).toBe(true);
    expect(matchGlobPattern('[invalid', 'path')).toBe(false);
  });

  it('ManifestService: load Manifest V2 with actions', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({
          manifest_version: 2,
          name: 'v2',
          version: '1',
          browser_action: { default_popup: 'p.html', default_icon: 'i.png' },
          background: { scripts: ['b.js'] },
          web_accessible_resources: ['r.png']
      }));
      const m = await ManifestService.load('m2.json');
      expect(m.manifest_version).toBe(2);
      expect(m.action.default_popup).toBe('p.html');
      expect(m.background_scripts).toEqual(['b.js']);
  });
});

describe('Elite Coverage: Final Perfection', () => {
  it('RegexUtils: convertMatchPatternToRegExp error handling', () => {
    expect(convertMatchPatternToRegExp('').test('any')).toBe(false);
  });

  it('TemplateService: error handling', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    await expect(TemplateService.load('nonexistent')).rejects.toThrow('Template not found');
  });

  it('AssetService: handles unmapped relative assets', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p: any) => {
          if (p.endsWith('p.html')) return true;
          return false;
      });
      vi.mocked(fs.readFile).mockImplementation(async (p: any) => {
          if (p.endsWith('p.html')) return '<img src="unmapped.png">';
          return '';
      });
      const map = await AssetService.generateAssetMap('.', { manifest_version: 3, name: 't', version: '1', action: { default_popup: 'p.html' } } as any);
      expect(map['p.html']).toBeDefined();
      expect(map['unmapped.png']).toBeUndefined();
  });
});
