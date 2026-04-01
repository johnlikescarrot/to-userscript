// src/utils/Logger.ts
import chalk from "chalk";
import ora from "ora";
var Logger = class {
  constructor(context) {
    this.context = context;
  }
  spinner = null;
  info(message) {
    console.log(chalk.blue(`[${this.context}] `) + message);
  }
  success(message) {
    console.log(chalk.green(`\u2714 [${this.context}] `) + message);
  }
  warn(message) {
    console.warn(chalk.yellow(`\u26A0 [${this.context}] `) + message);
  }
  error(message, error) {
    console.error(chalk.red(`\u2716 [${this.context}] `) + message);
    if (error) console.error(error);
  }
  startSpinner(message) {
    this.spinner = ora(chalk.blue(`[${this.context}] `) + message).start();
  }
  stopSpinner(success = true, message) {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message ? chalk.green(`[${this.context}] `) + message : void 0);
      } else {
        this.spinner.fail(message ? chalk.red(`[${this.context}] `) + message : void 0);
      }
      this.spinner = null;
    }
  }
};

// src/core/ConversionContext.ts
var ConversionContext = class {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.target);
  }
  logger;
  state = {};
  set(key, value) {
    this.state[key] = value;
  }
  get(key) {
    if (!(key in this.state)) {
      throw new Error(`State key "${key}" not found in ConversionContext.`);
    }
    return this.state[key];
  }
};

// src/core/MigrationEngine.ts
var MigrationEngine = class {
  constructor(context) {
    this.context = context;
  }
  steps = [];
  addStep(step) {
    this.steps.push(step);
    return this;
  }
  async run() {
    this.context.logger.info("Starting conversion engine...");
    for (const step of this.steps) {
      await step.execute(this.context);
    }
    this.context.logger.success("All conversion steps completed successfully.");
  }
};

// src/core/Step.ts
var Step = class {
  async execute(context) {
    context.logger.startSpinner(`Step: ${this.name}...`);
    try {
      await this.run(context);
      context.logger.stopSpinner(true, `Completed ${this.name}`);
    } catch (error) {
      context.logger.stopSpinner(false, `Failed ${this.name}`);
      throw error;
    }
  }
};

// src/services/ManifestService.ts
import fs from "fs-extra";

