import { describe, it, expect, vi } from 'vitest';
import { AssembleStep } from '../AssembleStep.js';
import { ConversionContext } from '../../core/ConversionContext.js';
import { TemplateService } from '../../services/TemplateService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../services/PolyfillService.js', () => ({
    PolyfillService: { build: vi.fn().mockResolvedValue('polyfill_code') }
}));
vi.mock('../../services/TemplateService.js', () => ({
    TemplateService: {
        load: vi.fn().mockResolvedValue('{{COMBINED_EXECUTION_LOGIC}} {{INJECTED_MANIFEST}}'),
        replace: vi.fn().mockImplementation((c, r) => {
            let res = c;
            for (const [k, v] of Object.entries(r)) { const re = new RegExp(k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"); res = res.replace(re, v); }
            return res;
        })
    }
}));

describe('AssembleStep', () => {
  it('should assemble with locale and css', async () => {
    const ctx = new ConversionContext({
        inputDir: '.', outputFile: 'out.js', target: 'userscript',
        locale: 'en'
    });

    ctx.set('manifest', {
      name: 'Test Ext',
      version: '1.0',
      description: 'Desc',
      manifest_version: 3,
      raw: { name: 'Test Ext' },
      content_scripts: [{ js: ['s.js'], css: ['c.css'], run_at: 'document_start' }],
      action: { default_popup: 'p.html' },
      background_scripts: [],
      permissions: []
    });

    ctx.set('assetMap', { 'p.html': '<html></html>' });
    ctx.set('resources', {
      jsContents: { 's.js': 'console.log(1)' },
      cssContents: { 'c.css': 'body { color: red }' }
    });

    const step = new AssembleStep();
    await step.execute(ctx);
    expect(fs.outputFile).toHaveBeenCalledWith('out.js', expect.stringContaining('console.log(1)'));
  });
});
