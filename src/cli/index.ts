#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import os from 'os';
import { pathToFileURL, fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import { convertExtension } from '../index.js';
import { DownloadService } from '../services/DownloadService.js';

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
      let tempDownloadPath: string | null = null;

      try {
        if (source.startsWith('http')) {
          console.log(chalk.blue('Downloading extension...'));
          const isCws = source.includes('chromewebstore');
          const url = isCws ? DownloadService.getCrxUrl(source) : source;
          tempDownloadPath = path.resolve(os.tmpdir(), `to-userscript-download-${Date.now()}.zip`);
          source = await DownloadService.download(url, tempDownloadPath);
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
        console.error(chalk.red.bold('\n❌ Conversion failed:'), (error as Error).message);
        throw error;
      } finally {
        if (tempDownloadPath) {
          await fs.remove(tempDownloadPath).catch(() => {});
        }
      }
    }
  )
  .command(
    'download <source>',
    'Download an extension archive',
    (yargs) => yargs.positional('source', { type: 'string', demandOption: true }),
    async (argv) => {
      const source = argv.source as string;
      const url = source.startsWith('http') ? source : DownloadService.getCrxUrl(source);
      const dest = path.resolve(process.cwd(), 'extension.zip');
      await DownloadService.download(url, dest);
      console.log(chalk.green('Downloaded to:'), dest);
    }
  )
  .command(
    'require <userscript>',
    'Generate a metadata block with @require',
    (yargs) => yargs.positional('userscript', { type: 'string', demandOption: true }),
    async (argv) => {
      const filePath = path.resolve(argv.userscript as string);
      const fileUrl = pathToFileURL(filePath).href;
      console.log('// ==UserScript==');
      console.log('// @name        Requirement');
      console.log(`// @require     ${fileUrl}`);
      console.log('// ==/UserScript==');
    }
  )
  .help().alias('h', 'help');

export async function runCli(args: string[]) {
  return await parser.parseAsync(args);
}

export async function bootstrap() {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Fatal error:'), (error as Error).message);
    process.exit(1);
    throw error;
  }
}

export const isMain = (url: string, scriptPath: string) => {
  if (!url || !scriptPath) return false;
  try {
    const pathFromUrl = fileURLToPath(url);
    return pathFromUrl === path.resolve(scriptPath);
  } catch {
    return false;
  }
};

if (isMain(import.meta.url, process.argv[1])) {
  bootstrap();
}
