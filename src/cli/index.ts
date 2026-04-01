#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { convertExtension } from '../index.js';

const parser = yargs(hideBin(process.argv))
  .scriptName('to-userscript')
  .usage('$0 <command> [options]')
  .command(
    'convert <source>',
    'Convert an extension to a userscript',
    (yargs) => {
      return yargs
        .positional('source', {
          describe: 'Extension source directory',
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
        .option('force', {
          alias: 'f',
          describe: 'Overwrite output file if it exists',
          type: 'boolean',
          default: false,
        });
    },
    async (argv) => {
      const inputDir = path.resolve(argv.source as string);
      const outputFile = argv.output
        ? path.resolve(argv.output as string)
        : path.resolve(process.cwd(), 'extension.user.js');

      if (!(await fs.pathExists(inputDir))) {
        console.error(chalk.red(`Error: Source directory "${inputDir}" does not exist.`));
        process.exit(1);
      }

      try {
        await convertExtension({
          inputDir,
          outputFile,
          target: argv.target,
          force: argv.force,
        });
        console.log(chalk.green.bold('\n✨ Conversion successful!'));
        console.log(chalk.blue('📄 Output:'), outputFile);
      } catch (error) {
        console.error(chalk.red.bold('\n❌ Conversion failed:'), (error as Error).message);
        process.exit(1);
      }
    }
  )
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'V')
  .demandCommand(1, 'You must specify a command')
  .strict();

parser.parse();
