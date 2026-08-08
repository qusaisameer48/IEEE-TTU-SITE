(function () {
  const qrBox = document.getElementById("qrBox");
  const qrUrl = document.getElementById("qrUrl");
  const btnPrint = document.getElementById("btnPrint");
  const pacSlot = document.getElementById("pacSlot");

  // رابط صفحة المشاركة
  const shareUrl =
    window.SPORTS2026_CONFIG?.SHARE_URL ||
    new URL("./share.html", window.location.href).href;

  // عرض الرابط
  if (qrUrl) {
    qrUrl.textContent = shareUrl;
  }

  // إنشاء QR
  if (qrBox && typeof QRCode !== "undefined") {
    qrBox.innerHTML = "";

    new QRCode(qrBox, {
      text: shareUrl,
      width: 260,
      height: 260,
      colorDark: "#07070c",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    console.error("QRCode library not loaded");
  }

  // Pac-Man
  if (pacSlot && typeof mountPacTrail === "function") {
    mountPacTrail(pacSlot, { tiny: true });
  }

  // زر الطباعة
  if (btnPrint) {
    btnPrint.addEventListener("click", function () {
      window.print();
    });
  }
})();