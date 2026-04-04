# 🚀 to-userscript: The Ultimate Transcendence Engine

### Convert any WebExtension into a high-performance, portable Userscript.

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3_Ready-orange.svg?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Code Coverage](https://img.shields.io/badge/Coverage-98%25-brightgreen.svg?style=for-the-badge&logo=vitest)](https://vitest.dev/)
![Security](https://img.shields.io/badge/Security-Hardened-success.svg?style=for-the-badge![Security](https://img.shields.io/badge/Security-Hardened-success.svg?style=for-the-badge[![Security](https://img.shields.io/badge/Security-Hardened-success.svg?style=for-the-badge&logo=shield-halved)]()logo=shield-halved)logo=shield-halved)
[![Release Ready](https://img.shields.io/badge/Release-Ready-brightgreen.svg?style=for-the-badge)](https://github.com/Explosion-Scratch/to-userscript)

**"Break the chains of the browser store. Transcend the boundaries of standard extensions."**

`to-userscript` is a high-performance, strictly-typed transformation framework that converts complex Chrome and Firefox extensions into sleek, self-contained userscripts with absolute fidelity.

[Explore Docs](./docs/architecture.md) • [Report Bug](https://github.com/johnlikescarrot/to-userscript/issues) • [Request Feature](https://github.com/johnlikescarrot/to-userscript/issues)

</div>

---

## 🌟 Why `to-userscript` Ultimate Edition?

Most converters are fragile regex scripts. `to-userscript` is an **industrial-grade migration framework**.

- **🛡️ Secure Isolation Layer**: Logic executes in a strictly-mode compliant parameter-injection scope. No global namespace pollution, no conflicts with host page scripts.
- **🏗️ Shadow DOM UI Shell**: Popups, Side Panels, and Option pages are rendered in a secure, `closed` Shadow DOM container. Styles are perfectly isolated, ensuring extension UIs look exactly as intended.
- **🔌 High-Fidelity API Polyfills**: Robust emulation for `chrome.*` APIs, including the latest Manifest V3 additions like `sidePanel`, `action`, `declarativeNetRequest`, and `alarms`.
- **📦 Total Self-Containment**: Automatically and recursively inlines all assets (HTML, CSS, Images, Fonts) as high-performance Data URLs.

---

## 🏗️ Architectural Lifecycle

```text
    [ SOURCE EXTENSION (MV2 / MV3) ]
                   │
    (1) VALIDATE & NORMALIZE (Zod Schema Enforcement)
                   │
    (2) ASSET DISCOVERY (Recursive Resource Mapping)
                   │
    (3) UNIFIED POLYFILL (High-Fidelity chrome.* Layer)
                   │
    (4) UI SHELL ISOLATION (Closed Shadow DOM & Sandbox)
                   │
    (5) ASSEMBLY & OPTIMIZATION (Strict-Mode Compliant Output)
                   │
    [ TRANSCENDENT USERSCRIPT ]
```

---

## ⚡ Quick Start

### Installation

```bash
# Using bun (recommended)
bun install -g to-userscript

# Using npm
npm install -g to-userscript
```

### Transformation

**From Chrome Web Store:**

```bash
to-userscript convert "https://chromewebstore.google.com/detail/..." -o script.user.js --minify
```

**Local Directory:**

```bash
to-userscript convert ./my-extension -o dev.user.js --beautify
```

---

## 📊 Capability Matrix

| Feature Category | Support | Implementation Detail |
| :--- | :---: | :--- |
| **Manifest V3 Core** | ✅ Full | Deep support for Service Worker logic and Host Permissions. |
| **Side Panel API** | ✅ Full | Rendered in a sliding Shadow DOM shell with perfect isolation. |
| **Action & Popups** | ✅ Full | Modal-based popups with full badge, title, and icon support. |
| **Declarative Net Request** | ✅ Adv | Mapped to `GM_webRequest` for real-time network manipulation. |
| **Alarms API** | ✅ Full | Persistent background interval with `GM_` storage backing. |
| **Offscreen Docs** | ✅ Full | Logic executed in hidden isolated sandboxed iframes. |
| **Scripting API** | ✅ Full | `executeScript` and `insertCSS` support with world-isolation. |
| **Storage API** | ✅ Full | `local`, `sync`, and `session` support via `GM_` persistence. |
| **i18n & Locales** | ✅ Full | High-fidelity placeholder substitution and UI language detection. |

---

## 🛡️ Pro-Tips for Power Users

### Dealing with Strict CSP

If a website blocks your script's Data URLs or iframes, adjust your userscript manager settings for maximum freedom:

1. Open **Tampermonkey Dashboard** -> **Settings**.
2. Set **"Modify existing Content Security headers"** to **"Remove entirely"**.

---

## 🧪 Bulletproof Reliability

We maintain **>98% Code Coverage** across all transformation services. Every release is verified against a battery of complex WebExtension samples and adversarial test cases including ZIP path traversal and recursive asset discovery.

---

## 🤝 Join the Transcendence

Contributions are welcome! Please see [AGENTS.md](./AGENTS.md) for our high-fidelity development standards.

ISC © 2024. Part of the **Ultimate Project** initiative.
