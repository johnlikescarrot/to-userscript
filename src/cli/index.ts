import { Logger } from '../utils/Logger.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import { convertExtension } from '../index.js';
import { DownloadService } from '../services/DownloadService.js';

export function createCli(argv: string[]) {
  return yargs(hideBin(argv))
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
        Logger.showBanner();
        const sourceInput = argv.source as string;
        let localSource: string | null = null;
        let isTemp = false;

        try {
          if (sourceInput.startsWith('http')) {
              console.log(chalk.blue('Downloading extension...'));
          }
          const prepared = await DownloadService.getLocalSourceFrom(sourceInput);
          localSource = prepared.path;
          isTemp = prepared.isTemp;

          await convertExtension({
            inputDir: path.resolve(localSource),
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
          process.exit(1);
        } finally {
          if (isTemp && localSource) {
            try { await fs.remove(localSource); } catch(e) {}
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
          const prepared = await DownloadService.getLocalSourceFrom(argv.source as string);
          const dest = path.resolve(process.cwd(), "extension.zip");
          if (prepared.isTemp) {
              await fs.move(prepared.path, dest, { overwrite: true });
          } else {
              await fs.copy(prepared.path, dest);
          }
          console.log(chalk.green("Downloaded to:"), dest);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error); /* v8 ignore next 2 */
          console.error(chalk.red("Download failed:"), msg);
          process.exit(1);
        }
      } /* v8 ignore stop */ /* v8 ignore stop */
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
}
