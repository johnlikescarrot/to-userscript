// -- Messaging implementation

function createEventBus(scopeId, type = "page") {
  const handlers = {};
  const children = [];

  window.addEventListener("message", (ev) => {
    const msg = ev.data;
    if (!msg || msg.__eventBus !== true || msg.scopeId !== scopeId) return;

    // Handle intra-window broadcast from other bus instances
    // P1: Handle broadcasted events from the same window context
    if (msg.__isBroadcast && ev.source === window) {
      (handlers[msg.event] || []).forEach((fn) => fn(msg.payload, { source: ev.source }));
      return;
    }

    if (type === "page" && msg.event === "__INIT__") {
      if (ev.source && !children.includes(ev.source)) children.push(ev.source);
      return;
    }

    (handlers[msg.event] || []).forEach((fn) => fn(msg.payload, { source: ev.source }));
  });

  if (type === "iframe") {
    setTimeout(() => window.parent.postMessage({ __eventBus: true, scopeId, event: "__INIT__" }, "*"), 0);
  }

  return {
    on(event, fn) { handlers[event] = handlers[event] || []; handlers[event].push(fn); },
    emit(event, payload, { to, __isBroadcast = false } = {}) {
      const envelope = { __eventBus: true, scopeId, event, payload };
      if (to) {
        to.postMessage(envelope, "*");
      } else {
        // Local handlers
        (handlers[event] || []).forEach(fn => fn(payload, { source: window }));

        // Downward broadcast (to iframes)
        if (type === "page") children.forEach(c => c.postMessage(envelope, "*"));

        // Upward broadcast (to parent)
        if (type === "iframe") window.parent.postMessage(envelope, "*");

        // Intra-window broadcast (to other instances in same window/context)
        // P1: Loop prevention via __isBroadcast flag
        if (!__isBroadcast) {
          window.postMessage({ ...envelope, __isBroadcast: true }, "*");
        }
      }
    }
  };
}

function createRuntime(type, bus) {
  let nextId = 1;
  const pending = {};
  const listeners = [];

  if (type === "background") {
    bus.on("__REQUEST__", ({ id, message }, { source }) => {
      let responded = false, isAsync = false;
      function sendResponse(resp) {
        if (responded) return;
        responded = true;
        bus.emit("__RESPONSE__", { id, response: resp }, { to: source });
      }

      // P1: Wrapped in try-catch and added async Promise detection
      listeners.forEach(fn => {
        try {
          const ret = fn(message, { tab: { id: source } }, sendResponse);
          if (ret === true || (ret && typeof ret.then === "function")) {
            isAsync = true;
            if (ret && typeof ret.then === "function") {
              ret.then(sendResponse).catch(err => {
                  _error("Async message listener error:", err);
                  sendResponse(undefined);
              });
            }
          }
        } catch(e) {
          _error("Message listener error:", e);
        }
      });

      if (!isAsync && !responded) sendResponse(undefined);
    });
  }

  if (type !== "background") {
    bus.on("__RESPONSE__", ({ id, response }) => {
      const entry = pending[id];
      if (entry) {
        entry.resolve(response);
        if (entry.callback) entry.callback(response);
        delete pending[id];
      }
    });
  }

  function sendMessage(...args) {
    const message = args[0];
    const callback = typeof args[args.length - 1] === "function" ? args.pop() : null;
    const id = nextId++;
    return new Promise((resolve) => {
      pending[id] = { resolve, callback };
      bus.emit("__REQUEST__", { id, message });
    });
  }

  return {
    sendMessage,
    onMessage: {
      addListener(fn) { listeners.push(fn); },
      removeListener(fn) {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      }
    },
    connect(info = {}) {
      return {
        name: info.name, onMessage: { addListener: () => {} },
        onDisconnect: { addListener: () => {} }, postMessage: () => {}, disconnect: () => {}
      };
    }
  };
}
