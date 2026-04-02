import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import { EventEmitter } from 'events';
import fs from 'fs-extra';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({
    default: {
        dirSync: vi.fn().mockReturnValue({ name: '/tmp/dir' })
    }
}));

describe('UnpackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unpack files and directories', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn();

    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);

    const p = UnpackService.unpack('test.zip');

    mockZip.emit('entry', { fileName: 'folder/' });
    expect(fs.mkdirpSync).toHaveBeenCalled();

    const mockFileStream = new EventEmitter() as any;
    mockFileStream.pipe = vi.fn();
    mockZip.openReadStream.mockImplementation(((e: any, cb: any) => cb(null, mockFileStream)) as any);

    const mockWriteStream = new EventEmitter() as any;
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

    mockZip.emit('entry', { fileName: 'file.txt' });

    process.nextTick(() => {
        mockWriteStream.emit('close');
        mockZip.emit('close');
    });

    const res = await p;
    expect(res).toBe('/tmp/dir');
  });

  it('should handle open error', async () => {
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(new Error('Open failed'))) as any);
    await expect(UnpackService.unpack('test.zip')).rejects.toThrow('Open failed');
  });

  it('should handle path traversal', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);
    const p = UnpackService.unpack('test.zip');
    mockZip.emit('entry', { fileName: '../../etc/passwd' });
    await expect(p).rejects.toThrow('path traversal');
  });

  it('should handle read stream error', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn();
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);
    const p = UnpackService.unpack('test.zip');
    const mockReadStream = new EventEmitter() as any;
    mockReadStream.pipe = vi.fn();
    mockZip.openReadStream.mockImplementation(((e: any, cb: any) => cb(null, mockReadStream)) as any);
    vi.mocked(fs.createWriteStream).mockReturnValue(new EventEmitter() as any);
    mockZip.emit('entry', { fileName: 'fail.txt' });
    process.nextTick(() => mockReadStream.emit('error', new Error('Read error')));
    await expect(p).rejects.toThrow('Read error');
  });

  it('should handle write stream error', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn();
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);
    const p = UnpackService.unpack('test.zip');
    const mockReadStream = new EventEmitter() as any;
    mockReadStream.pipe = vi.fn();
    const mockWriteStream = new EventEmitter() as any;
    mockZip.openReadStream.mockImplementation(((e: any, cb: any) => cb(null, mockReadStream)) as any);
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
    mockZip.emit('entry', { fileName: 'fail_write.txt' });
    process.nextTick(() => mockWriteStream.emit('error', new Error('Write error')));
    await expect(p).rejects.toThrow('Write error');
  });

  it('should handle zip error', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);
    const p = UnpackService.unpack('test.zip');
    process.nextTick(() => mockZip.emit('error', new Error('Zip failed')));
    await expect(p).rejects.toThrow('Zip failed');
  });

  it('should handle openReadStream error', async () => {
    const mockZip = new EventEmitter() as any;
    mockZip.readEntry = vi.fn();
    mockZip.openReadStream = vi.fn();
    vi.mocked(yauzl.open).mockImplementation(((p: any, o: any, cb: any) => cb(null, mockZip)) as any);
    mockZip.openReadStream.mockImplementation(((e: any, cb: any) => cb(new Error('Stream failed'))) as any);
    const p = UnpackService.unpack('test.zip');
    mockZip.emit('entry', { fileName: 'file.txt' });
    await expect(p).rejects.toThrow('Stream failed');
  });
});
