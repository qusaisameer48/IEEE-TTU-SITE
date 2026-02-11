console.log("main.js connected ✅");

document.addEventListener("DOMContentLoaded", () => {
  // ===== Search Dropdown =====
  const searchToggle = document.getElementById("searchToggle");
  const searchDropdown = document.getElementById("searchDropdown");
  const searchInput = document.querySelector(".search-input-field");
  const searchSubmitBtn = document.querySelector(".search-submit-btn");

  function performSearch() {
    const searchTerm = (searchInput?.value || "").trim();
    if (searchTerm) {
      // انت داخل pages/ فالمسار الصحيح يكون search.html بنفس المجلد
      window.location.href = "search.html?q=" + encodeURIComponent(searchTerm);
    }
  }

  if (searchToggle && searchDropdown) {
    searchToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      searchDropdown.classList.toggle("active");
      if (searchDropdown.classList.contains("active") && searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !searchDropdown.contains(e.target) &&
        !searchToggle.contains(e.target)
      ) {
        searchDropdown.classList.remove("active");
      }
    });

    searchDropdown.addEventListener("click", (e) => e.stopPropagation());

    if (searchSubmitBtn) searchSubmitBtn.addEventListener("click", performSearch);

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch();
      });
    }
  }

  // ===== Header Scroll Color Change =====
  const header = document.getElementById("siteHeader");
  if (!header) return; // حماية لو الصفحة ما فيها هيدر

  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 50);
  });
});


// load saved theme
document.documentElement.setAttribute(
  "data-theme",
  localStorage.getItem("theme") || "light"
);

const header = document.getElementById("siteHeader");

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 50);
});







//Event
document.addEventListener("DOMContentLoaded", () => {
  const events = document.querySelectorAll("[data-event]");

  events.forEach((eventBox) => {
    const mainImg = eventBox.querySelector(".event-main-img");
    const thumbs = Array.from(eventBox.querySelectorAll(".thumb"));
    const prevBtn = eventBox.querySelector(".prev");
    const nextBtn = eventBox.querySelector(".next");

    if (!mainImg || thumbs.length === 0) return;

    let index = thumbs.findIndex(t => t.classList.contains("active"));
    if (index < 0) index = 0;

    function setActive(i) {
      index = (i + thumbs.length) % thumbs.length;
      mainImg.src = thumbs[index].src;

      thumbs.forEach(t => t.classList.remove("active"));
      thumbs[index].classList.add("active");
    }

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener("click", () => setActive(i));
    });

    prevBtn?.addEventListener("click", () => setActive(index - 1));
    nextBtn?.addEventListener("click", () => setActive(index + 1));
  });
});








const toggle = document.getElementById("themeToggle");

if (toggle) {
  toggle.addEventListener("click", () => {
    const html = document.documentElement;
    const next =
      html.getAttribute("data-theme") === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });









 
}


