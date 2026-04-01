import { describe, it, expect, vi } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('ManifestService', () => {
  it('should load and parse a valid Manifest V2', async () => {
    const mockManifest = {
      manifest_version: 2,
      name: 'Test Extension',
      version: '1.0.0',
      content_scripts: [
        {
          matches: ['*://*.google.com/*'],
          js: ['script.js']
        }
      ]
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockManifest));

    const manifest = await ManifestService.load('manifest.json');
    expect(manifest.name).toBe('Test Extension');
    expect(manifest.manifest_version).toBe(2);
    expect(manifest.content_scripts?.[0].js?.[0]).toBe('script.js');
  });

  it('should filter out content scripts without matches or assets', async () => {
    const mockManifest = {
      manifest_version: 3,
      name: 'Test V3',
      version: '1.0.0',
      content_scripts: [
        { matches: [] }, // Invalid
        { js: ['only.js'] }, // Invalid (no matches)
        { matches: ['*://*/*'], js: ['valid.js'] } // Valid
      ]
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockManifest));

    const manifest = await ManifestService.load('manifest.json');
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts?.[0].js?.[0]).toBe('valid.js');
  });

  it('should generate a consistent internal ID', () => {
    const manifest: any = { name: 'My Awesome Extension!! ' };
    expect(ManifestService.getInternalId(manifest)).toBe('my-awesome-extension');
  });
});
