// -- Messaging implementation

function createEventBus(scopeId, type = "page") {
  const handlers = {};
  const children = [];

  window.addEventListener("message", (ev) => {
    const msg = ev.data;
    if (!msg || msg.__eventBus !== true || msg.scopeId !== scopeId) return;

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
    off(event, fn) {
        if (!handlers[event]) return;
        const index = handlers[event].indexOf(fn);
        if (index >= 0) handlers[event].splice(index, 1);
    },
    emit(event, payload, { to } = {}) {
      const envelope = { __eventBus: true, scopeId, event, payload };
      if (to) {
        to.postMessage(envelope, "*");
      } else {
        // Broadcast
        (handlers[event] || []).forEach(fn => fn(payload, { source: window }));
        if (type === "page") children.forEach(c => c.postMessage(envelope, "*"));
        else window.parent.postMessage(envelope, "*");
      }
    }
  };
}

function createRuntime(type, bus) {
  let nextId = 1;
  const pending = {};
  const listeners = [];
  const connectListeners = [];

  function createPort(portId, name, source) {
    const onMessageListeners = [];
    const onDisconnectListeners = [];
    let disconnected = false;

    const port = {
      name,
      onMessage: {
        addListener: (fn) => onMessageListeners.push(fn),
        removeListener: (fn) => {
          const i = onMessageListeners.indexOf(fn);
          if (i >= 0) onMessageListeners.splice(i, 1);
        }
      },
      onDisconnect: {
        addListener: (fn) => onDisconnectListeners.push(fn),
        removeListener: (fn) => {
          const i = onDisconnectListeners.indexOf(fn);
          if (i >= 0) onDisconnectListeners.splice(i, 1);
        }
      },
      postMessage: (msg) => {
        if (disconnected) throw new Error("Attempt to use a closed port.");
        bus.emit("__PORT_MSG__", { portId, message: msg }, { to: source });
      },
      disconnect: () => {
        if (disconnected) return;
        disconnected = true;
        bus.emit("__PORT_DISCONNECT__", { portId }, { to: source });
        onDisconnectListeners.forEach(fn => fn(port));
      }
    };

    const msgHandler = (payload, meta) => {
      if (payload.portId === portId) {
        onMessageListeners.forEach(fn => fn(payload.message, port));
      }
    };

    const disconnectHandler = (payload) => {
      if (payload.portId === portId && !disconnected) {
        disconnected = true;
        bus.off("__PORT_MSG__", msgHandler);
        bus.off("__PORT_DISCONNECT__", disconnectHandler);
        onDisconnectListeners.forEach(fn => fn(port));
      }
    };

    bus.on("__PORT_MSG__", msgHandler);
    bus.on("__PORT_DISCONNECT__", disconnectHandler);

    return port;
  }

  if (type === "background") {
    bus.on("__REQUEST__", ({ id, message }, { source }) => {
      let responded = false, isAsync = false;
      function sendResponse(resp) {
        if (responded) return;
        responded = true;
        bus.emit("__RESPONSE__", { id, response: resp }, { to: source });
      }

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

    bus.on("__CONNECT__", ({ portId, name }, { source }) => {
        const port = createPort(portId, name, source);
        connectListeners.forEach(fn => fn(port));
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

  function connect(info = {}) {
    const portId = Math.random().toString(36).substring(7);
    const name = info.name || "";
    // Connect always goes to background in this polyfill
    bus.emit("__CONNECT__", { portId, name });
    return createPort(portId, name, null); // null 'to' means broadcast/parent which background listens to
  }

  return {
    sendMessage,
    connect,
    onMessage: {
      addListener(fn) { listeners.push(fn); },
      removeListener(fn) {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      }
    },
    onConnect: {
        addListener(fn) { connectListeners.push(fn); },
        removeListener(fn) {
            const i = connectListeners.indexOf(fn);
            if (i >= 0) connectListeners.splice(i, 1);
        }
    }
  };
}
