import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CFG = window.SPORTS2026_CONFIG;
const supabase = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------
const el = (id) => document.getElementById(id);

const stepCapture = el("step-capture");
const stepPreview = el("step-preview");
const stepSuccess = el("step-success");

const btnTakePhoto = el("btnTakePhoto");
const btnChooseGallery = el("btnChooseGallery");
const inputCamera = el("inputCamera");
const inputGallery = el("inputGallery");

const previewImg = el("previewImg");
const consentCheck = el("consentCheck");
const btnUpload = el("btnUpload");
const btnChooseAnother = el("btnChooseAnother");
const btnUploadAnother = el("btnUploadAnother");

const progressTrack = el("progressTrack");
const progressFill = el("progressFill");
const progressNote = el("progressNote");

const hpField = el("hp_field");
const toastEl = el("toast");
const recentSection = el("recentSection");
const recentStrip = el("recentStrip");

mountPacTrail(el("pacSlot"));

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
let compressedBlob = null;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("is-error", isError);
  toastEl.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 3200);
}

function goToStep(step) {
  stepCapture.classList.toggle("hidden", step !== "capture");
  stepPreview.classList.toggle("hidden", step !== "preview");
  stepSuccess.classList.toggle("hidden", step !== "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function randomId(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function withinRateLimit() {
  const key = "s26_upload_log";
  const now = Date.now();
  let log = [];
  try { log = JSON.parse(localStorage.getItem(key) || "[]"); } catch { log = []; }
  log = log.filter((t) => now - t < CFG.RATE_LIMIT_WINDOW_MS);
  if (log.length >= CFG.RATE_LIMIT_UPLOADS) return false;
  log.push(now);
  localStorage.setItem(key, JSON.stringify(log));
  return true;
}

// Resize + re-encode an image file client-side using canvas.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      const max = CFG.MAX_DIMENSION_PX;
      if (width > max || height > max) {
        if (width >= height) { height = Math.round((height * max) / width); width = max; }
        else { width = Math.round((width * max) / height); height = max; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
        "image/jpeg",
        CFG.JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function validateFile(file) {
  if (!file) return "No file selected.";
  if (!CFG.ALLOWED_TYPES.includes(file.type)) return "Please choose a JPG, PNG, or WebP image.";
  if (file.size > CFG.MAX_UPLOAD_BYTES) return "That photo is too large. Please choose a smaller one.";
  return null;
}

async function handleFileSelected(file) {
  const err = validateFile(file);
  if (err) { showToast(err, true); return; }

  try {
    showToast("Preparing your photo…");
    let blob = file;
    // Compress if it's already reasonably small we still normalize to JPEG
    // for consistency, but skip heavy re-encode work for tiny files.
    blob = await compressImage(file);
    compressedBlob = blob;
    previewImg.src = URL.createObjectURL(blob);
    consentCheck.checked = false;
    btnUpload.disabled = true;
    goToStep("preview");
  } catch (e) {
    console.error(e);
    showToast("Couldn't process that photo — please try another.", true);
  }
}

// ---------------------------------------------------------------------
// Step 1 — capture / choose
// ---------------------------------------------------------------------
btnTakePhoto.addEventListener("click", () => inputCamera.click());
btnChooseGallery.addEventListener("click", () => inputGallery.click());

inputCamera.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  inputCamera.value = "";
  if (file) handleFileSelected(file);
});
inputGallery.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  inputGallery.value = "";
  if (file) handleFileSelected(file);
});

// ---------------------------------------------------------------------
// Step 2 — preview / consent / upload
// ---------------------------------------------------------------------
consentCheck.addEventListener("change", () => {
  btnUpload.disabled = !consentCheck.checked || !compressedBlob;
});

btnChooseAnother.addEventListener("click", () => {
  compressedBlob = null;
  previewImg.src = "";
  goToStep("capture");
});

btnUpload.addEventListener("click", async () => {
  if (!compressedBlob) return;
  if (hpField.value.trim() !== "") { showToast("Something went wrong. Please try again.", true); return; }
  if (!withinRateLimit()) {
    showToast("You've shared a few photos already — give it a moment before uploading more.", true);
    return;
  }

  btnUpload.disabled = true;
  btnChooseAnother.disabled = true;
  progressTrack.classList.add("is-active");
  progressNote.classList.remove("hidden");
  animateProgress(0, 70, 900);

  const fileName = `${Date.now()}-${randomId(6)}.jpg`;
  const path = `${CFG.FOLDER}/${fileName}`;

  try {
    const { error } = await supabase.storage.from(CFG.BUCKET).upload(path, compressedBlob, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    animateProgress(70, 100, 350);
    setTimeout(() => {
      progressTrack.classList.remove("is-active");
      progressNote.classList.add("hidden");
      btnChooseAnother.disabled = false;
      compressedBlob = null;
      goToStep("success");
    }, 380);
  } catch (e) {
    console.error(e);
    progressTrack.classList.remove("is-active");
    progressNote.classList.add("hidden");
    btnUpload.disabled = false;
    btnChooseAnother.disabled = false;
    showToast("Upload failed — please check your connection and try again.", true);
  }
});

function animateProgress(from, to, duration) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const val = from + (to - from) * t;
    progressFill.style.width = `${val}%`;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------
// Step 3 — success
// ---------------------------------------------------------------------
btnUploadAnother.addEventListener("click", () => {
  progressFill.style.width = "0%";
  goToStep("capture");
  loadRecentMoments();
});

// ---------------------------------------------------------------------
// Recent moments strip
// ---------------------------------------------------------------------
async function loadRecentMoments() {
  try {
    const { data, error } = await supabase.storage.from(CFG.BUCKET).list(CFG.FOLDER, {
      limit: CFG.RECENT_PREVIEW_COUNT,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data || data.length === 0) return;

    recentStrip.innerHTML = "";
    data
      .filter((f) => f.name && !f.name.startsWith("."))
      .slice(0, CFG.RECENT_PREVIEW_COUNT)
      .forEach((f) => {
        const { data: pub } = supabase.storage.from(CFG.BUCKET).getPublicUrl(`${CFG.FOLDER}/${f.name}`);
        const img = document.createElement("img");
        img.src = pub.publicUrl;
        img.alt = "Recent moment from IEEE Sports 2026";
        img.loading = "lazy";
        recentStrip.appendChild(img);
      });
    recentSection.classList.remove("hidden");
  } catch (e) {
    console.warn("Could not load recent moments", e);
  }
}

loadRecentMoments();