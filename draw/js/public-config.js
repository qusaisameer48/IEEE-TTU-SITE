(function () {
  'use strict';

  window.PacDrawPublic = window.PacDrawPublic || {};

  PacDrawPublic.Config = Object.freeze({
    SUPABASE_URL: 'https://bkhxdvwcawtkmbtzowpr.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_t_e2Vw4vLioNM3iqpW8sSQ_jJnlOwH1',
    LIVE_STATE_TABLE: 'draw_live_state',
    LIVE_STATE_RPC: 'push_draw_live_state',
    LIVE_REFRESH_INTERVAL_MS: 2500,
    LIVE_TOKEN_SESSION_KEY: 'ieee_sports_2026_live_display_token_v9'
  });
})();
