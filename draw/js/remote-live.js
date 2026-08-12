(function () {
  'use strict';

  window.PacDraw = window.PacDraw || {};

  const PublicConfig = window.PacDrawPublic && PacDrawPublic.Config;
  const State = PacDraw.State;

  let latestState = null;
  let timer = null;
  let inFlight = false;
  let pending = false;
  let lastPushAt = 0;
  let lastStatus = 'idle';
  let lastError = '';

  function endpoint(path) {
    return String(PublicConfig.SUPABASE_URL || '').replace(/\/$/, '') + path;
  }

  function getToken(interactive) {
    const key = PublicConfig.LIVE_TOKEN_SESSION_KEY;
    let token = '';
    try { token = sessionStorage.getItem(key) || ''; } catch (_) {}
    if (token || !interactive) return token;

    token = window.prompt(
      'أدخل رمز شاشة العرض المباشر.\n\n' +
      'يُطلب مرة واحدة في هذا التبويب، وبعدها ستظهر القرعة على أجهزة المشاركين مباشرة.'
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
    window.dispatchEvent(new CustomEvent('pacdraw:remote-live-status', {
      detail: Object.assign({ status }, detail || {})
    }));
  }

  function sanitizeState(state) {
    if (!state || !state.selectedSport) return null;

    // IMPORTANT: drawOrder is intentionally NOT sent to Supabase.
    // The audience can only see what has already been revealed / is previewing.
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
      emit('error', { error: 'Missing Supabase public config' });
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
      const response = await fetch(
        endpoint('/rest/v1/rpc/' + encodeURIComponent(PublicConfig.LIVE_STATE_RPC)),
        {
          method: 'POST',
          headers: {
            'apikey': PublicConfig.SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            p_token: token,
            p_sport: publicState.selectedSport,
            p_state: publicState
          }),
          cache: 'no-store'
        }
      );

      const raw = await response.text();
      if (!response.ok) {
        let parsed = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch (_) {}
        const message = parsed && (parsed.message || parsed.details || parsed.hint)
          ? [parsed.message, parsed.details, parsed.hint].filter(Boolean).join(' — ')
          : ('HTTP ' + response.status + (raw ? ' — ' + raw : ''));

        if (response.status === 401 || response.status === 403 || /token/i.test(message)) {
          clearToken();
        }
        throw new Error(message);
      }

      lastPushAt = Date.now();
      lastError = '';
      emit('online', { sport: publicState.selectedSport, at: lastPushAt });
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

    const minGap = 120;
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

  function ensureToken(interactive) {
    return !!getToken(interactive !== false);
  }

  function init() {
    window.addEventListener('pacdraw:statechange', (event) => {
      if (!event.detail || event.detail.source !== 'local') return;
      schedule(event.detail.state);
    });

    if (getToken(false)) {
      const current = State.get();
      if (current && current.selectedSport) schedule(current, 0);
    }
  }

  PacDraw.RemoteLive = {
    init,
    ensureToken,
    pushNow,
    schedule,
    clearToken,
    hasToken: () => !!getToken(false),
    getStatus: () => ({ status: lastStatus, error: lastError, lastPushAt })
  };
})();
