import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import tmp from 'tmp';

export class UnpackService {
  static async unpack(archivePath: string): Promise<string> {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          const dest = path.join(tmpDir, entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            fs.mkdirpSync(dest);
            zipfile.readEntry();
          } else {
            fs.mkdirpSync(path.dirname(dest));
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);
              const writeStream = fs.createWriteStream(dest);
              readStream.pipe(writeStream);
              writeStream.on('close', () => zipfile.readEntry());
            });
          }
        });
        zipfile.on('close', () => resolve(tmpDir));
      });
    });
  }
}
