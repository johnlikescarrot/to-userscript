import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCli } from '../index.js';
import { DownloadService } from '../../services/DownloadService.js';
import { convertExtension } from '../../index.js';
import fs from 'fs-extra';

vi.mock('../../services/DownloadService.js');
vi.mock('../../index.js');
vi.mock('fs-extra', () => ({
  default: {
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('chalk', () => {
    const fn: any = vi.fn((s: any) => s);
    fn.blue = Object.assign(vi.fn((s: any) => s), { bold: vi.fn((s: any) => s) });
    fn.green = Object.assign(vi.fn((s: any) => s), { bold: vi.fn((s: any) => s) });
    fn.red = Object.assign(vi.fn((s: any) => s), { bold: vi.fn((s: any) => s) });
    fn.white = Object.assign(vi.fn((s: any) => s), { italic: vi.fn((s: any) => s) });
    fn.bold = vi.fn((s: any) => s);
    fn.italic = vi.fn((s: any) => s);
    return { default: fn };
});

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should run convert command for local directory', async () => {
    await createCli(['node', 'script', 'convert', './dir', '-o', 'out.js']).parse();
    expect(convertExtension).toHaveBeenCalled();
  });

  it('should run convert command for Chrome Store URL', async () => {
    vi.mocked(DownloadService.getCrxUrl).mockReturnValue('http://crx.url');
    vi.mocked(DownloadService.download).mockResolvedValue('temp.zip');
    await createCli(['node', 'script', 'convert', 'https://chromewebstore.google.com/detail/abc', '-o', 'out.js']).parse();
    expect(DownloadService.getCrxUrl).toHaveBeenCalled();
  });

  it('should run convert command for other URL', async () => {
      vi.mocked(DownloadService.download).mockResolvedValue('temp.zip');
      await createCli(['node', 'script', 'convert', 'http://other.url/ext.zip', '-o', 'out.js']).parse();
      expect(DownloadService.getCrxUrl).not.toHaveBeenCalled();
  });

  it('should handle convert errors', async () => {
    vi.mocked(convertExtension).mockRejectedValue(new Error('Fail'));
    await createCli(['node', 'script', 'convert', './dir']).parse();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should run download command with ID', async () => {
    vi.mocked(DownloadService.getCrxUrl).mockReturnValue('http://crx.url');
    await createCli(['node', 'script', 'download', 'abc']).parse();
    expect(DownloadService.getCrxUrl).toHaveBeenCalled();
  });

  it('should run download command with direct URL', async () => {
      await createCli(['node', 'script', 'download', 'http://example.com/ext.zip']).parse();
      expect(DownloadService.getCrxUrl).not.toHaveBeenCalled();
  });

  it('should run require command', async () => {
    await createCli(['node', 'script', 'require', 'myscript.user.js']).parse();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@require'));
  });
});
