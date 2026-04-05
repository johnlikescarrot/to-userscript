import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolyfillService } from '../PolyfillService.js';
import { TemplateService } from '../TemplateService.js';

vi.mock('../TemplateService.js');

describe('PolyfillService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build the polyfill and use manifest name for script ID', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return 'ID: {{SCRIPT_ID}} MANIFEST: {{INJECTED_MANIFEST}}';
        return `content of ${name}`;
    });

    const manifest: any = { name: 'Transcendent-Extension', version: '1' };
    const res = await PolyfillService.build('userscript', {}, manifest);

    expect(res).toContain('ID: transcendent-extension');
    expect(res).toContain('MANIFEST: {"name":"Transcendent-Extension"');
    expect(res).toContain('content of abstractionLayer.userscript');
  });

  it('should build with meaningful properties for vanilla and postmessage', async () => {
    vi.mocked(TemplateService.load).mockImplementation(async (name: string) => {
        if (name === 'polyfill') return 'IS_IFRAME: {{IS_IFRAME}}';
        return `content: ${name}`;
    });

    const manifest: any = { name: 'test' };

    const resVanilla = await PolyfillService.build('vanilla', {}, manifest);
    expect(resVanilla).toContain('IS_IFRAME: false');
    expect(resVanilla).toContain('content: abstractionLayer.vanilla');

    const resPost = await PolyfillService.build('postmessage', {}, manifest);
    expect(resPost).toContain('IS_IFRAME: true');
    expect(resPost).toContain('content: abstractionLayer.postmessage');
  });
});
