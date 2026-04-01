#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { pathToFileURL } from 'url';
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
      if (source.startsWith('http')) {
        console.log(chalk.blue('Downloading extension...'));
        const url = source.includes('chromewebstore') ? DownloadService.getCrxUrl(source) : source;
        const tempPath = path.resolve(process.cwd(), `temp-${Date.now()}.zip`);
        source = await DownloadService.download(url, tempPath);
      }

      try {
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
        process.exit(1);
      } finally {
        if (source.includes('temp-')) await fs.remove(source).catch(() => {});
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
      // P2: Use pathToFileURL for Windows compatibility
      const fileUrl = pathToFileURL(filePath).href;
      console.log('// ==UserScript==');
      console.log('// @name        Requirement');
      console.log(`// @require     ${fileUrl}`);
      console.log('// ==/UserScript==');
    }
  )
  .help().alias('h', 'help').parse();
