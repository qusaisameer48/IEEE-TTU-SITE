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

  function buildSports() {
    const grid = $('#sport-grid');
    grid.innerHTML = Object.values(Config.SPORTS).map((sport) => `
      <button class="sport-card" data-sport="${sport.key}" style="--card-accent:${sport.accent}">
        <div class="sport-icon">${sport.icon}</div>
        <div class="sport-card-copy">
          <h2>${sport.name}</h2>
          <p>${sport.participants} ${sport.kindLabel} · ${sport.round}</p>
        </div>
        <span class="sport-arrow">→</span>
      </button>
    `).join('');
  }

  function showView(view) {
    currentView = view;
    ['landing', 'controller', 'display'].forEach((name) => {
      const element = document.getElementById('view-' + name);
      if (element) element.classList.toggle('is-hidden', name !== view);
    });

    if (view === 'controller') PacDraw.Controller.render();
    if (view === 'display') PacDraw.Display.render();
    if (view === 'landing') renderLandingSession();
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
    const state = State.get();
    const panel = $('#active-session');
    if (!panel) return;
    const cfg = Config.SPORTS[state.selectedSport];
    const resumable = cfg && state.phase !== 'empty';
    panel.classList.toggle('is-hidden', !resumable);
    if (resumable) {
      $('#active-session-text').textContent = `${cfg.icon} ${cfg.name} · ${cfg.round} · الحالة: ${state.phase}`;
    }
  }

  function selectSport(sportKey) {
    const state = State.get();
    if (state.selectedSport && state.phase !== 'empty' && state.phase !== 'setup') {
      renderLandingSession();
      return;
    }
    State.selectSport(sportKey);
    PacDraw.Controller.resetInputCache();
    routeTo('controller');
  }

  function openDisplay() {
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

    $('#btn-resume-session').addEventListener('click', () => routeTo('controller'));
    $('#btn-controller-home').addEventListener('click', () => routeTo('landing'));
    $('#btn-back-sports').addEventListener('click', () => {
      const state = State.get();
      if (state.phase === 'setup') {
        State.hardReset('changed_sport_before_lock');
        PacDraw.Controller.resetInputCache();
        routeTo('landing');
      }
    });

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

    window.addEventListener('popstate', () => initializeRoute(false));
  }

  function initializeRoute(startSync) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('view');
    const state = State.get();
    let view = requested === 'display' ? 'display' : requested === 'controller' ? 'controller' : 'landing';
    if (view === 'controller' && !state.selectedSport) view = 'landing';

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
