(function () {
  'use strict';

  window.PacDraw = window.PacDraw || {};

  PacDraw.Config = Object.freeze({
    APP_VERSION: '4.0.0',
    STORAGE_KEY: 'ieee_sports_2026_pacdraw_workspace_v3',
    LEGACY_STORAGE_KEYS: Object.freeze([
      'ieee_sports_2026_pacdraw_state_v2'
    ]),
    HISTORY_KEY: 'ieee_sports_2026_pacdraw_history_v3',
    CHANNEL_NAME: 'ieee-sports-2026-pacdraw-v3',
    PEER_TIMEOUT_MS: 5500,
    DRAW_STEPS: 18,
    DRAW_START_DELAY_MS: 48,
    DRAW_DELAY_GROWTH_MS: 13,
    MAX_HISTORY_SESSIONS: 20,
    SPORTS: Object.freeze({
      football: Object.freeze({
        key: 'football',
        icon: '⚽',
        name: 'FOOTBALL',
        round: 'QUARTER FINALS',
        roundLabel: 'Quarter Finals',
        participants: 8,
        matches: 4,
        kind: 'team',
        kindLabel: 'TEAMS',
        participantLabel: 'Team',
        accent: '#00E1FF'
      }),
      basketball: Object.freeze({
        key: 'basketball',
        icon: '🏀',
        name: 'BASKETBALL',
        round: 'SEMI FINALS',
        roundLabel: 'Semi Finals',
        participants: 4,
        matches: 2,
        kind: 'team',
        kindLabel: 'TEAMS',
        participantLabel: 'Team',
        accent: '#FF9D2E'
      }),
      tabletennis: Object.freeze({
        key: 'tabletennis',
        icon: '🏓',
        name: 'TABLE TENNIS',
        round: 'ROUND OF 16',
        roundLabel: 'Round of 16',
        participants: 16,
        matches: 8,
        kind: 'player',
        kindLabel: 'PLAYERS',
        participantLabel: 'Player',
        accent: '#FF4B4B'
      }),
      badminton: Object.freeze({
        key: 'badminton',
        icon: '🏸',
        name: 'BADMINTON',
        round: 'QUARTER FINALS',
        roundLabel: 'Quarter Finals',
        participants: 8,
        matches: 4,
        kind: 'player',
        kindLabel: 'PLAYERS',
        participantLabel: 'Player',
        accent: '#B47CFF'
      })
    })
  });
})();
