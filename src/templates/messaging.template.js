// -- Messaging implementation

function createEventBus(
  scopeId,
  type = "page", // "page" or "iframe"
  { allowedOrigin = "*", children = [], parentWindow = null } = {}
) {
  if (!scopeId) throw new Error("createEventBus requires a scopeId");

  const handlers = {};

  function handleIncoming(ev) {
    if (allowedOrigin !== "*" && ev.origin !== allowedOrigin) return;

    const msg = ev.data;
    if (!msg || msg.__eventBus !== true || msg.scopeId !== scopeId) return;

    const { event, payload } = msg;

    if (type === "page" && event === "__INIT__") {
      const win = ev.source;
      if (win && !children.includes(win)) {
        children.push(win);
      }
      return;
    }

    (handlers[event] || []).forEach((fn) =>
      fn(payload, { origin: ev.origin, source: ev.source })
    );
  }

  window.addEventListener("message", handleIncoming);

  function emitTo(win, event, payload) {
    const envelope = {
      __eventBus: true,
      scopeId,
      event,
      payload,
    };
    win.postMessage(envelope, allowedOrigin);
  }

  if (type === "iframe") {
    setTimeout(() => {
      const pw = parentWindow || window.parent;
      if (pw && pw.postMessage) {
        emitTo(pw, "__INIT__", null);
      }
    }, 0);
  }

  return {
    on(event, fn) {
      handlers[event] = handlers[event] || [];
      handlers[event].push(fn);
    },
    off(event, fn) {
      if (!handlers[event]) return;
      handlers[event] = handlers[event].filter((h) => h !== fn);
    },
    emit(event, payload, { to } = {}) {
      if (to) {
        if (to && typeof to.postMessage === "function") {
          emitTo(to, event, payload);
        }
        return;
      }

      (handlers[event] || []).forEach((fn) =>
        fn(payload, { origin: location.origin, source: window })
      );

      if (type === "page") {
        children.forEach((win) => emitTo(win, event, payload));
      } else {
        const pw = parentWindow || window.parent;
        if (pw && pw.postMessage) {
          emitTo(pw, event, payload);
        }
      }
    },
  };
}

function createRuntime(type = "background", bus) {
  let nextId = 1;
  const pending = {};
  const msgListeners = [];

  let nextPortId = 1;
  const ports = {};
  const onConnectListeners = [];

  if (type === "background") {
    bus.on("__REQUEST__", ({ id, message }, { source }) => {
      let responded = false,
        isAsync = false;
      function sendResponse(resp) {
        if (responded) return;
        responded = true;
        bus.emit("__RESPONSE__", { id, response: resp }, { to: source });
      }
      msgListeners.forEach((fn) => {
        try {
          const ret = fn(message, { id, tab: { id: source } }, sendResponse);
          if (ret === true || (ret && typeof ret.then === "function")) {
            isAsync = true;
          }
        } catch (e) {
          _error(e);
        }
      });
      if (!isAsync && !responded) {
        sendResponse(undefined);
      }
    });
  }

  if (type !== "background") {
    bus.on("__RESPONSE__", ({ id, response }) => {
      const entry = pending[id];
      if (!entry) return;
      entry.resolve(response);
      if (entry.callback) entry.callback(response);
      delete pending[id];
    });
  }

  function sendMessage(...args) {
    const message = args[0];
    const callback = typeof args[args.length - 1] === "function" ? args.pop() : null;
    const id = nextId++;
    const promise = new Promise((resolve) => {
      pending[id] = { resolve, callback };
      bus.emit("__REQUEST__", { id, message });
    });
    return promise;
  }

  return {
    sendMessage,
    onMessage: {
      addListener(fn) {
        msgListeners.push(fn);
      },
      removeListener(fn) {
        const i = msgListeners.indexOf(fn);
        if (i >= 0) msgListeners.splice(i, 1);
      },
    },
    connect(connectInfo = {}) {
      const name = connectInfo.name || "";
      const portId = nextPortId++;
      return {
        name,
        onMessage: { addListener: (fn) => {}, removeListener: (fn) => {} },
        onDisconnect: { addListener: (fn) => {}, removeListener: (fn) => {} },
        postMessage: (msg) => {},
        disconnect: () => {},
      };
    },
    onConnect: {
      addListener(fn) {
        if (type === "background") onConnectListeners.push(fn);
      },
      removeListener(fn) {
        const i = onConnectListeners.indexOf(fn);
        if (i >= 0) onConnectListeners.splice(i, 1);
      },
    },
  };
}
