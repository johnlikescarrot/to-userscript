import { describe, it, expect, vi } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import { EventEmitter } from 'events';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({
    default: { dirSync: () => ({ name: '/tmp' }) },
    dirSync: () => ({ name: '/tmp' })
}));

describe('UnpackService', () => {
  it('should unpack a valid zip file', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn(() => {
        process.nextTick(() => mockZip.emit('close'));
    });

    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
        cb(null, mockZip);
    });

    const res = await UnpackService.unpack('test.zip');
    expect(res).toBe('/tmp');
  });

  it('should detect path traversal', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();

    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
        cb(null, mockZip);
    });

    const p = UnpackService.unpack('test.zip');
    process.nextTick(() => mockZip.emit('entry', { fileName: '../../etc/passwd' }));

    await expect(p).rejects.toThrow('path traversal');
  });
});
