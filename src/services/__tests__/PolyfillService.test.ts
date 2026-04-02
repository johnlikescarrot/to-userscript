import { describe, it, expect, vi } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { TemplateService } from '../TemplateService.js';

vi.mock('../TemplateService.js');
vi.mock('../ManifestService.js', () => ({
    ManifestService: { getInternalId: () => 'test-id' }
}));

describe('PolyfillService', () => {
  it('should build the polyfill string for userscript', async () => {
    vi.mocked(TemplateService.load).mockResolvedValue('{{SCRIPT_ID}} {{INJECTED_MANIFEST}} getURL: (path) => ...,');
    const res = await PolyfillService.build('userscript', {}, { name: 'test' } as any);
    expect(res).toContain('test-id');
    expect(res).toContain('{"name":"test"}');
  });

  it('should build the polyfill string for vanilla', async () => {
    vi.mocked(TemplateService.load).mockResolvedValue('template');
    const res = await PolyfillService.build('vanilla', {}, { name: 'test' } as any);
    expect(res).toBeDefined();
  });

  it('should build the polyfill string for postmessage', async () => {
    vi.mocked(TemplateService.load).mockResolvedValue('{{IS_IFRAME}}');
    const res = await PolyfillService.build('postmessage', {}, { name: 'test' } as any);
    expect(res).toContain('true');
  });
});
