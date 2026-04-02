import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssembleStep } from '../AssembleStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../services/PolyfillService.js');
vi.mock('../../services/TemplateService.js', () => ({
  TemplateService: {
    load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}}'),
    replace: vi.fn().mockReturnValue('final script')
  }
}));

describe('AssembleStep', () => {
  let ctx: ConversionContext;

  beforeEach(() => {
      vi.clearAllMocks();
      ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: {}, cssContents: {} });
  });

  it('should assemble the final script with side panel and complex content scripts', async () => {
    ctx.set('manifest', {
      name: 'test',
      version: '1',
      description: 'desc',
      raw: {},
      content_scripts: [
          { matches: ['*://*/*'], js: ['s1.js'], run_at: 'document_start' },
          { matches: ['https://google.com/*'], js: ['s2.js'], run_at: 'document_end' },
          { matches: ['*://github.com/*'], js: ['s3.js'], run_at: 'document_idle' }
      ],
      action: { default_popup: 'pop.html' },
      side_panel: { default_path: 'side.html' },
      permissions: []
    });
    ctx.set('resources', {
        jsContents: { 's1.js': 'c1', 's2.js': 'c2', 's3.js': 'c3' },
        cssContents: { 'style.css': 'body{}' }
    });

    const step = new AssembleStep();
    await step.execute(ctx);

    expect(fs.outputFile).toHaveBeenCalled();
  });

  it('should handle manifest without content scripts or side panel', async () => {
      ctx.set('manifest', {
        name: 'test',
        version: '1',
        description: 'desc',
        raw: {},
        content_scripts: [],
        action: {},
        permissions: []
      });
      ctx.set('assetMap', {});
      ctx.set('resources', { jsContents: {}, cssContents: {} });

      const step = new AssembleStep();
      await step.execute(ctx);

      expect(fs.outputFile).toHaveBeenCalled();
    });

  it('should handle content scripts without js', async () => {
      ctx.set('manifest', {
          name: 'test',
          version: '1',
          raw: {},
          content_scripts: [{ matches: ['*://*/*'], css: ['c.css'] }],
          action: {}
      });
      const step = new AssembleStep();
      await step.execute(ctx);
      expect(fs.outputFile).toHaveBeenCalled();
  });
});
