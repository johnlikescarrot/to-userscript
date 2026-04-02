import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import fs from 'fs-extra';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({
  default: {
    dirSync: () => ({ name: '/tmp/test-unpack' })
  },
  dirSync: () => ({ name: '/tmp/test-unpack' })
}));

describe('UnpackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unpack a valid zip file with files and directories', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn((entry, cb) => {
        const stream = new Readable({
          read() {
            this.push('content');
            this.push(null);
          }
        });
        cb(null, stream);
    });

    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });

    const unpackPromise = UnpackService.unpack('test.zip');

    await new Promise(resolve => process.nextTick(resolve));

    // Emit a directory entry
    mockZip.emit('entry', { fileName: 'subdir/' });
    expect(fs.mkdirpSync).toHaveBeenCalled();

    // Emit a file entry
    const mockWriteStream = new PassThrough();
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

    mockZip.emit('entry', { fileName: 'file.txt' });

    // Simulate stream finish
    process.nextTick(() => {
        mockWriteStream.emit('close');
        mockZip.emit('close');
    });

    const res = await unpackPromise;
    expect(res).toBe('/tmp/test-unpack');
  });

  it('should detect path traversal attacks', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });

    const p = UnpackService.unpack('test.zip');
    await new Promise(resolve => process.nextTick(resolve));

    mockZip.emit('entry', { fileName: '../../etc/passwd' });

    await expect(p).rejects.toThrow('Potential path traversal attack detected');
  });

  it('should handle yauzl open errors', async () => {
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(new Error('open failed')));
    });
    await expect(UnpackService.unpack('test.zip')).rejects.toThrow('open failed');
  });

  it('should handle yauzl zip errors', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
      process.nextTick(() => cb(null, mockZip));
    });
    const p = UnpackService.unpack('test.zip');
    await new Promise(resolve => process.nextTick(resolve));

    mockZip.emit('error', new Error('zip error'));
    await expect(p).rejects.toThrow('zip error');
  });
});
