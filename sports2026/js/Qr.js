// Runs on qr.html — expects config.js, pacman.js, and the qrcodejs CDN
// script to already be loaded (see qr.html <script> tags).
(function () {
  const CFG = window.SPORTS2026_CONFIG;

  mountPacTrail(document.getElementById("pacSlot"), { tiny: true });

  document.getElementById("qrUrl").textContent = CFG.SHARE_URL;

  new QRCode(document.getElementById("qrBox"), {
    text: CFG.SHARE_URL,
    width: 260,
    height: 260,
    colorDark: "#07070c",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });

  document.getElementById("btnPrint").addEventListener("click", () => window.print());
})();