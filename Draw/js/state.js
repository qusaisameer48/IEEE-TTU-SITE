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

  function blankSession(sportKey) {
    return {
      version: Config.APP_VERSION,
      selectedSport: sportKey || null,
      participants: [],
      phase: sportKey ? 'setup' : 'empty',
      lockedAt: null,
      sessionId: null,
      startedAt: null,
      completedAt: null,
      resultsCompletedAt: null,
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

  function createSportSession(sportKey) {
    const sport = Config.SPORTS[sportKey];
    if (!sport) return blankSession(null);
    const next = blankSession(sportKey);
    next.participants = Array.from({ length: sport.participants }, (_, index) => ({
      id: sportKey.slice(0, 3).toUpperCase() + '-' + String(index + 1).padStart(2, '0'),
      name: ''
    }));
    return next;
  }

  function normalizeSession(raw, forcedSportKey) {
    const sportKey = forcedSportKey || (raw && raw.selectedSport) || null;
    if (!Config.SPORTS[sportKey]) return blankSession(null);

    const base = createSportSession(sportKey);
    if (!raw || typeof raw !== 'object') return base;

    const next = Object.assign(base, raw, { selectedSport: sportKey, version: Config.APP_VERSION });
    if (!VALID_PHASES.has(next.phase) || next.phase === 'empty') next.phase = 'setup';
    if (!Array.isArray(next.participants)) next.participants = base.participants;
    if (!Array.isArray(next.drawOrder)) next.drawOrder = [];
    if (!Array.isArray(next.matches)) next.matches = [];
    next.matches = next.matches.map((match, index) => Object.assign({
      number: index + 1,
      winnerId: null,
      winnerName: null,
      resultUpdatedAt: null
    }, match || {}));
    if (!Array.isArray(next.audit)) next.audit = [];
    if (!Number.isInteger(next.drawCursor) || next.drawCursor < 0) next.drawCursor = 0;

    const sport = Config.SPORTS[sportKey];
    if (next.participants.length !== sport.participants && next.phase === 'setup') {
      const existing = new Map(next.participants.map((p, i) => [i, p]));
      next.participants = Array.from({ length: sport.participants }, (_, index) => {
        const old = existing.get(index);
        return old ? {
          id: old.id || (sportKey.slice(0, 3).toUpperCase() + '-' + String(index + 1).padStart(2, '0')),
          name: String(old.name || '')
        } : base.participants[index];
      });
    }
    return next;
  }

  function blankWorkspace() {
    return {
      version: Config.APP_VERSION,
      activeSport: null,
      sessions: {},
      updatedAt: nowISO()
    };
  }

  function normalizeWorkspace(raw) {
    const workspace = blankWorkspace();
    if (!raw || typeof raw !== 'object') return workspace;

    // Automatic migration from the old single-draw v2 state.
    if (raw.selectedSport && Config.SPORTS[raw.selectedSport]) {
      workspace.activeSport = raw.selectedSport;
      workspace.sessions[raw.selectedSport] = normalizeSession(raw, raw.selectedSport);
      return workspace;
    }

    if (raw.sessions && typeof raw.sessions === 'object') {
      Object.keys(Config.SPORTS).forEach((sportKey) => {
        if (raw.sessions[sportKey]) {
          workspace.sessions[sportKey] = normalizeSession(raw.sessions[sportKey], sportKey);
        }
      });
    }

    workspace.activeSport = Config.SPORTS[raw.activeSport] && workspace.sessions[raw.activeSport]
      ? raw.activeSport
      : null;
    workspace.updatedAt = raw.updatedAt || nowISO();
    return workspace;
  }

  let workspace = blankWorkspace();

  function activeSessionRef() {
    return workspace.activeSport ? workspace.sessions[workspace.activeSport] || null : null;
  }

  function get() {
    const active = activeSessionRef();
    return deepClone(active || blankSession(null));
  }

  function getSession(sportKey) {
    const session = workspace.sessions[sportKey];
    return session ? deepClone(session) : null;
  }

  function getSessions() {
    const result = {};
    Object.keys(Config.SPORTS).forEach((sportKey) => {
      if (workspace.sessions[sportKey]) result[sportKey] = deepClone(workspace.sessions[sportKey]);
    });
    return result;
  }

  function getWorkspace() {
    return deepClone(workspace);
  }

  function persist() {
    try {
      workspace.version = Config.APP_VERSION;
      workspace.updatedAt = nowISO();
      localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.warn('PAC-DRAW: could not persist workspace.', error);
    }
  }

  function emit(source, persistState) {
    const active = activeSessionRef();
    if (active) active.updatedAt = nowISO();
    workspace.updatedAt = nowISO();
    if (persistState !== false) persist();
    window.dispatchEvent(new CustomEvent('pacdraw:statechange', {
      detail: {
        state: get(),
        workspace: getWorkspace(),
        source: source || 'local'
      }
    }));
  }

  function load() {
    let raw = null;
    try {
      const current = localStorage.getItem(Config.STORAGE_KEY);
      if (current) raw = JSON.parse(current);

      if (!raw && Array.isArray(Config.LEGACY_STORAGE_KEYS)) {
        for (const key of Config.LEGACY_STORAGE_KEYS) {
          const legacy = localStorage.getItem(key);
          if (!legacy) continue;
          raw = JSON.parse(legacy);
          break;
        }
      }
      workspace = normalizeWorkspace(raw);
      if (raw && !localStorage.getItem(Config.STORAGE_KEY)) persist();
    } catch (error) {
      workspace = blankWorkspace();
    }
    return get();
  }

  function ensureSport(sportKey) {
    if (!Config.SPORTS[sportKey]) throw new Error('Unknown sport: ' + sportKey);
    if (!workspace.sessions[sportKey]) {
      workspace.sessions[sportKey] = createSportSession(sportKey);
      audit(workspace.sessions[sportKey], 'sport_selected', { sport: sportKey });
    }
    return workspace.sessions[sportKey];
  }

  function selectSport(sportKey) {
    ensureSport(sportKey);
    workspace.activeSport = sportKey;
    emit('local', true);
    return get();
  }

  function set(nextState, options) {
    options = options || {};
    const sportKey = nextState && nextState.selectedSport;
    if (!Config.SPORTS[sportKey]) return get();
    workspace.sessions[sportKey] = normalizeSession(deepClone(nextState), sportKey);
    workspace.activeSport = sportKey;
    emit(options.source || 'local', options.persist !== false);
    return get();
  }

  function update(mutator, options) {
    options = options || {};
    const active = activeSessionRef();
    if (!active) return get();
    const draft = deepClone(active);
    mutator(draft);
    workspace.sessions[workspace.activeSport] = normalizeSession(draft, workspace.activeSport);
    emit(options.source || 'local', options.persist !== false);
    return get();
  }

  // BroadcastChannel sync sends only the currently active draw. This keeps
  // the audience display focused on whichever draw the controller selected.
  function applyRemote(remoteState) {
    if (!remoteState || !Config.SPORTS[remoteState.selectedSport]) return;
    const sportKey = remoteState.selectedSport;
    workspace.sessions[sportKey] = normalizeSession(deepClone(remoteState), sportKey);
    workspace.activeSport = sportKey;
    emit('remote', false);
  }

  // localStorage fallback contains the full multi-draw workspace.
  function applyPersisted(remoteWorkspace) {
    workspace = normalizeWorkspace(deepClone(remoteWorkspace));
    emit('remote', false);
  }

  function audit(draft, type, data) {
    draft.audit.push({
      at: nowISO(),
      type,
      data: data || null
    });
  }

  function setParticipantName(index, name) {
    const state = activeSessionRef();
    if (!state || state.phase !== 'setup') return get();
    return update((draft) => {
      if (!draft.participants[index]) return;
      draft.participants[index].name = String(name || '').replace(/\s+/g, ' ').slice(0, 80);
    });
  }

  function validateParticipants() {
    const state = activeSessionRef();
    const sport = state ? Config.SPORTS[state.selectedSport] : null;
    const errors = [];
    if (!sport || !state) return { valid: false, errors: ['لم يتم اختيار رياضة.'] };
    if (state.participants.length !== sport.participants) {
      errors.push('عدد المشاركين لا يطابق إعداد الرياضة.');
    }

    const trimmed = state.participants.map((p) => String(p.name || '').trim());
    const emptyIndexes = [];
    trimmed.forEach((name, index) => { if (!name) emptyIndexes.push(index + 1); });
    if (emptyIndexes.length) errors.push('يوجد أسماء فارغة: ' + emptyIndexes.join(', '));

    const seen = new Map();
    const duplicates = new Set();
    trimmed.forEach((name) => {
      if (!name) return;
      const key = name.toLocaleLowerCase('en').replace(/\s+/g, ' ');
      if (seen.has(key)) duplicates.add(name);
      else seen.set(key, true);
    });
    if (duplicates.size) errors.push('أسماء مكررة: ' + Array.from(duplicates).join('، '));

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

  function setMatchWinner(matchNumber, winnerId) {
    const state = activeSessionRef();
    if (!state || state.phase !== 'complete') return { ok: false, reason: 'draw_not_complete' };

    const match = state.matches.find((item) => item.number === Number(matchNumber));
    if (!match) return { ok: false, reason: 'match_not_found' };
    if (![match.aId, match.bId].includes(winnerId)) return { ok: false, reason: 'invalid_winner' };

    const participant = state.participants.find((item) => item.id === winnerId);
    const previousWinnerId = match.winnerId || null;
    const previousWinnerName = match.winnerName || null;

    update((draft) => {
      const target = draft.matches.find((item) => item.number === Number(matchNumber));
      if (!target) return;
      target.winnerId = winnerId;
      target.winnerName = participant ? participant.name : (winnerId === target.aId ? target.aName : target.bName);
      target.resultUpdatedAt = nowISO();

      const allDecided = draft.matches.length > 0 && draft.matches.every((item) => !!item.winnerId);
      draft.resultsCompletedAt = allDecided ? (draft.resultsCompletedAt || nowISO()) : null;
      audit(draft, previousWinnerId ? 'match_winner_changed' : 'match_winner_recorded', {
        matchNumber: target.number,
        previousWinnerId,
        previousWinnerName,
        winnerId: target.winnerId,
        winnerName: target.winnerName
      });
    });

    return { ok: true };
  }

  function clearMatchWinner(matchNumber) {
    const state = activeSessionRef();
    if (!state || state.phase !== 'complete') return { ok: false, reason: 'draw_not_complete' };
    const match = state.matches.find((item) => item.number === Number(matchNumber));
    if (!match || !match.winnerId) return { ok: false, reason: 'winner_not_set' };

    update((draft) => {
      const target = draft.matches.find((item) => item.number === Number(matchNumber));
      if (!target) return;
      const previousWinnerId = target.winnerId;
      const previousWinnerName = target.winnerName;
      target.winnerId = null;
      target.winnerName = null;
      target.resultUpdatedAt = nowISO();
      draft.resultsCompletedAt = null;
      audit(draft, 'match_winner_cleared', {
        matchNumber: target.number,
        previousWinnerId,
        previousWinnerName
      });
    });

    return { ok: true };
  }

  function resultsProgress() {
    const state = activeSessionRef();
    if (!state) return { decided: 0, total: 0, complete: false };
    const decided = state.matches.filter((match) => !!match.winnerId).length;
    return { decided, total: state.matches.length, complete: state.matches.length > 0 && decided === state.matches.length };
  }

  function archiveSession(session, reason) {
    if (!session || !session.selectedSport) return;
    try {
      const existing = JSON.parse(localStorage.getItem(Config.HISTORY_KEY) || '[]');
      existing.unshift({ archivedAt: nowISO(), reason: reason || 'manual_reset', state: deepClone(session) });
      localStorage.setItem(Config.HISTORY_KEY, JSON.stringify(existing.slice(0, Config.MAX_HISTORY_SESSIONS)));
    } catch (error) {
      console.warn('PAC-DRAW: could not archive state.', error);
    }
  }

  function archiveCurrent(reason) {
    archiveSession(activeSessionRef(), reason);
  }

  // Reset only the currently selected sport. Other prepared draws stay saved.
  function hardReset(reason) {
    const sportKey = workspace.activeSport;
    const current = activeSessionRef();
    if (current) archiveSession(current, reason || 'manual_reset');
    if (sportKey) delete workspace.sessions[sportKey];
    workspace.activeSport = null;
    emit('local', true);
    return get();
  }

  function participantById(id) {
    const state = activeSessionRef();
    return state ? state.participants.find((participant) => participant.id === id) || null : null;
  }

  PacDraw.State = {
    load,
    get,
    getSession,
    getSessions,
    getWorkspace,
    set,
    update,
    applyRemote,
    applyPersisted,
    selectSport,
    setParticipantName,
    validateParticipants,
    lockParticipants,
    setMatchWinner,
    clearMatchWinner,
    resultsProgress,
    hardReset,
    archiveCurrent,
    participantById,
    audit,
    nowISO
  };
})();
