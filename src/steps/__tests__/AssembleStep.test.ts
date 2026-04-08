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
    load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}} {{SCRIPT_ID}}'),
    replace: vi.fn().mockImplementation((content, replacements) => {
        let res = content;
        for (const [k, v] of Object.entries(replacements)) {
            res = res.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v);
        }
        return res;
    })
  }
}));

vi.mock('../../services/ManifestService.js', () => ({
  ManifestService: {
    getInternalId: vi.fn().mockReturnValue('test-id'),
    loadLocaleMessages: vi.fn().mockResolvedValue({}),
    load: vi.fn()
  }
}));

describe('AssembleStep: Industrial Robustness', () => {
  it('should assemble the final script with custom grants based on resource scanning', async () => {
    vi.mocked(PolyfillService.build).mockResolvedValue('polyfill code');

    const ctx = new ConversionContext({
        inputDir: '.',
        outputFile: 'industrial.user.js',
        target: 'userscript'
    });

    // Simulate manifest with specific permissions and name requiring normalization
    ctx.set('manifest', {
      name: '  Industrial\n#Extension!!  ',
      version: '1.0.0',
      description: 'Elite description',
      raw: {},
      content_scripts: [{ matches: ['https://elite.com/*'], js: ['content.js'] }],
      action: { default_popup: 'pop.html' },
      dnr_rule_resources: []
    });

    // Mock resources containing GM_webRequest usage
    ctx.set('resources', {
        jsContents: { 'content.js': 'GM_webRequest({ selector: "*" });' },
        cssContents: {}
    });
    ctx.set('dnrRules', {});
    ctx.set('assetMap', {});

    const step = new AssembleStep();
    await step.execute(ctx);

    const call = vi.mocked(fs.outputFile).mock.calls.find(c => c[0] === 'industrial.user.js');
    const output = call?.[1] as string;

    // Check sanitized name (newlines become spaces)
    expect(output).toContain('// @name        Industrial #Extension!!');
    expect(output).toContain('// @grant       GM_webRequest');
    expect(output).toContain('// @match       https://elite.com/*');
    // Normalized scriptId used in wrapper
    expect(output).toContain('test-id');
  });

  it('should exercise scriptId fallback path when manifest name is invalid', async () => {
      vi.mocked(PolyfillService.build).mockResolvedValue('fallback polyfill');
      const { ManifestService } = await import('../../services/ManifestService.js');
      vi.mocked(ManifestService.getInternalId).mockReturnValue('');

      const ctx = new ConversionContext({ inputDir: '.', outputFile: 'fallback.js', target: 'userscript' });
      ctx.set('manifest', {
          name: '',
          version: '1',
          raw: {},
          content_scripts: [],
          action: {}, // Ensure action is defined
          dnr_rule_resources: []
      });
      ctx.set('dnrRules', {});
      ctx.set('resources', { jsContents: {}, cssContents: {} });
      ctx.set('assetMap', {});

      const step = new AssembleStep();
      await step.execute(ctx);

      const output = vi.mocked(fs.outputFile).mock.calls.find(c => c[0] === 'fallback.js')?.[1] as string;
      expect(output).toContain('extension-');
  });
});