// src/schemas/ManifestSchema.ts
import { z } from "zod";
var ContentScriptSchema = z.object({
  matches: z.array(z.string()).optional(),
  js: z.array(z.string()).optional(),
  css: z.array(z.string()).optional(),
  run_at: z.enum(["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]).optional(),
  all_frames: z.boolean().optional()
});
var ManifestV2Schema = z.object({
  manifest_version: z.literal(2),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  default_locale: z.string().optional(),
  icons: z.record(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  optional_permissions: z.array(z.string()).optional(),
  content_scripts: z.array(ContentScriptSchema).optional(),
  background: z.object({
    scripts: z.array(z.string()).optional(),
    persistent: z.boolean().optional()
  }).optional(),
  browser_action: z.object({
    default_popup: z.string().optional(),
    default_icon: z.union([z.string(), z.record(z.string())]).optional()
  }).optional(),
  page_action: z.object({
    default_popup: z.string().optional()
  }).optional(),
  options_ui: z.object({
    page: z.string().optional(),
    open_in_tab: z.boolean().optional()
  }).optional(),
  options_page: z.string().optional(),
  web_accessible_resources: z.array(z.string()).optional()
});
var ManifestV3Schema = z.object({
  manifest_version: z.literal(3),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  default_locale: z.string().optional(),
  icons: z.record(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  optional_permissions: z.array(z.string()).optional(),
  host_permissions: z.array(z.string()).optional(),
  content_scripts: z.array(ContentScriptSchema).optional(),
  background: z.object({
    service_worker: z.string().optional(),
    type: z.enum(["module"]).optional()
  }).optional(),
  action: z.object({
    default_popup: z.string().optional(),
    default_icon: z.union([z.string(), z.record(z.string())]).optional()
  }).optional(),
  options_ui: z.object({
    page: z.string().optional(),
    open_in_tab: z.boolean().optional()
  }).optional(),
  web_accessible_resources: z.array(z.object({
    resources: z.array(z.string()),
    matches: z.array(z.string()).optional()
  })).optional()
});
var ManifestSchema = z.union([ManifestV2Schema, ManifestV3Schema]);

// src/utils/PathUtils.ts
function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/\/+/g, "/");
}

// src/services/ManifestService.ts
var ManifestService = class {
  static async load(manifestPath) {
    const content = await fs.readFile(manifestPath, "utf-8");
    const raw = JSON.parse(content);
    const parsed = ManifestSchema.parse(raw);
    const normalized = {
      manifest_version: parsed.manifest_version,
      name: parsed.name,
      version: parsed.version,
      description: parsed.description || "",
      icons: parsed.icons || {},
      content_scripts: (parsed.content_scripts || []).filter((cs) => cs.matches && cs.matches.length > 0 && (cs.js?.length || cs.css?.length)).map((cs) => ({
        ...cs,
        js: cs.js?.map(normalizePath),
        css: cs.css?.map(normalizePath)
      })),
      action: {},
      background_scripts: [],
      web_accessible_resources: [],
      raw: parsed
    };
    if (parsed.manifest_version === 2) {
      normalized.action = {
        default_popup: parsed.browser_action?.default_popup || parsed.page_action?.default_popup,
        default_icon: parsed.browser_action?.default_icon
      };
      normalized.background_scripts = parsed.background?.scripts || [];
      normalized.options_page = parsed.options_ui?.page || parsed.options_page;
      normalized.web_accessible_resources = parsed.web_accessible_resources || [];
    } else {
      normalized.action = {
        default_popup: parsed.action?.default_popup,
        default_icon: parsed.action?.default_icon
      };
      normalized.background_scripts = parsed.background?.service_worker ? [parsed.background.service_worker] : [];
      normalized.options_page = parsed.options_ui?.page;
      normalized.web_accessible_resources = (parsed.web_accessible_resources || []).flatMap((r) => r.resources);
    }
    return normalized;
  }
  static getInternalId(manifest) {
    return manifest.name.replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "").replace(/^-+/, "").toLowerCase();
  }
};

// src/steps/LoadManifestStep.ts
import path from "path";
var LoadManifestStep = class extends Step {
  name = "Load Manifest";
  async run(context) {
    const manifestPath = path.join(context.config.inputDir, "manifest.json");
    const manifest = await ManifestService.load(manifestPath);
    context.set("manifest", manifest);
  }
};

// src/services/ResourceService.ts
import fs2 from "fs-extra";
import path2 from "path";
var ResourceService = class {
  static async readScriptsAndStyles(baseDir, contentScripts) {
    const jsContents = {};
    const cssContents = {};
    const processedJs = /* @__PURE__ */ new Set();
    const processedCss = /* @__PURE__ */ new Set();
    for (const config of contentScripts) {
      if (config.js) {
        for (const jsPath of config.js) {
          const rel = normalizePath(jsPath);
          if (!processedJs.has(rel)) {
            const full = path2.join(baseDir, rel);
            jsContents[rel] = await fs2.readFile(full, "utf-8");
            processedJs.add(rel);
          }
        }
      }
      if (config.css) {
        for (const cssPath of config.css) {
          const rel = normalizePath(cssPath);
          if (!processedCss.has(rel)) {
            const full = path2.join(baseDir, rel);
            cssContents[rel] = await fs2.readFile(full, "utf-8");
            processedCss.add(rel);
          }
        }
      }
    }
    return { jsContents, cssContents };
  }
  static async readBackgroundScripts(baseDir, scripts) {
    const contents = {};
    for (const script of scripts) {
      const rel = normalizePath(script);
      const full = path2.join(baseDir, rel);
      contents[rel] = await fs2.readFile(full, "utf-8");
    }
    return contents;
  }
};

// src/steps/ProcessResourcesStep.ts
var ProcessResourcesStep = class extends Step {
  name = "Process Resources";
  async run(context) {
    const manifest = context.get("manifest");
    const { inputDir } = context.config;
    const resources = await ResourceService.readScriptsAndStyles(
      inputDir,
      manifest.content_scripts
    );
    context.set("resources", resources);
    const backgroundJs = await ResourceService.readBackgroundScripts(
      inputDir,
      manifest.background_scripts
    );
    context.set("backgroundJs", backgroundJs);
  }
};

// src/services/AssetService.ts
import fs3 from "fs-extra";
import path3 from "path";
var AssetService = class {
  static MIME_MAP = {
    ".html": "text/html",
    ".htm": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf"
  };
  static REGEX_PATTERNS = {
    HTML_ASSETS: /(src|href)\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi,
    CSS_ASSETS: /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    EXTERNAL_URLS: /^(data:|https?:\/\/|\/\/|#|javascript:|mailto:)/
  };
  static async generateAssetMap(extensionRoot, manifest) {
    const assetMap = {};
    const processedFiles = /* @__PURE__ */ new Set();
    const processFile = async (relPath) => {
      const cleanRelPath = relPath.split(/[?#]/)[0];
      const normalized = normalizePath(cleanRelPath);
      if (processedFiles.has(normalized)) return;
      const fullPath = path3.join(extensionRoot, normalized);
      if (!await fs3.pathExists(fullPath)) return;
      processedFiles.add(normalized);
      const ext = path3.extname(normalized).toLowerCase();
      const isText = [".html", ".htm", ".css", ".js", ".json", ".svg"].includes(ext);
      if (isText) {
        let textContent = await fs3.readFile(fullPath, "utf-8");
        if ([".html", ".htm", ".css"].includes(ext)) {
          const type = ext === ".css" ? "CSS" : "HTML";
          const pattern = type === "CSS" ? this.REGEX_PATTERNS.CSS_ASSETS : this.REGEX_PATTERNS.HTML_ASSETS;
          pattern.lastIndex = 0;
          let match;
          const foundAssets = [];
          while ((match = pattern.exec(textContent)) !== null) {
            const url = type === "HTML" ? match[2] || match[3] : match[1];
            if (url && !this.REGEX_PATTERNS.EXTERNAL_URLS.test(url)) {
              foundAssets.push(url);
            }
          }
          for (const asset of foundAssets) {
            const assetRelPath = path3.join(path3.dirname(normalized), asset);
            await processFile(assetRelPath);
          }
        }
        assetMap[normalized] = textContent;
      } else {
        const buffer = await fs3.readFile(fullPath);
        assetMap[normalized] = buffer.toString("base64");
      }
    };
    const initialFiles = /* @__PURE__ */ new Set();
    if (manifest.manifest_version === 2) {
      if (manifest.options_ui?.page) initialFiles.add(manifest.options_ui.page);
      if (manifest.options_page) initialFiles.add(manifest.options_page);
      if (manifest.browser_action?.default_popup) initialFiles.add(manifest.browser_action.default_popup);
    } else {
      if (manifest.options_ui?.page) initialFiles.add(manifest.options_ui.page);
      if (manifest.action?.default_popup) initialFiles.add(manifest.action.default_popup);
    }
    for (const f of initialFiles) await processFile(f);
    if (manifest.web_accessible_resources) {
      for (const res of manifest.web_accessible_resources) {
        if (typeof res === "string") await processFile(res);
        else for (const rp of res.resources) await processFile(rp);
      }
    }
    return assetMap;
  }
  static getMimeType(filePath) {
    const ext = path3.extname(filePath).toLowerCase();
    return this.MIME_MAP[ext] || "application/octet-stream";
  }
};

// src/steps/GenerateAssetsStep.ts
var GenerateAssetsStep = class extends Step {
  name = "Generate Assets Map";
  async run(context) {
    const manifest = context.get("manifest");
    const { inputDir } = context.config;
    const assetMap = await AssetService.generateAssetMap(inputDir, manifest);
    context.set("assetMap", assetMap);
  }
};

// src/services/TemplateService.ts
import fs4 from "fs-extra";
import path4 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var TemplateService = class {
  static templatesDir = path4.resolve(__dirname, "../templates");
  static async load(name) {
    const filePath = path4.join(this.templatesDir, name);
    if (!await fs4.pathExists(filePath)) {
      const fallback = path4.join(this.templatesDir, `${name}.template.js`);
      if (await fs4.pathExists(fallback)) return fs4.readFile(fallback, "utf-8");
      throw new Error(`Template not found: ${name}`);
    }
    return fs4.readFile(filePath, "utf-8");
  }
  static replace(content, replacements) {
    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(escapedKey, "g");
      const safeValue = value.replace(/\$/g, "$$$$");
      result = result.replace(regex, safeValue);
    }
    return result;
  }
};

// src/services/PolyfillService.ts
var PolyfillService = class {
  static async build(target, assetMap, manifest) {
    const messaging = await TemplateService.load("messaging");
    const abstraction = await TemplateService.load(`abstractionLayer.${target === "userscript" ? "userscript" : target === "vanilla" ? "vanilla" : "postmessage"}`);
    const polyfillTemplate = await TemplateService.load("polyfill");
    const internalId = ManifestService.getInternalId(manifest);
    const decodingHelper = `
function _base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
`;
    const getURLImpl = `
      getURL: (path) => {
        if (!path) return "";
        let cleanPath = path.startsWith("/") ? path.substring(1) : path;
        const data = EXTENSION_ASSETS_MAP[cleanPath];
        if (!data) return path;

        const isText = ["html", "htm", "js", "css", "json", "svg"].some(ext => cleanPath.endsWith(ext));
        const blob = isText ? new Blob([data], { type: "text/plain" }) : new Blob([_base64ToUint8Array(data)]);
        return URL.createObjectURL(blob);
      }
    `;
    let combined = `
${decodingHelper}
${messaging}
${abstraction}

${polyfillTemplate.replace("{{IS_IFRAME}}", target === "postmessage" ? "true" : "false").replace("{{SCRIPT_ID}}", internalId).replace(/getURL: \(path\) => .*,/, getURLImpl + ",").replace("{{INJECTED_MANIFEST}}", JSON.stringify(manifest))}
`;
    return combined;
  }
};

// src/steps/AssembleStep.ts
import fs5 from "fs-extra";

// src/utils/RegexUtils.ts
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function convertMatchPatternToRegExpString(pattern) {
  if (typeof pattern !== "string" || !pattern) {
    return "$.";
  }
  const schemeMatch = pattern.match(/^(\*|https?|file|ftp):\/\//);
  if (!schemeMatch) return "$.";
  const scheme = schemeMatch[1];
  const remaining = pattern.substring(schemeMatch[0].length);
  const schemeRegex = scheme === "*" ? "https?|file|ftp" : scheme;
  const hostMatch = remaining.match(/^([^\/]+)/);
  if (!hostMatch) return "$.";
  const host = hostMatch[1];
  const pathPart = remaining.substring(host.length);
  let hostRegex;
  if (host === "*") {
    hostRegex = "[^/]+";
  } else if (host.startsWith("*.")) {
    hostRegex = "(?:[^\\/]+\\.)?" + escapeRegex(host.substring(2));
  } else {
    hostRegex = escapeRegex(host);
  }
  let pathRegex = pathPart;
  if (!pathRegex.startsWith("/")) {
    pathRegex = "/" + pathRegex;
  }
  pathRegex = pathRegex.split("*").map(escapeRegex).join(".*");
  if (pathRegex === "/.*") {
    pathRegex = "(?:/.*)?";
  } else {
    pathRegex = pathRegex + "(?:[?#]|$)";
  }
  return `^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}`;
}
function convertMatchPatternToRegExp(pattern) {
  if (pattern === "<all_urls>") {
    return new RegExp(".*");
  }
  try {
    const singleEscapedPattern = convertMatchPatternToRegExpString(pattern).replace(/\\\\/g, "\\");
    return new RegExp(singleEscapedPattern);
  } catch {
    return new RegExp("$.");
  }
}

// src/steps/AssembleStep.ts
var AssembleStep = class extends Step {
  name = "Assemble Final Script";
  async run(context) {
    const manifest = context.get("manifest");
    const assetMap = context.get("assetMap");
    const resources = context.get("resources");
    const { target, outputFile } = context.config;
    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest.raw);
    const orchestrationTemplate = await TemplateService.load("orchestration");
    const runAtMap = {
      "document-start": [],
      "document-end": [],
      "document-idle": []
    };
    if (manifest.content_scripts) {
      for (const cs of manifest.content_scripts) {
        const runAt = cs.run_at?.replace("_", "-") || "document-idle";
        if (cs.js) {
          for (const js of cs.js) {
            const normalized = normalizePath(js);
            if (resources.jsContents[normalized]) {
              runAtMap[runAt].push(`// --- ${normalized}
${resources.jsContents[normalized]}`);
            }
          }
        }
      }
    }
    const combinedExecutionLogic = `
async function executeAllScripts(globalThis, extensionCssData) {
    const {chrome, browser, window, self} = globalThis;

    // Inject CSS
    for (const [path, css] of Object.entries(extensionCssData)) {
        const style = document.createElement('style');
        style.textContent = css;
        style.setAttribute('data-extension-path', path);
        (document.head || document.documentElement).appendChild(style);
    }

    // --- Document Start
    ${runAtMap["document-start"].join("\n\n")}

    // --- Wait for Document End
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // --- Document End
    ${runAtMap["document-end"].join("\n\n")}

    // --- Wait for Document Idle
    if (typeof window.requestIdleCallback === 'function') {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 2000 }));
    } else {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // --- Document Idle
    ${runAtMap["document-idle"].join("\n\n")}

    _log('Phased execution complete.');
}
`;
    const finalScript = TemplateService.replace(orchestrationTemplate, {
      "{{INJECTED_MANIFEST}}": JSON.stringify(manifest.raw),
      "{{EXTENSION_CSS_DATA}}": JSON.stringify(resources.cssContents),
      "{{COMBINED_EXECUTION_LOGIC}}": combinedExecutionLogic,
      "{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}": JSON.stringify(manifest.content_scripts),
      "{{OPTIONS_PAGE_PATH}}": JSON.stringify(manifest.options_page || null),
      "{{POPUP_PAGE_PATH}}": JSON.stringify(manifest.action.default_popup || null),
      "{{EXTENSION_ICON}}": "null",
      "{{LOCALE}}": "{}",
      "{{USED_LOCALE}}": JSON.stringify(context.config.locale || "en")
    });
    const wrapper = `
(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    // --- Utils
    const escapeRegex = ${escapeRegex.toString()};
    const convertMatchPatternToRegExpString = ${convertMatchPatternToRegExpString.toString()};
    const convertMatchPatternToRegExp = ${convertMatchPatternToRegExp.toString()};

    // --- Assets Map
    const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap)};

    // --- Polyfill & Logic
    ${mainPolyfill}

    ${finalScript}

    main().catch(e => _error('Initialization error', e));
})();
`;
    await fs5.outputFile(outputFile, wrapper);
  }
};

// src/services/UnpackService.ts
import fs6 from "fs-extra";
import path5 from "path";
import yauzl from "yauzl";
import tmp from "tmp";
var UnpackService = class {
  static async unpack(archivePath) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);
        zipfile.readEntry();
        zipfile.on("entry", (entry) => {
          const dest = path5.join(tmpDir, entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            fs6.mkdirpSync(dest);
            zipfile.readEntry();
          } else {
            fs6.mkdirpSync(path5.dirname(dest));
            zipfile.openReadStream(entry, (err2, readStream) => {
              if (err2) return reject(err2);
              const writeStream = fs6.createWriteStream(dest);
              readStream.pipe(writeStream);
              writeStream.on("close", () => zipfile.readEntry());
            });
          }
        });
        zipfile.on("close", () => resolve(tmpDir));
      });
    });
  }
};

// src/index.ts
import fs7 from "fs-extra";
async function convertExtension(config) {
  let inputDir = config.inputDir;
  if (await fs7.pathExists(inputDir)) {
    const stats = await fs7.stat(inputDir);
    if (stats.isFile()) {
      inputDir = await UnpackService.unpack(inputDir);
    }
  }
  const context = new ConversionContext({ ...config, inputDir });
  const engine = new MigrationEngine(context);
  engine.addStep(new LoadManifestStep()).addStep(new ProcessResourcesStep()).addStep(new GenerateAssetsStep()).addStep(new AssembleStep());
  await engine.run();
  const manifest = context.get("manifest");
  const resources = context.get("resources");
  return {
    success: true,
    outputFile: config.outputFile,
    extension: {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description
    },
    stats: {
      jsFiles: Object.keys(resources.jsContents).length,
      cssFiles: Object.keys(resources.cssContents).length,
      assets: Object.keys(context.get("assetMap")).length
    }
  };
}

export {
  ConversionContext,
  ContentScriptSchema,
  ManifestV2Schema,
  ManifestV3Schema,
  ManifestSchema,
  convertExtension
};
