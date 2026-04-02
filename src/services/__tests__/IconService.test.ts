import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IconService } from '../IconService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('IconService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for undefined icons', async () => {
    expect(await IconService.getBestIconBase64('r', undefined)).toBeNull();
  });

  it('should select largest numeric size from object', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'));
    const icons = { '16': 's.png', '128': 'l.png', '48': 'm.png' };
    await IconService.getBestIconBase64('r', icons);
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('l.png'));
  });

  it('should handle string path and correct MIME types', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'));

    expect(await IconService.getBestIconBase64('r', 'icon.png')).toMatch(/^data:image\/png;base64,/);
    expect(await IconService.getBestIconBase64('r', 'icon.jpg')).toMatch(/^data:image\/jpeg;base64,/);
    expect(await IconService.getBestIconBase64('r', 'icon.ico')).toMatch(/^data:image\/x-icon;base64,/);
    expect(await IconService.getBestIconBase64('r', 'icon.svg')).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should prevent path traversal', async () => {
    const res = await IconService.getBestIconBase64('/root', '../../etc/passwd');
    expect(res).toBeNull();
  });
});
