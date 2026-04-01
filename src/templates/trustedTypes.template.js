// Needed on some sites for scripts to set .innerHTML of things.
const passThroughFunc = (string) => string;
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy("default", {
            createHTML: passThroughFunc,
            createScript: passThroughFunc,
            createScriptURL: passThroughFunc,
        });
    }
}
