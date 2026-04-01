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
          // P0: Validate ZIP entry paths to prevent path traversal
          const dest = path.normalize(path.join(absoluteTmpDir, entry.fileName));
          if (!dest.startsWith(absoluteTmpDir)) {
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

              // P1: Handle read/write stream errors
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
