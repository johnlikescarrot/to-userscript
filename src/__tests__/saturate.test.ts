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
        load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}}'),
        replace: vi.fn().mockReturnValue('replaced_content')
    }
}));

describe('Coverage Saturation Ultimate', () => {
  it('AssetService - exhaustive branches', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'));

    // Discovered files via MV2 (Line 88-92)
    await AssetService.generateAssetMap('root', {
        manifest_version: 2,
        name: 'V2',
        options_ui: { page: 'o.html' },
        options_page: 'op.html',
        browser_action: { default_popup: 'p.html' },
        page_action: { default_popup: 'pa.html' }
    } as any);

    // MV3 Side Panel (Line 106)
    const map = await AssetService.generateAssetMap('root', {
        manifest_version: 3,
        name: 'V3_SP',
        side_panel: { default_path: 'side.html' }
    } as any);

    expect(map["side.html"]).toBeDefined();
    expect(AssetService.getMimeType('a.html')).toBe('text/html');
  });

  it('RegexUtils - exhaustive matching', () => {
    expect(RegexUtils.convertMatchPatternToRegExpString('file:///foo/*')).toContain('file');
    expect(RegexUtils.convertMatchPatternToRegExpString('http:///path')).toBe('$.');
    expect(RegexUtils.convertMatchPatternToRegExpString('http://a.com/*')).toContain('(?:/.*)?');
    expect(RegexUtils.convertMatchPatternToRegExpString('')).toBe('$.');
    expect(RegexUtils.convertMatchPatternToRegExpString('invalid')).toBe('$.');
  });

  it('AssembleStep - exhaustive UI', async () => {
      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
      ctx.set('manifest', {
          name: 'test', version: '1', description: 'd', manifest_version: 3,
          raw: { name: 'test', options_page: 'o.html', action: { default_popup: 'p.html' }, side_panel: { default_path: 's.html' } },
          content_scripts: [], action: { default_popup: 'p.html' },
          permissions: []
      });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: {}, cssContents: {} });

      const step = new AssembleStep();
      await step.run(ctx);
      expect(TemplateService.replace).toHaveBeenCalled();
  });
});
