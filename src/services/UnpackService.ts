import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import tmp from 'tmp';

export class UnpackService {
  static async unpack(archivePath: string): Promise<string> {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const absoluteTmpDir = path.resolve(tmpDir);

    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          // P1: Use path.relative for robust path traversal protection
          const dest = path.resolve(path.join(absoluteTmpDir, entry.fileName));
          const relative = path.relative(absoluteTmpDir, dest);

          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            return reject(new Error(`Potential path traversal attack detected in ZIP entry: ${entry.fileName}`));
          }

          if (/\/$/.test(entry.fileName)) {
            fs.mkdirpSync(dest);
            zipfile.readEntry();
          } else {
            fs.mkdirpSync(path.dirname(dest));
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);

              const writeStream = fs.createWriteStream(dest);

              readStream.on('error', (err) => reject(err));
              writeStream.on('error', (err) => reject(err));

              readStream.pipe(writeStream);
              writeStream.on('close', () => zipfile.readEntry());
            });
          }
        });
        zipfile.on('close', () => resolve(absoluteTmpDir));
        zipfile.on('error', (err) => reject(err));
      });
    });
  }
}
