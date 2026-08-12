(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;
  const Random = PacDraw.Random;
  const Audio = PacDraw.Audio;
  let spinning = false;

  function sportConfig() {
    const current = State.get();
    return Config.SPORTS[current.selectedSport] || null;
  }

  function createSessionId(sportKey) {
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      '-',
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0')
    ].join('');
    return (sportKey || 'DRAW').toUpperCase() + '-' + stamp + '-' + Random.randomHex(3);
  }

  function startLiveDraw() {
    const current = State.get();
    const sport = sportConfig();
    if (!sport || current.phase !== 'locked') return false;

    const ids = current.participants.map((participant) => participant.id);
    const drawOrder = Random.secureShuffle(ids);

    State.update((draft) => {
      draft.sessionId = createSessionId(draft.selectedSport);
      draft.startedAt = State.nowISO();
      draft.completedAt = null;
      draft.drawOrder = drawOrder;
      draft.drawCursor = 0;
      draft.matches = [];
      draft.slotAId = null;
      draft.slotBId = null;
      draft.previewParticipantId = null;
      draft.randomAlgorithm = Random.algorithmLabel;
      draft.phase = 'idle';
      State.audit(draft, 'draw_started', {
        sessionId: draft.sessionId,
        algorithm: draft.randomAlgorithm,
        participantCount: draft.participants.length
      });
    });

    Audio.ensureContext();
    return true;
  }

  function remainingIds(current) {
    return current.drawOrder.slice(current.drawCursor);
  }

  function previewCandidate(current) {
    const remaining = remainingIds(current);
    if (!remaining.length) return null;
    return remaining[Random.secureRandomInt(remaining.length)];
  }

  function draw(which) {
    if (spinning) return Promise.resolve(false);
    const current = State.get();
    if (which === 'a' && current.phase !== 'idle') return Promise.resolve(false);
    if (which === 'b' && current.phase !== 'drawing_a_done') return Promise.resolve(false);

    spinning = true;
    State.update((draft) => {
      draft.phase = which === 'a' ? 'drawing_a' : 'drawing_b';
      draft.previewParticipantId = null;
      State.audit(draft, 'draw_animation_started', { side: which.toUpperCase(), drawCursor: draft.drawCursor });
    });

    return new Promise((resolve) => {
      let step = 0;
      let delay = Config.DRAW_START_DELAY_MS;

      function tick() {
        const tickState = State.get();
        const previewId = previewCandidate(tickState);
        if (previewId) {
          State.update((draft) => {
            draft.previewParticipantId = previewId;
          }, { persist: false });
          Audio.tick();
        }

        step += 1;
        delay += Config.DRAW_DELAY_GROWTH_MS;
        if (step < Config.DRAW_STEPS) {
          setTimeout(tick, delay);
        } else {
          // IMPORTANT: clear the spinning lock BEFORE finalize() updates state.
          // State.update() emits pacdraw:statechange synchronously, which causes
          // the controller to re-render immediately. If spinning is still true
          // during that render, the next action button stays disabled until a
          // page refresh even though the draw already finished.
          spinning = false;
          finalize(which);
          resolve(true);
        }
      }

      tick();
    });
  }

  function finalize(which) {
    const current = State.get();
    const selectedId = current.drawOrder[current.drawCursor];
    if (!selectedId) {
      spinning = false;
      return;
    }

    State.update((draft) => {
      const participant = draft.participants.find((item) => item.id === selectedId);
      draft.previewParticipantId = null;
      draft.drawCursor += 1;

      if (which === 'a') {
        draft.slotAId = selectedId;
        draft.slotBId = null;
        draft.phase = 'drawing_a_done';
        State.audit(draft, 'participant_revealed', {
          side: 'A', participantId: selectedId, name: participant ? participant.name : selectedId
        });
      } else {
        draft.slotBId = selectedId;
        const a = draft.participants.find((item) => item.id === draft.slotAId);
        const b = participant;
        const match = {
          number: draft.matches.length + 1,
          aId: draft.slotAId,
          bId: selectedId,
          aName: a ? a.name : draft.slotAId,
          bName: b ? b.name : selectedId,
          lockedAt: State.nowISO()
        };
        draft.matches.push(match);
        draft.phase = 'confirmed';
        State.audit(draft, 'participant_revealed', {
          side: 'B', participantId: selectedId, name: b ? b.name : selectedId
        });
        State.audit(draft, 'match_locked', match);
      }
    });

    Audio.reveal();
    if (which === 'b') setTimeout(Audio.lock, 170);
  }

  function handleSpin() {
    const current = State.get();
    if (current.phase === 'idle') return draw('a');
    if (current.phase === 'drawing_a_done') return draw('b');
    return Promise.resolve(false);
  }

  function advanceMatch() {
    const current = State.get();
    const sport = sportConfig();
    if (!sport || current.phase !== 'confirmed') return false;

    State.update((draft) => {
      if (draft.matches.length >= sport.matches) {
        draft.phase = 'complete';
        draft.completedAt = State.nowISO();
        draft.slotAId = null;
        draft.slotBId = null;
        State.audit(draft, 'draw_complete', {
          sessionId: draft.sessionId,
          matches: draft.matches.length
        });
      } else {
        draft.phase = 'idle';
        draft.slotAId = null;
        draft.slotBId = null;
        draft.previewParticipantId = null;
      }
    });

    if (current.matches.length >= sport.matches) {
      Audio.complete();
      // Publish the finished draw to the public read-only results page.
      // The first publish in a browser session asks the organizer for the
      // private publish token; later completed draws publish automatically.
      setTimeout(() => {
        if (PacDraw.Publish && typeof PacDraw.Publish.publishCompletedDraw === 'function') {
          PacDraw.Publish.publishCompletedDraw(State.get(), { interactive: true });
        }
      }, 250);
    }
    return true;
  }

  PacDraw.DrawEngine = {
    startLiveDraw,
    handleSpin,
    advanceMatch,
    isSpinning: () => spinning
  };
})();
