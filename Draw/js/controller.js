(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;
  const Engine = PacDraw.DrawEngine;
  let validationConfirmed = false;
  let lastInputSport = null;

  const $ = (selector) => document.querySelector(selector);

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function sport() {
    const state = State.get();
    return Config.SPORTS[state.selectedSport] || null;
  }

  function nameById(state, id) {
    const item = state.participants.find((participant) => participant.id === id);
    return item ? item.name : '';
  }

  function formatNumber(value) {
    return String(value).padStart(2, '0');
  }

  function setStage(stageId) {
    ['controller-setup', 'controller-locked', 'controller-live', 'controller-complete'].forEach((id) => {
      document.getElementById(id).classList.toggle('is-hidden', id !== stageId);
    });
  }

  function ensureParticipantInputs(state, cfg) {
    const container = $('#participant-inputs');
    if (!container) return;
    if (lastInputSport === state.selectedSport && container.children.length === state.participants.length) return;

    lastInputSport = state.selectedSport;
    container.innerHTML = state.participants.map((participant, index) => `
      <label class="participant-input-wrap">
        <span class="participant-index pixel">${formatNumber(index + 1)}</span>
        <input
          class="participant-input"
          data-index="${index}"
          type="text"
          maxlength="80"
          autocomplete="off"
          placeholder="${esc(cfg.participantLabel)} ${formatNumber(index + 1)}"
          value="${esc(participant.name)}"
          aria-label="${esc(cfg.participantLabel)} ${index + 1}">
      </label>
    `).join('');
  }

  function renderValidationNeutral() {
    const panel = $('#validation-panel');
    panel.classList.remove('valid', 'invalid');
    $('#validation-title').textContent = 'جاهز للفحص';
    $('#validation-message').textContent = 'أدخل جميع الأسماء ثم اضغط Check Participants.';
    $('#btn-lock-participants').disabled = true;
  }

  function runValidation() {
    const result = State.validateParticipants();
    const panel = $('#validation-panel');
    panel.classList.toggle('valid', result.valid);
    panel.classList.toggle('invalid', !result.valid);
    validationConfirmed = result.valid;

    if (result.valid) {
      $('#validation-title').textContent = '✓ جميع المشاركين صالحون';
      $('#validation-message').textContent = 'العدد صحيح، لا توجد أسماء فارغة أو مكررة. يمكنك الآن قفل القائمة.';
      $('#btn-lock-participants').disabled = false;
    } else {
      $('#validation-title').textContent = 'يوجد خطأ في قائمة المشاركين';
      $('#validation-message').textContent = result.errors.join(' • ');
      $('#btn-lock-participants').disabled = true;
    }
  }

  function renderSetup(state, cfg) {
    setStage('controller-setup');
    $('#setup-sport-kicker').textContent = `${cfg.icon} ${cfg.name} · ${cfg.round}`;
    $('#setup-round-title').textContent = `إعداد ${cfg.kind === 'team' ? 'الفرق' : 'اللاعبين'}`;
    $('#setup-description').textContent = `${cfg.participants} ${cfg.kindLabel.toLowerCase()} · ${cfg.matches} matches · ${cfg.roundLabel}`;
    $('#participant-count-label').textContent = `${cfg.participants} / ${cfg.participants} REQUIRED`;
    $('#participant-kind-pill').textContent = cfg.kindLabel;
    ensureParticipantInputs(state, cfg);
    if (!validationConfirmed) renderValidationNeutral();
  }

  function renderLocked(state, cfg) {
    setStage('controller-locked');
    $('#locked-count').textContent = `${cfg.participants} ${cfg.kindLabel}`;
    $('#locked-participants').innerHTML = state.participants.map((participant, index) => `
      <div class="locked-person">
        <span class="locked-num pixel">${formatNumber(index + 1)}</span>
        <strong>${esc(participant.name)}</strong>
        <span class="locked-check">LOCKED ✓</span>
      </div>
    `).join('');
    renderConnection(PacDraw.Sync.isPeerConnected());
  }

  function participantStatus(state, participant) {
    const drawn = state.drawCursor > state.drawOrder.indexOf(participant.id) && state.drawOrder.includes(participant.id);
    const currentA = state.slotAId === participant.id;
    const currentB = state.slotBId === participant.id;
    if (currentA || currentB) return 'current';
    if (drawn) return 'drawn';
    return 'available';
  }

  function renderLive(state, cfg) {
    setStage('controller-live');
    const matchNo = Math.min(state.matches.length + 1, cfg.matches);
    $('#ctrl-match-num').textContent = formatNumber(matchNo);
    $('#ctrl-match-total').textContent = `/ ${formatNumber(cfg.matches)}`;
    $('#ctrl-session-id').textContent = state.sessionId ? `Session: ${state.sessionId}` : '';

    const phaseLabels = {
      idle: 'جاهز لسحب الطرف الأول',
      drawing_a: 'جارٍ سحب الطرف الأول...',
      drawing_a_done: 'تم تثبيت الطرف الأول — اسحب المنافس',
      drawing_b: 'جارٍ سحب المنافس...',
      confirmed: 'تم قفل المواجهة رسميًا'
    };
    $('#ctrl-phase-label').textContent = phaseLabels[state.phase] || '';

    const previewName = nameById(state, state.previewParticipantId);
    let a = nameById(state, state.slotAId) || '?';
    let b = nameById(state, state.slotBId) || '?';
    if (state.phase === 'drawing_a') a = previewName || '...';
    if (state.phase === 'drawing_b') b = previewName || '...';
    $('#ctrl-slot-a').textContent = a;
    $('#ctrl-slot-b').textContent = b;

    const remaining = Math.max(0, state.participants.length - state.drawCursor);
    $('#available-count').textContent = `${remaining} remaining`;
    $('#ctrl-participant-grid').innerHTML = state.participants.map((participant, index) => {
      const status = participantStatus(state, participant);
      return `
        <div class="participant-status-card ${status}">
          <span class="participant-index pixel">${formatNumber(index + 1)}</span>
          <strong>${esc(participant.name)}</strong>
          <small>${status === 'drawn' ? 'DRAWN ✓' : status === 'current' ? 'CURRENT' : 'AVAILABLE'}</small>
        </div>
      `;
    }).join('');

    const spin = $('#btn-spin');
    spin.disabled = Engine.isSpinning() || !['idle', 'drawing_a_done'].includes(state.phase);
    spin.textContent = state.phase === 'drawing_a_done'
      ? '🟡 DRAW OPPONENT'
      : '🟡 DRAW PARTICIPANT';

    const next = $('#btn-next');
    next.disabled = state.phase !== 'confirmed';
    next.textContent = state.matches.length >= cfg.matches ? '▶ SHOW FINAL RESULTS' : '▶ NEXT MATCH';

    $('#ctrl-match-log').innerHTML = state.matches.length
      ? state.matches.map((match) => `
          <div class="match-log-row maze-box">
            <span class="match-log-number pixel">M${formatNumber(match.number)}</span>
            <strong>${esc(match.aName)}</strong>
            <span class="match-log-vs">VS</span>
            <strong>${esc(match.bName)}</strong>
            <span class="match-log-lock">LOCKED ✓</span>
          </div>
        `).join('')
      : '<div class="empty-log">لا توجد مواجهات مقفلة بعد.</div>';
  }

  function resultsCards(state) {
    return state.matches.map((match) => `
      <article class="result-card">
        <div class="result-number pixel">MATCH ${formatNumber(match.number)}</div>
        <div class="result-pair">
          <strong>${esc(match.aName)}</strong>
          <span class="result-vs pixel">VS</span>
          <strong>${esc(match.bName)}</strong>
        </div>
      </article>
    `).join('');
  }

  function renderComplete(state, cfg) {
    setStage('controller-complete');
    $('#controller-results-title').textContent = `${cfg.name} — ${cfg.round}`;
    $('#controller-results-sub').textContent = `${state.matches.length} matches locked · Session ${state.sessionId || ''}`;
    $('#controller-results-grid').innerHTML = resultsCards(state);
    $('#controller-audit').innerHTML = `
      <span><strong>Random:</strong> ${esc(state.randomAlgorithm || '')}</span>
      <span><strong>Started:</strong> ${esc(state.startedAt || '')}</span>
      <span><strong>Completed:</strong> ${esc(state.completedAt || '')}</span>
      <span><strong>Audit events:</strong> ${state.audit.length}</span>
    `;
  }

  function renderConnection(connected) {
    const status = $('#ctrl-status');
    if (!status) return;
    status.classList.toggle('connected', connected);
    status.querySelector('.status-text').textContent = connected ? 'شاشة العرض متصلة ✓' : 'شاشة العرض غير متصلة';

    const row = $('#display-check-row');
    if (row) {
      row.classList.toggle('pending', !connected);
      row.classList.toggle('ready', connected);
      row.querySelector('span').textContent = connected ? '✓' : '•';
      row.querySelector('small').textContent = connected ? 'الشاشة جاهزة لاستقبال القرعة' : 'افتح شاشة العرض قبل البدء';
    }
  }

  function render() {
    const state = State.get();
    const cfg = sport();
    if (!cfg) return;

    document.documentElement.style.setProperty('--sport-accent', cfg.accent);
    $('#ctrl-title').textContent = `${cfg.icon} ${cfg.name} — ${cfg.round}`;

    if (state.phase === 'setup') renderSetup(state, cfg);
    else if (state.phase === 'locked') renderLocked(state, cfg);
    else if (state.phase === 'complete') renderComplete(state, cfg);
    else renderLive(state, cfg);
  }

  function bind() {
    $('#participant-inputs').addEventListener('input', (event) => {
      const input = event.target.closest('.participant-input');
      if (!input) return;
      validationConfirmed = false;
      $('#btn-lock-participants').disabled = true;
      renderValidationNeutral();
      State.setParticipantName(Number(input.dataset.index), input.value);
    });

    $('#btn-check-participants').addEventListener('click', runValidation);
    $('#btn-lock-participants').addEventListener('click', () => {
      if (!validationConfirmed) return runValidation();
      const result = State.lockParticipants();
      if (!result.valid) runValidation();
    });

    $('#btn-start-live').addEventListener('click', () => Engine.startLiveDraw());
    $('#btn-spin').addEventListener('click', () => Engine.handleSpin());
    $('#btn-next').addEventListener('click', () => Engine.advanceMatch());

    window.addEventListener('pacdraw:statechange', () => render());
    window.addEventListener('pacdraw:connection', (event) => {
      if (event.detail && event.detail.peer === 'display') renderConnection(event.detail.connected);
    });
  }

  PacDraw.Controller = {
    bind,
    render,
    renderConnection,
    resetInputCache: () => { lastInputSport = null; validationConfirmed = false; }
  };
})();
