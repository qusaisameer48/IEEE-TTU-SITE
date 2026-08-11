(function () {
  'use strict';

  const Config = PacDraw.Config;
  const VALID_PHASES = new Set([
    'empty', 'setup', 'locked', 'idle', 'drawing_a', 'drawing_a_done',
    'drawing_b', 'confirmed', 'complete'
  ]);

  function nowISO() {
    return new Date().toISOString();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function blankState() {
    return {
      version: Config.APP_VERSION,
      selectedSport: null,
      participants: [],
      phase: 'empty',
      lockedAt: null,
      sessionId: null,
      startedAt: null,
      completedAt: null,
      drawOrder: [],
      drawCursor: 0,
      previewParticipantId: null,
      slotAId: null,
      slotBId: null,
      matches: [],
      audit: [],
      randomAlgorithm: null,
      updatedAt: nowISO()
    };
  }

  function normalize(raw) {
    const base = blankState();
    if (!raw || typeof raw !== 'object') return base;

    const next = Object.assign(base, raw);
    if (!Config.SPORTS[next.selectedSport]) {
      next.selectedSport = null;
      next.participants = [];
      next.phase = 'empty';
    }
    if (!VALID_PHASES.has(next.phase)) next.phase = next.selectedSport ? 'setup' : 'empty';
    if (!Array.isArray(next.participants)) next.participants = [];
    if (!Array.isArray(next.drawOrder)) next.drawOrder = [];
    if (!Array.isArray(next.matches)) next.matches = [];
    if (!Array.isArray(next.audit)) next.audit = [];
    if (!Number.isInteger(next.drawCursor) || next.drawCursor < 0) next.drawCursor = 0;
    return next;
  }

  let state = blankState();

  function persist() {
    try {
      localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('PAC-DRAW: could not persist state.', error);
    }
  }

  function emit(source, persistState) {
    state.updatedAt = nowISO();
    if (persistState !== false) persist();
    window.dispatchEvent(new CustomEvent('pacdraw:statechange', {
      detail: { state: deepClone(state), source: source || 'local' }
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(Config.STORAGE_KEY);
      state = normalize(raw ? JSON.parse(raw) : null);
    } catch (error) {
      state = blankState();
    }
    return deepClone(state);
  }

  function get() {
    return deepClone(state);
  }

  function set(nextState, options) {
    options = options || {};
    state = normalize(deepClone(nextState));
    emit(options.source || 'local', options.persist !== false);
    return get();
  }

  function update(mutator, options) {
    options = options || {};
    const draft = deepClone(state);
    mutator(draft);
    state = normalize(draft);
    emit(options.source || 'local', options.persist !== false);
    return get();
  }

  function applyRemote(remoteState) {
    state = normalize(deepClone(remoteState));
    emit('remote', false);
  }

  function audit(draft, type, data) {
    draft.audit.push({
      at: nowISO(),
      type,
      data: data || null
    });
  }

  function selectSport(sportKey) {
    const sport = Config.SPORTS[sportKey];
    if (!sport) throw new Error('Unknown sport: ' + sportKey);

    const next = blankState();
    next.selectedSport = sportKey;
    next.phase = 'setup';
    next.participants = Array.from({ length: sport.participants }, (_, index) => ({
      id: sportKey.slice(0, 3).toUpperCase() + '-' + String(index + 1).padStart(2, '0'),
      name: ''
    }));
    audit(next, 'sport_selected', { sport: sportKey });
    return set(next);
  }

  function setParticipantName(index, name) {
    if (state.phase !== 'setup') return get();
    return update((draft) => {
      if (!draft.participants[index]) return;
      draft.participants[index].name = String(name || '').replace(/\s+/g, ' ').slice(0, 80);
    });
  }

  function validateParticipants() {
    const sport = Config.SPORTS[state.selectedSport];
    const errors = [];
    if (!sport) return { valid: false, errors: ['لم يتم اختيار رياضة.'] };
    if (state.participants.length !== sport.participants) {
      errors.push('عدد المشاركين لا يطابق إعداد الرياضة.');
    }

    const trimmed = state.participants.map((p) => String(p.name || '').trim());
    const emptyIndexes = [];
    trimmed.forEach((name, index) => { if (!name) emptyIndexes.push(index + 1); });
    if (emptyIndexes.length) {
      errors.push('يوجد أسماء فارغة: ' + emptyIndexes.join(', '));
    }

    const seen = new Map();
    const duplicates = new Set();
    trimmed.forEach((name) => {
      if (!name) return;
      const key = name.toLocaleLowerCase('en').replace(/\s+/g, ' ');
      if (seen.has(key)) duplicates.add(name);
      else seen.set(key, true);
    });
    if (duplicates.size) {
      errors.push('أسماء مكررة: ' + Array.from(duplicates).join('، '));
    }

    return { valid: errors.length === 0, errors, names: trimmed };
  }

  function lockParticipants() {
    const validation = validateParticipants();
    if (!validation.valid) return validation;

    update((draft) => {
      draft.participants.forEach((participant, index) => {
        participant.name = validation.names[index];
      });
      draft.phase = 'locked';
      draft.lockedAt = nowISO();
      audit(draft, 'participants_locked', {
        count: draft.participants.length,
        names: draft.participants.map((p) => p.name)
      });
    });
    return validation;
  }

  function archiveCurrent(reason) {
    if (!state.selectedSport || state.phase === 'empty') return;
    try {
      const existing = JSON.parse(localStorage.getItem(Config.HISTORY_KEY) || '[]');
      existing.unshift({ archivedAt: nowISO(), reason: reason || 'manual_reset', state: deepClone(state) });
      localStorage.setItem(Config.HISTORY_KEY, JSON.stringify(existing.slice(0, Config.MAX_HISTORY_SESSIONS)));
    } catch (error) {
      console.warn('PAC-DRAW: could not archive state.', error);
    }
  }

  function hardReset(reason) {
    archiveCurrent(reason || 'manual_reset');
    state = blankState();
    emit('local', true);
    return get();
  }

  function participantById(id) {
    return state.participants.find((participant) => participant.id === id) || null;
  }

  PacDraw.State = {
    load,
    get,
    set,
    update,
    applyRemote,
    selectSport,
    setParticipantName,
    validateParticipants,
    lockParticipants,
    hardReset,
    archiveCurrent,
    participantById,
    audit,
    nowISO
  };
})();
