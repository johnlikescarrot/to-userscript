// -- Messaging implementation
function createEventBus(scopeId, type = "page") {
  const handlers = {};
  window.addEventListener("message", (ev) => {
    const msg = ev.data;
    if (!msg || msg.__eventBus !== true || msg.scopeId !== scopeId) return;
    (handlers[msg.event] || []).forEach((fn) => fn(msg.payload, { source: ev.source }));
  });
  return {
    on(event, fn) { handlers[event] = handlers[event] || []; handlers[event].push(fn); },
    emit(event, payload, { to } = {}) {
      const envelope = { __eventBus: true, scopeId, event, payload };
      if (to) to.postMessage(envelope, "*");
      else window.postMessage(envelope, "*");
    }
  };
}
function createRuntime(type, bus) {
  const listeners = [];
  bus.on("__REQUEST__", (msg, { source }) => {
    listeners.forEach(fn => fn(msg.message, { tab: { id: source } }, (resp) => bus.emit("__RESPONSE__", { id: msg.id, response: resp }, { to: source })));
  });
  return {
    sendMessage(message) { bus.emit("__REQUEST__", { id: Math.random(), message }); },
    onMessage: { addListener(fn) { listeners.push(fn); } }
  };
}
