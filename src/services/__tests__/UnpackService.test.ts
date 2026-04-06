import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import fs from 'fs-extra';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({
    default: { dirSync: () => ({ name: '/tmp/test' }) },
    dirSync: () => ({ name: '/tmp/test' })
}));

describe('UnpackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject potential path traversal attacks and stop extraction', async () => {
      const mockZip = new EventEmitter();
      (mockZip as any).readEntry = vi.fn();
      (mockZip as any).openReadStream = vi.fn();
      vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
          cb(null, mockZip);
      });

      const unpackPromise = UnpackService.unpack('attack.zip');
      // Emit malicious entry
      mockZip.emit('entry', { fileName: '../../etc/passwd' });

      await expect(unpackPromise).rejects.toThrow('Potential path traversal attack detected');

      // Verification: readEntry is only called once (initialization)
      expect(mockZip.readEntry).toHaveBeenCalledTimes(1);
      // Verification: openReadStream is NEVER called for malicious entries
      expect((mockZip as any).openReadStream).not.toHaveBeenCalled();
  });

  it('should advance ZIP loop driven by writeStream close events', async () => {
      const mockZip = new EventEmitter();
      const readEntrySpy = vi.fn();
      (mockZip as any).readEntry = readEntrySpy;

      vi.mocked(yauzl.open).mockImplementation((path: any, opts: any, cb: any) => {
          cb(null, mockZip);
      });

      const mockReadStream = new PassThrough();
      const mockWriteStream = new EventEmitter();
      (mockWriteStream as any).write = vi.fn().mockReturnValue(true);
      (mockWriteStream as any).end = vi.fn();

      vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
      (mockZip as any).openReadStream = vi.fn((entry, cb) => cb(null, mockReadStream));

      const unpackPromise = UnpackService.unpack('valid.zip');

      // Zip initializes with 1 readEntry call
      expect(readEntrySpy).toHaveBeenCalledTimes(1);

      // 1. Process directory entry
      mockZip.emit('entry', { fileName: 'dir/' });
      expect(fs.mkdirpSync).toHaveBeenCalledWith(expect.stringContaining('dir'));
      // Advancing from dir entry: calls readEntry
      expect(readEntrySpy).toHaveBeenCalledTimes(2);

      // 2. Process file entry
      mockZip.emit('entry', { fileName: 'file.txt' });
      expect(fs.createWriteStream).toHaveBeenCalled();

      // Advance by simulating stream completion (drives the loop)
      mockWriteStream.emit('close');
      expect(readEntrySpy).toHaveBeenCalledTimes(3);

      // 3. Close zip
      mockZip.emit('close');
      const result = await unpackPromise;
      expect(result).toBe('/tmp/test');
  });
});
