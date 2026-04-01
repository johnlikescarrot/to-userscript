# to-userscript

to-userscript is a powerful Node.js command-line tool that converts browser extensions (from Chrome Web Store, Firefox Add-ons, or local files) into self-contained userscripts compatible with Tampermonkey, Greasemonkey, and Violentmonkey. It parses extension manifests, inlines all assets as Data URLs, and polyfills WebExtension APIs (`chrome.storage`, `chrome.runtime`, `chrome.tabs`, etc.) to create portable `.user.js` files that work across different browsers and userscript managers.

The converter handles the complete extension lifecycle including content scripts, background scripts, options pages, and popup pages. It supports both Manifest V2 and V3 extensions, respects `_locales` directories for internationalization, and offers output options including minification via terser and beautification via prettier. The tool can download extensions directly from web stores or process local directories and archive files (`.crx`, `.xpi`, `.zip`).

## CLI Commands

### convert - Convert Extension to Userscript

The primary command that converts a browser extension from various sources into a userscript. Supports Chrome Web Store URLs, Firefox Add-ons URLs, direct download URLs, local directories, and archive files.

```bash
# Convert from Chrome Web Store with minification
to-userscript convert "https://chromewebstore.google.com/detail/modern-for-wikipedia/emdkdnnopdnajipoapepbeeiemahbjcn?hl=en" -o modern-wikipedia.user.js --minify

# Convert from Firefox Add-ons
to-userscript convert "https://addons.mozilla.org/addon/ublock-origin/" -o ublock.user.js

# Convert local extension directory
to-userscript convert ./my-extension/ -o my-script.user.js

# Convert with French localization and keep temp files for debugging
to-userscript convert ./extension.xpi --locale fr --keep-temp

# Convert to vanilla JavaScript (no userscript metadata)
to-userscript convert extension.crx --target vanilla -o extension.js

# Ignore large assets during conversion
to-userscript convert ./extension/ -o script.user.js --ignore-assets mp4,webm,ttf

# Convert with beautified output
to-userscript convert ./my-extension/ -o my-script.user.js --beautify
```

### download - Download Extension Archive

Downloads an extension archive from web stores without converting it to a userscript. Useful for inspecting extension contents or manual processing.

```bash
# Download from Chrome Web Store
to-userscript download "https://chromewebstore.google.com/detail/material-icons-for-github/bggfcpfjbdkhfhfmkjpbhnkhnpjjeomc/" -o material-icons.crx

# Download from Firefox Add-ons
to-userscript download "https://addons.mozilla.org/addon/darkreader/" -o darkreader.xpi

# Download and extract to a directory
to-userscript download "https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa" --extract --locale en

# Download with force overwrite
to-userscript download "https://addons.mozilla.org/addon/ublock-origin/" -o ublock.xpi --force
```

### require - Generate @require Metadata Block

Generates a userscript metadata block with a `@require` directive pointing to another userscript file. Useful for modular userscript development.

```bash
# Generate require block for a converted userscript
to-userscript require ./material-design-fileicons.user.js

# Pipe output to clipboard (macOS)
to-userscript require ./my-script.user.js | pbcopy

# Pipe output to clipboard (Linux)
to-userscript require ./my-script.user.js | xclip -selection clipboard
```

## Programmatic API

### convertExtension - Core Conversion Function

The main library function for programmatic extension conversion. Accepts a configuration object and returns detailed conversion results including statistics.

```javascript
const { convertExtension } = require('to-userscript/src/convert');
const path = require('path');

async function convertMyExtension() {
  try {
    const result = await convertExtension({
      // Required: Absolute path to unpacked extension directory
      inputDir: path.resolve('./my-extension'),

      // Required: Absolute path for output file
      outputFile: path.resolve('./output/my-script.user.js'),

      // Optional: 'userscript' (default) or 'vanilla'
      target: 'userscript',

      // Optional: Preferred locale for name/description
      locale: 'en',

      // Optional: Comma-separated asset extensions to ignore
      ignoredAssets: 'mp4,webm,ttf,woff2'
    });

    console.log('Conversion successful!');
    console.log(`Extension: ${result.extension.name} v${result.extension.version}`);
    console.log(`Description: ${result.extension.description}`);
    console.log(`Output: ${result.outputFile}`);
    console.log(`Stats:`, {
      jsFiles: result.stats.jsFiles,
      cssFiles: result.stats.cssFiles,
      backgroundScripts: result.stats.backgroundScripts,
      outputSize: `${(result.stats.outputSize / 1024).toFixed(2)} KB`
    });

    return result;
  } catch (error) {
    console.error('Conversion failed:', error.message);
    console.error('Input directory:', error.inputDir);
    console.error('Target:', error.target);
    throw error;
  }
}

convertMyExtension();
```

