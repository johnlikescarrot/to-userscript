// -- Polyfill Implementation
function buildPolyfill({ isBackground = false } = {}) {
  const BUS = createEventBus("{{SCRIPT_ID}}");
  const RUNTIME = createRuntime(isBackground ? "background" : "tab", BUS);
  return {
    runtime: {
      ...RUNTIME,
      getURL: (path) => EXTENSION_ASSETS_MAP[path] ? URL.createObjectURL(new Blob([EXTENSION_ASSETS_MAP[path]])) : path,
      getManifest: () => ({{INJECTED_MANIFEST}})
    },
    storage: {
      local: {
        get: (keys) => Promise.resolve({}),
        set: (items) => Promise.resolve()
      }
    }
  };
}
