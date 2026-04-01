// --- Abstraction Layer: Userscript Target

async function _storageSet(items) {
  try {
    for (const key in items) {
      if (items.hasOwnProperty(key)) {
        await GM_setValue(key, items[key]);
      }
    }
  } catch (e) {
    _error("GM_setValue error:", e);
    throw e;
  }
}

async function _storageGet(keys) {
  try {
    const results = {};
    let keyList = [];
    let defaults = {};

    if (keys === null) {
      // P1: Handle null (get all)
      keyList = await GM_listValues();
    } else if (typeof keys === "string") {
      keyList = [keys];
    } else if (Array.isArray(keys)) {
      keyList = keys;
    } else if (typeof keys === "object" && keys !== null) {
      // P1: Handle object (defaults pattern)
      keyList = Object.keys(keys);
      defaults = keys;
    } else {
      throw new Error("Invalid keys format for storage.get");
    }

    for (const key of keyList) {
      const storedValue = await GM_getValue(key, defaults[key]);
      results[key] = storedValue;
    }

    return results;
  } catch (e) {
    _error("storage.get error:", e);
    throw e;
  }
}

async function _storageRemove(keysToRemove) {
  const list = Array.isArray(keysToRemove) ? keysToRemove : [keysToRemove];
  for (const k of list) await GM_deleteValue(k);
}

async function _storageClear() {
  const keys = await GM_listValues();
  for (const k of keys) await GM_deleteValue(k);
}

async function _cookieList(d) { return (typeof GM_cookie !== 'undefined' && GM_cookie.list) ? new Promise((res, rej) => GM_cookie.list(d, (c, e) => e ? rej(e) : res(c))) : []; }
async function _cookieSet(d) { return (typeof GM_cookie !== 'undefined' && GM_cookie.set) ? new Promise((res, rej) => GM_cookie.set(d, (e) => e ? rej(e) : res())) : Promise.reject('GM_cookie.set N/A'); }
async function _cookieDelete(d) { return (typeof GM_cookie !== 'undefined' && GM_cookie.delete) ? new Promise((res, rej) => GM_cookie.delete(d, (e) => e ? rej(e) : res())) : Promise.reject('GM_cookie.delete N/A'); }

async function _fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      GM_xmlhttpRequest({
        method: options.method || "GET",
        url: url,
        headers: options.headers || {},
        data: options.body,
        responseType: options.responseType,
        onload: function (resp) {
          const responseHeaders = {};
          if (resp.responseHeaders) {
            resp.responseHeaders.trim().split("\r\n").forEach((h) => {
                const parts = h.match(/^([^:]+):\s*(.*)$/);
                if (parts) responseHeaders[parts[1].toLowerCase()] = parts[2];
            });
          }

          const mock = {
            ok: resp.status >= 200 && resp.status < 300,
            status: resp.status,
            statusText: resp.statusText,
            url: resp.finalUrl || url,
            headers: new Headers(responseHeaders),
            text: () => Promise.resolve(resp.responseText),
            json: () => Promise.resolve(JSON.parse(resp.responseText)),
            blob: () => Promise.resolve(resp.response),
            arrayBuffer: () => Promise.resolve(resp.response)
          };
          // P1: Resolve even on 4xx/5xx to match fetch contract
          resolve(mock);
        },
        onerror: (e) => reject(new Error("Network Error")),
        onabort: () => reject(new Error("Aborted")),
        ontimeout: () => reject(new Error("Timeout"))
      });
    } catch (e) { reject(e); }
  });
}

function _registerMenuCommand(n, f) { if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(n, f); }
function _openTab(u, a) { if (typeof GM_openInTab === 'function') GM_openInTab(u, { loadInBackground: !a }); else window.open(u, '_blank'); }
async function _initStorage() { return Promise.resolve(); }
