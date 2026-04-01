# to-userscript

to-userscript is a powerful Node.js command-line tool and library that converts browser extensions from Chrome Web Store, Firefox Add-ons, or local files into self-contained userscripts compatible with Tampermonkey, Greasemonkey, and Violentmonkey. Built with a robust **MigrationEngine** architecture, it parses extension manifests (both V2 and V3), inlines all assets as Data URLs, and provides high-fidelity polyfills for WebExtension APIs including `chrome.storage`, `chrome.runtime`, `chrome.tabs`, `chrome.i18n`, and more.

The converter handles the complete extension lifecycle including content scripts with phased execution (document-start, document-end, document-idle), background scripts, options pages, and popup pages rendered as modal iframes. It supports multiple output targets: userscript format with GM_* function integration, and vanilla JavaScript using IndexedDB for storage. Additional features include minification via terser, beautification via prettier, localization support through `_locales` directories, and automatic asset discovery from HTML/CSS references.

---

## CLI Commands

### convert - Convert Extension to Userscript

The primary command that converts a browser extension from various sources (Chrome Web Store URLs, Firefox Add-ons URLs, local directories, or archive files like `.crx`, `.xpi`, `.zip`) into a portable userscript file.

```bash
# Convert from Chrome Web Store with minification
to-userscript convert "https://chromewebstore.google.com/detail/modern-for-wikipedia/emdkdnnopdnajipoapepbeeiemahbjcn" -o modern-wikipedia.user.js --minify

# Convert from Firefox Add-ons
to-userscript convert "https://addons.mozilla.org/addon/ublock-origin/" -o ublock.user.js

# Convert local extension directory
to-userscript convert ./my-extension/ -o my-script.user.js

# Convert with beautified output for debugging
to-userscript convert ./my-extension/ -o my-script.user.js --beautify

# Convert to vanilla JavaScript (no userscript metadata, uses IndexedDB)
to-userscript convert extension.crx --target vanilla -o extension.js

# Force overwrite existing output file
to-userscript convert ./extension/ -o script.user.js --force
```

### download - Download Extension Archive

Downloads an extension archive from Chrome Web Store or Firefox Add-ons without converting it to a userscript, useful for inspecting extension contents or manual processing.

```bash
# Download from Chrome Web Store
to-userscript download "https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa" -o json-formatter.crx

# Download using just the extension ID
to-userscript download bcjindcccaagfpapjjmafapmmgkkhgoa -o extension.crx

# Download from Firefox Add-ons
to-userscript download "https://addons.mozilla.org/addon/darkreader/" -o darkreader.xpi
```

### require - Generate @require Metadata Block

Generates a userscript metadata block with a `@require` directive pointing to another userscript file, enabling modular userscript development.

```bash
# Generate require block for a converted userscript
to-userscript require ./material-design-fileicons.user.js
# Output:
# // ==UserScript==
# // @name        Requirement
# // @require     file:///absolute/path/to/material-design-fileicons.user.js
# // ==/UserScript==

# Pipe output to clipboard (macOS)
to-userscript require ./my-script.user.js | pbcopy

# Pipe output to clipboard (Linux)
to-userscript require ./my-script.user.js | xclip -selection clipboard
```

---

## Programmatic API

### convertExtension - Core Conversion Function

The main library function for programmatic extension conversion. Accepts a configuration object specifying input directory, output file, target format, and optional settings. Returns detailed conversion results including extension metadata and statistics.

```javascript
import { convertExtension } from 'to-userscript';
import path from 'path';

async function convertMyExtension() {
  try {
    const result = await convertExtension({
      // Required: Absolute path to unpacked extension directory or archive file
      inputDir: path.resolve('./my-extension'),

      // Required: Absolute path for output file
      outputFile: path.resolve('./output/my-script.user.js'),

      // Optional: 'userscript' (default) or 'vanilla'
      target: 'userscript',

      // Optional: Preferred locale for name/description from _locales
      locale: 'en',

      // Optional: Minify output using terser
      minify: true,

      // Optional: Beautify output using prettier
      beautify: false,

      // Optional: Force overwrite existing output
      force: true
    });

    console.log('Conversion successful!');
    console.log(`Extension: ${result.extension.name} v${result.extension.version}`);
    console.log(`Description: ${result.extension.description}`);
    console.log(`Output: ${result.outputFile}`);
    console.log(`Stats:`, {
      jsFiles: result.stats.jsFiles,
      cssFiles: result.stats.cssFiles,
      assets: result.stats.assets
    });

    return result;
  } catch (error) {
    console.error('Conversion failed:', error.message);
    throw error;
  }
}

// Result structure:
// {
//   success: true,
//   outputFile: '/path/to/output.user.js',
//   extension: { name: 'My Extension', version: '1.0.0', description: '...' },
//   stats: { jsFiles: 5, cssFiles: 2, assets: 12 }
// }
```

