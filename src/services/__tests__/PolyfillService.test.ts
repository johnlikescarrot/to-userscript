import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { TemplateService } from '../TemplateService.js';

vi.mock('../TemplateService.js');
vi.mock('../ManifestService.js', () => ({
    ManifestService: { getInternalId: () => 'test-id' }
}));

describe('PolyfillService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should build the polyfill string with all major components', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return '{{SCRIPT_ID}} {{INJECTED_MANIFEST}} getURL: (path) => ...,';
        return `content for ${name}`;
    });

    const res = await PolyfillService.build('userscript', {}, { name: 'test' } as any);

    expect(res).toContain('test-id');
    expect(res).toContain('{"name":"test"}');
    expect(res).toContain('content for messaging');
    expect(res).toContain('content for abstractionLayer.userscript');
  });

  it('should support vanilla target', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => `content for ${name}`);
    const res = await PolyfillService.build('vanilla', {}, {} as any);
    expect(res).toContain('content for abstractionLayer.vanilla');
  });

  it('should support postmessage target', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => `content for ${name}`);
    const res = await PolyfillService.build('postmessage', {}, {} as any);
    expect(res).toContain('content for abstractionLayer.postmessage');
  });
});
