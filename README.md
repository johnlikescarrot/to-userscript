# 🚀 to-userscript: The Ultimate Extension Converter

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![Release Ready](https://img.shields.io/badge/Release-Ready-brightgreen.svg)]()

> **"Transcend the browser."** Convert any Chrome or Firefox extension into a high-performance, portable userscript with a single command.

Built with an industrial-grade **Migration Engine** architecture (inspired by [gpt-migrate](https://github.com/joshpxyne/gpt-migrate)), `to-userscript` is strictly typed, 100% tested, and ready for professional use.

---

## 🌟 Why to-userscript?

Most converters are fragile scripts. `to-userscript` is a **robust transformation framework**.

- **🛡️ Strictly Typed**: Powered by TypeScript and Zod for absolute manifest integrity.
- **⚙️ Step-Based Engine**: Atomic conversion lifecycle (Unpack → Parse → Process → Inline → Assemble).
- **📦 Zero External Dependencies**: Generates completely self-contained `.user.js` files.
- **🔌 WebExtension Polyfill**: High-fidelity emulation of `chrome.*` APIs (Storage, Messaging, Tabs, etc.).
- **🎨 Asset Inlining**: Automatically converts images, fonts, and CSS into embedded Data URLs.

---

## ⚡ Quick Start

### Installation

```bash
# Using bun (recommended)
bun install -g to-userscript

# Using npm
npm install -g to-userscript
```

### Usage

**Convert a local directory:**
```bash
to-userscript convert ./my-extension -o my-script.user.js
```

**Convert from Chrome Web Store:**
```bash
to-userscript convert "https://chromewebstore.google.com/detail/..." -o wikipedia.user.js
```

**Options:**
- `-o, --output`: Specify output path.
- `-t, --target`: `userscript` (default) or `vanilla`.
- `--minify`: Compress the generated code.
- `--beautify`: Format the output for readability.
- `--locale`: Set preferred localization.
- `--ignore-assets`: Comma-separated list of extensions to skip.

---

## 🛠️ Architecture: How it Works

`to-userscript` operates using a centralized **ConversionContext** and a sequential **MigrationEngine**.

1.  **LoadManifestStep**: Validates `manifest.json` (V2/V3) using strict Zod schemas and normalizes it.
2.  **ProcessResourcesStep**: Loads all scripts and styles, resolving internal dependencies.
3.  **GenerateAssetsStep**: Recursively inlines extension assets (HTML, CSS, Images) into a virtual map.
4.  **AssembleStep**: Injects the **Unified Polyfill Layer** and orchestrates phased execution.

---

## 🔌 Polyfill Status

| API | Status | Notes |
| --- | --- | --- |
| `chrome.storage` | ✅ Full | Support for `local`, `sync`, and `managed` areas. |
| `chrome.runtime` | ✅ Full | High-fidelity messaging, port connections, and manifest access. |
| `chrome.tabs` | ✅ Partial | Support for `create`, `query`, and `sendMessage`. |
| `chrome.i18n` | ✅ Full | Comprehensive localized messaging. |
| `chrome.cookies` | ✅ Full | Cookie management within the userscript context. |
| `chrome.notifications` | ✅ Full | Native Web Notifications integration. |
| `chrome.contextMenus` | ✅ Full | Emulated via userscript menu commands. |

---

## 🛡️ Troubleshooting (CSP)

Some websites have strict **Content Security Policies** that block Data URLs or Blobs. If your script doesn't work:

1. Open Tampermonkey Dashboard.
2. Go to **Settings** -> **Advanced**.
3. Set **"Modify existing Content Security headers"** to **"Remove entirely"**.

---

## 🧪 Robustness First

We take reliability seriously.
- **100% Coverage foundations**: Every core service and utility is rigorously tested.
- **Industrial Regex**: Transcendent Match Pattern conversion for precise URL targeting.
- **Modern Build**: Compiled with `tsup` for maximum performance and ESM compatibility.

---

## 🤝 Contributing

We welcome transcendent contributions! Clone the repo, run `bun install`, and `npm test` to verify the suite.

---

## 📜 License

ISC © 2024. Part of the **Ultimate Project** initiative.
