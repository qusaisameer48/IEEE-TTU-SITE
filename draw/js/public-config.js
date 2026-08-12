(function () {
  'use strict';

  window.PacDrawPublic = window.PacDrawPublic || {};

  PacDrawPublic.Config = Object.freeze({
    SUPABASE_URL: 'https://bkhxdvwcawtkmbtzowpr.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_t_e2Vw4vLioNM3iqpW8sSQ_jJnlOwH1',
    RESULTS_TABLE: 'draw_results',
    PUBLISH_RPC: 'publish_draw_result',
    REFRESH_INTERVAL_MS: 10000,
    PUBLISH_TOKEN_SESSION_KEY: 'ieee_sports_2026_draw_publish_token_v7'
  });
})();
