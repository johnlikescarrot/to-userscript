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

  it('should run the conversion engine for directory source', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'test', version: '1', description: '', raw: {} });
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

  it('should unpack and run engine for file source', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any);
    vi.mocked(UnpackService.unpack).mockResolvedValue('/tmp/unpacked');
    vi.mocked(fs.remove).mockResolvedValue(undefined as never);

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'file-test', version: '1', description: '', raw: {} });
        ctx.set('resources', { jsContents: {}, cssContents: {} });
        ctx.set('assetMap', {});
        return mockEngine as any;
    });

    const res = await convertExtension({
        inputDir: 'archive.zip',
        outputFile: 'out.js',
        target: 'userscript'
    } as any);

    expect(res.success).toBe(true);
    expect(UnpackService.unpack).toHaveBeenCalledWith('archive.zip');
    expect(fs.remove).toHaveBeenCalledWith('/tmp/unpacked');
  });

  it('should handle missing inputDir', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'missing', version: '1', raw: {} });
        ctx.set('resources', { jsContents: {}, cssContents: {} });
        ctx.set('assetMap', {});
        return mockEngine as any;
    });

    const res = await convertExtension({ inputDir: 'none', outputFile: 'out.js' } as any);
    expect(res.success).toBe(true);
  });
});
