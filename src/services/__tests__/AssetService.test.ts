import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../AssetService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate asset map for text and binary files', async () => {
    const manifest: any = {
      manifest_version: 3,
      name: 'Test',
      version: '1',
      action: { default_popup: 'popup.html' },
      web_accessible_resources: [
        { resources: ['icon.png'] }
      ]
    };

    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);
    vi.mocked(fs.readdir).mockResolvedValue(['popup.html', 'icon.png'] as any);
    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.toString().endsWith('popup.html')) return Promise.resolve('<html></html>') as any;
      if (path.toString().endsWith('icon.png')) return Promise.resolve(Buffer.from('binary-data')) as any;
      return Promise.resolve('') as any;
    });

    const assetMap = await AssetService.generateAssetMap('root', manifest);

    expect(assetMap['popup.html']).toBe('<html></html>');
    expect(assetMap['icon.png']).toBe(Buffer.from('binary-data').toString('base64'));
  });

  it('should get correct mime types', () => {
    expect(AssetService.getMimeType('test.html')).toBe('text/html');
    expect(AssetService.getMimeType('test.png')).toBe('image/png');
    expect(AssetService.getMimeType('unknown.ext')).toBe('application/octet-stream');
  });
});
