import { describe, it, expect, vi } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { TemplateService } from '../TemplateService.js';

vi.mock('../TemplateService.js');

describe('PolyfillService', () => {
  it('should build the polyfill string', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return '{{SCRIPT_ID}} {{INJECTED_MANIFEST}} getURL: (path) => ...,';
        return 'template content';
    });
    const res = await PolyfillService.build('userscript', {}, { name: 'test' } as any, 'test-id');
    expect(res).toContain('test-id');
    expect(res).toContain('{"name":"test"}');
  });
});
