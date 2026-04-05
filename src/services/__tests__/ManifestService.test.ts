import { describe, it, expect, vi } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('ManifestService', () => {
  it('should cover all branches in V2 and V3', async () => {
      const v2: any = {
          manifest_version: 2,
          name: 'v2',
          version: '1',
          permissions: ['p'],
          browser_action: { default_popup: 'p.html' }
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v2));
      const m2 = await ManifestService.load('m2.json');
      expect(m2.manifest_version).toBe(2);
      expect(m2.permissions).toContain('p');

      const v3: any = {
          manifest_version: 3,
          name: 'v3',
          version: '1',
          action: { default_popup: 'p.html' },
          host_permissions: ['hp'],
          background: { service_worker: 'sw.js' },
          web_accessible_resources: [{ resources: ['r.png'] }]
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v3));
      const m3 = await ManifestService.load('m3.json');
      expect(m3.manifest_version).toBe(3);
      expect(m3.permissions).toContain('hp');
      expect(m3.background_scripts).toContain('sw.js');
  });

  it('should handle missing fields', async () => {
      const min: any = { manifest_version: 3, name: 'm', version: '1' };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(min));
      const m = await ManifestService.load('min.json');
      expect(m.name).toBe('m');
      expect(m.permissions).toEqual([]);
  });

  it('should handle missing background and optional fields in V2', async () => {
      const v2: any = { manifest_version: 2, name: 'v2', version: '1' };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v2));
      const m = await ManifestService.load('v2.json');
      expect(m.background_scripts).toEqual([]);
  });

  it('should handle content scripts with mixed js/css', async () => {
      const cs: any = {
          manifest_version: 3,
          name: 'cs',
          version: '1',
          content_scripts: [{ matches: ['*://*/*'], js: ['a.js'], css: ['b.css'] }]
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cs));
      const m = await ManifestService.load('cs.json');
      expect(m.content_scripts[0].js).toContain('a.js');
      expect(m.content_scripts[0].css).toContain('b.css');
  });
});