### ConversionConfig - Configuration Interface

The configuration interface that defines all options for the conversion process, including input/output paths, target format, localization, and code processing options.

```typescript
import { ConversionConfig, ConversionContext } from 'to-userscript';

// Full configuration interface
const config: ConversionConfig = {
  // Required: Path to extension directory or archive (.crx, .xpi, .zip)
  inputDir: '/path/to/extension',

  // Required: Output file path for generated userscript
  outputFile: '/path/to/output.user.js',

  // Target output format
  // - 'userscript': Uses GM_* functions, generates ==UserScript== header
  // - 'vanilla': Uses IndexedDB storage, no userscript metadata
  target: 'userscript',

  // Preferred locale code (e.g., 'en', 'fr', 'de')
  locale: 'en',

  // Comma-separated list of file extensions to ignore during asset inlining
  ignoredAssets: 'mp4,webm,ttf,woff2',

  // Enable terser minification
  minify: false,

  // Enable prettier formatting
  beautify: true,

  // Force overwrite existing output file
  force: false
};

// Create context for custom pipeline
const context = new ConversionContext(config);
console.log(context.config.target); // 'userscript'

// Access shared state during conversion
context.set('customKey', { data: 'value' });
const data = context.get<{ data: string }>('customKey');
```

### DownloadService - Web Store Download

Service class for downloading extension archives from Chrome Web Store or Firefox Add-ons programmatically, with support for generating direct download URLs from extension IDs.

```javascript
import { DownloadService } from 'to-userscript/services/DownloadService.js';

async function downloadFromStore() {
  // Generate Chrome Web Store direct download URL from extension ID or URL
  const chromeUrl = DownloadService.getCrxUrl(
    'https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa'
  );
  console.log('Download URL:', chromeUrl);
  // Output: https://clients2.google.com/service/update2/crx?response=redirect&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3Dbcjindcccaagfpapjjmafapmmgkkhgoa%26uc

  // Generate URL from just the extension ID
  const urlFromId = DownloadService.getCrxUrl('bcjindcccaagfpapjjmafapmmgkkhgoa');

  // Download extension archive to local file
  const downloadedPath = await DownloadService.download(
    chromeUrl,
    './downloads/extension.crx'
  );
  console.log('Downloaded to:', downloadedPath);

  return downloadedPath;
}
```

### UnpackService - Archive Extraction

Service class for extracting browser extension archives (`.crx`, `.xpi`, `.zip`) to temporary directories with built-in path traversal protection for security.

```javascript
import { UnpackService } from 'to-userscript/services/UnpackService.js';
import fs from 'fs-extra';

async function extractExtension() {
  // Unpack archive to temporary directory
  // Supports .crx (Chrome), .xpi (Firefox), and .zip formats
  const tempDir = await UnpackService.unpack('./extension.crx');

  console.log('Extracted to:', tempDir);

  // Read the manifest from extracted directory
  const manifest = await fs.readJson(`${tempDir}/manifest.json`);
  console.log('Extension name:', manifest.name);
  console.log('Manifest version:', manifest.manifest_version);

  // List extracted files
  const files = await fs.readdir(tempDir);
  console.log('Extracted files:', files);

  // Clean up when done
  await fs.remove(tempDir);

  return manifest;
}

// The service includes path traversal protection:
// - Validates all extracted file paths stay within temp directory
// - Rejects archives with malicious "../" path entries
// - Throws Error: "Potential path traversal attack detected"
```

### ManifestService - Manifest Parsing

Service class for loading and normalizing browser extension manifests, supporting both Manifest V2 and V3 formats with Zod schema validation.

