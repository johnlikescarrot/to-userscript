import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';
import { LocaleService } from '../LocaleService.js';

vi.mock('fs-extra');
vi.mock('../LocaleService.js');

describe('ManifestService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should load MV2 manifest with all options', async () => {
    const mock = { manifest_version: 2, name: 'n', version: '1', browser_action: { default_popup: 'p.html' }, options_ui: { page: 'o.html' }, web_accessible_resources: ['r.js'] };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mock));
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    const res = await ManifestService.load('m.json');
    expect(res.options_page).toBe('o.html');
  });

  it('should load MV3 manifest and flatten resources', async () => {
    const mock = { manifest_version: 3, name: 'n', version: '1', action: { default_popup: 'p.html' }, background: { service_worker: 'sw.js' }, web_accessible_resources: [{ resources: ['r.js'] }] };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mock));
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    const res = await ManifestService.load('m.json');
    expect(res.background_scripts).toEqual(['sw.js']);
  });

  it('should generate ID', () => {
    expect(ManifestService.getInternalId({ name: 'A B C' })).toBe('a-b-c');
  });
});
