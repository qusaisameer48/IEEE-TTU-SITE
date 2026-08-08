// ==========================================================================
// IEEE Sports 2026 — Global Config
// ==========================================================================

window.SPORTS2026_CONFIG = {

  SUPABASE_URL: "https://bkhxdvwcawtkmbtzowpr.supabase.co",

  SUPABASE_ANON_KEY: "sb_publishable_t_e2Vw4vLioNM3iqpW8sSQ_jJnlOwH1",

  // Storage
  BUCKET: "sports-photos",
  FOLDER: "community",

  // Upload limits
  MAX_UPLOAD_BYTES: 15 * 1024 * 1024,
  MAX_OUTPUT_BYTES: 3 * 1024 * 1024,
  MAX_DIMENSION_PX: 1920,
  JPEG_QUALITY: 0.82,

  ALLOWED_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ],

  // Gallery
  LIVE_POLL_INTERVAL_MS: 20000,
  GALLERY_PAGE_SIZE: 200,
  RECENT_PREVIEW_COUNT: 6,

  // Rate limit
  RATE_LIMIT_UPLOADS: 5,
  RATE_LIMIT_WINDOW_MS: 10 * 60 * 1000,

  // QR link
  SHARE_URL: "https://ieeettubranch.com/sports2026/share.html",

  // Turnstile
  TURNSTILE_SITE_KEY: ""
};