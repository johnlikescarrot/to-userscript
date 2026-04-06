import { describe, it, expect, vi } from 'vitest';
import { AssembleStep } from '../AssembleStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import { PolyfillService } from '../../services/PolyfillService.js';
import { TemplateService } from '../../services/TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../services/PolyfillService.js');
vi.mock('../../services/TemplateService.js', () => ({
  TemplateService: {
    load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}}'),
    replace: vi.fn().mockReturnValue('final script'),
    loadLocaleMessages: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../services/ManifestService.js', () => ({
  ManifestService: {
    getInternalId: vi.fn().mockReturnValue('test-id'),
    loadLocaleMessages: vi.fn().mockResolvedValue({})
  }
}));

describe('AssembleStep', () => {
  it('should assemble the final script', async () => {
    vi.mocked(PolyfillService.build).mockResolvedValue('polyfill code');

    const ctx = new ConversionContext({
        inputDir: '.',
        outputFile: 'out.js',
        target: 'userscript',
        locale: 'en'
    });
    ctx.set('manifest', {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
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
