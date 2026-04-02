import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestService } from '../ManifestService.js';
import fs from 'fs-extra';
import { LocaleService } from '../LocaleService.js';

vi.mock('fs-extra');
vi.mock('../LocaleService.js');

describe('ManifestService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should cover all version and component branches', async () => {
    // MV2
    const mv2 = { manifest_version: 2, name: 'n', version: '1', page_action: { default_popup: 'p.html' }, options_page: 'o.html', web_accessible_resources: ['r'] };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mv2));
    vi.mocked(LocaleService.replaceInObject).mockImplementation(o => o);
    const r2 = await ManifestService.load('m.json');
    expect(r2.action.default_popup).toBe('p.html');

    // MV3
    const mv3 = { manifest_version: 3, name: 'n', version: '1', action: { default_popup: 'p3.html' }, background: { service_worker: 'sw.js' }, web_accessible_resources: [{ resources: ['r3'] }] };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mv3));
    const r3 = await ManifestService.load('m.json');
    expect(r3.action.default_popup).toBe('p3.html');

    // Localization error
    vi.mocked(LocaleService.loadMessages).mockRejectedValue(new Error('fail'));
    const re = await ManifestService.load('m.json', 'en');
    expect(re.name).toBe('n');
  });

  it('should generate ID', () => {
    expect(ManifestService.getInternalId({ name: 'A-B' })).toBe('a-b');
  });
});
