# 🚀 to-userscript: The Ultimate Extension Transmutation Engine

<div align="center">
  <img src="https://raw.githubusercontent.com/johnlikescarrot/to-userscript/main/assets/logo.png" alt="to-userscript logo" width="200" />
  <p><b>"Transcend the browser limits."</b> Convert any Chrome or Firefox extension into a high-performance, portable userscript with a single command.</p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![License: ISC](https://img.shields.io/badge/License-ISC-green.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
  ![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg?style=for-the-badge)
  ![Release Ready](https://img.shields.io/badge/Status-Release--Ready-orange.svg?style=for-the-badge)
</div>

---

## 🌟 Why to-userscript?

Most converters are fragile scripts. `to-userscript` is a **robust transformation framework** built with an industrial-grade **Migration Engine** architecture.

- **🛡️ Strictly Typed**: Powered by TypeScript and Zod for absolute manifest integrity (MV2 & MV3).
- **⚙️ Step-Based Engine**: Atomic conversion lifecycle (Unpack → Parse → Localize → Process → Inline → Assemble).
- **🔌 WebExtension Polyfill**: High-fidelity emulation of `chrome.*` APIs including Storage, Messaging, and Ports.
- **🎨 Deep Asset Inlining**: Automatically transforms images, fonts, and CSS into embedded Data URLs.
- **🌍 Automated Localization**: Full support for `_locales/` message replacement.

---

## 🚀 Quick Start

### Installation

```bash
# Using bun (recommended)
bun install -g to-userscript

# Using npm
npm install -g to-userscript
```

### Usage

**Convert from Chrome Web Store:**

```bash
to-userscript convert "https://chromewebstore.google.com/detail/..." -o wikipedia.user.js --minify
```

**Convert a local directory:**

```bash
to-userscript convert ./my-extension -o my-script.user.js
```

---

## 🛠️ CLI Commands

### `convert <source>`
The primary command to transmute an extension into a portable userscript.

**Sources:**
- **Web Store URL**: Chrome Web Store or Firefox Add-ons links.
- **Extension ID**: e.g., `abcdefghijklmnopqrstuvwxyz123456`.
- **Local Archive**: `.crx`, `.xpi`, `.zip`.
- **Local Directory**: Path to unpacked extension.

**Options:**
- `-o, --output <file>`: Output file path (default: `extension.user.js`).
- `-t, --target <type>`: `userscript` (uses GM_* APIs) or `vanilla` (uses IndexedDB).
- `--minify`: Compress generated code using Terser.
- `--beautify`: Format output using Prettier.
- `--force`: Overwrite existing output.

### `download <source>`
Download an extension archive from a web store without converting it.

### `require <userscript>`
Generates a metadata block with a `@require` directive pointing to another userscript file.

---

## 🏗️ Programmatic API

Integrate transmutation directly into your Node.js pipelines.

```javascript
import { convertExtension } from 'to-userscript';

const result = await convertExtension({
  inputDir: './my-extension',
  outputFile: './output/my-script.user.js',
  target: 'userscript',
  minify: true
});

console.log(`Transmuted: ${result.extension.name} v${result.extension.version}`);
console.log(`Stats: ${result.stats.assets} assets, ${result.stats.jsFiles} scripts`);
```

---

## 🔌 API Support Matrix

| API | Status | Feature Highlights |
| :--- | :---: | :--- |
| `chrome.storage` | ✅ Full | Support for `local`/`sync`, `onChanged` with `oldValue` diffing. |
| `chrome.runtime` | ✅ Full | Messaging, **Ports** (connect), `getURL`, `getManifest`, `openOptionsPage`. |
| `chrome.tabs` | ✅ Robust | `create`, `query`, `get`, `update`, `remove`, `sendMessage`. |
| `chrome.i18n` | ✅ Full | Comprehensive localization and placeholder substitution. |
| `chrome.notifications` | ✅ Native | Integrated with `GM_notification` for system-native alerts. |
| `chrome.contextMenus` | ✅ Full | Emulated via userscript manager menu commands. |
| `chrome.cookies` | ✅ Support | Cookie management via standard browser/GM APIs. |

---

## 🛡️ Troubleshooting (CSP)

If a script fails to load assets due to **Content Security Policy**:

1. Open your Userscript Manager Dashboard (e.g., Tampermonkey).
2. Go to **Settings** -> **Advanced**.
3. Set **"Modify existing Content Security headers"** to **"Remove entirely"**.

---

## 🧪 Robustness First

We achieve **100% Code Coverage** on core logic through rigorous automated testing. Every service and utility is verified for edge cases.

```bash
# Run the validation suite
npm test
```

---

## 📜 License

ISC © 2024. Part of the **Ultimate Project** initiative.
