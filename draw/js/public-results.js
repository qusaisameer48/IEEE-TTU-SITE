(function () {
  'use strict';

  const PublicConfig = PacDrawPublic.Config;
  const SPORTS = Object.freeze({
    football:    { key: 'football',    icon: '⚽', name: 'FOOTBALL',     round: 'QUARTER FINALS', count: 4, accent: '#00E1FF' },
    basketball:  { key: 'basketball',  icon: '🏀', name: 'BASKETBALL',   round: 'SEMI FINALS',    count: 2, accent: '#FF9D2E' },
    tabletennis: { key: 'tabletennis', icon: '🏓', name: 'TABLE TENNIS', round: 'ROUND OF 16',    count: 8, accent: '#FF4B4B' },
    badminton:   { key: 'badminton',   icon: '🏸', name: 'BADMINTON',    round: 'QUARTER FINALS', count: 4, accent: '#B47CFF' }
  });

  const $ = (selector) => document.querySelector(selector);
  let client = null;
  let channel = null;
  let rowsBySport = {};
  let selectedSport = null;
  let lastError = '';
  let lastRenderedFingerprint = '';
  let realtimeReady = false;
  let initialReadDone = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    return String(value).padStart(2, '0');
  }

  function participantName(state, id) {
    if (!state || !Array.isArray(state.participants)) return '';
    const participant = state.participants.find((item) => item.id === id);
    return participant ? String(participant.name || '') : '';
  }

  function timeoutFetch(input, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const merged = Object.assign({}, init || {}, { signal: controller.signal });
    return fetch(input, merged).finally(() => clearTimeout(timer));
  }

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library did not load');
    }
    client = window.supabase.createClient(
      PublicConfig.SUPABASE_URL,
      PublicConfig.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: timeoutFetch },
        realtime: { params: { eventsPerSecond: 20 } }
      }
    );
    return client;
  }

  function setBadge(selector, mode, text, title) {
    const badge = $(selector);
    if (!badge) return;
    badge.classList.remove('offline', 'online', 'loading', 'live');
    badge.classList.add(mode);
    badge.textContent = text;
    badge.title = title || '';
  }

  function renderConnectionBadge() {
    if (lastError && !initialReadDone) {
      setBadge('#public-sync-status', 'offline', 'CONNECTION ERROR', lastError);
      setBadge('#remote-live-status', 'offline', 'CONNECTION ERROR', lastError);
      return;
    }
    if (!initialReadDone) {
      setBadge('#public-sync-status', 'loading', 'CONNECTING…');
      setBadge('#remote-live-status', 'loading', 'CONNECTING…');
      return;
    }
    setBadge('#public-sync-status', 'online', realtimeReady ? 'LIVE LINK ✓' : 'LIVE DISPLAY READY');
    if (!selectedSport) return;
    const status = sportStatus(selectedSport);
    if (status.cls === 'live') setBadge('#remote-live-status', 'live', 'LIVE NOW ●');
    else if (status.cls === 'ready') setBadge('#remote-live-status', 'online', 'DRAW COMPLETE ✓');
    else setBadge('#remote-live-status', 'online', 'WAITING FOR DRAW');
  }

  function normalizeRemoteState(row) {
    if (!row || !row.state || typeof row.state !== 'object') return null;
    const state = row.state;
    if (!SPORTS[row.sport] || state.selectedSport !== row.sport) return null;
    if (!Array.isArray(state.participants)) state.participants = [];
    if (!Array.isArray(state.matches)) state.matches = [];
    return state;
  }

  function upsertRow(row) {
    if (!row || !SPORTS[row.sport]) return;
    rowsBySport[row.sport] = row;
    lastError = '';
    initialReadDone = true;
    render();
  }

  async function fetchLiveStates() {
    try {
      const sb = getClient();
      const { data, error } = await sb
        .from(PublicConfig.LIVE_STATE_TABLE)
        .select('sport,state,updated_at')
        .order('sport', { ascending: true });

      if (error) throw error;
      const next = {};
      (Array.isArray(data) ? data : []).forEach((row) => {
        if (SPORTS[row.sport]) next[row.sport] = row;
      });
      rowsBySport = next;
      lastError = '';
      initialReadDone = true;
      render();
    } catch (error) {
      lastError = error.message || String(error);
      initialReadDone = false;
      console.error('Could not load live draw state:', error);
      renderConnectionBadge();
    }
  }

  function subscribeRealtime() {
    try {
      const sb = getClient();
      if (channel) sb.removeChannel(channel);
      channel = sb
        .channel('ieee-sports-public-live-v9')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: PublicConfig.LIVE_STATE_TABLE },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old || {};
              if (oldRow.sport) delete rowsBySport[oldRow.sport];
              render();
              return;
            }
            upsertRow(payload.new);
          }
        )
        .subscribe((status) => {
          realtimeReady = status === 'SUBSCRIBED';
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime channel status:', status);
          }
          renderConnectionBadge();
        });
    } catch (error) {
      console.warn('Realtime unavailable; polling fallback remains active:', error);
      realtimeReady = false;
      renderConnectionBadge();
    }
  }

  function sportStatus(sportKey) {
    const state = normalizeRemoteState(rowsBySport[sportKey]);
    if (!state || ['empty', 'setup', 'locked'].includes(state.phase)) return { text: 'WAITING', cls: '' };
    if (state.phase === 'complete') return { text: 'DRAW COMPLETE ✓', cls: 'ready' };
    return { text: 'LIVE NOW ●', cls: 'live' };
  }

  function renderPicker() {
    const grid = $('#public-sport-grid');
    if (!grid) return;
    grid.innerHTML = Object.values(SPORTS).map((sport) => {
      const status = sportStatus(sport.key);
      return `
        <button class="public-sport-card" data-sport="${sport.key}" style="--sport-accent:${sport.accent}">
          <span class="public-sport-icon">${sport.icon}</span>
          <span class="public-sport-copy">
            <strong>${sport.name}</strong>
            <small>${sport.round}</small>
            <span class="public-availability ${status.cls}">${status.text}</span>
          </span>
          <span class="public-card-arrow">→</span>
        </button>
      `;
    }).join('');
  }

  function setDisplayState(id) {
    ['display-waiting', 'display-live', 'display-results'].forEach((target) => {
      const el = document.getElementById(target);
      if (el) el.classList.toggle('is-hidden', target !== id);
    });
  }

  function renderHeader(cfg) {
    $('#disp-sport-icon').textContent = cfg.icon;
    $('#disp-sport-name').textContent = cfg.name;
    $('#disp-round-name').textContent = cfg.round;
    document.documentElement.style.setProperty('--sport-accent', cfg.accent);
  }

  function renderWaiting(cfg, state) {
    setDisplayState('display-waiting');
    $('#waiting-title').textContent = `${cfg.icon} ${cfg.name}`;
    if (!initialReadDone) {
      $('#waiting-sub').textContent = 'CONNECTING TO LIVE DRAW...';
    } else if (!state) {
      $('#waiting-sub').textContent = `${cfg.round} · WAITING FOR THE ORGANIZER`;
    } else if (state.phase === 'locked') {
      $('#waiting-sub').textContent = `${cfg.round} · OFFICIAL DRAW STARTING SOON`;
    } else {
      $('#waiting-sub').textContent = `${cfg.round} · PREPARING OFFICIAL DRAW`;
    }
  }

  function renderSlots(state) {
    const preview = participantName(state, state.previewParticipantId);
    let nameA = participantName(state, state.slotAId) || '?';
    let nameB = participantName(state, state.slotBId) || '?';
    const drawingA = state.phase === 'drawing_a';
    const drawingB = state.phase === 'drawing_b';

    if (drawingA) nameA = preview || '...';
    if (drawingB) nameB = preview || '...';

    $('#slot-a-name').textContent = nameA;
    $('#slot-b-name').textContent = nameB;
    $('#slot-a').classList.toggle('shuffling', drawingA);
    $('#slot-b').classList.toggle('shuffling', drawingB);
    $('#slot-a').classList.toggle('revealed', !!state.slotAId && !drawingA);
    $('#slot-b').classList.toggle('revealed', !!state.slotBId && !drawingB);
    $('#slot-a-state').textContent = drawingA ? 'DRAWING...' : state.slotAId ? 'LOCKED' : 'WAITING';
    $('#slot-b-state').textContent = drawingB ? 'DRAWING...' : state.slotBId ? 'LOCKED' : 'WAITING';
  }

  function buildRunner(active) {
    const runner = $('#pac-runner');
    if (!active) {
      runner.innerHTML = '';
      runner.classList.remove('active');
      return;
    }
    runner.classList.add('active');
    runner.innerHTML = '<div class="runner-pac pacman"></div>' +
      Array.from({ length: 13 }, () => '<span class="runner-dot"></span>').join('') +
      '<span class="runner-ghost">👻</span>';
  }

  function renderMatchList(state) {
    $('#disp-match-list').innerHTML = state.matches.map((match, index) => `
      <div class="display-match-row">
        <span class="display-match-number pixel">M${formatNumber(match.number || index + 1)}</span>
        <span>${esc(match.aName)}</span>
        <b>VS</b>
        <span>${esc(match.bName)}</span>
      </div>
    `).join('');
  }

  function renderLive(state, cfg) {
    setDisplayState('display-live');
    const matchNo = Math.min(state.matches.length + 1, cfg.count);
    $('#disp-progress').textContent = `MATCH ${formatNumber(matchNo)} OF ${formatNumber(cfg.count)}`;

    const labels = {
      idle: 'READY TO DRAW FIRST PARTICIPANT',
      drawing_a: 'DRAWING FIRST PARTICIPANT',
      drawing_a_done: 'FIRST PARTICIPANT LOCKED · DRAW OPPONENT',
      drawing_b: 'DRAWING OPPONENT',
      confirmed: 'OFFICIAL MATCH LOCKED'
    };
    $('#disp-action-label').textContent = labels[state.phase] || 'OFFICIAL DRAW';
    renderSlots(state);
    buildRunner(state.phase === 'drawing_a' || state.phase === 'drawing_b');
    renderMatchList(state);
    $('#match-locked-banner').classList.toggle('is-hidden', state.phase !== 'confirmed');
  }

  function renderResults(state, cfg) {
    setDisplayState('display-results');
    $('#display-results-sub').textContent = `${cfg.icon} ${cfg.name} · ${cfg.round}`;
    $('#display-results-grid').innerHTML = state.matches.map((match, index) => `
      <article class="result-card display-result-card">
        <div class="result-number pixel">MATCH ${formatNumber(match.number || index + 1)}</div>
        <div class="result-pair">
          <strong>${esc(match.aName)}</strong>
          <span class="result-vs pixel">VS</span>
          <strong>${esc(match.bName)}</strong>
        </div>
      </article>
    `).join('');
    $('#display-results-footer').textContent = 'IEEE SPORTS TOURNAMENT 2026 · OFFICIAL DRAW';
  }

  function renderSelectedSport() {
    const cfg = SPORTS[selectedSport];
    if (!cfg) return;
    renderHeader(cfg);

    const state = normalizeRemoteState(rowsBySport[selectedSport]);
    if (!state || ['empty', 'setup', 'locked'].includes(state.phase)) renderWaiting(cfg, state);
    else if (state.phase === 'complete') renderResults(state, cfg);
    else renderLive(state, cfg);

    renderConnectionBadge();
  }

  function render() {
    renderPicker();
    if (selectedSport) {
      const row = rowsBySport[selectedSport];
      const fingerprint = JSON.stringify(row ? [row.updated_at, row.state && row.state.phase, row.state && row.state.previewParticipantId, row.state && row.state.slotAId, row.state && row.state.slotBId, row.state && row.state.matches] : ['none', initialReadDone, lastError]);
      if (fingerprint !== lastRenderedFingerprint) {
        lastRenderedFingerprint = fingerprint;
        renderSelectedSport();
      } else {
        renderConnectionBadge();
      }
    } else {
      renderConnectionBadge();
    }
  }

  function updateUrl(sportKey, push) {
    const url = new URL(window.location.href);
    if (sportKey) url.searchParams.set('sport', sportKey);
    else url.searchParams.delete('sport');
    if (push === false) history.replaceState({}, '', url);
    else history.pushState({}, '', url);
  }

  function showPicker(push) {
    selectedSport = null;
    lastRenderedFingerprint = '';
    $('#public-picker-view').classList.remove('is-hidden');
    $('#public-live-view').classList.add('is-hidden');
    if (push !== false) updateUrl(null, true);
    render();
  }

  function showSport(sportKey, push) {
    if (!SPORTS[sportKey]) return showPicker(push);
    selectedSport = sportKey;
    lastRenderedFingerprint = '';
    $('#public-picker-view').classList.add('is-hidden');
    $('#public-live-view').classList.remove('is-hidden');
    if (push !== false) updateUrl(sportKey, true);
    render();
  }

  function toggleFullscreen() {
    const target = document.getElementById('public-live-view') || document.documentElement;
    if (!document.fullscreenElement) {
      const request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (request) request.call(target);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function buildDots() {
    document.querySelectorAll('.dot-corridor').forEach((element) => {
      if (element.children.length) return;
      for (let i = 0; i < 14; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'corridor-dot';
        element.appendChild(dot);
      }
    });
  }

  function bind() {
    $('#public-sport-grid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-sport]');
      if (card) showSport(card.dataset.sport, true);
    });
    $('#btn-public-back').addEventListener('click', () => showPicker(true));
    $('#btn-public-fullscreen').addEventListener('click', toggleFullscreen);

    window.addEventListener('popstate', () => {
      const key = new URLSearchParams(window.location.search).get('sport');
      if (SPORTS[key]) showSport(key, false);
      else showPicker(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) fetchLiveStates();
    });
  }

  async function init() {
    buildDots();
    bind();

    const requested = new URLSearchParams(window.location.search).get('sport');
    if (SPORTS[requested]) showSport(requested, false);
    else showPicker(false);

    try {
      getClient();
      await fetchLiveStates();
      subscribeRealtime();
    } catch (error) {
      lastError = error.message || String(error);
      initialReadDone = false;
      renderConnectionBadge();
    }

    // Fallback: even if Realtime is blocked on a network, this keeps the display updating.
    setInterval(() => {
      if (!document.hidden) fetchLiveStates();
    }, Math.max(1500, Number(PublicConfig.LIVE_REFRESH_INTERVAL_MS) || 2500));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
