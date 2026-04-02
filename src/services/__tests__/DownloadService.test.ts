import { describe, it, expect, vi } from 'vitest';
import { DownloadService } from '../DownloadService.js';
import fetch from 'node-fetch';
import fs from 'fs-extra';

vi.mock('node-fetch');
vi.mock('fs-extra');

describe('DownloadService', () => {
  it('should download a file', async () => {
    const mockResp = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(Buffer.from('data'))
    };
    vi.mocked(fetch).mockResolvedValue(mockResp as any);

    await DownloadService.download('http://test.com', 'dest.zip');
    expect(fs.outputFile).toHaveBeenCalled();
  });

  it('should get correct CRX URL from ID', () => {
    const url = DownloadService.getCrxUrl('abcdefghijklmnopqrstuvwxyz123456');
    expect(url).toContain('abcdefghijklmnopqrstuvwxyz123456');
  });

  it('should throw on invalid ID', () => {
    expect(() => DownloadService.getCrxUrl('short')).toThrow();
  });
});

  it('should throw on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Not Found' } as any);
    await expect(DownloadService.download('http://bad.url', 'dest')).rejects.toThrow('Failed to download: Not Found');
  });