```javascript
import { ManifestService } from 'to-userscript/services/ManifestService.js';

async function loadAndParseManifest() {
  // Load and normalize manifest.json with Zod validation
  const manifest = await ManifestService.load('./extension/manifest.json');

  // Normalized manifest structure (same for V2 and V3)
  console.log('Name:', manifest.name);
  console.log('Version:', manifest.version);
  console.log('Description:', manifest.description);
  console.log('Manifest Version:', manifest.manifest_version);

  // Unified content_scripts access
  for (const cs of manifest.content_scripts) {
    console.log('Match patterns:', cs.matches);
    console.log('JS files:', cs.js);
    console.log('CSS files:', cs.css);
    console.log('Run at:', cs.run_at); // 'document_start', 'document_end', 'document_idle'
  }

  // Unified action (browser_action/page_action in V2, action in V3)
  console.log('Popup:', manifest.action.default_popup);
  console.log('Icon:', manifest.action.default_icon);

  // Background scripts (scripts array in V2, service_worker in V3)
  console.log('Background scripts:', manifest.background_scripts);

  // Options page
  console.log('Options page:', manifest.options_page);

  // Generate internal ID from extension name
  const internalId = ManifestService.getInternalId(manifest);
  console.log('Internal ID:', internalId); // e.g., 'my-extension-name'

  return manifest;
}
```

### AssetService - Asset Inlining

Service class for generating a complete asset map from extension resources, recursively discovering and inlining HTML, CSS, images, fonts, and other assets as text or base64-encoded data.

```javascript
import { AssetService } from 'to-userscript/services/AssetService.js';
import fs from 'fs-extra';

async function generateAssetMap() {
  const extensionRoot = './my-extension';
  const manifest = await fs.readJson(`${extensionRoot}/manifest.json`);

  // Generate asset map from extension resources
  // Recursively discovers assets from popup, options pages, and web_accessible_resources
  const assetMap = await AssetService.generateAssetMap(extensionRoot, manifest);

  // Asset map structure: { [relativePath]: content }
  // - Text files (html, css, js, json, svg): stored as plain text
  // - Binary files (png, jpg, woff2): stored as base64

  for (const [path, content] of Object.entries(assetMap)) {
    const isBase64 = !['html', 'css', 'js', 'json', 'svg'].some(ext => path.endsWith(ext));
    console.log(`${path}: ${isBase64 ? 'base64' : 'text'} (${content.length} chars)`);
  }

  // Get MIME type for a file path
  const mimeType = AssetService.getMimeType('icons/icon48.png');
  console.log('MIME type:', mimeType); // 'image/png'

  // Supported MIME types:
  // .html, .htm -> text/html
  // .js -> text/javascript
  // .css -> text/css
  // .json -> application/json
  // .png -> image/png
  // .jpg, .jpeg -> image/jpeg
  // .gif -> image/gif
  // .svg -> image/svg+xml
  // .webp -> image/webp
  // .ico -> image/x-icon
  // .woff -> font/woff
  // .woff2 -> font/woff2
  // .ttf -> font/ttf

  return assetMap;
}
```

### ResourceService - Script and Style Loading

Service class for reading content scripts and background scripts from an extension directory, organizing them by file path for later processing and injection.

```javascript
import { ResourceService } from 'to-userscript/services/ResourceService.js';

async function loadExtensionResources() {
  const baseDir = './my-extension';

  // Content script configurations from manifest
  const contentScripts = [
    {
      matches: ['*://*.example.com/*'],
      js: ['content/main.js', 'content/utils.js'],
      css: ['content/styles.css'],
      run_at: 'document_end'
    },
    {
      matches: ['*://*.github.com/*'],
      js: ['content/github.js'],
      run_at: 'document_idle'
    }
  ];

  // Load all content scripts and styles
  const resources = await ResourceService.readScriptsAndStyles(baseDir, contentScripts);

  // Resources structure:
  // {
  //   jsContents: { 'content/main.js': '...code...', 'content/utils.js': '...' },
  //   cssContents: { 'content/styles.css': '...styles...' }
  // }

  console.log('Loaded JS files:', Object.keys(resources.jsContents));
  console.log('Loaded CSS files:', Object.keys(resources.cssContents));

  // Load background scripts separately
  const backgroundScripts = ['background/service.js', 'background/api.js'];
  const bgContents = await ResourceService.readBackgroundScripts(baseDir, backgroundScripts);

  console.log('Background scripts:', Object.keys(bgContents));

  return { resources, bgContents };
}
```

---

## Polyfilled WebExtension APIs

### chrome.storage - Persistent Storage

The storage API is backed by GM_* functions (userscript target) or IndexedDB (vanilla target), supporting both callback and Promise-based patterns with change listeners.

