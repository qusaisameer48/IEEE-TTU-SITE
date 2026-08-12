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
  let rowsBySport = {};
  let selectedSport = null;
  let loading = false;
  let lastError = '';
  let lastRenderedFingerprint = '';

  function endpoint(path) {
    return String(PublicConfig.SUPABASE_URL || '').replace(/\/$/, '') + path;
  }

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

  function setBadge(selector, mode, text, title) {
    const badge = $(selector);
    if (!badge) return;
    badge.classList.remove('offline', 'online', 'loading', 'live');
    badge.classList.add(mode);
    badge.textContent = text;
    badge.title = title || '';
  }

  function setConnectionState(mode, detail) {
    if (mode === 'error') {
      setBadge('#public-sync-status', 'offline', 'CONNECTION ERROR', detail || lastError);
      setBadge('#remote-live-status', 'offline', 'CONNECTION ERROR', detail || lastError);
    } else if (mode === 'loading') {
      setBadge('#public-sync-status', 'loading', 'CONNECTING…');
      setBadge('#remote-live-status', 'loading', 'CONNECTING…');
    } else {
      setBadge('#public-sync-status', 'online', 'LIVE DISPLAY READY');
      setBadge('#remote-live-status', 'online', 'LIVE');
    }
  }

  function normalizeRemoteState(row) {
    if (!row || !row.state || typeof row.state !== 'object') return null;
    const state = row.state;
    if (!SPORTS[row.sport] || state.selectedSport !== row.sport) return null;
    if (!Array.isArray(state.participants)) state.participants = [];
    if (!Array.isArray(state.matches)) state.matches = [];
    return state;
  }

  async function fetchLiveStates() {
    if (loading) return;
    loading = true;
    if (!Object.keys(rowsBySport).length) setConnectionState('loading');

    try {
      const select = 'sport,state,updated_at';
      const url = endpoint(
        '/rest/v1/' + encodeURIComponent(PublicConfig.LIVE_STATE_TABLE) +
        '?select=' + encodeURIComponent(select) +
        '&order=sport.asc'
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': PublicConfig.SUPABASE_PUBLISHABLE_KEY,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      const raw = await response.text();
      if (!response.ok) throw new Error('HTTP ' + response.status + (raw ? ' — ' + raw : ''));

      const rows = raw ? JSON.parse(raw) : [];
      const next = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        if (SPORTS[row.sport]) next[row.sport] = row;
      });
      rowsBySport = next;
      lastError = '';
      setConnectionState('online');
      render();
    } catch (error) {
      lastError = error.message || String(error);
      console.error('Could not load live draw state:', error);
      setConnectionState('error', lastError);
    } finally {
      loading = false;
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
    if (!state) {
      $('#waiting-sub').textContent = `${cfg.round} · WAITING FOR THE ORGANIZER TO START`;
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
    $('#display-results-footer').textContent = `IEEE SPORTS TOURNAMENT 2026 · OFFICIAL DRAW`;
  }

  function renderSelectedSport() {
    const cfg = SPORTS[selectedSport];
    if (!cfg) return;
    renderHeader(cfg);

    const state = normalizeRemoteState(rowsBySport[selectedSport]);
    if (!state || ['empty', 'setup', 'locked'].includes(state.phase)) renderWaiting(cfg, state);
    else if (state.phase === 'complete') renderResults(state, cfg);
    else renderLive(state, cfg);

    const liveStatus = sportStatus(selectedSport);
    if (lastError) setBadge('#remote-live-status', 'offline', 'CONNECTION ERROR', lastError);
    else if (liveStatus.cls === 'live') setBadge('#remote-live-status', 'live', 'LIVE NOW ●');
    else if (liveStatus.cls === 'ready') setBadge('#remote-live-status', 'online', 'DRAW COMPLETE ✓');
    else setBadge('#remote-live-status', 'loading', 'WAITING');
  }

  function render() {
    renderPicker();
    if (selectedSport) {
      const row = rowsBySport[selectedSport];
      const fingerprint = JSON.stringify(row ? [row.updated_at, row.state && row.state.phase, row.state && row.state.previewParticipantId, row.state && row.state.slotAId, row.state && row.state.slotBId, row.state && row.state.matches] : []);
      if (fingerprint !== lastRenderedFingerprint) {
        lastRenderedFingerprint = fingerprint;
        renderSelectedSport();
      }
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
    renderPicker();
  }

  function showSport(sportKey, push) {
    if (!SPORTS[sportKey]) return showPicker(push);
    selectedSport = sportKey;
    lastRenderedFingerprint = '';
    $('#public-picker-view').classList.add('is-hidden');
    $('#public-live-view').classList.remove('is-hidden');
    if (push !== false) updateUrl(sportKey, true);
    renderSelectedSport();
    fetchLiveStates();
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

  function init() {
    buildDots();
    bind();
    const requested = new URLSearchParams(window.location.search).get('sport');
    if (SPORTS[requested]) showSport(requested, false);
    else showPicker(false);
    fetchLiveStates();
    setInterval(fetchLiveStates, Math.max(400, Number(PublicConfig.LIVE_REFRESH_INTERVAL_MS) || 650));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
