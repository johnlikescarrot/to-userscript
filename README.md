# 🚀 to-userscript: The Transcendent Transformation Layer

<div align="center">

[![Release](https://img.shields.io/badge/Release--Candidate-v1.1.0--Transcendent-success.svg?style=for-the-badge&logo=rocket)](https://github.com/explosion-scratch/to-userscript)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-success.svg?style=for-the-badge&logo=vitest)](https://github.com/explosion-scratch/to-userscript)
[![Security](https://img.shields.io/badge/Security-Isolated-blue.svg?style=for-the-badge&logo=shield-halved)](https://github.com/explosion-scratch/to-userscript)
[![Architecture](https://img.shields.io/badge/Architecture-Step--Based-orange.svg?style=for-the-badge&logo=diagram-project)](https://github.com/explosion-scratch/to-userscript)

**"Transcend the Browser."** Convert any Chrome or Firefox extension into a high-performance, portable userscript with a single command.

Built with an industrial-grade **Migration Engine**, `to-userscript` is strictly typed, 100% tested, and ready for professional deployment.

[Explore Docs](./docs/architecture.md) • [Report Bug](https://github.com/explosion-scratch/to-userscript/issues) • [Request Feature](https://github.com/explosion-scratch/to-userscript/issues)

</div>

---

## 🌟 Why to-userscript?

Most converters are fragile scripts. `to-userscript` is a **robust transformation framework**.

- **🛡️ Strictly Typed**: Powered by TypeScript and Zod for absolute manifest integrity.
- **⚙️ Step-Based Engine**: Atomic conversion lifecycle (Unpack → Parse → Process → Inline → Assemble).
- **📦 Zero External Dependencies**: Generates completely self-contained `.user.js` files.
- **🔌 High-Fidelity Polyfill**: Emulates modern Chrome APIs (SidePanel, Action, Scripting, DNR) inside a secure isolation layer.
- **🎨 Asset Inlining**: Recursively converts HTML, CSS, and binary images into embedded Data/Blob URLs.

---

## 📊 Capability Matrix (Manifest V3 Support)

| WebExtension API | Status | Implementation Note |
| :--- | :---: | :--- |
| `chrome.action` | ✅ FULL | Support for badges, icons, and popups via Shadow DOM HUD. |
| `chrome.sidePanel` | ✅ FULL | Isolated SidePanel UI rendered in a closed Shadow DOM container. |
| `chrome.scripting` | ✅ FULL | Dynamic execution via strict parameter-injection model. |
| `chrome.offscreen` | ✅ FULL | Managed hidden iframes for DOM-requiring background tasks. |
| `chrome.storage` | ✅ FULL | Support for `local`, `sync`, `session`, and `managed` areas. |
| `chrome.runtime` | ✅ FULL | High-fidelity messaging, port connections, and asset resolution. |
| `chrome.tabs` | 🟡 PARTIAL | Support for `create`, `query`, and `sendMessage`. |
| `chrome.i18n` | ✅ FULL | Comprehensive localized messaging with global placeholder replacement. |

---

## 🛠️ Architecture: The Transformation Lifecycle

`to-userscript` operates as a sequential pipeline of atomic transformation steps, ensuring maximum reliability and output quality.

```mermaid
graph TD
    A[Extension Archive/Dir] --> B(UnpackService)
    B --> C(LoadManifestStep)
    C --> D{Manifest Version?}
    D -- V2 --> E(Normalization)
    D -- V3 --> E
    E --> F(ProcessResourcesStep)
    F --> G(GenerateAssetsStep)
    G --> H(AssembleStep)
    H --> I[Final .user.js]

    subgraph "High-Fidelity Polyfill Layer"
    J[messaging.js]
    K[abstractionLayer.js]
    L[polyfill.js]
    end

    H -.-> J
    H -.-> K
    H -.-> L
```

---

## 🛡️ Security & Isolation

We implement a multi-layered isolation strategy to ensure extension code never conflicts with the host page:

1. **Parameter Injection Architecture**: Scripts are executed inside a `new Function` scope with explicit global overrides (`chrome`, `window`, `self`). No `with` statements, no global pollution.
2. **Shadow DOM UI Shell**: Popups, Options, and Side Panels are mounted into a **closed Shadow DOM** to prevent CSS leakage from or into the host page.
3. **Internal Messaging Hub**: A robust `postMessage` event bus simulates the WebExtension runtime across main and iframe contexts.

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

---

## 🛡️ Troubleshooting (CSP)

Some websites have strict **Content Security Policies** that block Data URLs or Blobs. If your script doesn't work:

1. Open Tampermonkey Dashboard.
2. Go to **Settings** -> **Advanced**.
3. Set **"Modify existing Content Security headers"** to **"Remove entirely"**.

---

## 📜 License

ISC © 2024. Part of the **Ultimate Project** initiative.