### generateRequireBlock - Create @require Metadata

Generates a userscript metadata block with a `@require` directive for referencing another userscript file.

```javascript
const { generateRequireBlock } = require('to-userscript/src/cli/require');

async function createRequireBlock() {
  try {
    const metadataBlock = await generateRequireBlock('./my-library.user.js');
    console.log(metadataBlock);
    // Output:
    // // ==UserScript==
    // // @name        My Library
    // // @version     1.0.0
    // // @require     file:///absolute/path/to/my-library.user.js
    // // ==/UserScript==

    return metadataBlock;
  } catch (error) {
    if (error.message.includes('File not found')) {
      console.error('Userscript file does not exist');
    } else if (error.message.includes('No UserScript metadata')) {
      console.error('File is not a valid userscript');
    }
    throw error;
  }
}

createRequireBlock();
```

### downloadExtension - Download from Web Stores

Downloads extension archives from Chrome Web Store or Firefox Add-ons programmatically.

```javascript
const { downloadExtension, getDownloadableUrl } = require('to-userscript/src/cli/download');

async function downloadFromStore() {
  // Define source information
  const chromeSource = {
    type: 'chrome-store',
    url: 'https://chromewebstore.google.com/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa'
  };

  const firefoxSource = {
    type: 'firefox-store',
    url: 'https://addons.mozilla.org/addon/darkreader/'
  };

  try {
    // Get the direct download URL
    const downloadUrl = await getDownloadableUrl(chromeSource);
    console.log('Download URL:', downloadUrl);

    // Download the extension
    const downloadedPath = await downloadExtension(chromeSource, './downloads');
    console.log('Downloaded to:', downloadedPath);

    return downloadedPath;
  } catch (error) {
    console.error('Download failed:', error.message);
    throw error;
  }
}

downloadFromStore();
```

## Polyfilled WebExtension APIs

### chrome.storage - Persistent Storage

The storage API is backed by GM_* functions (userscript target) or IndexedDB (vanilla target). Supports both callback and Promise-based patterns.

```javascript
// Store data
await chrome.storage.local.set({
  settings: { darkMode: true, fontSize: 14 },
  lastUpdated: Date.now()
});

// Retrieve data with defaults
const result = await chrome.storage.local.get({
  settings: { darkMode: false, fontSize: 12 },
  lastUpdated: 0
});
console.log(result.settings.darkMode); // true

// Retrieve specific keys
const { lastUpdated } = await chrome.storage.local.get('lastUpdated');

// Remove specific keys
await chrome.storage.local.remove(['oldKey', 'deprecatedSetting']);

// Clear all storage
await chrome.storage.local.clear();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`Storage area "${areaName}" changed:`, changes);
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${key}: ${oldValue} -> ${newValue}`);
  }
});

// Note: chrome.storage.sync maps to local storage in the polyfill
await chrome.storage.sync.set({ syncedPref: 'value' });
```

### chrome.runtime - Extension Runtime

Provides messaging, manifest access, and URL resolution for bundled assets.

```javascript
// Get extension manifest
const manifest = chrome.runtime.getManifest();
console.log(`Running ${manifest.name} v${manifest.version}`);

// Get URL for bundled assets (returns blob: or data: URL)
const iconUrl = chrome.runtime.getURL('icons/icon48.png');
const img = document.createElement('img');
img.src = iconUrl;

// Send message to other contexts (background, content scripts, iframes)
chrome.runtime.sendMessage({ action: 'getData', key: 'user' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError);
    return;
  }
  console.log('Received:', response);
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message from:', sender);

  if (message.action === 'getData') {
    // Async response
    fetchData(message.key).then(data => sendResponse({ data }));
    return true; // Keep channel open for async response
  }

  sendResponse({ status: 'ok' });
});

// Open options page
chrome.runtime.openOptionsPage();

// Get platform information
const platform = await chrome.runtime.getPlatformInfo();
console.log(`OS: ${platform.os}, Arch: ${platform.arch}`);
```

### chrome.tabs - Tab Management

Limited tab management capabilities that work within userscript constraints.

```javascript
// Open new tab
const newTab = await chrome.tabs.create({
  url: 'https://example.com',
  active: true
});
console.log('Created tab:', newTab.id);

