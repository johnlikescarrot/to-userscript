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
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false, size: 100 } as any);
    vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => false } as any); // inputDir
    vi.mocked(fs.stat).mockResolvedValueOnce({ size: 100 } as any); // outputFile

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {})
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        ctx.set('manifest', { name: 'test', version: '1', description: '', background_scripts: [] });
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
  });
});
