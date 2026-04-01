import fetch from 'node-fetch';
import fs from 'fs-extra';
import { resolve } from 'path';

export class DownloadService {
  static async download(url: string, dest: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    await fs.outputFile(resolve(dest), Buffer.from(buffer));
    return dest;
  }

  static getCrxUrl(idOrUrl: string): string {
    const idMatch = idOrUrl.match(/([a-z0-9]{32})/i);
    if (!idMatch) throw new Error(`Invalid Chrome extension ID: ${idOrUrl}`);
    const id = encodeURIComponent(idMatch[1]);
    return `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3D${id}%26uc`;
  }
}
