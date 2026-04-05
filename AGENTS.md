# Agent Guidelines: to-userscript Development

You are an expert software engineer working on the `to-userscript` converter. Follow these rules to maintain the project's transcendent quality.

## 🎯 Core Objectives

1. **Maintain 100% Code Coverage**: Every new feature or bug fix MUST be accompanied by comprehensive tests.
2. **Strict Manifest Integrity**: Ensure any changes to manifest parsing align with the latest Chrome/Firefox standards.
3. **Polyfill Fidelity**: Always prioritize high-fidelity emulation of `chrome.*` APIs using `GM_` functions.

## 🛠️ Development Workflow

- **Code Organization**: Core logic resides in `src/services/`, while the transformation lifecycle is managed in `src/steps/`.
- **Templates**: Code generated for the userscript must be edited in `src/templates/`. Always use placeholders like `{{PLACEHOLDER}}` for dynamic injection.
- **Paths**: Always use `normalizePath` from `src/utils/PathUtils.ts` to ensure cross-platform compatibility.

## ✅ Verification Checklist

- [ ] `npm run lint`: No type errors.
- [ ] `npm run test:coverage`: 100% coverage achieved.
- [ ] Manual Check: Convert a test extension and verify the output script loads without syntax errors.

## 🚀 Release Readiness

The project is considered release-ready when:
- README.md is up-to-date with all supported APIs.
- All core services are strictly typed and tested.
- CLI provides clear, colorized feedback via `Logger.ts`.
