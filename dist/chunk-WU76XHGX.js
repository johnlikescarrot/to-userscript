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
    if (parsed.content_scripts) {
      parsed.content_scripts = parsed.content_scripts.filter((cs) => cs.matches && (cs.js || cs.css)).map((cs) => ({
        ...cs,
        js: cs.js?.map(normalizePath),
        css: cs.css?.map(normalizePath)
      }));
    }
    return parsed;
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
      manifest.content_scripts || []
    );
    context.set("resources", resources);
    const backgroundScripts = manifest.background?.service_worker ? [manifest.background.service_worker] : manifest.background?.scripts || [];
    const backgroundJs = await ResourceService.readBackgroundScripts(inputDir, backgroundScripts);
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
      const normalized = normalizePath(relPath);
      if (processedFiles.has(normalized)) return;
      const fullPath = path3.join(extensionRoot, normalized);
      if (!await fs3.pathExists(fullPath)) return;
      const ext = path3.extname(normalized).toLowerCase();
      const isText = [".html", ".htm", ".css", ".js", ".json", ".svg"].includes(ext);
      if (isText) {
        let textContent = await fs3.readFile(fullPath, "utf-8");
        if ([".html", ".htm", ".css"].includes(ext)) {
          const type = ext === ".css" ? "CSS" : "HTML";
          const patterns = type === "CSS" ? this.REGEX_PATTERNS.CSS_ASSETS : this.REGEX_PATTERNS.HTML_ASSETS;
          let match;
          const foundAssets = [];
          while ((match = patterns.exec(textContent)) !== null) {
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
      processedFiles.add(normalized);
    };
    const pages = /* @__PURE__ */ new Set();
    if (manifest.manifest_version === 2) {
      if (manifest.options_ui?.page) pages.add(manifest.options_ui.page);
      if (manifest.options_page) pages.add(manifest.options_page);
      if (manifest.browser_action?.default_popup) pages.add(manifest.browser_action.default_popup);
    } else {
      if (manifest.options_ui?.page) pages.add(manifest.options_ui.page);
      if (manifest.action?.default_popup) pages.add(manifest.action.default_popup);
    }
    for (const page of pages) await processFile(page);
    if (manifest.web_accessible_resources) {
      for (const res of manifest.web_accessible_resources) {
        if (typeof res === "string") await processFile(res);
        else for (const resourcePath of res.resources) await processFile(resourcePath);
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
    const polyfill = await TemplateService.load("polyfill");
    const internalId = ManifestService.getInternalId(manifest);
    let combined = `
${messaging}

${abstraction}

const EXTENSION_ASSETS_MAP = ${JSON.stringify(assetMap, null, 2)};

${polyfill.replace("{{IS_IFRAME}}", target === "postmessage" ? "true" : "false").replace("{{SCRIPT_ID}}", internalId)}

if (typeof window !== 'undefined') {
    (window as any).buildPolyfill = (buildPolyfill as any);
}
`;
    return combined;
  }
};

// src/steps/AssembleStep.ts
import fs5 from "fs-extra";
var AssembleStep = class extends Step {
  name = "Assemble Final Script";
  async run(context) {
    const manifest = context.get("manifest");
    const assetMap = context.get("assetMap");
    const resources = context.get("resources");
    const { target, outputFile } = context.config;
    const mainPolyfill = await PolyfillService.build(target, assetMap, manifest);
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
              runAtMap[runAt].push(resources.jsContents[normalized]);
            }
          }
        }
      }
    }
    const generatePhase = (phase) => `
      _log('Executing ${phase} phase...');
      ${runAtMap[phase].join("\n\n")}
    `;
    const combinedExecutionLogic = `
async function executeAllScripts(globalThis, extensionCssData) {
    const {chrome, browser, window, self} = globalThis;

    // --- Document Start
    ${generatePhase("document-start")}

    // --- Wait for DOMContentLoaded
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // --- Document End
    ${generatePhase("document-end")}

    // --- Document Idle
    if (typeof window.requestIdleCallback === 'function') {
        await new Promise(resolve => window.requestIdleCallback(resolve, { timeout: 2000 }));
    } else {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    ${generatePhase("document-idle")}

    _log('All phases complete.');
}
`;
    const finalScript = TemplateService.replace(orchestrationTemplate, {
      "{{INJECTED_MANIFEST}}": JSON.stringify(manifest),
      "{{EXTENSION_CSS_DATA}}": JSON.stringify(resources.cssContents),
      "{{COMBINED_EXECUTION_LOGIC}}": combinedExecutionLogic,
      "{{UNIFIED_POLYFILL_FOR_IFRAME}}": JSON.stringify(mainPolyfill),
      // Simplified for now
      "{{CONTENT_SCRIPT_CONFIGS_FOR_MATCHING_ONLY}}": JSON.stringify(manifest.content_scripts || []),
      "{{OPTIONS_PAGE_PATH}}": JSON.stringify(manifest.options_page || manifest.options_ui?.page || null),
      "{{POPUP_PAGE_PATH}}": JSON.stringify(manifest.action?.default_popup || manifest.browser_action?.default_popup || null),
      "{{EXTENSION_ICON}}": "null",
      "{{CONVERT_MATCH_PATTERN_TO_REGEXP_FUNCTION}}": "() => { return { test: () => true } }",
      // Mocked for brevity
      "{{CONVERT_MATCH_PATTERN_FUNCTION_STRING}}": '""',
      "{{LOCALE}}": "{}",
      "{{USED_LOCALE}}": '"en"'
    });
    const wrapper = `
(function() {
    'use strict';
    const SCRIPT_NAME = ${JSON.stringify(manifest.name)};
    const _log = (...args) => console.log(\`[\${SCRIPT_NAME}]\`, ...args);
    const _warn = (...args) => console.warn(\`[\${SCRIPT_NAME}]\`, ...args);
    const _error = (...args) => console.error(\`[\${SCRIPT_NAME}]\`, ...args);

    ${mainPolyfill}

    ${finalScript}

    main().catch(e => _error('Init error', e));
})();
`;
    await fs5.outputFile(outputFile, wrapper);
  }
};

// src/index.ts
async function convertExtension(config) {
  const context = new ConversionContext(config);
  const engine = new MigrationEngine(context);
  engine.addStep(new LoadManifestStep()).addStep(new ProcessResourcesStep()).addStep(new GenerateAssetsStep()).addStep(new AssembleStep());
  await engine.run();
}

export {
  ContentScriptSchema,
  ManifestV2Schema,
  ManifestV3Schema,
  ManifestSchema,
  convertExtension
};