```javascript
// Store data persistently
await chrome.storage.local.set({
  settings: { darkMode: true, fontSize: 14 },
  lastUpdated: Date.now(),
  userPrefs: { language: 'en', notifications: true }
});

// Retrieve data with default values
const result = await chrome.storage.local.get({
  settings: { darkMode: false, fontSize: 12 },  // defaults if not found
  lastUpdated: 0
});
console.log(result.settings.darkMode); // true
console.log(result.lastUpdated);       // 1699123456789

// Retrieve specific keys only
const { lastUpdated } = await chrome.storage.local.get('lastUpdated');

// Retrieve multiple keys
const data = await chrome.storage.local.get(['settings', 'userPrefs']);

// Retrieve all stored data
const allData = await chrome.storage.local.get(null);

// Remove specific keys
await chrome.storage.local.remove(['oldKey', 'deprecatedSetting']);

// Clear all storage
await chrome.storage.local.clear();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`Storage area "${areaName}" changed:`);
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`  ${key}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(newValue)}`);
  }
});

// chrome.storage.sync is aliased to local storage in the polyfill
await chrome.storage.sync.set({ syncedPref: 'value' });
const syncData = await chrome.storage.sync.get('syncedPref');
```

### chrome.runtime - Extension Runtime

Provides messaging between contexts, manifest access, URL resolution for bundled assets, and options page management.

```javascript
// Get extension manifest
const manifest = chrome.runtime.getManifest();
console.log(`Running ${manifest.name} v${manifest.version}`);
console.log('Permissions:', manifest.permissions);

// Get URL for bundled assets (returns blob: URL from inlined data)
const iconUrl = chrome.runtime.getURL('icons/icon48.png');
const img = document.createElement('img');
img.src = iconUrl;
document.body.appendChild(img);

// Load HTML asset
const popupUrl = chrome.runtime.getURL('popup/index.html');
const iframe = document.createElement('iframe');
iframe.src = popupUrl;

// Send message to other contexts (background, content scripts)
chrome.runtime.sendMessage(
  { action: 'getData', key: 'user' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('Message failed:', chrome.runtime.lastError);
      return;
    }
    console.log('Received:', response);
  }
);

// Promise-based messaging
const response = await chrome.runtime.sendMessage({ action: 'ping' });

// Listen for incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  console.log('From sender:', sender);

  if (message.action === 'getData') {
    // Async response - must return true to keep channel open
    fetchData(message.key).then(data => {
      sendResponse({ success: true, data });
    });
    return true;
  }

  // Sync response
  sendResponse({ status: 'ok', echo: message });
});

// Open extension options page (rendered as modal iframe)
chrome.runtime.openOptionsPage();

// Get extension ID
console.log('Extension ID:', chrome.runtime.id);
```

### chrome.tabs - Tab Management

Limited tab management capabilities that work within userscript constraints, including tab creation and messaging.

```javascript
// Create a new tab
const newTab = await chrome.tabs.create({
  url: 'https://example.com',
  active: true  // Focus the new tab
});
console.log('Created tab with ID:', newTab.id);

// Create background tab
await chrome.tabs.create({
  url: 'https://example.com/background-task',
  active: false
});

// Query tabs (returns current tab info in polyfill)
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
const currentTab = tabs[0];
console.log('Current URL:', currentTab.url);
console.log('Tab ID:', currentTab.id);
console.log('Is active:', currentTab.active);

// Send message to a tab (redirects to runtime.sendMessage in polyfill)
chrome.tabs.sendMessage(currentTab.id, { action: 'highlight' }, (response) => {
  console.log('Tab responded:', response);
});
```

### chrome.i18n - Internationalization

Access localized strings from the extension's `_locales` directory with placeholder substitution support.

```javascript
// Get localized message by key
const greeting = chrome.i18n.getMessage('greeting');
console.log(greeting); // "Hello!" or localized equivalent

// Get message with substitutions
// _locales/en/messages.json: { "welcome_user": { "message": "Welcome, $1!" } }
const welcome = chrome.i18n.getMessage('welcome_user', ['John']);
console.log(welcome); // "Welcome, John!"

// Multiple substitutions
// messages.json: { "file_info": { "message": "File $1 is $2 KB" } }
const fileInfo = chrome.i18n.getMessage('file_info', ['document.pdf', '256']);
console.log(fileInfo); // "File document.pdf is 256 KB"

// Get UI language
const lang = chrome.i18n.getUILanguage();
console.log('UI Language:', lang); // "en", "fr", "de", etc.

// Fallback: returns key if message not found
const missing = chrome.i18n.getMessage('nonexistent_key');
console.log(missing); // "nonexistent_key"
```

