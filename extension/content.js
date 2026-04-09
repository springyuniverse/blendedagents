/**
 * BlendedAgents Annotator — Content Script
 *
 * Injects a transparent canvas overlay + floating toolbar onto any page.
 * The tester draws annotations (pen, rect, arrow, text) directly on the
 * target site. Since the canvas is part of the page's DOM, getDisplayMedia
 * and captureVisibleTab capture both the site and the annotations.
 */

(() => {
  // Guard against double-injection.
  if (document.getElementById('ba-root')) return;

  // ── State ──────────────────────────────────────────────────

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
  const STROKE_W = 3;

  let active = false;        // overlay mounted?
  let drawMode = false;       // pointer events on canvas?
  let tool = 'arrow';         // pen | rect | arrow | text | eraser
  let color = COLORS[0];
  let strokes = [];           // { id, type, color, width, points, text? }
  let drawingId = null;
  let isPointerDown = false;

  // ── DOM ────────────────────────────────────────────────────

  let root, canvas, ctx, toolbar, toast;

  function mount() {
    root = document.createElement('div');
    root.id = 'ba-root';

    canvas = document.createElement('canvas');
    canvas.id = 'ba-canvas';
    root.appendChild(canvas);

    toolbar = buildToolbar();
    root.appendChild(toolbar);

    toast = document.createElement('div');
    toast.id = 'ba-toast';
    root.appendChild(toast);

    document.documentElement.appendChild(root);

    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  function unmount() {
    if (root) {
      window.removeEventListener('resize', resizeCanvas);
      root.remove();
      root = canvas = ctx = toolbar = toast = null;
    }
    strokes = [];
    drawingId = null;
    isPointerDown = false;
    drawMode = false;
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    redraw();
  }

  // ── Drawing ────────────────────────────────────────────────

  function norm(e) {
    return {
      nx: Math.max(0, Math.min(1, e.clientX / window.innerWidth)),
      ny: Math.max(0, Math.min(1, e.clientY / window.innerHeight)),
    };
  }

  function onPointerDown(e) {
    if (!drawMode) return;
    e.preventDefault();
    e.stopPropagation();
    canvas.setPointerCapture(e.pointerId);
    const { nx, ny } = norm(e);

    if (tool === 'text') {
      const text = prompt('Annotation text:');
      if (text) {
        strokes.push({ id: uid(), type: 'text', color, width: STROKE_W, points: [[nx, ny]], text });
        redraw();
      }
      return;
    }

    if (tool === 'eraser') {
      eraseAt(nx, ny);
      isPointerDown = true;
      return;
    }

    isPointerDown = true;
    drawingId = uid();
    strokes.push({ id: drawingId, type: tool, color, width: STROKE_W, points: [[nx, ny]] });
    redraw();
  }

  function onPointerMove(e) {
    if (!drawMode || !isPointerDown) return;
    e.preventDefault();
    e.stopPropagation();
    const { nx, ny } = norm(e);

    if (tool === 'eraser') {
      eraseAt(nx, ny);
      return;
    }

    const s = strokes.find((s) => s.id === drawingId);
    if (!s) return;

    if (s.type === 'pen') {
      s.points.push([nx, ny]);
    } else {
      // rect/arrow: keep first point + current
      s.points = [s.points[0], [nx, ny]];
    }
    redraw();
  }

  function onPointerUp() {
    isPointerDown = false;
    drawingId = null;
  }

  function eraseAt(nx, ny) {
    const t = 0.025;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (hitTest(strokes[i], nx, ny, t)) {
        strokes.splice(i, 1);
        redraw();
        return;
      }
    }
  }

  function undo() {
    if (strokes.length > 0) {
      strokes.pop();
      redraw();
    }
  }

  function clearAll() {
    strokes = [];
    redraw();
  }

  // ── Render ─────────────────────────────────────────────────

  function redraw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    for (const s of strokes) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.type === 'pen') {
        ctx.beginPath();
        for (let i = 0; i < s.points.length; i++) {
          const x = s.points[i][0] * w;
          const y = s.points[i][1] * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (s.type === 'rect') {
        const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
        const x0 = p0[0] * w, y0 = p0[1] * h;
        const x1 = p1[0] * w, y1 = p1[1] * h;
        ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      } else if (s.type === 'arrow') {
        const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
        const x0 = p0[0] * w, y0 = p0[1] * h;
        const x1 = p1[0] * w, y1 = p1[1] * h;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(y1 - y0, x1 - x0);
        const headLen = Math.max(12, s.width * 5) * dpr;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (s.type === 'text' && s.text) {
        const x = s.points[0][0] * w;
        const y = s.points[0][1] * h;
        const size = 16 * dpr;
        ctx.font = `600 ${size}px -apple-system, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        const metrics = ctx.measureText(s.text);
        const px = 6 * dpr, py = 4 * dpr;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - px, y - py, metrics.width + px * 2, size + py * 2);
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, x, y);
      }

      ctx.restore();
    }
  }

  // ── Hit testing for eraser ─────────────────────────────────

  function hitTest(s, nx, ny, t) {
    if (s.type === 'pen') return s.points.some(([px, py]) => Math.hypot(px - nx, py - ny) < t);
    if (s.type === 'rect') {
      const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
      return nx >= Math.min(p0[0], p1[0]) - t && nx <= Math.max(p0[0], p1[0]) + t
        && ny >= Math.min(p0[1], p1[1]) - t && ny <= Math.max(p0[1], p1[1]) + t;
    }
    if (s.type === 'arrow') {
      const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
      return distToSeg(nx, ny, p0[0], p0[1], p1[0], p1[1]) < t;
    }
    if (s.type === 'text') return Math.hypot(s.points[0][0] - nx, s.points[0][1] - ny) < 0.05;
    return false;
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + u * dx), py - (y1 + u * dy));
  }

  // ── Screenshot ─────────────────────────────────────────────

  async function captureScreenshot() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'ba:capture-tab' });
      if (!response?.ok) {
        showToast('Capture failed — try clicking the extension icon first');
        return;
      }

      // Copy to clipboard.
      const blob = await (await fetch(response.dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      showToast('Screenshot copied to clipboard');

      // Also forward to dashboard tab.
      chrome.runtime.sendMessage({
        type: 'ba:send-to-dashboard',
        dataUrl: response.dataUrl,
      });
    } catch (err) {
      console.error('[BA] Screenshot capture failed:', err);
      showToast('Capture failed: ' + err.message);
    }
  }

  // ── Toast ──────────────────────────────────────────────────

  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('ba-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('ba-visible'), 2500);
  }

  // ── Toolbar ────────────────────────────────────────────────

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.id = 'ba-toolbar';

    // Drag handle
    const drag = el('div', 'ba-drag');
    drag.innerHTML = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
      <circle cx="2" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
      <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
      <circle cx="2" cy="13" r="1.2"/><circle cx="8" cy="13" r="1.2"/>
    </svg>`;
    drag.title = 'Drag to move';
    setupDrag(drag, bar);
    bar.appendChild(drag);

    // Draw toggle
    const toggle = el('button', 'ba-btn ba-toggle');
    toggle.innerHTML = '<span class="ba-dot"></span>Draw';
    toggle.title = 'Toggle drawing mode';
    toggle.onclick = () => toggleDraw();
    toggle.dataset.role = 'toggle';
    bar.appendChild(toggle);

    bar.appendChild(el('div', 'ba-sep'));

    // Tools
    const tools = [
      { id: 'pen', label: 'Pen', svg: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>' },
      { id: 'rect', label: 'Rectangle', svg: '<rect x="3" y="3" width="18" height="18" rx="2"/>' },
      { id: 'arrow', label: 'Arrow', svg: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/>' },
      { id: 'text', label: 'Text', svg: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>' },
      { id: 'eraser', label: 'Eraser', svg: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/>' },
    ];
    tools.forEach((t) => {
      const btn = el('button', 'ba-btn');
      btn.innerHTML = svgIcon(t.svg);
      btn.title = t.label;
      btn.dataset.tool = t.id;
      btn.onclick = () => selectTool(t.id);
      bar.appendChild(btn);
    });

    bar.appendChild(el('div', 'ba-sep'));

    // Colors
    COLORS.forEach((c) => {
      const btn = el('button', 'ba-color');
      btn.style.background = c;
      btn.dataset.color = c;
      btn.title = c;
      btn.onclick = () => selectColor(c);
      bar.appendChild(btn);
    });

    bar.appendChild(el('div', 'ba-sep'));

    // Undo
    const undoBtn = el('button', 'ba-btn');
    undoBtn.innerHTML = svgIcon('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>');
    undoBtn.title = 'Undo';
    undoBtn.onclick = () => undo();
    bar.appendChild(undoBtn);

    // Clear
    const clearBtn = el('button', 'ba-btn');
    clearBtn.innerHTML = svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');
    clearBtn.title = 'Clear all';
    clearBtn.onclick = () => clearAll();
    bar.appendChild(clearBtn);

    bar.appendChild(el('div', 'ba-sep'));

    // Capture screenshot
    const capBtn = el('button', 'ba-btn ba-capture');
    capBtn.textContent = 'Capture';
    capBtn.title = 'Capture screenshot with annotations';
    capBtn.onclick = () => captureScreenshot();
    bar.appendChild(capBtn);

    bar.appendChild(el('div', 'ba-sep'));

    // Close / dismiss toolbar
    const closeBtn = el('button', 'ba-btn');
    closeBtn.innerHTML = svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');
    closeBtn.title = 'Close annotation bar';
    closeBtn.onclick = () => { unmount(); active = false; };
    bar.appendChild(closeBtn);

    return bar;
  }

  function toggleDraw() {
    drawMode = !drawMode;
    updateToolbarState();
    canvas.className = drawMode
      ? (tool === 'eraser' ? 'ba-erasing' : 'ba-drawing')
      : '';
  }

  function selectTool(id) {
    tool = id;
    if (!drawMode) {
      drawMode = true;
    }
    updateToolbarState();
    canvas.className = tool === 'eraser' ? 'ba-erasing' : 'ba-drawing';
  }

  function selectColor(c) {
    color = c;
    updateToolbarState();
  }

  function updateToolbarState() {
    if (!toolbar) return;
    // Toggle
    const toggle = toolbar.querySelector('[data-role="toggle"]');
    if (toggle) toggle.classList.toggle('ba-active', drawMode);
    // Tools
    toolbar.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.toggle('ba-active', drawMode && btn.dataset.tool === tool);
    });
    // Colors
    toolbar.querySelectorAll('[data-color]').forEach((btn) => {
      btn.classList.toggle('ba-active', btn.dataset.color === color);
    });
  }

  // ── Drag ───────────────────────────────────────────────────

  function setupDrag(handle, target) {
    let dragging = false;
    let startX, startY, origX, origY;

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = target.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      handle.setPointerCapture(e.pointerId);
      target.classList.add('ba-dragging');
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      target.style.left = (origX + dx) + 'px';
      target.style.top = (origY + dy) + 'px';
      target.style.transform = 'none';
    });

    handle.addEventListener('pointerup', () => {
      dragging = false;
    });
  }

  // ── Helpers ────────────────────────────────────────────────

  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function svgIcon(inner) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  function uid() {
    return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  // ── Message handling ───────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ba:toggle') {
      if (active) {
        unmount();
        active = false;
      } else {
        mount();
        active = true;
        updateToolbarState();
      }
    }

    // Dashboard integration: receive screenshot forwarded from another tab.
    if (msg.type === 'ba:screenshot-from-extension' && msg.dataUrl) {
      window.postMessage({ type: 'ba:screenshot', dataUrl: msg.dataUrl }, '*');
    }
  });
})();
