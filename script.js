(() => {
  const canvas = document.getElementById('paintCanvas');
  const overlay = document.getElementById('overlayCanvas');
  const ctx = canvas.getContext('2d');
  const octx = overlay.getContext('2d');

  // ---------- Fill paper background once ----------
  function paintBackground() {
    ctx.fillStyle = '#F3ECDC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  paintBackground();

  // ---------- State ----------
  const state = {
    tool: 'brush',
    color: '#1f4b5f',
    size: 14,
    opacity: 100,
    drawing: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  };

  const palette = [
    '#14110D', '#F3ECDC', '#1F4B5F', '#3A7086',
    '#C98A2C', '#A63D2F', '#5B7A4A', '#8A5A9E',
    '#D4B483', '#7A2E2E', '#2E4A3A', '#C4C4B6'
  ];

  // ---------- Build swatches ----------
  const board = document.getElementById('swatchBoard');
  palette.forEach((hex, i) => {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (hex.toLowerCase() === state.color ? ' is-active' : '');
    sw.style.background = hex;
    sw.setAttribute('aria-label', 'color ' + hex);
    sw.addEventListener('click', () => {
      setColor(hex);
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-active'));
      sw.classList.add('is-active');
    });
    board.appendChild(sw);
  });

  const colorPicker = document.getElementById('colorPicker');
  colorPicker.addEventListener('input', (e) => {
    setColor(e.target.value);
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-active'));
  });

  function setColor(hex) {
    state.color = hex;
    updateBrushPreview();
  }

  // ---------- Tool buttons ----------
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.tool = btn.dataset.tool;
      updateBrushPreview();
    });
  });

  // ---------- Sliders ----------
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeReadout = document.getElementById('sizeReadout');
  sizeSlider.addEventListener('input', () => {
    state.size = Number(sizeSlider.value);
    sizeReadout.textContent = state.size;
    updateBrushPreview();
  });

  const opacitySlider = document.getElementById('opacitySlider');
  const opacityReadout = document.getElementById('opacityReadout');
  opacitySlider.addEventListener('input', () => {
    state.opacity = Number(opacitySlider.value);
    opacityReadout.textContent = state.opacity;
    updateBrushPreview();
  });

  const brushDot = document.getElementById('brushDot');
  function updateBrushPreview() {
    const displaySize = Math.max(4, Math.min(48, state.size));
    brushDot.style.width = displaySize + 'px';
    brushDot.style.height = displaySize + 'px';
    brushDot.style.background = state.tool === 'eraser' ? '#F3ECDC' : state.color;
    brushDot.style.opacity = state.opacity / 100;
    brushDot.style.border = state.tool === 'eraser' ? '2px dashed #14110D' : 'none';
  }
  updateBrushPreview();

  // ---------- Coordinate mapping (canvas buffer vs displayed size) ----------
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point = e.touches ? e.touches[0] : e;
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }

  // ---------- Drawing ----------
  function strokeStyleFor(tool) {
    if (tool === 'eraser') return '#F3ECDC';
    return state.color;
  }

  function beginStroke(pos) {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.opacity / 100;
    ctx.strokeStyle = strokeStyleFor(state.tool);
    ctx.lineWidth = state.tool === 'pencil' ? Math.max(1, state.size * 0.35) : state.size;
  }

  function drawTo(pos) {
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function drawShapePreview(pos) {
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.globalAlpha = state.opacity / 100;
    octx.strokeStyle = state.color;
    octx.lineWidth = state.size;
    octx.lineCap = 'round';
    octx.beginPath();
    if (state.tool === 'line') {
      octx.moveTo(state.startX, state.startY);
      octx.lineTo(pos.x, pos.y);
    } else if (state.tool === 'rect') {
      const w = pos.x - state.startX;
      const h = pos.y - state.startY;
      octx.rect(state.startX, state.startY, w, h);
    } else if (state.tool === 'circle') {
      const r = Math.hypot(pos.x - state.startX, pos.y - state.startY);
      octx.arc(state.startX, state.startY, r, 0, Math.PI * 2);
    }
    octx.stroke();
  }

  function commitShape(pos) {
    ctx.globalAlpha = state.opacity / 100;
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (state.tool === 'line') {
      ctx.moveTo(state.startX, state.startY);
      ctx.lineTo(pos.x, pos.y);
    } else if (state.tool === 'rect') {
      const w = pos.x - state.startX;
      const h = pos.y - state.startY;
      ctx.rect(state.startX, state.startY, w, h);
    } else if (state.tool === 'circle') {
      const r = Math.hypot(pos.x - state.startX, pos.y - state.startY);
      ctx.arc(state.startX, state.startY, r, 0, Math.PI * 2);
    }
    ctx.stroke();
    octx.clearRect(0, 0, overlay.width, overlay.height);
  }

  const freehandTools = ['brush', 'pencil', 'eraser'];

  function pointerDown(e) {
    e.preventDefault();
    const pos = getPos(e);
    state.drawing = true;
    state.startX = pos.x;
    state.startY = pos.y;
    state.lastX = pos.x;
    state.lastY = pos.y;
    if (freehandTools.includes(state.tool)) {
      beginStroke(pos);
    }
  }

  function pointerMove(e) {
    if (!state.drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    if (freehandTools.includes(state.tool)) {
      drawTo(pos);
    } else {
      drawShapePreview(pos);
    }
    state.lastX = pos.x;
    state.lastY = pos.y;
  }

  function pointerUp(e) {
    if (!state.drawing) return;
    state.drawing = false;
    ctx.globalAlpha = 1;
    if (!freehandTools.includes(state.tool)) {
      const pos = getPos(e && e.changedTouches ? e.changedTouches[0] : e || { clientX: 0, clientY: 0 });
      // fall back to lastX/lastY if event unavailable (e.g. pointer left canvas)
      const finalPos = (e && (e.clientX !== undefined || e.changedTouches)) ? pos : { x: state.lastX, y: state.lastY };
      commitShape(finalPos);
    }
    pushHistory();
  }

  canvas.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);

  canvas.addEventListener('touchstart', pointerDown, { passive: false });
  canvas.addEventListener('touchmove', pointerMove, { passive: false });
  canvas.addEventListener('touchend', pointerUp);

  // ---------- History (undo / redo) ----------
  const history = [];
  let historyIndex = -1;
  const MAX_HISTORY = 40;

  function pushHistory() {
    const snapshot = canvas.toDataURL();
    history.splice(historyIndex + 1); // drop redo branch
    history.push(snapshot);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function restore(dataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restore(history[historyIndex]);
    updateHistoryButtons();
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restore(history[historyIndex]);
    updateHistoryButtons();
  }

  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  function updateHistoryButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
  }
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // seed initial history state (blank paper)
  pushHistory();

  // ---------- Clear ----------
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear the whole canvas?')) return;
    paintBackground();
    pushHistory();
  });

  // ---------- Save ----------
  document.getElementById('saveBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'atelier-artwork.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ---------- Keyboard shortcuts ----------
  window.addEventListener('keydown', (e) => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (meta && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  });
})();
