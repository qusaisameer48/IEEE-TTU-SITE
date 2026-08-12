(function () {
  'use strict';

  const PublicConfig = PacDrawPublic.Config;
  const SPORTS = Object.freeze({
    football: { key: 'football', icon: '⚽', name: 'FOOTBALL', round: 'QUARTER FINALS', count: 4, accent: '#00E1FF' },
    basketball: { key: 'basketball', icon: '🏀', name: 'BASKETBALL', round: 'SEMI FINALS', count: 2, accent: '#FF9D2E' },
    tabletennis: { key: 'tabletennis', icon: '🏓', name: 'TABLE TENNIS', round: 'ROUND OF 16', count: 8, accent: '#FF4B4B' },
    badminton: { key: 'badminton', icon: '🏸', name: 'BADMINTON', round: 'QUARTER FINALS', count: 4, accent: '#B47CFF' }
  });

  const $ = (selector) => document.querySelector(selector);
  let rowsBySport = {};
  let selectedSport = null;
  let loading = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function endpoint(path) {
    return String(PublicConfig.SUPABASE_URL || '').replace(/\/$/, '') + path;
  }

  async function fetchResults() {
    if (loading) return;
    loading = true;
    try {
      const select = 'sport,sport_name,round,session_id,matches,completed_at,published_at';
      const response = await fetch(
        endpoint('/rest/v1/' + encodeURIComponent(PublicConfig.RESULTS_TABLE) + '?select=' + encodeURIComponent(select)),
        {
          headers: {
            'apikey': PublicConfig.SUPABASE_PUBLISHABLE_KEY,
            'Accept': 'application/json'
          },
          cache: 'no-store'
        }
      );
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const rows = await response.json();
      const next = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        if (SPORTS[row.sport]) next[row.sport] = row;
      });
      rowsBySport = next;
      setConnectionState(true);
      render();
    } catch (error) {
      console.error('Could not load public draw results.', error);
      setConnectionState(false);
      render();
    } finally {
      loading = false;
    }
  }

  function setConnectionState(online) {
    const badge = $('#public-sync-status');
    if (!badge) return;
    badge.classList.toggle('offline', !online);
    badge.textContent = online ? 'LIVE RESULTS' : 'RECONNECTING…';
  }

  function updateUrl(sportKey) {
    const url = new URL(window.location.href);
    if (sportKey) url.searchParams.set('sport', sportKey);
    else url.searchParams.delete('sport');
    history.pushState({}, '', url);
  }

  function showPicker() {
    selectedSport = null;
    $('#public-picker').classList.remove('is-hidden');
    $('#public-sport-results').classList.add('is-hidden');
    renderPicker();
  }

  function showSport(sportKey, push) {
    if (!SPORTS[sportKey]) return showPicker();
    selectedSport = sportKey;
    if (push !== false) updateUrl(sportKey);
    $('#public-picker').classList.add('is-hidden');
    $('#public-sport-results').classList.remove('is-hidden');
    renderSport();
  }

  function renderPicker() {
    const grid = $('#public-sport-grid');
    grid.innerHTML = Object.values(SPORTS).map((sport) => {
      const available = !!rowsBySport[sport.key];
      return `
        <button class="public-sport-card ${available ? 'available' : 'pending'}" data-sport="${sport.key}" style="--sport-accent:${sport.accent}">
          <span class="public-sport-icon">${sport.icon}</span>
          <span class="public-sport-copy">
            <strong>${sport.name}</strong>
            <small>${sport.round}</small>
            <span class="public-availability ${available ? 'ready' : ''}">${available ? 'DRAW AVAILABLE ✓' : 'DRAW PENDING'}</span>
          </span>
          <span class="public-card-arrow">→</span>
        </button>
      `;
    }).join('');
  }

  function normalizedMatches(row) {
    if (!row || !Array.isArray(row.matches)) return [];
    return row.matches.map((match, index) => ({
      number: Number(match.number) || (index + 1),
      a: String(match.a || match.aName || ''),
      b: String(match.b || match.bName || '')
    })).filter((match) => match.a && match.b);
  }

  function renderSport() {
    const sport = SPORTS[selectedSport];
    if (!sport) return;
    const row = rowsBySport[selectedSport] || null;

    document.documentElement.style.setProperty('--public-sport-accent', sport.accent);
    $('#public-sport-icon').textContent = sport.icon;
    $('#public-sport-name').textContent = sport.name;
    $('#public-round-name').textContent = sport.round;

    const pending = $('#public-pending');
    const results = $('#public-match-results');
    if (!row) {
      pending.classList.remove('is-hidden');
      results.classList.add('is-hidden');
      results.innerHTML = '';
      return;
    }

    const matches = normalizedMatches(row);
    pending.classList.add('is-hidden');
    results.classList.remove('is-hidden');
    results.innerHTML = matches.map((match) => `
      <article class="public-match-card">
        <div class="public-match-number pixel">MATCH ${String(match.number).padStart(2, '0')}</div>
        <div class="public-pair">
          <strong>${esc(match.a)}</strong>
          <span class="public-vs pixel">VS</span>
          <strong>${esc(match.b)}</strong>
        </div>
      </article>
    `).join('');
  }

  function render() {
    renderPicker();
    if (selectedSport) renderSport();
  }

  function bind() {
    $('#public-sport-grid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-sport]');
      if (card) showSport(card.dataset.sport, true);
    });
    $('#btn-public-back').addEventListener('click', () => {
      updateUrl(null);
      showPicker();
    });
    window.addEventListener('popstate', () => {
      const key = new URLSearchParams(window.location.search).get('sport');
      if (SPORTS[key]) showSport(key, false);
      else showPicker();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) fetchResults();
    });
  }

  function init() {
    bind();
    const requested = new URLSearchParams(window.location.search).get('sport');
    if (SPORTS[requested]) showSport(requested, false);
    else showPicker();
    fetchResults();
    setInterval(fetchResults, Math.max(5000, Number(PublicConfig.REFRESH_INTERVAL_MS) || 12000));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
