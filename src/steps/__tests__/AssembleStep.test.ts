import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssembleStep } from '../AssembleStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../services/PolyfillService.js');
vi.mock('../../services/IconService.js', () => ({
    IconService: { getBestIconBase64: vi.fn().mockResolvedValue('base64icon') }
}));
vi.mock('../../services/TemplateService.js', () => ({
  TemplateService: {
    load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}}'),
    replace: vi.fn().mockReturnValue('final script body')
  }
}));

describe('AssembleStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assemble the final script and handle various content script configs', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
    ctx.set('manifest', {
      name: 'test',
      version: '1.0.0',
      description: 'desc',
      raw: { permissions: ['storage', 'notifications', 'tabs'], host_permissions: ['*://*/*'] },
      content_scripts: [
        { matches: ['*://google.com/*'], js: ['c.js'], run_at: 'document_start' }
      ],
      icons: {},
      action: { default_popup: 'p.html' }
    });
    ctx.set('assetMap', { 'a.png': 'd' });
    ctx.set('resources', { jsContents: { 'c.js': 'console.log(1)' }, cssContents: { 's.css': 'body{}' } });

    const step = new AssembleStep();
    await step.execute(ctx);

    expect(fs.outputFile).toHaveBeenCalledWith('out.js', expect.stringContaining('// @grant       GM_notification'));
    expect(fs.outputFile).toHaveBeenCalledWith('out.js', expect.stringContaining('// @grant       GM_openInTab'));
  });

  it('should handle vanilla target without grants', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'vanilla' });
    ctx.set('manifest', { name: 't', version: '1', description: '', raw: {}, content_scripts: [], icons: {}, action: {} });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });

    const step = new AssembleStep();
    await step.execute(ctx);
    expect(fs.outputFile).toHaveBeenCalled();
  });
});
