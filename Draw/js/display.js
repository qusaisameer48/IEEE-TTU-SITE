(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;
  const $ = (selector) => document.querySelector(selector);

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    return String(value).padStart(2, '0');
  }

  function participantName(state, id) {
    const participant = state.participants.find((item) => item.id === id);
    return participant ? participant.name : '';
  }

  function setDisplayState(id) {
    ['display-waiting', 'display-live', 'display-results'].forEach((target) => {
      document.getElementById(target).classList.toggle('is-hidden', target !== id);
    });
  }

  function renderHeader(state, cfg) {
    $('#disp-sport-icon').textContent = cfg ? cfg.icon : '●';
    $('#disp-sport-name').textContent = cfg ? cfg.name : 'PAC-DRAW';
    $('#disp-round-name').textContent = cfg ? cfg.round : 'OFFICIAL DRAW SYSTEM';
    if (cfg) document.documentElement.style.setProperty('--sport-accent', cfg.accent);
  }

  function renderWaiting(state, cfg) {
    setDisplayState('display-waiting');
    if (!cfg || state.phase === 'empty' || state.phase === 'setup') {
      $('#waiting-title').textContent = 'PAC-DRAW SYSTEM';
      $('#waiting-sub').textContent = 'Waiting for the controller to prepare the official draw...';
      return;
    }
    $('#waiting-title').textContent = `${cfg.icon} ${cfg.name}`;
    $('#waiting-sub').textContent = `${cfg.round} · OFFICIAL DRAW STARTING SOON`;
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
    const list = $('#disp-match-list');
    list.innerHTML = state.matches.map((match) => `
      <div class="display-match-row">
        <span class="display-match-number pixel">M${formatNumber(match.number)}</span>
        <span>${esc(match.aName)}</span>
        <b>VS</b>
        <span>${esc(match.bName)}</span>
      </div>
    `).join('');
  }

  function renderLive(state, cfg) {
    setDisplayState('display-live');
    const matchNo = Math.min(state.matches.length + 1, cfg.matches);
    $('#disp-progress').textContent = `MATCH ${formatNumber(matchNo)} OF ${formatNumber(cfg.matches)}`;

    const actionLabels = {
      idle: 'READY TO DRAW FIRST PARTICIPANT',
      drawing_a: 'DRAWING FIRST PARTICIPANT',
      drawing_a_done: 'FIRST PARTICIPANT LOCKED · DRAW OPPONENT',
      drawing_b: 'DRAWING OPPONENT',
      confirmed: 'OFFICIAL MATCH LOCKED'
    };
    $('#disp-action-label').textContent = actionLabels[state.phase] || 'OFFICIAL DRAW';
    renderSlots(state);
    buildRunner(state.phase === 'drawing_a' || state.phase === 'drawing_b');
    renderMatchList(state);
    $('#match-locked-banner').classList.toggle('is-hidden', state.phase !== 'confirmed');
  }

  function displayResultSide(match, side) {
    const id = side === 'a' ? match.aId : match.bId;
    const name = side === 'a' ? match.aName : match.bName;
    const isWinner = match.winnerId === id;
    const isLoser = !!match.winnerId && !isWinner;
    return `
      <div class="display-result-side ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
        <strong>${esc(name)}</strong>
        <span>${isWinner ? '🏆 WINNER' : isLoser ? '—' : 'WAITING'}</span>
      </div>
    `;
  }

  function renderResults(state, cfg) {
    setDisplayState('display-results');
    const decided = state.matches.filter((match) => !!match.winnerId).length;
    const allDecided = state.matches.length > 0 && decided === state.matches.length;
    const hasAnyResult = decided > 0;

    $('#display-results-kicker').textContent = allDecided ? 'ALL RESULTS RECORDED' : hasAnyResult ? 'LIVE MATCH RESULTS' : 'DRAW COMPLETE';
    $('#display-results-title').textContent = hasAnyResult ? 'MATCH RESULTS' : 'FINAL DRAW RESULTS';
    $('#display-results-sub').textContent = `${cfg.icon} ${cfg.name} · ${cfg.round}`;
    $('#display-results-progress').textContent = allDecided
      ? `${decided} / ${state.matches.length} RESULTS · COMPLETE ✓`
      : `${decided} / ${state.matches.length} RESULTS RECORDED`;
    $('#display-results-progress').classList.toggle('complete', allDecided);

    $('#display-results-grid').innerHTML = state.matches.map((match) => `
      <article class="result-card display-result-card ${match.winnerId ? 'has-winner' : 'pending-result'}">
        <div class="display-result-topline">
          <div class="result-number pixel">MATCH ${formatNumber(match.number)}</div>
          <span class="display-result-status ${match.winnerId ? 'decided' : 'pending'}">${match.winnerId ? 'FINAL ✓' : 'PENDING'}</span>
        </div>
        <div class="display-result-pair">
          ${displayResultSide(match, 'a')}
          <span class="result-vs pixel">VS</span>
          ${displayResultSide(match, 'b')}
        </div>
      </article>
    `).join('');
    $('#display-results-footer').textContent = `${state.sessionId || ''} · Results update live from the controller · IEEE SPORTS TOURNAMENT 2026`;
  }

  function render() {
    const state = State.get();
    const cfg = Config.SPORTS[state.selectedSport] || null;
    renderHeader(state, cfg);

    if (!cfg || ['empty', 'setup', 'locked'].includes(state.phase)) renderWaiting(state, cfg);
    else if (state.phase === 'complete') renderResults(state, cfg);
    else renderLive(state, cfg);
  }

  function bind() {
    window.addEventListener('pacdraw:statechange', render);
  }

  PacDraw.Display = { bind, render };
})();
