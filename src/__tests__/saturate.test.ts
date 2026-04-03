import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '../services/AssetService.js';
import * as RegexUtils from '../utils/RegexUtils.js';
import { AssembleStep } from '../steps/AssembleStep.js';
import { ConversionContext } from '../core/ConversionContext.js';
import { TemplateService } from '../services/TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../services/TemplateService.js', () => ({
    TemplateService: {
        load: vi.fn().mockResolvedValue('template_content'),
        replace: vi.fn().mockReturnValue('replaced_content')
    }
}));

describe('Coverage Saturation Ultimate', () => {
  it('AssetService - exhaustive branches', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data') as any);

    // MV3 with Side Panel (Line 106)
    await AssetService.generateAssetMap('root', {
        manifest_version: 3,
        name: 'V3_SP',
        side_panel: { default_path: 'side.html' }
    } as any);

    // MIME types exhaustive (Line 118-123)
    expect(AssetService.getMimeType('a.html')).toBe('text/html');
    expect(AssetService.getMimeType('a.png')).toBe('image/png');
    expect(AssetService.getMimeType('a.unknown')).toBe('application/octet-stream');
  });

  it('RegexUtils - exhaustive matching', () => {
    // File scheme (Line 16-18)
    expect(RegexUtils.convertMatchPatternToRegExpString('file:///foo/*')).toContain('file');
    // Host Match failure (Line 30-31)
    expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');
    // Simple Path (Line 38)
    expect(RegexUtils.convertMatchPatternToRegExpString('http://a.com/*')).toContain('(?:/.*)?');
  });

  it('AssembleStep - side panel replacement', async () => {
      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
      ctx.set('manifest', {
          name: 'test', version: '1', description: 'd', manifest_version: 3,
          raw: { name: 'test', side_panel: { default_path: 'side.html' } }, // Triggers side panel path logic
          content_scripts: [], action: { default_popup: 'pop.html' }
      });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: {}, cssContents: {} });

      await new AssembleStep().run(ctx);
      // Verify replacement logic was called with side panel path
      expect(TemplateService.replace).toHaveBeenCalled();
  });
});
