(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;
  let channel = null;
  let role = 'unknown';
  let clientId = null;
  let heartbeatTimer = null;
  let connectionTimer = null;
  const lastSeen = { controller: 0, display: 0 };

  function makeClientId() {
    try { return PacDraw.Random.randomHex(6); }
    catch (_) { return Math.random().toString(36).slice(2, 10); }
  }

  function peerRole() {
    return role === 'display' ? 'controller' : 'display';
  }

  function emitConnection() {
    const target = peerRole();
    const connected = Date.now() - (lastSeen[target] || 0) < Config.PEER_TIMEOUT_MS;
    window.dispatchEvent(new CustomEvent('pacdraw:connection', {
      detail: { role, peer: target, connected }
    }));
  }

  function post(message) {
    if (!channel) return;
    channel.postMessage(Object.assign({
      clientId,
      role,
      sentAt: Date.now()
    }, message));
  }

  function markPeer(message) {
    if (!message || message.clientId === clientId) return;
    if (message.role === 'controller' || message.role === 'display') {
      lastSeen[message.role] = Date.now();
      emitConnection();
    }
  }

  function onMessage(event) {
    const message = event.data || {};
    if (message.clientId === clientId) return;
    markPeer(message);

    if (message.type === 'state' && message.state) {
      State.applyRemote(message.state);
      return;
    }
    if (message.type === 'request_state') {
      post({ type: 'state', state: State.get() });
      return;
    }
    if (message.type === 'ping') {
      post({ type: 'pong' });
    }
  }

  function init(nextRole) {
    role = nextRole || 'unknown';
    clientId = makeClientId();

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(Config.CHANNEL_NAME);
      channel.addEventListener('message', onMessage);
    }

    window.addEventListener('storage', (event) => {
      if (event.key !== Config.STORAGE_KEY || !event.newValue) return;
      try { State.applyPersisted(JSON.parse(event.newValue)); }
      catch (_) { /* ignore malformed storage */ }
    });

    window.addEventListener('pacdraw:statechange', (event) => {
      if (!event.detail || event.detail.source !== 'local') return;
      post({ type: 'state', state: event.detail.state });
    });

    post({ type: 'hello' });
    post({ type: 'request_state' });

    heartbeatTimer = window.setInterval(() => post({ type: 'ping' }), 1700);
    connectionTimer = window.setInterval(emitConnection, 1200);
    return { role, clientId };
  }

  function destroy() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (connectionTimer) clearInterval(connectionTimer);
    if (channel) channel.close();
    channel = null;
  }

  PacDraw.Sync = {
    init,
    destroy,
    sendState: () => post({ type: 'state', state: State.get() }),
    isPeerConnected: () => Date.now() - (lastSeen[peerRole()] || 0) < Config.PEER_TIMEOUT_MS
  };
})();
