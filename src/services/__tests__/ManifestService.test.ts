import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';
import { LocaleService } from '../LocaleService.js';

vi.mock('fs-extra');
vi.mock('../LocaleService.js');

describe('ManifestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle MV2 page_action and background scripts', async () => {
    const mock = {
      manifest_version: 2, name: 'n', version: '1',
      page_action: { default_popup: 'p.html' },
      background: { scripts: ['b.js'] }
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mock));
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    const res = await ManifestService.load('m.json');
    expect(res.action.default_popup).toBe('p.html');
    expect(res.background_scripts).toEqual(['b.js']);
  });

  it('should hit default_locale branch', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
        manifest_version: 2, name: 'n', version: '1', default_locale: 'en'
    }));
    vi.mocked(LocaleService.loadMessages).mockResolvedValue({});
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    await ManifestService.load('m.json');
    expect(LocaleService.loadMessages).toHaveBeenCalled();
  });

  it('should hit MV3 action and background branches', async () => {
    const mock = {
        manifest_version: 3, name: 'n', version: '1',
        action: { default_popup: 'p3.html' },
        background: { service_worker: 'sw.js' },
        web_accessible_resources: [{ resources: ['r.js'] }]
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mock));
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    const res = await ManifestService.load('m.json');
    expect(res.background_scripts).toEqual(['sw.js']);
    expect(res.action.default_popup).toBe('p3.html');
  });
});
