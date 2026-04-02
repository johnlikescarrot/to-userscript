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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockZip() {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn((entry, cb) => {
        const stream = new Readable({
          read() { this.push('data'); this.push(null); }
        });
        cb(null, stream);
    });
    return mockZip;
  }

  it('should unpack directory and file entries', async () => {
    const mockZip = createMockZip();
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });

    const p = UnpackService.unpack('test.zip');
    await new Promise(r => process.nextTick(r));

    // Dir entry
    mockZip.emit('entry', { fileName: 'subdir/' });
    expect(fs.mkdirpSync).toHaveBeenCalled();

    // File entry
    const mockWriteStream = new PassThrough();
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
    mockZip.emit('entry', { fileName: 'file.txt' });

    process.nextTick(() => {
        mockWriteStream.emit('close');
        mockZip.emit('close');
    });

    const res = await p;
    expect(res).toBe('/tmp/test-unpack');
  });

  it('should detect path traversal', async () => {
    const mockZip = createMockZip();
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });

    const p = UnpackService.unpack('test.zip');
    await new Promise(r => process.nextTick(r));
    mockZip.emit('entry', { fileName: '../../etc/passwd' });

    await expect(p).rejects.toThrow('Potential path traversal attack detected');
  });

  it('should handle zip error', async () => {
    const mockZip = createMockZip();
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });
    const p = UnpackService.unpack('test.zip');
    await new Promise(r => process.nextTick(r));
    mockZip.emit('error', new Error('zip fail'));
    await expect(p).rejects.toThrow('zip fail');
  });
});
