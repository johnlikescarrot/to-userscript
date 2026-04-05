import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCli } from '../index.js';
import { convertExtension } from '../../index.js';
import { DownloadService } from '../../services/DownloadService.js';
import fs from 'fs-extra';

vi.mock('fs-extra');
vi.mock('../../index.js');
vi.mock('../../services/DownloadService.js');

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DownloadService.getLocalSourceFrom).mockResolvedValue({ path: 'test-path', isTemp: true });
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  });

  it('should run convert command for local directory', async () => {
    vi.mocked(DownloadService.getLocalSourceFrom).mockResolvedValue({ path: './dir', isTemp: false });
    const cli = createCli(['node', 'script', 'convert', './dir']);
    await cli.parseAsync();
    expect(convertExtension).toHaveBeenCalled();
  });

  it('should run convert command for Chrome Store URL', async () => {
    const cli = createCli(['node', 'script', 'convert', 'https://chromewebstore.google.com/detail/abc']);
    await cli.parseAsync();
    expect(DownloadService.getLocalSourceFrom).toHaveBeenCalledWith('https://chromewebstore.google.com/detail/abc');
    expect(convertExtension).toHaveBeenCalled();
  });

  it('should handle convert errors', async () => {
    vi.mocked(convertExtension).mockRejectedValue(new Error('Fail'));
    const cli = createCli(['node', 'script', 'convert', './dir']);
    await expect(cli.parseAsync()).rejects.toThrow();
  });

  it('should run download command with ID', async () => {
    const cli = createCli(['node', 'script', 'download', 'abc']);
    await cli.parseAsync();
    expect(DownloadService.getLocalSourceFrom).toHaveBeenCalledWith('abc');
    expect(fs.move).toHaveBeenCalled();
  });

  it('should run require command', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cli = createCli(['node', 'script', 'require', 'script.js']);
    await cli.parseAsync();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('// @require'));
    spy.mockRestore();
  });
});
  it('should run download command for local path', async () => {
    vi.mocked(DownloadService.getLocalSourceFrom).mockResolvedValue({ path: 'local.zip', isTemp: false });
    const cli = createCli(['node', 'script', 'download', 'local.zip']);
    await cli.parseAsync();
    expect(fs.copy).toHaveBeenCalled();
  });
