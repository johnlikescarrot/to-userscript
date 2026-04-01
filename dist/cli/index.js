#!/usr/bin/env node
import {
  convertExtension
} from "../chunk-WU76XHGX.js";

// src/cli/index.ts
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
var parser = yargs(hideBin(process.argv)).scriptName("to-userscript").usage("$0 <command> [options]").command(
  "convert <source>",
  "Convert an extension to a userscript",
  (yargs2) => {
    return yargs2.positional("source", {
      describe: "Extension source directory",
      type: "string",
      demandOption: true
    }).option("output", {
      alias: "o",
      describe: "Output file path",
      type: "string"
    }).option("target", {
      alias: "t",
      describe: "Build target type",
      choices: ["userscript", "vanilla"],
      default: "userscript"
    }).option("force", {
      alias: "f",
      describe: "Overwrite output file if it exists",
      type: "boolean",
      default: false
    });
  },
  async (argv) => {
    const inputDir = path.resolve(argv.source);
    const outputFile = argv.output ? path.resolve(argv.output) : path.resolve(process.cwd(), "extension.user.js");
    if (!await fs.pathExists(inputDir)) {
      console.error(chalk.red(`Error: Source directory "${inputDir}" does not exist.`));
      process.exit(1);
    }
    try {
      await convertExtension({
        inputDir,
        outputFile,
        target: argv.target,
        force: argv.force
      });
      console.log(chalk.green.bold("\n\u2728 Conversion successful!"));
      console.log(chalk.blue("\u{1F4C4} Output:"), outputFile);
    } catch (error) {
      console.error(chalk.red.bold("\n\u274C Conversion failed:"), error.message);
      process.exit(1);
    }
  }
).help().alias("help", "h").version().alias("version", "V").demandCommand(1, "You must specify a command").strict();
parser.parse();
