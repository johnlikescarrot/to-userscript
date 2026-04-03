import { describe, it, expect, vi } from 'vitest';
import { UnpackService } from '../UnpackService.js';
import yauzl from 'yauzl';
import fs from 'fs-extra';
import { EventEmitter } from 'events';

vi.mock('yauzl');
vi.mock('fs-extra');
vi.mock('tmp', () => ({ default: { dirSync: () => ({ name: '/tmp' }) }, dirSync: () => ({ name: '/tmp' }) }));

describe('UnpackService', () => {
  it('should handle entries and streams', async () => {
      const zip = new EventEmitter();
      (zip as any).readEntry = vi.fn();
      vi.mocked(yauzl.open).mockImplementation((p, o, cb: any) => cb(null, zip));

      const p = UnpackService.unpack('a.zip');

      // Simulate Directory
      zip.emit('entry', { fileName: 'dir/' });
      expect(fs.mkdirpSync).toHaveBeenCalled();

      // Simulate File
      const rs = new EventEmitter();
      const ws = new EventEmitter();
      (rs as any).pipe = vi.fn();
      (zip as any).openReadStream = vi.fn((e, cb) => cb(null, rs));
      vi.mocked(fs.createWriteStream).mockReturnValue(ws as any);

      zip.emit('entry', { fileName: 'test.js' });
      ws.emit('close');
      expect(zip.readEntry).toHaveBeenCalled();

      // Final close
      zip.emit('close');
      const res = await p;
      expect(res).toBe('/tmp');
  });

  it('should handle traversal', async () => {
      const zip = new EventEmitter();
      (zip as any).readEntry = vi.fn();
      vi.mocked(yauzl.open).mockImplementation((p, o, cb: any) => cb(null, zip));
      const p = UnpackService.unpack('a.zip');
      zip.emit('entry', { fileName: '../../etc/passwd' });
      await expect(p).rejects.toThrow('path traversal');
  });
});
