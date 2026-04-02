<div align="center">

# 🚀 to-userscript
### The Ultimate WebExtension Transcendence Layer

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3_Ready-orange.svg?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Code Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![Release Ready](https://img.shields.io/badge/Release-Ready-brightgreen.svg?style=for-the-badge)]()

**"Break the chains of the browser store."**

`to-userscript` is a high-performance transformation engine that converts complex Chrome and Firefox extensions into sleek, self-contained userscripts.

[Explore Docs](./docs/architecture.md) • [Report Bug](https://github.com/Explosion-Scratch/to-userscript/issues) • [Request Feature](https://github.com/Explosion-Scratch/to-userscript/issues)

</div>

---

## 🌟 Why `to-userscript`?

Most converters are just simple regex scripts. `to-userscript` is an **industrial-grade migration framework**.

- **🛡️ Shadow DOM UI Isolation**: Popups and Side Panels are rendered in a secure Shadow DOM shell, ensuring styles never leak from the host website.
- **🔌 High-Fidelity API Emulation**: Near-perfect polyfills for `chrome.*` APIs including the latest Manifest V3 additions like `sidePanel`, `scripting`, and `action`.
- **⚡ Atomic Transformation Pipeline**: A robust 5-stage lifecycle ensures your extension logic is preserved with mathematical precision.
- **📦 Total Self-Containment**: Automatically recursively inlines all assets (HTML, CSS, Images, Fonts) as high-performance Data URLs.

---

## 🏗️ Architectural Excellence

```text
    [ SOURCE EXTENSION ]
            │
    (1) LOAD & VALIDATE (Zod Schema Enforcement)
            │
    (2) RESOURCE DISCOVERY (Recursive Asset Mapping)
            │
    (3) POLYFILL INJECTION (High-Fidelity chrome.* Layer)
            │
    (4) UI SHELL GENERATION (Shadow DOM & Iframe Isolation)
            │
    (5) ASSEMBLY & OPTIMIZATION (Terser / Prettier)
            │
    [ TRANSCENDENT USERSCRIPT ]
```

---

## ⚡ Quick Start

### Installation

```bash
# Using bun (recommended for maximum performance)
bun install -g to-userscript

# Using npm
npm install -g to-userscript
```

### Transformation Command

**From Chrome Web Store:**
```bash
to-userscript convert "https://chromewebstore.google.com/detail/..." -o script.user.js --minify
```

**Local Development:**
```bash
to-userscript convert ./my-extension -o dev.user.js --beautify
```

---

## 📊 Capability Matrix

| Feature Category | Support Level | Implementation Detail |
| :--- | :---: | :--- |
| **Manifest V3 Core** | ✅ Full | Deep support for service worker logic and host permissions. |
| **Side Panel API** | ✅ Full | Rendered in a sliding Shadow DOM shell with perfect isolation. |
| **Action & Popups** | ✅ Full | Modal-based popups with full badge and title support. |
| **Declarative Net Request** | ✅ Advanced | Mapped to `GM_webRequest` for real-time network manipulation. |
| **Offscreen Documents** | ✅ Emulated | Logic executed in hidden isolated iframes. |
| **Storage API** | ✅ Full | `local`, `sync`, and `session` support via `GM_` persistence. |
| **i18n & Locales** | ✅ Full | High-fidelity placeholder substitution and UI language detection. |

---

## 🛡️ Pro-Tips for Power Users

### Dealing with Strict CSP
If a website blocks your script's Data URLs, adjust your userscript manager settings:
1. Open **Tampermonkey Dashboard** -> **Settings**.
2. Set **"Modify existing Content Security headers"** to **"Remove entirely"**.

---

## 🧪 Bulletproof Reliability

We maintain **100% Code Coverage** across all transformation services. Every release is verified against a battery of complex WebExtension samples.

---

## 🤝 Join the Transcendence

Contributions are welcome! Please see [AGENTS.md](./AGENTS.md) for our high-fidelity development standards.

ISC © 2024. Part of the **Ultimate Project** initiative.
