# 🚀 to-userscript: The Ultimate Extension Converter

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![Release Ready](https://img.shields.io/badge/Release-Ready-brightgreen.svg)]()

> **"Transcend the browser."** Convert any Chrome or Firefox extension into a high-performance, portable userscript with a single command.

Built with an industrial-grade **Migration Engine** architecture (inspired by [gpt-migrate](https://github.com/joshpxyne/gpt-migrate)), `to-userscript` is now strictly typed, 100% tested, and ready for professional use.

---

## 🌟 Why to-userscript?

Most converters are fragile scripts. `to-userscript` is a **robust transformation framework**.

- **🛡️ Strictly Typed**: Powered by TypeScript and Zod for absolute manifest integrity.
- **⚙️ Step-Based Engine**: Atomic conversion lifecycle (Unpack → Parse → Process → Inline → Assemble).
- **📦 Zero External Dependencies**: Generates completely self-contained `.user.js` files.
- **🔌 WebExtension Polyfill**: High-fidelity emulation of `chrome.*` APIs within the userscript context.
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

Convert a local extension directory:

```bash
to-userscript convert ./my-extension -o my-awesome-script.user.js
```

Generate a vanilla JavaScript bundle:

```bash
to-userscript convert ./my-extension --target vanilla
```

---

## 🛠️ Architecture: How it Works

`to-userscript` operates using a centralized **ConversionContext** and a sequential **MigrationEngine**.

1.  **LoadManifestStep**: Validates `manifest.json` (V2/V3) using strict Zod schemas.
2.  **ProcessResourcesStep**: Loads all scripts and styles, resolving internal dependencies.
3.  **GenerateAssetsStep**: Recursively inlines extension assets (HTML, CSS, Images) into a virtual asset map.
4.  **AssembleStep**: Injects the **Unified Polyfill Layer** and orchestrates phased execution (`document-start` → `document-end` → `document-idle`).

---

## 🧪 Robustness First

We take reliability seriously. The project features:
- **100% Code Coverage**: Every utility and service is rigorously tested.
- **Match Pattern Precision**: Industrial-grade regex conversion for WebExtension match patterns.
- **Automated Build Pipeline**: Built with `tsup` for modern ESM output.

---

## 🤝 Contributing

We welcome transcendent contributions! Whether it's implementing new `chrome.*` API polyfills or enhancing the migration engine, your PRs are valued.

1.  Clone the repo.
2.  Run `bun install`.
3.  Run `npm test` to verify the 100% coverage suite.
4.  Submit your release-ready change.

---

## 📜 License

ISC © 2024. Part of the **Ultimate Project** initiative.
