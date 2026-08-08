// ==========================================================================
// IEEE Sports 2026 — Community Photo Wall — Global Config
// ==========================================================================
// Fill in SUPABASE_URL and SUPABASE_ANON_KEY with your project's values.
// SUPABASE_ANON_KEY is the PUBLIC "anon" key — it is safe to ship in the
// browser as long as Storage RLS policies are configured correctly
// (see /supabase/setup.sql). NEVER put the service_role key here.
// ==========================================================================

window.SPORTS2026_CONFIG = {
SUPABASE_URL: "https://bkhxdvwcawtkmbtzowpr.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_t_e2Vw4vLioNM3iqpW8sSQ_jJnlOwH1",

  // Storage
  BUCKET: "sports-photos",
  FOLDER: "community",

  // Upload limits (client-side pre-check; hard limits also enforced by the bucket)
  MAX_UPLOAD_BYTES: 15 * 1024 * 1024,      // 15MB raw file accepted before compression
  MAX_OUTPUT_BYTES: 3 * 1024 * 1024,       // target size after compression
  MAX_DIMENSION_PX: 1920,                  // longest edge after compression
  JPEG_QUALITY: 0.82,
  ALLOWED_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],

  // Gallery
  LIVE_POLL_INTERVAL_MS: 20000,            // 15–30s live refresh
  GALLERY_PAGE_SIZE: 200,                  // photos loaded per fetch (most recent first)
  RECENT_PREVIEW_COUNT: 6,                 // small strip on the share page

  // Basic client-side abuse guard (NOT a security boundary — real protection
  // is the Storage RLS policy. This just stops accidental spam-tapping).
  RATE_LIMIT_UPLOADS: 5,
  RATE_LIMIT_WINDOW_MS: 10 * 60 * 1000,    // 5 uploads / 10 minutes per device

  // Public share link encoded into the QR code
  SHARE_URL: "https://ieeettubranch.com/sports2026/share",

  // Optional: Cloudflare Turnstile site key. Leave empty to disable CAPTCHA.
  TURNSTILE_SITE_KEY: ""
};