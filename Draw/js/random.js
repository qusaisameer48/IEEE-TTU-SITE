(function () {
  'use strict';

  const UINT32_RANGE = 0x100000000;

  function secureRandomInt(maxExclusive) {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('maxExclusive must be a positive safe integer.');
    }
    if (!window.crypto || !window.crypto.getRandomValues) {
      throw new Error('Secure random source is not available in this browser.');
    }

    // Rejection sampling avoids modulo bias.
    const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    const buffer = new Uint32Array(1);
    let value;
    do {
      window.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % maxExclusive;
  }

  function secureShuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = secureRandomInt(i + 1);
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  function randomHex(bytes) {
    const buffer = new Uint8Array(bytes || 4);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  PacDraw.Random = {
    secureRandomInt,
    secureShuffle,
    randomHex,
    algorithmLabel: 'Web Crypto CSPRNG + unbiased Fisher–Yates shuffle'
  };
})();
