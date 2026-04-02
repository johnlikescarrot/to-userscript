import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssembleStep } from '../AssembleStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../services/PolyfillService.js');
vi.mock('../../services/IconService.js', () => ({
    IconService: { getBestIconBase64: vi.fn().mockResolvedValue('icon') }
}));
vi.mock('../../services/TemplateService.js', () => ({
  TemplateService: {
    load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}}'),
    // Real-ish implementation for replacement in tests
    replace: vi.fn().mockImplementation((template, replacements) => {
        let res = template;
        for (const [k, v] of Object.entries(replacements)) {
            res = res.replace(k, v as string);
        }
        return res;
    })
  }
}));

describe('AssembleStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should handle all grant and resource branches', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
    ctx.set('manifest', {
        name: 't', version: '1', description: 'd\nn',
        raw: { permissions: ['storage', 'notifications'], host_permissions: ['https://*/*'] },
        content_scripts: [{ matches: ['*://*/*'], js: ['c.js'], run_at: 'document_start' }],
        icons: {}, action: {}, background_scripts: []
    });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: { 'c.js': 'EXPECTED_CODE_STRING' }, cssContents: {} });

    await new AssembleStep().execute(ctx);
    const content = vi.mocked(fs.outputFile).mock.calls[0][1] as string;
    expect(content).toContain('@grant       GM_setValue');
    expect(content).toContain('@grant       GM_notification');
    expect(content).toContain('@connect     https://*/*');
    expect(content).toContain('EXPECTED_CODE_STRING');
  });

  it('should handle vanilla target', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'vanilla' });
    ctx.set('manifest', { name: 't', version: '1', description: '', raw: {}, content_scripts: [], icons: {}, action: {}, background_scripts: [] });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });
    await new AssembleStep().execute(ctx);
    expect(vi.mocked(fs.outputFile).mock.calls[0][1]).not.toContain('// ==UserScript==');
  });
});
