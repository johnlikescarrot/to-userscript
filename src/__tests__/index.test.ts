import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertExtension } from '../index.js';
import fs from 'fs-extra';
import { MigrationEngine } from '../core/MigrationEngine.js';
import { UnpackService } from '../services/UnpackService.js';

vi.mock('fs-extra');
vi.mock('../core/MigrationEngine.js');
vi.mock('../services/UnpackService.js');

describe('Main Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run conversion for a directory', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'test', version: '1', description: '' });
        ctx.set('resources', { jsContents: {}, cssContents: {} });
        ctx.set('assetMap', {});
        return mockEngine as any;
    });

    const res = await convertExtension({
        inputDir: 'dir',
        outputFile: 'out.js',
        target: 'userscript'
    } as any);

    expect(res.success).toBe(true);
    expect(UnpackService.unpack).not.toHaveBeenCalled();
  });

  it('should unpack and then run conversion for a file', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any);
    vi.mocked(UnpackService.unpack).mockResolvedValue('temp_dir');
    vi.mocked(fs.remove).mockResolvedValue(undefined);

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'test', version: '1', description: '' });
        ctx.set('resources', { jsContents: {}, cssContents: {} });
        ctx.set('assetMap', {});
        return mockEngine as any;
    });

    const res = await convertExtension({
        inputDir: 'ext.zip',
        outputFile: 'out.js',
        target: 'vanilla'
    } as any);

    expect(res.success).toBe(true);
    expect(UnpackService.unpack).toHaveBeenCalledWith('ext.zip');
    expect(fs.remove).toHaveBeenCalledWith('temp_dir');
  });

  it('should handle non-existent input dir', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    const mockEngine = { addStep: vi.fn().mockReturnThis(), run: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 't', version: '1', description: '' });
        ctx.set('resources', { jsContents: {}, cssContents: {} });
        ctx.set('assetMap', {});
        return mockEngine as any;
    });

    await convertExtension({ inputDir: 'none', outputFile: 'o', target: 'vanilla' } as any);
    expect(UnpackService.unpack).not.toHaveBeenCalled();
  });
});
