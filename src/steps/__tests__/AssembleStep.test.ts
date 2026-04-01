import { describe, it, expect, vi } from 'vitest';
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
  it('should assemble the final script', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
    ctx.set('manifest', {
      name: 'test',
      raw: {},
      content_scripts: [],
      action: { default_popup: 'pop.html' }
    });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });

    const step = new AssembleStep();
    await step.execute(ctx);

    expect(fs.outputFile).toHaveBeenCalledWith('out.js', expect.stringContaining('final script'));
  });
});
