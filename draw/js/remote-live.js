(function () {
  'use strict';

  window.PacDraw = window.PacDraw || {};

  const PublicConfig = window.PacDrawPublic && PacDrawPublic.Config;
  const State = PacDraw.State;

  let client = null;
  let latestState = null;
  let timer = null;
  let inFlight = false;
  let pending = false;
  let lastPushAt = 0;
  let lastStatus = 'idle';
  let lastError = '';

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library did not load');
    }
    client = window.supabase.createClient(
      PublicConfig.SUPABASE_URL,
      PublicConfig.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      }
    );
    return client;
  }

  function getToken(interactive) {
    const key = PublicConfig.LIVE_TOKEN_SESSION_KEY;
    let token = '';
    try { token = sessionStorage.getItem(key) || ''; } catch (_) {}
    if (token || !interactive) return token;

    token = window.prompt(
      'أدخل رمز شاشة العرض المباشر.\n\n' +
      'سيتم حفظه في هذا التبويب فقط، ولن يظهر للمشاركين.'
    ) || '';

    token = token.trim();
    if (token) {
      try { sessionStorage.setItem(key, token); } catch (_) {}
    }
    return token;
  }

  function clearToken() {
    try { sessionStorage.removeItem(PublicConfig.LIVE_TOKEN_SESSION_KEY); } catch (_) {}
  }

  function emit(status, detail) {
    lastStatus = status;
    if (detail && detail.error) lastError = detail.error;
    if (status === 'online') lastError = '';
    window.dispatchEvent(new CustomEvent('pacdraw:remote-live-status', {
      detail: Object.assign({ status }, detail || {})
    }));
  }

  function sanitizeState(state) {
    if (!state || !state.selectedSport) return null;

    // Never expose the hidden secure draw order to the audience.
    return {
      version: state.version || null,
      selectedSport: state.selectedSport,
      phase: state.phase,
      sessionId: state.sessionId || null,
      startedAt: state.startedAt || null,
      completedAt: state.completedAt || null,
      updatedAt: new Date().toISOString(),
      participants: Array.isArray(state.participants)
        ? state.participants.map((p) => ({ id: String(p.id || ''), name: String(p.name || '') }))
        : [],
      previewParticipantId: state.previewParticipantId || null,
      slotAId: state.slotAId || null,
      slotBId: state.slotBId || null,
      matches: Array.isArray(state.matches)
        ? state.matches.map((m, index) => ({
            number: Number(m.number) || index + 1,
            aId: m.aId || null,
            bId: m.bId || null,
            aName: String(m.aName || ''),
            bName: String(m.bName || ''),
            lockedAt: m.lockedAt || null
          }))
        : []
    };
  }

  async function send(state, interactive) {
    if (!PublicConfig || !PublicConfig.SUPABASE_URL || !PublicConfig.SUPABASE_PUBLISHABLE_KEY) {
      emit('error', { error: 'Missing Supabase configuration' });
      return false;
    }

    const publicState = sanitizeState(state);
    if (!publicState) return false;

    const token = getToken(!!interactive);
    if (!token) {
      emit('token-needed');
      return false;
    }

    inFlight = true;
    emit('syncing', { sport: publicState.selectedSport });

    try {
      const sb = getClient();
      const { data, error } = await sb.rpc(PublicConfig.LIVE_STATE_RPC, {
        p_token: token,
        p_sport: publicState.selectedSport,
        p_state: publicState
      });

      if (error) {
        const message = [error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Unknown Supabase error';
        if (/token|permission|unauthorized|forbidden/i.test(message)) clearToken();
        throw new Error(message);
      }

      lastPushAt = Date.now();
      emit('online', { sport: publicState.selectedSport, at: lastPushAt, response: data || null });
      return true;
    } catch (error) {
      console.error('PAC-DRAW remote live sync failed:', error);
      emit('error', { sport: publicState.selectedSport, error: error.message || String(error) });
      return false;
    } finally {
      inFlight = false;
      if (pending) {
        pending = false;
        schedule(latestState, 40);
      }
    }
  }

  function schedule(state, forcedDelay) {
    if (!state || !state.selectedSport) return;
    latestState = state;

    if (!getToken(false)) return;
    if (inFlight) {
      pending = true;
      return;
    }
    if (timer) return;

    // Coalesce very fast animation updates but still feel live to the audience.
    const minGap = 140;
    const gap = Date.now() - lastPushAt;
    const delay = forcedDelay != null ? forcedDelay : Math.max(0, minGap - gap);
    timer = setTimeout(() => {
      timer = null;
      send(latestState, false);
    }, delay);
  }

  function pushNow(state, interactive) {
    latestState = state || State.get();
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (inFlight) {
      pending = true;
      return Promise.resolve(false);
    }
    return send(latestState, !!interactive);
  }

  async function connectAndTest() {
    if (!getToken(true)) return false;
    const ok = await pushNow(State.get(), false);
    if (!ok) {
      const status = getStatus();
      window.alert('فشل ربط شاشة المشاركين.\n\n' + (status.error || 'راجع إعداد Supabase ثم حاول مرة أخرى.'));
    }
    return ok;
  }

  function ensureToken(interactive) {
    return !!getToken(interactive !== false);
  }

  function init() {
    try { getClient(); } catch (error) {
      emit('error', { error: error.message || String(error) });
      return;
    }

    window.addEventListener('pacdraw:statechange', (event) => {
      if (!event.detail || event.detail.source !== 'local') return;
      schedule(event.detail.state);
    });

    if (getToken(false)) {
      const current = State.get();
      if (current && current.selectedSport) schedule(current, 0);
    }
  }

  function getStatus() {
    return { status: lastStatus, error: lastError, lastPushAt };
  }

  PacDraw.RemoteLive = {
    init,
    ensureToken,
    connectAndTest,
    pushNow,
    schedule,
    clearToken,
    hasToken: () => !!getToken(false),
    getStatus
  };
})();
