#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
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
        .option('output', {
          alias: 'o',
          describe: 'Output file path',
          type: 'string',
        })
        .option('target', {
          alias: 't',
          describe: 'Build target type',
          choices: ['userscript', 'vanilla'] as const,
          default: 'userscript' as const,
        })
        .option('minify', { type: 'boolean', default: false })
        .option('beautify', { type: 'boolean', default: false })
        .option('force', { alias: 'f', type: 'boolean', default: false });
    },
    async (argv) => {
      let source = argv.source as string;
      if (source.startsWith('http')) {
        console.log(chalk.blue('Downloading extension...'));
        const url = source.includes('chromewebstore') ? DownloadService.getCrxUrl(source) : source;
        source = await DownloadService.download(url, path.join(process.cwd(), 'temp.zip'));
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
      }
    }
  )
  .command(
    'download <source>',
    'Download an extension archive',
    (yargs) => yargs.positional('source', { type: 'string', demandOption: true }),
    async (argv) => {
      const url = DownloadService.getCrxUrl(argv.source as string);
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
      console.log('// ==UserScript==');
      console.log('// @name        Requirement');
      console.log(`// @require     file://${filePath}`);
      console.log('// ==/UserScript==');
    }
  )
  .help().alias('h', 'help').parse();
