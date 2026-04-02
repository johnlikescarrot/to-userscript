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
    replace: vi.fn().mockImplementation((t, r) => t) // Return template as is for simplicity in this test
  }
}));

describe('AssembleStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assemble the userscript with grants', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
    ctx.set('manifest', {
      name: 'test', version: '1.0.0', description: 'desc',
      raw: { permissions: ['storage'] },
      content_scripts: [], icons: {}, action: {}, background_scripts: []
    });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });

    const step = new AssembleStep();
    await step.execute(ctx);

    const call = vi.mocked(fs.outputFile).mock.calls[0];
    const content = call[1] as string;
    expect(content).toContain('// ==UserScript==');
    expect(content).toContain('// @grant       GM_setValue');
  });

  it('should assemble the vanilla script without metadata and grants', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'vanilla' });
    ctx.set('manifest', {
      name: 'test', version: '1.0.0', description: 'desc',
      raw: { permissions: ['storage'] },
      content_scripts: [], icons: {}, action: {}, background_scripts: []
    });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });

    const step = new AssembleStep();
    await step.execute(ctx);

    const call = vi.mocked(fs.outputFile).mock.calls[0];
    const content = call[1] as string;
    expect(content).not.toContain('// ==UserScript==');
    expect(content).not.toContain('// @grant');
    expect(content).toContain('use strict');
  });
});
