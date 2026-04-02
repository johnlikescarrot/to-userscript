import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IconService } from '../IconService.js';
import fs from 'fs-extra';
import path from 'path';

vi.mock('fs-extra');

describe('IconService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should handle complex icon selection and errors', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('d'));

    // Numeric sort check
    await IconService.getBestIconBase64('r', { '16': 's.png', '48': 'm.png' });
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('m.png'));

    // Non-numeric fallback
    await IconService.getBestIconBase64('r', { 'foo': 'bar.png' });
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('bar.png'));

    // Traversal
    expect(await IconService.getBestIconBase64('/r', '../evil.png')).toBeNull();

    // Read error
    vi.mocked(fs.readFile).mockRejectedValue(new Error('fail'));
    expect(await IconService.getBestIconBase64('r', 'bad.png')).toBeNull();
  });
});
