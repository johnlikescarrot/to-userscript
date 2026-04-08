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
  // Path detection: starts with dot, slash, contains separators, or matches Windows drive letters
  const isPathLike = source.startsWith('.') ||
                     source.startsWith('/') ||
                     source.includes('/') ||
                     source.includes('\\') ||
                     /^[a-zA-Z]:[\\/]/.test(source);

  try {
    const url = new URL(source);
    // If it's a valid URL but not http/https, we don't support it for download
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        // If it looks like a path (e.g. C:/...), treat it as localPath
        return isPathLike ? { type: 'localPath' } : { type: 'unknown' };
    }

    // Explicit hostname validation to prevent spoofing
    if (url.hostname === 'chromewebstore.google.com' ||
       (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
      // Allow getCrxUrl errors to propagate outside for better error reporting on malformed webstore URLs
      return { type: 'chromeWebStoreListing', url: DownloadService.getCrxUrl(source) };
    }
    return { type: 'directUrl', url: source };
  } catch (e) {
    // Not a valid URL
  }

  // Alphanumeric 32-char ID check (case-insensitive) for Chrome Web Store
  if (source.length === 32 && /^[a-z0-9]{32}$/i.test(source)) {
    return { type: 'chromeWebStoreListing', url: DownloadService.getCrxUrl(source) };
  }

  if (isPathLike) {
      return { type: 'localPath' };
  }

  return { type: 'unknown' };
}

export const parser = yargs(hideBin(process.argv))
  .scriptName('to-userscript')
  .usage('$0 <command> [options]')
  .strict()
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
        .option('output', { alias: 'o', type: 'string', describe: 'Output file path' })
        .option('target', { alias: 't', choices: ['userscript', 'vanilla'] as const, default: 'userscript' as const, describe: 'Conversion target' })
        .option('minify', { type: 'boolean', default: false, describe: 'Minify the output' })
        .option('beautify', { type: 'boolean', default: false, describe: 'Beautify the output' })
        .option('force', { alias: 'f', type: 'boolean', default: false, describe: 'Overwrite output if it exists' })
        .strict();
    },
    async (argv) => {
      let source = argv.source as string;
      let tempDir: string | null = null;

      try {
        // P1: Local path precedence. If the source exists locally, treat as localPath and skip download branch.
        const isLocal = await fs.pathExists(path.resolve(source));
        const parsed = isLocal ? { type: 'localPath' as const } : parseExtensionSource(source);

        if (parsed.type === 'unknown') {
            throw new Error(`Unrecognized extension source: ${source}. Please provide a valid local path, extension URL, or 32-character extension ID.`);
        }

        if (parsed.url) {
          console.log(chalk.blue('Downloading extension...'));
          // Robust temporary directory usage
          tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'to-userscript-download-'));
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
        // Error bubbles to the global handler for process termination
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
    (yargs) => {
      return yargs
        .positional('source', { describe: 'Extension source (URL or ID)', type: 'string', demandOption: true })
        .option('output', { alias: 'o', type: 'string', describe: 'Output path for the archive' })
        .option('force', { alias: 'f', type: 'boolean', default: false, describe: 'Overwrite output if it exists' })
        .strict();
    },
    async (argv) => {
      try {
        const source = argv.source as string;
        const parsed = parseExtensionSource(source);

        if (parsed.type === 'localPath') {
            throw new Error('Local paths are not supported by the download command. Please provide a URL or extension ID.');
        }
        if (parsed.type === 'unknown') {
            throw new Error(`Unrecognized download source: ${source}. Please provide a valid extension URL or 32-character extension ID.`);
        }

        const url = parsed.url || source;
        const dest = path.resolve(argv.output as string || 'extension.zip');

        if (await fs.pathExists(dest)) {
            const stat = await fs.stat(dest);
            if (stat.isDirectory()) {
                throw new Error(`The output path is a directory: ${dest}. Please specify a file path.`);
            }
            if (!argv.force) {
                throw new Error(`Output file already exists: ${dest}. Use --force to overwrite.`);
            }
        }

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
    (yargs) => yargs.positional('userscript', { type: 'string', demandOption: true }).strict(),
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
        // Suppress redundant error logging here as commands handle their own logging
        process.exit(1);
    }
}

const mainFile = process.argv[1];
if (mainFile && (import.meta.url === pathToFileURL(mainFile).href || mainFile.endsWith('to-userscript'))) {
    run();
}
