async function _storageSet(items) {
    for (const [key, val] of Object.entries(items)) {
        await GM_setValue(key, val);
    }
}
async function _storageGet(keys) {
    const res = {};
    for (const key of (Array.isArray(keys) ? keys : [keys])) {
        res[key] = await GM_getValue(key);
    }
    return res;
}
