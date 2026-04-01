async function main() {
    _log('Initializing userscript...');
    const polyfill = buildPolyfill();
    window.chrome = polyfill;
    window.browser = polyfill;
    {{COMBINED_EXECUTION_LOGIC}}
}
