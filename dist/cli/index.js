#!/usr/bin/env node
import {
  convertExtension
} from "../chunk-CBWDTYPJ.js";

// src/cli/index.ts
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { pathToFileURL } from "url";
import fs2 from "fs-extra";
import chalk from "chalk";

// src/services/DownloadService.ts
import fetch from "node-fetch";
import fs from "fs-extra";
import { resolve } from "path";
var DownloadService = class {
  static async download(url, dest) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    await fs.outputFile(resolve(dest), Buffer.from(buffer));
    return dest;
  }
  static getCrxUrl(idOrUrl) {
    const idMatch = idOrUrl.match(/([a-z0-9]{32})/i);
    if (!idMatch) throw new Error(`Invalid Chrome extension ID: ${idOrUrl}`);
    const id = encodeURIComponent(idMatch[1]);
    return `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3D${id}%26uc`;
  }
};

// src/cli/index.ts
var parser = yargs(hideBin(process.argv)).scriptName("to-userscript").usage("$0 <command> [options]").command(
  "convert <source>",
  "Convert an extension to a userscript",
  (yargs2) => {
    return yargs2.positional("source", {
      describe: "Extension source (dir, archive, or URL)",
      type: "string",
      demandOption: true
    }).option("output", { alias: "o", type: "string" }).option("target", { alias: "t", choices: ["userscript", "vanilla"], default: "userscript" }).option("minify", { type: "boolean", default: false }).option("beautify", { type: "boolean", default: false }).option("force", { alias: "f", type: "boolean", default: false });
  },
  async (argv) => {
    let source = argv.source;
    if (source.startsWith("http")) {
      console.log(chalk.blue("Downloading extension..."));
      const url = source.includes("chromewebstore") ? DownloadService.getCrxUrl(source) : source;
      const tempPath = path.resolve(process.cwd(), `temp-${Date.now()}.zip`);
      source = await DownloadService.download(url, tempPath);
    }
    try {
      await convertExtension({
        inputDir: path.resolve(source),
        outputFile: path.resolve(argv.output || "extension.user.js"),
        target: argv.target,
        minify: argv.minify,
        beautify: argv.beautify,
        force: argv.force
      });
      console.log(chalk.green.bold("\n\u2728 Conversion successful!"));
    } catch (error) {
      console.error(chalk.red.bold("\n\u274C Conversion failed:"), error.message);
      process.exit(1);
    } finally {
      if (source.includes("temp-")) await fs2.remove(source).catch(() => {
      });
    }
  }
).command(
  "download <source>",
  "Download an extension archive",
  (yargs2) => yargs2.positional("source", { type: "string", demandOption: true }),
  async (argv) => {
    const source = argv.source;
    const url = source.startsWith("http") ? source : DownloadService.getCrxUrl(source);
    const dest = path.resolve(process.cwd(), "extension.zip");
    await DownloadService.download(url, dest);
    console.log(chalk.green("Downloaded to:"), dest);
  }
).command(
  "require <userscript>",
  "Generate a metadata block with @require",
  (yargs2) => yargs2.positional("userscript", { type: "string", demandOption: true }),
  async (argv) => {
    const filePath = path.resolve(argv.userscript);
    const fileUrl = pathToFileURL(filePath).href;
    console.log("// ==UserScript==");
    console.log("// @name        Requirement");
    console.log(`// @require     ${fileUrl}`);
    console.log("// ==/UserScript==");
  }
).help().alias("h", "help").parse();
