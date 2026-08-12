(function () {
  'use strict';

  let context = null;
  let muted = localStorage.getItem('ieee_pacdraw_muted') === '1';

  function ensureContext() {
    if (muted) return null;
    try {
      context = context || new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume();
      return context;
    } catch (_) {
      return null;
    }
  }

  function beep(freq, duration, type, volume) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type || 'square';
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume == null ? 0.05 : volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  function tick() { beep(720, 0.055, 'square', 0.04); }
  function reveal() { beep(980, 0.22, 'triangle', 0.12); }
  function lock() {
    beep(520, 0.10, 'square', 0.06);
    setTimeout(() => beep(760, 0.16, 'triangle', 0.08), 90);
  }
  function complete() {
    beep(520, 0.12, 'triangle', 0.08);
    setTimeout(() => beep(720, 0.14, 'triangle', 0.09), 130);
    setTimeout(() => beep(980, 0.28, 'triangle', 0.11), 270);
  }

  function toggle() {
    muted = !muted;
    localStorage.setItem('ieee_pacdraw_muted', muted ? '1' : '0');
    if (!muted) ensureContext();
    return muted;
  }

  PacDraw.Audio = {
    ensureContext,
    tick,
    reveal,
    lock,
    complete,
    toggle,
    isMuted: () => muted
  };
})();
