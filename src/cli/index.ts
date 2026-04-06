#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { pathToFileURL } from 'url';
import os from 'os';
import fs from 'fs-extra';
import chalk from 'chalk';
import { convertExtension } from '../index.js';
import { DownloadService } from '../services/DownloadService.js';

type SourceType = 'localPath' | 'chromeWebStoreListing' | 'directUrl' | 'unknown';

function parseExtensionSource(source: string): { type: SourceType; url?: string } {
  try {
    const url = new URL(source);
    // Explicit hostname validation to prevent spoofing
    if (url.hostname === 'chromewebstore.google.com' ||
       (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
      return { type: 'chromeWebStoreListing', url: DownloadService.getCrxUrl(source) };
    }
    return { type: 'directUrl', url: source };
  } catch (e) {
    // Alphanumeric 32-char ID check (case-insensitive)
    if (source.length === 32 && /^[a-z0-9]{32}$/i.test(source)) {
      return { type: 'chromeWebStoreListing', url: DownloadService.getCrxUrl(source) };
    }
    return { type: 'localPath' };
  }
}

const parser = yargs(hideBin(process.argv))
  .scriptName('to-userscript')
  .usage('$0 <command> [options]')
  .command(
    'convert <source>',
    'Convert an extension to a userscript',
    (yargs) => {
      return yargs
        .positional('source', {
          describe: 'Extension source (dir, archive, or URL)',
          type: 'string',
          demandOption: true,
        })
        .option('output', { alias: 'o', type: 'string' })
        .option('target', { alias: 't', choices: ['userscript', 'vanilla'] as const, default: 'userscript' as const })
        .option('minify', { type: 'boolean', default: false })
        .option('beautify', { type: 'boolean', default: false })
        .option('force', { alias: 'f', type: 'boolean', default: false });
    },
    async (argv) => {
      let source = argv.source as string;
      let tempDir: string | null = null;

      try {
        const parsed = parseExtensionSource(source);
        if (parsed.url) {
          console.log(chalk.blue('Downloading extension...'));
          tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'to-userscript-'));
          const tempFilePath = path.join(tempDir, 'extension.zip');
          source = await DownloadService.download(parsed.url, tempFilePath);
        }

        await convertExtension({
          inputDir: path.resolve(source),
          outputFile: path.resolve(argv.output as string || 'extension.user.js'),
          target: argv.target,
          minify: argv.minify,
          beautify: argv.beautify,
          force: argv.force,
        });
        console.log(chalk.green.bold('\n✨ Conversion successful!'));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red.bold('\n❌ Conversion failed:'), msg);
        throw error;
      } finally {
        if (tempDir) {
          await fs.remove(tempDir).catch(() => {});
        }
      }
    }
  )
  .command(
    'download <source>',
    'Download an extension archive',
    (yargs) => yargs.positional('source', { type: 'string', demandOption: true }),
    async (argv) => {
      try {
        const source = argv.source as string;
        const parsed = parseExtensionSource(source);

        if (parsed.type === 'localPath') {
            throw new Error('Local paths are not supported by the download command. Please provide a URL or extension ID.');
        }

        const url = parsed.url || source;
        const dest = path.resolve(process.cwd(), 'extension.zip');
        await DownloadService.download(url, dest);
        console.log(chalk.green('Downloaded to:'), dest);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red.bold('\n❌ Download failed:'), msg);
        process.exit(1);
      }
    }
  )
  .command(
    'require <userscript>',
    'Generate a metadata block with @require',
    (yargs) => yargs.positional('userscript', { type: 'string', demandOption: true }),
    async (argv) => {
      try {
        const filePath = path.resolve(argv.userscript as string);
        if (!(await fs.pathExists(filePath))) {
            throw new Error(`File not found: ${filePath}`);
        }
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            throw new Error(`Expected a file but found a directory: ${filePath}`);
        }
        const fileUrl = pathToFileURL(filePath).href;
        console.log('// ==UserScript==');
        console.log('// @name        Requirement');
        console.log(`// @require     ${fileUrl}`);
        console.log('// ==/UserScript==');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red.bold('\n❌ Error:'), msg);
        process.exit(1);
      }
    }
  )
  .help().alias('h', 'help');

async function run() {
    try {
        await parser.parseAsync();
    } catch (err) {
        process.exit(1);
    }
}

const mainFile = process.argv[1];
if (mainFile && (import.meta.url === pathToFileURL(mainFile).href || mainFile.endsWith('to-userscript'))) {
    run();
}