### chrome.notifications - Web Notifications

Creates native browser notifications using the Web Notifications API with automatic permission handling.

```javascript
// Create notification with options object
const notificationId = await chrome.notifications.create({
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icons/notification.png'),
  title: 'Update Available',
  message: 'A new version is ready to install.'
});
console.log('Notification ID:', notificationId);

// Create notification with custom ID
await chrome.notifications.create('download-complete', {
  type: 'basic',
  title: 'Download Complete',
  message: 'Your file has been downloaded successfully.',
  iconUrl: 'https://example.com/icon.png'
});

// Create with callback
chrome.notifications.create(
  'reminder',
  { type: 'basic', title: 'Reminder', message: 'Meeting in 5 minutes' },
  (id) => console.log('Created notification:', id)
);
```

### chrome.contextMenus - Menu Commands

Context menus are emulated using `GM_registerMenuCommand` in userscript managers, appearing in the userscript menu.

```javascript
// Create context menu item (appears in Tampermonkey menu)
const menuId = chrome.contextMenus.create({
  id: 'process-selection',
  title: 'Process Selected Text',
  contexts: ['selection'],
  onclick: (info, tab) => {
    console.log('Selected text:', info.selectionText);
    console.log('Page URL:', tab.url);
    processText(info.selectionText);
  }
});

// Create menu item with just title and callback
chrome.contextMenus.create({
  id: 'open-settings',
  title: 'Open Extension Settings',
  onclick: () => {
    chrome.runtime.openOptionsPage();
  }
});

// Remove all menu items
chrome.contextMenus.removeAll();
```

### chrome.cookies - Cookie Management

Manage cookies for accessible domains using the document.cookie API with Promise-based interface.

```javascript
// Get a specific cookie
const cookie = await chrome.cookies.get({
  url: 'https://example.com',
  name: 'session_id'
});
if (cookie) {
  console.log('Cookie value:', cookie.value);
  console.log('Expires:', new Date(cookie.expirationDate * 1000));
}

// Get all cookies for a URL
const cookies = await chrome.cookies.getAll({
  url: 'https://example.com'
});
cookies.forEach(c => console.log(`${c.name}=${c.value}`));

// Set a cookie
const newCookie = await chrome.cookies.set({
  url: 'https://example.com',
  name: 'preference',
  value: 'dark_mode',
  expirationDate: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days
});

// Remove a cookie
await chrome.cookies.remove({
  url: 'https://example.com',
  name: 'old_cookie'
});
```

---

## MigrationEngine Architecture

### MigrationEngine - Step-Based Pipeline

The core engine that orchestrates the conversion process through a series of atomic steps, each responsible for a specific transformation phase.

```javascript
import { MigrationEngine } from 'to-userscript/core/MigrationEngine.js';
import { ConversionContext } from 'to-userscript/core/ConversionContext.js';
import { LoadManifestStep } from 'to-userscript/steps/LoadManifestStep.js';
import { ProcessResourcesStep } from 'to-userscript/steps/ProcessResourcesStep.js';
import { GenerateAssetsStep } from 'to-userscript/steps/GenerateAssetsStep.js';
import { AssembleStep } from 'to-userscript/steps/AssembleStep.js';

async function runCustomPipeline() {
  // Create conversion context with configuration
  const context = new ConversionContext({
    inputDir: '/path/to/extension',
    outputFile: '/path/to/output.user.js',
    target: 'userscript',
    locale: 'en'
  });

  // Create engine and add steps
  const engine = new MigrationEngine(context);

  engine
    .addStep(new LoadManifestStep())      // 1. Parse and validate manifest.json
    .addStep(new ProcessResourcesStep())  // 2. Load all JS and CSS files
    .addStep(new GenerateAssetsStep())    // 3. Inline assets as data URLs
    .addStep(new AssembleStep());         // 4. Generate final userscript

  // Run the pipeline
  await engine.run();

  // Access results from context state
  const manifest = context.get('manifest');
  const resources = context.get('resources');
  const assetMap = context.get('assetMap');

  console.log('Converted:', manifest.name);
  console.log('JS files processed:', Object.keys(resources.jsContents).length);
  console.log('Assets inlined:', Object.keys(assetMap).length);
}
```

