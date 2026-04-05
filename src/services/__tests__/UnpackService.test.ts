import { describe, it, expect, vi } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import { EventEmitter } from 'events';
import fs from 'fs-extra';

vi.mock('yauzl');
vi.mock('fs-extra', () => ({
    default: {
        mkdirpSync: vi.fn(),
        createWriteStream: vi.fn(() => {
            const s = new EventEmitter() as any;
            s.write = vi.fn();
            s.end = vi.fn();
            return s;
        })
    }
}));
vi.mock('tmp', () => ({
    default: { dirSync: () => ({ name: '/tmp/dir' }) },
    dirSync: () => ({ name: '/tmp/dir' })
}));

describe('UnpackService', () => {
  it('should cover extraction loop and errors', async () => {
      const mockZip = new EventEmitter() as any;
      mockZip.readEntry = vi.fn();
      mockZip.openReadStream = vi.fn((entry, cb) => {
          const s = new EventEmitter() as any;
          s.pipe = vi.fn((dest) => {
              process.nextTick(() => dest.emit('close'));
              return dest;
          });
          cb(null, s);
          process.nextTick(() => {
              s.emit('close');
              mockZip.readEntry();
          });
      });
      vi.mocked(yauzl.open).mockImplementation((p, o, cb: any) => cb(null, mockZip));

      const p = UnpackService.unpack('t.zip');
      mockZip.emit('entry', { fileName: 'file.txt' });
      mockZip.emit('entry', { fileName: 'dir/' });
      process.nextTick(() => mockZip.emit('close'));
      await p;
      expect(mockZip.readEntry).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
      vi.mocked(yauzl.open).mockImplementation((p, o, cb: any) => cb(new Error('fail')));
      await expect(UnpackService.unpack('t.zip')).rejects.toThrow('fail');
  });
});
