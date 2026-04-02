import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { TemplateService } from '../TemplateService.js';

vi.mock('../TemplateService.js');

describe('PolyfillService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build the polyfill string for userscript', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return '{{SCRIPT_ID}} {{INJECTED_MANIFEST}} getURL: (path) => ...,';
        return `content of ${name}`;
    });

    const manifest: any = { name: 'test', version: '1' };
    const res = await PolyfillService.build('userscript', {}, manifest);

    expect(res).toContain('test');
    expect(res).toContain('content of abstractionLayer.userscript');
    expect(res).toContain('content of messaging');
    expect(res).toContain('getURL');
  });

  it('should build for vanilla and postmessage', async () => {
    vi.mocked(TemplateService.load).mockResolvedValue('template content');

    const manifest: any = { name: 'test' };

    const resVanilla = await PolyfillService.build('vanilla', {}, manifest);
    expect(resVanilla).toBeDefined();

    const resPost = await PolyfillService.build('postmessage', {}, manifest);
    expect(resPost).toBeDefined();
  });

  it('should handle template replacement for manifest', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return '{{INJECTED_MANIFEST}}';
        return '';
    });
    const manifest: any = { name: 'Injection' };
    const res = await PolyfillService.build('userscript', {}, manifest);
    expect(res).toContain('Injection');
  });
});
