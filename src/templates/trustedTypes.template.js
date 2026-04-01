// P1: Limit Trusted Types policy to only createHTML
const passThroughFunc = (string) => string;
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy("default", {
            createHTML: passThroughFunc,
            // createScript and createScriptURL are intentionally excluded for security
        });
    }
}
