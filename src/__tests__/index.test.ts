import { describe, it, expect, vi } from 'vitest';
import { convertExtension } from '../index.js';
import fs from 'fs-extra';
import { MigrationEngine } from '../core/MigrationEngine.js';
import { ConversionContext } from '../core/ConversionContext.js';

vi.mock('fs-extra');
vi.mock('../core/MigrationEngine.js');
vi.mock('../services/UnpackService.js');

describe('Main Entry Point', () => {
  it('should run the conversion engine', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

    const mockEngine = {
        addStep: vi.fn().mockReturnThis(),
        run: vi.fn().mockImplementation(async () => {
            // No-op
        })
    };
    vi.mocked(MigrationEngine).mockImplementation((ctx: any) => {
        // Populate context state so convertExtension can read it
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
    expect(res.extension.name).toBe('test');
  });
});
