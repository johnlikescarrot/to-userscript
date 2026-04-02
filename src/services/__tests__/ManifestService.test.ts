import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('ManifestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cover all branches in V2 and V3', async () => {
      const v2: any = {
          manifest_version: 2,
          name: 'V2',
          version: '1',
          permissions: ['p'],
          optional_permissions: ['o'],
          browser_action: { default_popup: 'b.html', default_icon: 'i.png' },
          options_ui: { page: 'o.html' },
          background: { scripts: ['bg.js'] },
          content_scripts: [{ matches: ['*://*/*'], js: ['j.js'], css: ['c.css'] }]
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v2) as any);
      const m2 = await ManifestService.load('m2.json');
      expect(m2.permissions).toHaveLength(2);

      const v2p: any = {
          manifest_version: 2,
          name: 'V2P',
          version: '1',
          page_action: { default_popup: 'p.html' },
          options_page: 'op.html'
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v2p) as any);
      const m2p = await ManifestService.load('m2p.json');
      expect(m2p.action.default_popup).toBe('p.html');
      expect(m2p.options_page).toBe('op.html');

      const v3: any = {
          manifest_version: 3,
          name: 'V3',
          version: '1',
          permissions: ['p'],
          optional_permissions: ['o'],
          host_permissions: ['h'],
          action: { default_popup: 'a.html', default_icon: 'i.png' },
          background: { service_worker: 'sw.js' },
          options_ui: { page: 'ou.html' },
          side_panel: { default_path: 's.html' },
          web_accessible_resources: [{ resources: ['r'] }],
          content_scripts: [{ matches: ['*://*/*'], js: ['j.js'] }, { matches: ['*://*/*'], css: ['c.css'] }]
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(v3) as any);
      const m3 = await ManifestService.load('v3.json');
      expect(m3.permissions).toHaveLength(3);
  });

  it('should handle missing fields', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ manifest_version: 3, name: 'Min', version: '1' }) as any);
      const m = await ManifestService.load('min.json');
      expect(m.permissions).toEqual([]);
  });

  it('should handle missing background and optional fields in V2', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ manifest_version: 2, name: 'V2Min', version: '1' }) as any);
      await ManifestService.load('v2m.json');
  });

  it('should handle content scripts with mixed js/css', async () => {
      const m = {
          manifest_version: 3,
          name: 'CS',
          version: '1',
          content_scripts: [
              { matches: ['*://*/*'], js: ['j.js'] },
              { matches: ['*://*/*'], css: ['c.css'] }
          ]
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(m) as any);
      await ManifestService.load('cs.json');
  });
});
