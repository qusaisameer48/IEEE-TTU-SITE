(function () {
  'use strict';

  const Config = PacDraw.Config;
  const State = PacDraw.State;

  const FORMATS = {
    story: { width: 1080, height: 1920, label: 'Story' },
    post: { width: 1080, height: 1350, label: 'Post' },
    screen: { width: 1920, height: 1080, label: 'Screen' }
  };

  function safeName(value) {
    return String(value || 'Draw').replace(/[^a-z0-9_-]+/gi, '_');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function downloadJSON() {
    const state = State.get();
    const cfg = Config.SPORTS[state.selectedSport];
    if (!cfg) return;
    const record = {
      event: 'IEEE Sports Tournament 2026',
      system: 'PAC-DRAW',
      appVersion: Config.APP_VERSION,
      sessionId: state.sessionId,
      sport: cfg.name,
      round: cfg.round,
      participantKind: cfg.kind,
      participants: state.participants,
      matches: state.matches,
      drawOrder: state.drawOrder,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      resultsCompletedAt: state.resultsCompletedAt,
      randomAlgorithm: state.randomAlgorithm,
      audit: state.audit
    };
    downloadBlob(
      new Blob([JSON.stringify(record, null, 2)], { type: 'application/json;charset=utf-8' }),
      `IEEE_Sports_2026_${safeName(cfg.name)}_Draw_Record.json`
    );
  }

  function fitText(ctx, text, maxWidth, maxFont, minFont, weight) {
    let size = maxFont;
    while (size > minFont) {
      ctx.font = `${weight || 800} ${size}px Arial, sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawBackground(ctx, width, height) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,222,0,0.12)';
    const spacing = Math.max(32, Math.floor(width / 28));
    for (let y = spacing; y < height; y += spacing) {
      for (let x = spacing; x < width; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, width / 900), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPacDecor(ctx, width, y) {
    const dotGap = width / 18;
    const start = width * 0.16;
    ctx.fillStyle = '#FFD9A0';
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.arc(start + i * dotGap, y, width * 0.0035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFDE00';
    ctx.beginPath();
    ctx.arc(start - dotGap * 0.8, y, width * 0.014, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.lineTo(start - dotGap * 0.8, y);
    ctx.fill();
  }

  function drawResultsCanvas(formatKey) {
    const format = FORMATS[formatKey];
    const state = State.get();
    const cfg = Config.SPORTS[state.selectedSport];
    if (!format || !cfg || state.phase !== 'complete') return null;

    const canvas = document.createElement('canvas');
    canvas.width = format.width;
    canvas.height = format.height;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = W * 0.065;

    drawBackground(ctx, W, H);

    ctx.strokeStyle = '#2121DE';
    ctx.lineWidth = Math.max(5, W * 0.005);
    roundRect(ctx, W * 0.025, H * 0.025, W * 0.95, H * 0.95, W * 0.02);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFDE00';
    ctx.font = `800 ${Math.round(W * 0.024)}px monospace`;
    ctx.fillText('IEEE SPORTS TOURNAMENT 2026', W / 2, H * 0.085);

    const decidedResults = state.matches.filter((match) => !!match.winnerId).length;
    const hasMatchResults = decidedResults > 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(W * 0.055)}px Arial, sans-serif`;
    ctx.fillText(hasMatchResults ? 'MATCH RESULTS' : 'FINAL DRAW RESULTS', W / 2, H * 0.15);

    ctx.fillStyle = cfg.accent || '#00E1FF';
    ctx.font = `900 ${Math.round(W * 0.038)}px Arial, sans-serif`;
    ctx.fillText(`${cfg.icon} ${cfg.name}`, W / 2, H * 0.205);
    ctx.fillStyle = '#AEB7DD';
    ctx.font = `700 ${Math.round(W * 0.022)}px Arial, sans-serif`;
    ctx.fillText(cfg.round, W / 2, H * 0.24);

    drawPacDecor(ctx, W, H * 0.275);

    const count = state.matches.length;
    const isLandscape = W > H;
    let cols;
    if (isLandscape) cols = count > 4 ? 4 : Math.min(2, count);
    else cols = count > 4 ? 2 : 1;
    const rows = Math.ceil(count / cols);
    const gap = W * 0.018;
    const gridTop = H * 0.315;
    const footerSpace = H * 0.12;
    const gridH = H - gridTop - footerSpace;
    const cardW = (W - pad * 2 - gap * (cols - 1)) / cols;
    const cardH = Math.min((gridH - gap * (rows - 1)) / rows, H * 0.19);
    const totalGridH = rows * cardH + (rows - 1) * gap;
    const yOffset = gridTop + Math.max(0, (gridH - totalGridH) * 0.12);

    state.matches.forEach((match, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = pad + col * (cardW + gap);
      const y = yOffset + row * (cardH + gap);

      ctx.fillStyle = '#0A0A1E';
      ctx.strokeStyle = '#2121DE';
      ctx.lineWidth = Math.max(3, W * 0.0025);
      roundRect(ctx, x, y, cardW, cardH, W * 0.012);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFDE00';
      ctx.font = `800 ${Math.round(W * 0.014)}px monospace`;
      ctx.fillText(`MATCH ${String(match.number).padStart(2, '0')}`, x + cardW * 0.07, y + cardH * 0.22);

      ctx.textAlign = 'center';
      const maxNameWidth = cardW * 0.78;
      const aWinner = match.winnerId && match.winnerId === match.aId;
      const bWinner = match.winnerId && match.winnerId === match.bId;

      const nameFont = fitText(ctx, match.aName, maxNameWidth, Math.round(W * 0.022), Math.round(W * 0.013), 900);
      ctx.font = `900 ${nameFont}px Arial, sans-serif`;
      ctx.fillStyle = match.winnerId && !aWinner ? '#747A9B' : '#FFFFFF';
      ctx.fillText(`${aWinner ? '🏆 ' : ''}${match.aName}`, x + cardW / 2, y + cardH * 0.44);

      if (aWinner) {
        ctx.fillStyle = '#44E6A4';
        ctx.font = `900 ${Math.round(W * 0.0105)}px Arial, sans-serif`;
        ctx.fillText('WINNER', x + cardW / 2, y + cardH * 0.56);
      }

      ctx.fillStyle = '#FFDE00';
      ctx.font = `900 ${Math.round(W * 0.013)}px monospace`;
      ctx.fillText('VS', x + cardW / 2, y + cardH * 0.65);

      const nameFontB = fitText(ctx, match.bName, maxNameWidth, Math.round(W * 0.022), Math.round(W * 0.013), 900);
      ctx.font = `900 ${nameFontB}px Arial, sans-serif`;
      ctx.fillStyle = match.winnerId && !bWinner ? '#747A9B' : '#FFFFFF';
      ctx.fillText(`${bWinner ? '🏆 ' : ''}${match.bName}`, x + cardW / 2, y + cardH * 0.80);

      if (bWinner) {
        ctx.fillStyle = '#44E6A4';
        ctx.font = `900 ${Math.round(W * 0.0105)}px Arial, sans-serif`;
        ctx.fillText('WINNER', x + cardW / 2, y + cardH * 0.91);
      } else if (!match.winnerId) {
        ctx.fillStyle = '#9FA8DA';
        ctx.font = `700 ${Math.round(W * 0.0095)}px Arial, sans-serif`;
        ctx.fillText('RESULT PENDING', x + cardW / 2, y + cardH * 0.93);
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9FA8DA';
    ctx.font = `600 ${Math.round(W * 0.014)}px Arial, sans-serif`;
    ctx.fillText(`PAC-DRAW · ${state.sessionId || ''}`, W / 2, H * 0.94);

    return canvas;
  }

  function exportPNG(formatKey) {
    const canvas = drawResultsCanvas(formatKey);
    const state = State.get();
    const cfg = Config.SPORTS[state.selectedSport];
    if (!canvas || !cfg) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `IEEE_Sports_2026_${safeName(cfg.name)}_${FORMATS[formatKey].label}.png`);
    }, 'image/png');
  }

  function exportFormat(formatKey) {
    if (formatKey === 'json') return downloadJSON();
    return exportPNG(formatKey);
  }

  PacDraw.Export = {
    exportFormat,
    downloadJSON,
    drawResultsCanvas
  };
})();
