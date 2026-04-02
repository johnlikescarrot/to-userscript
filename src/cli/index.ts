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
      let tempDownloadPath: string | null = null;

      if (source.startsWith('http')) {
        console.log(chalk.blue.bold('\n🌐 Downloading extension from web store...'));
        const url = source.includes('chromewebstore') ? DownloadService.getCrxUrl(source) : source;
        tempDownloadPath = path.resolve(process.cwd(), `temp-download-${Date.now()}.zip`);
        source = await DownloadService.download(url, tempDownloadPath);
      }

      try {
        const result = await convertExtension({
          inputDir: path.resolve(source),
          outputFile: path.resolve(argv.output as string || 'extension.user.js'),
          target: argv.target,
          minify: argv.minify,
          beautify: argv.beautify,
          force: argv.force,
        });

        console.log(chalk.green.bold('\n✨ Transmutation Successful!'));
        console.log(chalk.dim('----------------------------------------'));
        console.log(`${chalk.bold('Extension:')}  ${chalk.cyan(result.extension.name)}`);
        console.log(`${chalk.bold('Version:')}    ${chalk.cyan(result.extension.version)}`);
        console.log(`${chalk.bold('Output:')}     ${chalk.yellow(result.outputFile)}`);
        console.log(chalk.dim('----------------------------------------'));
        console.log(`${chalk.bold('Assets:')}     ${chalk.magenta(result.stats.assets)} files inlined`);
        console.log(`${chalk.bold('Scripts:')}    ${chalk.magenta(result.stats.jsFiles)} JS, ${chalk.magenta(result.stats.cssFiles)} CSS`);
        console.log(chalk.dim('----------------------------------------\n'));

      } catch (error) {
        console.error(chalk.red.bold('\n❌ Transmutation Failed:'), (error as Error).message);
        process.exit(1);
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
      console.log(chalk.green.bold('✔ Downloaded to:'), chalk.yellow(dest));
    }
  )
  .command(
    'require <userscript>',
    'Generate a metadata block with @require',
    (yargs) => yargs.positional('userscript', { type: 'string', demandOption: true }),
    async (argv) => {
      const filePath = path.resolve(argv.userscript as string);
      const fileUrl = pathToFileURL(filePath).href;
      console.log(chalk.blue.bold('\n📋 Requirement Block Generated:'));
      console.log(chalk.gray('// ==UserScript=='));
      console.log(chalk.gray(`// @name        Requirement`));
      console.log(chalk.cyan(`// @require     ${fileUrl}`));
      console.log(chalk.gray('// ==/UserScript==\n'));
    }
  )
  .help().alias('h', 'help').parse();
