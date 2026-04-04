import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '../services/AssetService.js';
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
  it('AssetService - total saturation', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockImplementation((p: any) => {
        if (p.endsWith('.html')) return Promise.resolve('<html><img src="a.png"></html>');
        if (p.endsWith('.css')) return Promise.resolve('body { background: url("b.png"); }');
        return Promise.resolve(Buffer.from('bin'));
    });

    // Discovered files via MV2 and MV3
    const map = await AssetService.generateAssetMap('root', {
        manifest_version: 2,
        name: 'V2',
        options_ui: { page: 'o.html' },
        web_accessible_resources: ['res.png', { resources: ['style.css'] }]
    } as any);

    expect(map["o.html"]).toBeDefined();
    expect(map["a.png"]).toBeDefined();
    expect(map["b.png"]).toBeDefined();

    // Empty path branch
    await AssetService.generateAssetMap('root', { manifest_version: 3, name: 'T' } as any);
  });

  it('AssembleStep - total saturation', async () => {
      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
      ctx.set('manifest', {
          name: 'test', version: '1', description: 'd', manifest_version: 3,
          raw: {
              name: 'test',
              options_page: 'o.html',
              action: { default_popup: 'p.html' },
              side_panel: { default_path: 's.html' },
              content_scripts: [{ matches: ['*://*/*'], exclude_matches: ['https://ex.com/*'] }]
          },
          content_scripts: [{ matches: ['*://*/*'], js: ['s.js'] }],
          action: { default_popup: 'p.html' },
          permissions: []
      });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: { 's.js': '1' }, cssContents: {} });

      const step = new AssembleStep();
      await step.run(ctx);
      expect(TemplateService.replace).toHaveBeenCalled();
  });
});
