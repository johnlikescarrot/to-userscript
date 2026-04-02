import { describe, it, expect, vi } from 'vitest';
import { IconService } from '../IconService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');

describe('IconService', () => {
  it('should hit non-numeric key fallback and missing path', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('data'));
    expect(await IconService.getBestIconBase64('r', { 'key': 'val.png' })).toBeDefined();

    vi.mocked(fs.pathExists).mockResolvedValue(false);
    expect(await IconService.getBestIconBase64('r', 'missing.png')).toBeNull();
  });
});
