import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../AssetService.js';
import fs from 'fs-extra';
import { Manifest } from '../../schemas/ManifestSchema.js';

vi.mock('fs-extra');

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate asset map and discover assets in HTML/CSS', async () => {
    const manifest: Manifest = {
      manifest_version: 2,
      name: 'Test',
      version: '1',
      options_page: 'options.html',
      web_accessible_resources: ['web.png']
    };

    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockImplementation((filePath: any) => {
      if (filePath.endsWith('options.html')) return Promise.resolve('<html><img src="img.png"></html>') as any;
      if (filePath.endsWith('img.png')) return Promise.resolve(Buffer.from('img')) as any;
      if (filePath.endsWith('web.png')) return Promise.resolve(Buffer.from('web')) as any;
      return Promise.resolve('') as any;
    });

    const assetMap = await AssetService.generateAssetMap('root', manifest);
    expect(assetMap['options.html']).toBe('<html><img src="img.png"></html>');
    expect(assetMap['img.png']).toBe(Buffer.from('img').toString('base64'));
    expect(assetMap['web.png']).toBe(Buffer.from('web').toString('base64'));
  });

  it('should handle CSS url assets', async () => {
    const manifest: Manifest = {
      manifest_version: 3,
      name: 'Test',
      version: '1',
      action: { default_popup: 'popup.html' }
    };

    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockImplementation((filePath: any) => {
      if (filePath.endsWith('popup.html')) return Promise.resolve('<link rel="stylesheet" href="style.css">') as any;
      if (filePath.endsWith('style.css')) return Promise.resolve('body { background: url("bg.jpg"); }') as any;
      if (filePath.endsWith('bg.jpg')) return Promise.resolve(Buffer.from('bg')) as any;
      return Promise.resolve('') as any;
    });

    const assetMap = await AssetService.generateAssetMap('root', manifest);
    expect(assetMap['bg.jpg']).toBe(Buffer.from('bg').toString('base64'));
  });

  it('should ignore external URLs', async () => {
    const manifest: Manifest = {
      manifest_version: 3,
      name: 'Test',
      version: '1',
      action: { default_popup: 'p.html' }
    };
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue('<img src="https://ext.com/a.png">');

    const assetMap = await AssetService.generateAssetMap('root', manifest);
    expect(Object.keys(assetMap)).toEqual(['p.html']);
  });

  it('should get correct mime types', () => {
    expect(AssetService.getMimeType('test.html')).toBe('text/html');
    expect(AssetService.getMimeType('test.png')).toBe('image/png');
    expect(AssetService.getMimeType('test.js')).toBe('text/javascript');
    expect(AssetService.getMimeType('test.css')).toBe('text/css');
    expect(AssetService.getMimeType('test.json')).toBe('application/json');
    expect(AssetService.getMimeType('test.svg')).toBe('image/svg+xml');
    expect(AssetService.getMimeType('unknown')).toBe('application/octet-stream');
  });
});