### Step - Custom Pipeline Steps

Abstract base class for creating custom conversion steps that integrate with the MigrationEngine pipeline.

```javascript
import { Step } from 'to-userscript/core/Step.js';

// Create a custom step
class CustomValidationStep extends Step {
  readonly name = 'Custom Validation';

  async run(context) {
    const manifest = context.get('manifest');

    // Perform custom validation
    if (!manifest.permissions?.includes('storage')) {
      context.logger.warn('Extension does not request storage permission');
    }

    // Check for unsupported features
    if (manifest.manifest_version === 3 && manifest.background?.service_worker) {
      context.logger.warn('Service workers have limited support');
    }

    // Store validation results
    context.set('validationPassed', true);
    context.set('warnings', this.warnings);
  }
}

// Use custom step in pipeline
const engine = new MigrationEngine(context);
engine
  .addStep(new LoadManifestStep())
  .addStep(new CustomValidationStep())  // Insert custom step
  .addStep(new ProcessResourcesStep())
  .addStep(new GenerateAssetsStep())
  .addStep(new AssembleStep());

await engine.run();
```

---

## Utility Functions

### RegexUtils - Match Pattern Conversion

Utility functions for converting WebExtension match patterns to JavaScript regular expressions for URL matching.

```javascript
import {
  escapeRegex,
  convertMatchPatternToRegExp,
  convertMatchPatternToRegExpString,
  matchGlobPattern
} from 'to-userscript/utils/RegexUtils.js';

// Escape special regex characters
const escaped = escapeRegex('example.com/path?query=1');
console.log(escaped); // 'example\\.com/path\\?query=1'

// Convert match pattern to RegExp string
const regexStr = convertMatchPatternToRegExpString('*://*.example.com/*');
console.log(regexStr); // '^https?:\\/\\/(?:[^\\/]+\\.)?example\\.com(?:/.*)?'

// Convert match pattern to RegExp object
const regex = convertMatchPatternToRegExp('*://*.github.com/*/issues/*');
console.log(regex.test('https://www.github.com/user/repo/issues/123')); // true
console.log(regex.test('https://github.com/org/project/issues/456'));   // true
console.log(regex.test('https://gitlab.com/user/repo/issues/123'));     // false

// Handle special <all_urls> pattern
const allUrls = convertMatchPatternToRegExp('<all_urls>');
console.log(allUrls.test('https://any-site.com/any/path')); // true

// Match glob patterns (for file paths)
console.log(matchGlobPattern('*.js', 'script.js'));           // true
console.log(matchGlobPattern('content/**/*.js', 'content/deep/file.js')); // true
console.log(matchGlobPattern('icons/*.png', 'icons/icon48.png')); // true
```

### PathUtils - Path Normalization

Utility for normalizing file paths across different operating systems, ensuring consistent forward-slash separators.

```javascript
import { normalizePath } from 'to-userscript/utils/PathUtils.js';

// Normalize Windows-style paths
const path1 = normalizePath('content\\scripts\\main.js');
console.log(path1); // 'content/scripts/main.js'

// Collapse duplicate slashes
const path2 = normalizePath('assets//images///icon.png');
console.log(path2); // 'assets/images/icon.png'

// Handle mixed separators
const path3 = normalizePath('popup\\html//index.html');
console.log(path3); // 'popup/html/index.html'
```

---

## Summary

to-userscript serves developers who need to port browser extensions to environments where native extension support is limited or unavailable. Common use cases include running Chrome extensions on mobile browsers with userscript support (like Firefox with Tampermonkey), using Firefox add-ons in Chrome via Violentmonkey, preserving extension functionality on restricted corporate browsers, creating portable versions of extensions for backup or distribution, and automating extension conversion in CI/CD pipelines for cross-platform deployment.

The tool integrates seamlessly into development workflows through both its CLI and programmatic API. For automated pipelines, import `convertExtension` directly and pass configuration objects. For quick conversions, the CLI supports various input sources including web store URLs, extension IDs, local directories, and archive files. The modular MigrationEngine architecture allows extending the conversion pipeline with custom steps, while the abstraction layer pattern makes it straightforward to add new target environments beyond userscript and vanilla JavaScript. The high-fidelity WebExtension API polyfills ensure converted scripts maintain feature parity with the original extensions, supporting storage, messaging, tabs, notifications, context menus, and internationalization out of the box.
