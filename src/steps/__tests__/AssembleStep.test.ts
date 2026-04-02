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
    replace: vi.fn().mockImplementation((template, replacements) => {
        let res = template;
        for (const [k, v] of Object.entries(replacements)) {
            res = res.split(k).join(v as string);
        }
        return res;
    })
  }
}));

describe('AssembleStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should handle all grant, metadata and resource branches', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'userscript' });
    ctx.set('manifest', {
        name: 't', version: '1', description: 'd',
        raw: {
            permissions: ['storage', 'alarms'],
            host_permissions: ['https://*.example.com/*'],
            author: 'Me',
            homepage_url: 'http://home.com',
            support_url: 'http://support.com',
            license: 'MIT'
        },
        content_scripts: [{ matches: ['*://*/*'], js: ['c.js'], run_at: 'document_start' }],
        icons: {}, action: {}, background_scripts: []
    });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: { 'c.js': 'CODE' }, cssContents: {} });

    await new AssembleStep().execute(ctx);
    const content = vi.mocked(fs.outputFile).mock.calls[0][1] as string;

    // Core Metadata
    expect(content).toContain('@name        t');
    expect(content).toContain('@author      Me');
    expect(content).toContain('@homepageURL http://home.com');
    expect(content).toContain('@supportURL  http://support.com');
    expect(content).toContain('@license     MIT');

    // Grants
    expect(content).toContain('@grant       GM_setValue');
    expect(content).toContain('@grant       GM_info');

    // Connect
    expect(content).toContain('@connect     example.com');
  });

  it('should handle vanilla target without metadata block', async () => {
    const ctx = new ConversionContext({ inputDir: '.', outputFile: 'out.js', target: 'vanilla' });
    ctx.set('manifest', { name: 't', version: '1', description: '', raw: {}, content_scripts: [], icons: {}, action: {}, background_scripts: [] });
    ctx.set('assetMap', {});
    ctx.set('resources', { jsContents: {}, cssContents: {} });
    await new AssembleStep().execute(ctx);
    expect(vi.mocked(fs.outputFile).mock.calls[0][1]).not.toContain('// ==UserScript==');
  });
});
