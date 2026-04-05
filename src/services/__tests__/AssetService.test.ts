import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '../AssetService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('AssetService', () => {
  it('should handle discovery and binary assets', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockImplementation((p: any) => {
        if (p.endsWith('.html')) return Promise.resolve('<html><img src="a.png"></html>') as any;
        if (p.endsWith('.css')) return Promise.resolve('body { background: url("b.png"); }') as any;
        return Promise.resolve(Buffer.from('bin')) as any;
    });

    const manifest: any = {
      manifest_version: 3,
      name: 'Test',
      action: { default_popup: 'popup.html' },
      web_accessible_resources: [{ resources: ['style.css'] }]
    };

    const map = await AssetService.generateAssetMap('root', manifest);
    expect(map["popup.html"]).toBe("<html><img src=\"a.png\"></html>");
    expect(map['popup.html']).toBeDefined();
    expect(map['style.css']).toBeDefined();
    expect(map['a.png']).toBe(Buffer.from('bin').toString('base64'));
    expect(map['b.png']).toBeDefined();
  });

  it('should skip duplicate and missing files', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      const map = await AssetService.generateAssetMap('root', { manifest_version: 3, name: 'T' } as any);
      expect(Object.keys(map)).toHaveLength(0);
  });
});
