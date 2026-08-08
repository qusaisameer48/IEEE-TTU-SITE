// Shared "Pac-Man dot trail" signature element.
// Renders a row of glowing dots with a small Pac-Man SVG running across them.
// Usage: mountPacTrail(document.getElementById('slot')) or pass {tiny:true}.
function mountPacTrail(target, opts = {}) {
  if (!target) return;
  const tiny = opts.tiny ? ' pac-trail--tiny' : '';
  const dots = Array.from({ length: opts.dots || 5 }, () => '<span class="dot"></span>').join('');
  target.innerHTML = `
    <div class="pac-trail${tiny}" aria-hidden="true">
      ${dots}
      <span class="pac">
        <svg viewBox="0 0 20 20">
          <path class="mouth" fill="#ffd23f"
            d="M10 10 L19 4 A10 10 0 1 1 19 16 Z" />
        </svg>
      </span>
    </div>`;
}