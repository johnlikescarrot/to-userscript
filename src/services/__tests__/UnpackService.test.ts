import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import fs from 'fs-extra';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({
  default: { dirSync: () => ({ name: '/tmp/test-unpack' }) },
  dirSync: () => ({ name: '/tmp/test-unpack' })
}));

describe('UnpackService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should unpack directory and file entries with correct paths', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn((e, cb) => {
        const s = new Readable({ read() { this.push('d'); this.push(null); } });
        cb(null, s);
    });

    vi.mocked(yauzl.open).mockImplementation((p, o, cb) => process.nextTick(() => cb(null, mockZip)));
    const p = UnpackService.unpack('t.zip');
    await new Promise(r => process.nextTick(r));

    mockZip.emit('entry', { fileName: 'dir/' });
    expect(fs.mkdirpSync).toHaveBeenCalledWith('/tmp/test-unpack/dir');

    const mockWs = new PassThrough();
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWs as any);
    mockZip.emit('entry', { fileName: 'f.txt' });
    process.nextTick(() => { mockWs.emit('close'); mockZip.emit('close'); });
    expect(await p).toBe('/tmp/test-unpack');
  });

  it('should handle traversal, open errors, and zip errors', async () => {
    vi.mocked(yauzl.open).mockImplementation((p, o, cb) => cb(new Error('open fail')));
    await expect(UnpackService.unpack('t.zip')).rejects.toThrow('open fail');

    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    vi.mocked(yauzl.open).mockImplementation((p, o, cb) => process.nextTick(() => cb(null, mockZip)));
    const p1 = UnpackService.unpack('t.zip');
    await new Promise(r => process.nextTick(r));
    mockZip.emit('entry', { fileName: '../../etc/passwd' });
    await expect(p1).rejects.toThrow('traversal');

    const p2 = UnpackService.unpack('t.zip');
    await new Promise(r => process.nextTick(r));
    mockZip.emit('error', new Error('zip fail'));
    await expect(p2).rejects.toThrow('zip fail');
  });
});
