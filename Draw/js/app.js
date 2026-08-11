(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;
  const $ = (selector) => document.querySelector(selector);
  let currentView = 'landing';
  let resetTargetPhrase = '';

  function ghostSVG(color) {
    return `<svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 2C9 2 2 10 2 21v19l6-6 6 6 6-6 6 6 6-6 6 6V21C38 10 31 2 20 2Z" fill="${color}"/>
      <circle cx="14" cy="18" r="5" fill="#fff"/><circle cx="26" cy="18" r="5" fill="#fff"/>
      <circle cx="15" cy="19" r="2.4" fill="#0A0A1E"/><circle cx="27" cy="19" r="2.4" fill="#0A0A1E"/>
    </svg>`;
  }

  function buildDecor() {
    const track = $('#ghost-track');
    if (track) {
      const colors = ['#FF0000', '#FFB8DE', '#00E1FF', '#FFB851'];
      track.innerHTML = Array.from({ length: 3 }, () =>
        colors.map((color) => ghostSVG(color)).join('') + '<span class="marquee-pac pacman"></span>'
      ).join('');
    }

    document.querySelectorAll('.dot-corridor').forEach((element) => {
      if (element.children.length) return;
      for (let i = 0; i < 14; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'corridor-dot';
        element.appendChild(dot);
      }
    });
  }

  function sessionStatus(session, sport) {
    if (!session) return { label: 'NEW', cls: 'new', detail: 'ابدأ بإدخال الأسماء' };

    const filled = session.participants.filter((participant) => String(participant.name || '').trim()).length;
    if (session.phase === 'setup') {
      if (!filled) return { label: 'NEW', cls: 'new', detail: 'ابدأ بإدخال الأسماء' };
      return { label: 'DRAFT', cls: 'draft', detail: `${filled}/${sport.participants} أسماء محفوظة` };
    }
    if (session.phase === 'locked') return { label: 'READY', cls: 'ready', detail: 'جاهزة للبدء' };
    if (session.phase === 'complete') return { label: 'COMPLETE', cls: 'complete', detail: 'النتائج محفوظة' };
    return { label: 'LIVE', cls: 'live', detail: `${session.matches.length}/${sport.matches} مواجهات` };
  }

  function buildSports() {
    const grid = $('#sport-grid');
    if (!grid) return;
    const sessions = State.getSessions();
    grid.innerHTML = Object.values(Config.SPORTS).map((sport) => {
      const session = sessions[sport.key] || null;
      const status = sessionStatus(session, sport);
      return `
        <button class="sport-card has-session-status" data-sport="${sport.key}" style="--card-accent:${sport.accent}">
          <div class="sport-icon">${sport.icon}</div>
          <div class="sport-card-copy">
            <div class="sport-title-row">
              <h2>${sport.name}</h2>
              <span class="sport-session-badge ${status.cls}">${status.label}</span>
            </div>
            <p>${sport.participants} ${sport.kindLabel} · ${sport.round}</p>
            <small class="sport-session-detail">${status.detail}</small>
          </div>
          <span class="sport-arrow">→</span>
        </button>
      `;
    }).join('');
  }

  function showView(view) {
    currentView = view;
    ['landing', 'controller', 'display'].forEach((name) => {
      const element = document.getElementById('view-' + name);
      if (element) element.classList.toggle('is-hidden', name !== view);
    });

    if (view === 'controller') PacDraw.Controller.render();
    if (view === 'display') PacDraw.Display.render();
    if (view === 'landing') {
      buildSports();
      renderLandingSession();
    }
  }

  function routeTo(view, replace) {
    const url = new URL(window.location.href);
    if (view === 'landing') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    if (replace) history.replaceState({}, '', url);
    else history.pushState({}, '', url);
    showView(view);
  }

  function renderLandingSession() {
    const panel = $('#active-session');
    if (!panel) return;
    const sessions = State.getSessions();
    const entries = Object.values(sessions);
    const count = entries.length;
    panel.classList.toggle('is-hidden', count === 0);
    if (!count) return;

    const ready = entries.filter((session) => session.phase === 'locked').length;
    const live = entries.filter((session) => !['setup', 'locked', 'complete', 'empty'].includes(session.phase)).length;
    const complete = entries.filter((session) => session.phase === 'complete').length;
    const draft = entries.filter((session) => session.phase === 'setup' && session.participants.some((p) => String(p.name || '').trim())).length;

    $('#saved-draw-count').textContent = String(count);
    const parts = [];
    if (ready) parts.push(`${ready} جاهزة`);
    if (live) parts.push(`${live} جارية`);
    if (draft) parts.push(`${draft} مسودة`);
    if (complete) parts.push(`${complete} مكتملة`);
    $('#active-session-text').textContent = `${parts.join(' · ') || 'محفوظة'} — اختر أي رياضة من البطاقات للمتابعة أو الإعداد.`;
  }

  function selectSport(sportKey) {
    // v3: every sport owns an independent saved draw. Switching sports never
    // deletes or overwrites the names/results of another sport.
    State.selectSport(sportKey);
    PacDraw.Controller.resetInputCache();
    routeTo('controller');
  }

  function openDisplay() {
    const state = State.get();
    if (!state.selectedSport) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'display');
    window.open(url.toString(), 'ieee-pacdraw-display');
  }

  function toggleFullscreen(element) {
    const target = element || document.documentElement;
    if (!document.fullscreenElement) {
      const request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (request) request.call(target);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function updateMuteButton() {
    const button = $('#btn-controller-mute');
    if (button) button.textContent = PacDraw.Audio.isMuted() ? '🔇' : '🔊';
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('is-hidden');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('is-hidden');
  }

  function openResetModal() {
    const state = State.get();
    const cfg = Config.SPORTS[state.selectedSport];
    if (!cfg) return;
    resetTargetPhrase = `RESET ${cfg.name}`;
    $('#reset-phrase').textContent = resetTargetPhrase;
    $('#reset-confirm-input').value = '';
    $('#btn-confirm-reset').disabled = true;
    openModal('reset-modal');
    setTimeout(() => $('#reset-confirm-input').focus(), 80);
  }

  function confirmReset() {
    if ($('#reset-confirm-input').value.trim().toUpperCase() !== resetTargetPhrase) return;
    State.hardReset('manual_full_reset');
    PacDraw.Controller.resetInputCache();
    closeModal('reset-modal');
    routeTo('landing', true);
  }

  function bindGlobalActions() {
    $('#sport-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-sport]');
      if (button) selectSport(button.dataset.sport);
    });

    $('#btn-controller-home').addEventListener('click', () => routeTo('landing'));
    $('#btn-back-sports').addEventListener('click', () => routeTo('landing'));

    ['btn-open-display-top', 'btn-open-display'].forEach((id) => {
      document.getElementById(id).addEventListener('click', openDisplay);
    });

    $('#btn-controller-fullscreen').addEventListener('click', () => toggleFullscreen(document.documentElement));
    $('#btn-display-fullscreen').addEventListener('click', () => toggleFullscreen(document.documentElement));
    $('#btn-controller-mute').addEventListener('click', () => {
      PacDraw.Audio.toggle();
      updateMuteButton();
    });

    ['btn-reset-locked', 'btn-reset-live', 'btn-reset-complete'].forEach((id) => {
      document.getElementById(id).addEventListener('click', openResetModal);
    });

    $('#reset-confirm-input').addEventListener('input', (event) => {
      $('#btn-confirm-reset').disabled = event.target.value.trim().toUpperCase() !== resetTargetPhrase;
    });
    $('#btn-confirm-reset').addEventListener('click', confirmReset);

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => closeModal(button.dataset.closeModal));
    });
    document.querySelectorAll('.modal-backdrop').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal(modal.id);
      });
    });

    $('#btn-export-results').addEventListener('click', () => openModal('export-modal'));
    $('#export-modal').addEventListener('click', (event) => {
      const option = event.target.closest('[data-export]');
      if (!option) return;
      PacDraw.Export.exportFormat(option.dataset.export);
    });

    window.addEventListener('pacdraw:statechange', () => {
      if (currentView === 'landing') {
        buildSports();
        renderLandingSession();
      }
    });

    window.addEventListener('popstate', () => initializeRoute(false));
  }

  function initializeRoute(startSync) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('view');
    const state = State.get();
    let view = requested === 'display' ? 'display' : requested === 'controller' ? 'controller' : 'landing';
    if ((view === 'controller' || view === 'display') && !state.selectedSport) view = 'landing';

    if (startSync) PacDraw.Sync.init(view === 'display' ? 'display' : 'controller');
    showView(view);
  }

  function init() {
    State.load();
    buildDecor();
    buildSports();
    PacDraw.Controller.bind();
    PacDraw.Display.bind();
    bindGlobalActions();
    updateMuteButton();
    initializeRoute(true);
  }

  document.addEventListener('DOMContentLoaded', init);

  PacDraw.App = {
    showView,
    routeTo,
    openDisplay,
    openResetModal,
    toggleFullscreen
  };
})();
