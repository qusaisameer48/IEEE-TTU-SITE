import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CFG = window.SPORTS2026_CONFIG;
const supabase = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

const el = (id) => document.getElementById(id);
const masonry = el("masonry");
const emptyState = el("emptyState");
const livePill = el("livePill");
const toastEl = el("toast");

const lightbox = el("lightbox");
const lightboxImg = el("lightboxImg");
const lightboxClose = el("lightboxClose");

let knownNames = new Set();
let firstLoad = true;

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("is-error", isError);
  toastEl.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 3000);
}

function openLightbox(url) {
  lightboxImg.src = url;
  lightbox.classList.add("is-open");
}
function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightboxImg.src = "";
}
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

function tileEl(name, url, isNew) {
  const div = document.createElement("div");
  div.className = "tile" + (isNew ? " is-new" : "");
  div.dataset.name = name;
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Photo shared at IEEE Sports 2026";
  img.loading = "lazy";
  div.appendChild(img);
  div.addEventListener("click", () => openLightbox(url));
  return div;
}

async function fetchPhotos() {
  const { data, error } = await supabase.storage.from(CFG.BUCKET).list(CFG.FOLDER, {
    limit: CFG.GALLERY_PAGE_SIZE,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  return (data || []).filter((f) => f.name && !f.name.startsWith("."));
}

async function renderInitial() {
  try {
    const files = await fetchPhotos();
    if (files.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    masonry.innerHTML = "";
    files.forEach((f) => {
      const { data: pub } = supabase.storage.from(CFG.BUCKET).getPublicUrl(`${CFG.FOLDER}/${f.name}`);
      knownNames.add(f.name);
      masonry.appendChild(tileEl(f.name, pub.publicUrl, false));
    });
  } catch (e) {
    console.error(e);
    showToast("Couldn't load the photo wall. Retrying shortly…", true);
  } finally {
    firstLoad = false;
  }
}

async function pollForNew() {
  livePill.style.opacity = "0.55";
  try {
    const files = await fetchPhotos();
    const newOnes = files.filter((f) => !knownNames.has(f.name));
    if (newOnes.length > 0) {
      newOnes.reverse().forEach((f) => {
        const { data: pub } = supabase.storage.from(CFG.BUCKET).getPublicUrl(`${CFG.FOLDER}/${f.name}`);
        knownNames.add(f.name);
        masonry.prepend(tileEl(f.name, pub.publicUrl, true));
      });
      emptyState.classList.add("hidden");
    }
  } catch (e) {
    console.warn("Live refresh failed", e);
  } finally {
    livePill.style.opacity = "1";
  }
}

renderInitial().then(() => {
  setInterval(pollForNew, CFG.LIVE_POLL_INTERVAL_MS);
});