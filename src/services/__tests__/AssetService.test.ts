import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../AssetService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hit all branches including CSS and HTML', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(((p: any) => {
        if (p.endsWith('.html')) return Promise.resolve('<html><img src="img.png"><img src=noquote.png><img src=""><link href="style.css"></html>');
        if (p.endsWith('.css')) return Promise.resolve('body { background: url("bg.jpg"); }');
        return Promise.resolve(Buffer.from('data'));
    }) as any);

    const m: any = {
        manifest_version: 3,
        action: { default_popup: 'p.html' },
        web_accessible_resources: [{ resources: ['res.png'] }]
    };
    await AssetService.generateAssetMap('r', m);

    expect(AssetService.getMimeType('a.html')).toBe('text/html');
    expect(AssetService.getMimeType('a.css')).toBe('text/css');
    expect(AssetService.getMimeType('a.unknown')).toBe('application/octet-stream');
  });

  it('should handle all discovery paths', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readFile).mockResolvedValue('content' as any);

      const v2: any = {
          manifest_version: 2,
          options_ui: { page: 'o.html' },
          options_page: 'op.html',
          browser_action: { default_popup: 'b.html' },
          page_action: { default_popup: 'p.html' },
          web_accessible_resources: ['w.png']
      };
      await AssetService.generateAssetMap('r', v2);

      const v3: any = {
          manifest_version: 3,
          options_ui: { page: 'o3.html' },
          action: { default_popup: 'a3.html' },
          side_panel: { default_path: 's3.html' },
          web_accessible_resources: [{ resources: ['r3.png'] }]
      };
      await AssetService.generateAssetMap('r', v3);
  });
});
