(function () {
  'use strict';

  window.PacDrawPublic = window.PacDrawPublic || {};

  // Public browser configuration. The publishable key is intentionally safe
  // to ship to browsers when your Supabase RLS/grants are configured.
  PacDrawPublic.Config = Object.freeze({
    SUPABASE_URL: 'https://bkhxdvwcawtkmbtzowpr.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_t_e2Vw4vLioNM3iqpW8sSQ_jJnlOwH1',
    RESULTS_TABLE: 'draw_results',
    PUBLISH_RPC: 'publish_draw_result',
    REFRESH_INTERVAL_MS: 12000,
    PUBLISH_TOKEN_SESSION_KEY: 'ieee_sports_2026_draw_publish_token_v1'
  });
})();
