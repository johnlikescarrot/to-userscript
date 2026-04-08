// --- Abstraction Layer: Vanilla Target

let vanillaStorageDB = null;
const STORAGE_DB_NAME = "VanillaExtensionStorage";
const STORAGE_DB_VERSION = 1;
const STORAGE_STORE_NAME = "storage";

async function _initStorage() {
  if (vanillaStorageDB) {
    return vanillaStorageDB;
  }

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);

      request.onerror = () => {
        const error = new Error(`Failed to open IndexedDB: ${request.error?.message || "Unknown error"}`);
        _error("IndexedDB initialization error:", error);
        reject(error);
      };

      request.onsuccess = () => {
        vanillaStorageDB = request.result;
        _log("IndexedDB storage initialized successfully");
        resolve(vanillaStorageDB);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
          db.createObjectStore(STORAGE_STORE_NAME, { keyPath: "key" });
        }
      };
    } catch (error) {
      reject(new Error(`IndexedDB not supported or initialization failed: ${error.message}`));
    }
  });
}

async function _storageSet(items) {
  const db = await _initStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORAGE_STORE_NAME);
    for (const [key, value] of Object.entries(items)) {
      store.put({ key, value });
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function _storageGet(keys) {
  const db = await _initStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_STORE_NAME], "readonly");
    const store = transaction.objectStore(STORAGE_STORE_NAME);

    if (keys === null) {
      const request = store.getAll();
      request.onsuccess = () => {
        const res = {};
        request.result.forEach(i => res[i.key] = i.value);
        resolve(res);
      };
      return;
    }

    const keyList = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
    const res = {};
    let count = 0;
    keyList.forEach(key => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) res[key] = request.result.value;
        else if (typeof keys === "object" && !Array.isArray(keys) && keys.hasOwnProperty(key)) res[key] = keys[key];
        count++;
        if (count === keyList.length) resolve(res);
      };
    });
  });
}

async function _storageRemove(keys) {
  const db = await _initStorage();
  const keyList = typeof keys === "string" ? [keys] : keys;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORAGE_STORE_NAME);
    keyList.forEach(k => store.delete(k));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function _storageClear() {
  const db = await _initStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORAGE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORAGE_STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve();
  });
}

async function _fetch(url, options = {}) {
  if (typeof _applyDnrRules === "function") {
    const action = _applyDnrRules(url, "xmlhttprequest");
    if (action.type === "block") {
      return Promise.reject(new Error("Blocked by declarativeNetRequest"));
    }
    if (action.type === "redirect" && action.redirect?.url) {
      url = action.redirect.url;
    }
  }
  return fetch(url, options);
}

function _registerMenuCommand(name, func) {
  _log(`Menu command registered (vanilla): ${name}`);
}

function _openTab(url) {
  window.open(url, "_blank");
}