// Query current tab (returns only current tab info in polyfill)
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
const currentTab = tabs[0];
console.log('Current URL:', currentTab.url);

// Send message to tab (redirects to runtime.sendMessage in polyfill)
await chrome.tabs.sendMessage(currentTab.id, { action: 'highlight' });
```

### chrome.i18n - Internationalization

Access localized strings from the extension's `_locales` directory.

```javascript
// Get localized message
const greeting = chrome.i18n.getMessage('greeting');
console.log(greeting); // "Hello!" or localized equivalent

// Get message with substitutions
const welcome = chrome.i18n.getMessage('welcome_user', ['John']);
// If _locales/en/messages.json has: "welcome_user": { "message": "Welcome, $1!" }
console.log(welcome); // "Welcome, John!"

// Get UI language
const lang = chrome.i18n.getUILanguage();
console.log('UI Language:', lang); // "en", "fr", "de", etc.
```

### chrome.notifications - Web Notifications

Creates native browser notifications using the Web Notifications API.

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
await chrome.notifications.create('custom-id', {
  type: 'basic',
  title: 'Download Complete',
  message: 'Your file has been downloaded.',
  iconUrl: 'https://example.com/icon.png'
});

// Clear notification
await chrome.notifications.clear('custom-id');

// Check permission level
const { level } = await chrome.notifications.getPermissionLevel();
if (level === 'granted') {
  console.log('Notifications are enabled');
}
```

### chrome.contextMenus - Menu Commands

Context menus are emulated using `GM_registerMenuCommand` in userscript managers.

```javascript
// Create context menu item
const menuId = chrome.contextMenus.create({
  id: 'my-menu-item',
  title: 'Process Selected Text',
  contexts: ['selection'],
  onclick: (info, tab) => {
    console.log('Selected text:', info.selectionText);
    processText(info.selectionText);
  }
});

// Update menu item
chrome.contextMenus.update('my-menu-item', {
  title: 'Process Text (Updated)',
  enabled: true
});

// Listen for menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'my-menu-item') {
    console.log('Menu clicked on:', tab.url);
  }
});

// Remove specific item
chrome.contextMenus.remove('my-menu-item');

// Remove all items
chrome.contextMenus.removeAll();
```

### chrome.cookies - Cookie Management

Manage cookies for the current domain using document.cookie.

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

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  console.log(`Cookie ${changeInfo.cookie.name} was ${changeInfo.removed ? 'removed' : 'set'}`);
  console.log('Cause:', changeInfo.cause);
});
```

## Output Structure

### Generated Userscript Format

The converter produces a self-contained IIFE with proper userscript metadata, polyfills, and execution orchestration.

```javascript
// ==UserScript==
// @name        Extension Name
// @version     1.0.0
// @description Extension description from manifest
// @namespace   extension-id
// @author      Converter Script
// @match       *://*.example.com/*
// @match       *://example.org/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_openInTab
// @grant       GM_registerMenuCommand
// @icon        data:image/png;base64,...
// @run-at      document-start
// ==/UserScript==

(function() {
  'use strict';

  // 1. UNIFIED POLYFILL
  // - Messaging system (createEventBus, createRuntime)
  // - Abstraction layer (_storageSet, _storageGet, _fetch, _openTab)
  // - Asset management (EXTENSION_ASSETS_MAP, _createAssetUrl)
  // - Chrome API polyfill (chrome.*, browser.*)

  // 2. BACKGROUND SCRIPT ENVIRONMENT
  // - Executes background scripts immediately
  // - Maintains persistent state

  // 3. ORCHESTRATION LOGIC
  // - URL matching against content_scripts patterns
  // - Phased execution: document-start, document-end, document-idle
  // - CSS injection
  // - Options/Popup page modals (iframe-based)
  // - GM_registerMenuCommand for UI access
})();
```

## Summary

to-userscript is designed for developers who need to port browser extensions to environments where native extension support is limited or unavailable. Common use cases include running Chrome extensions on mobile browsers with userscript support, using Firefox add-ons in Chrome via Tampermonkey, preserving extension functionality on restricted corporate browsers, and creating portable versions of extensions for backup or distribution.

The tool integrates seamlessly into development workflows through both its CLI and programmatic API. For automated pipelines, the `convertExtension` function can be imported directly. For quick conversions, the CLI supports piping and scripting with commands like `to-userscript convert`. The modular architecture allows extending the polyfill layer for additional WebExtension APIs, and the abstraction layer pattern makes it straightforward to add new target environments beyond userscript and vanilla JavaScript.
