// Pointer capture and ink rendering for the writing pad.
//
// A stroke is { pointerType, lineSpacing, points: [{ x, y, t, p }] }, where x and y
// are CSS pixels relative to the canvas, t is ms since the pad was created and p is
// pressure (0..1). Only the Pencil (and the mouse, for desktop development) draws ink;
// finger touches are ignored unless acceptTouch is set, which gives palm rejection.

export class InkPad {
  constructor(canvas, { onChange = () => {}, onStrokeStart = () => {}, onStrokeMove = () => {}, acceptTouch = false, lineSpacing = 48 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onChange = onChange;
    // Live hooks for real-time assistance: (stroke) on pen-down and as points arrive.
    this.hooks = { start: onStrokeStart, move: onStrokeMove };
    this.acceptTouch = acceptTouch;
    this.lineSpacing = lineSpacing;
    this.inkColor = '#1d3c8f';
    this.lineWidth = 2.2;

    this.strokes = [];
    this.history = [];      // undo stack: { type: 'add' } | { type: 'clear', strokes }
    this.current = null;    // stroke being written
    this.pointerId = null;
    this.drawnUpTo = 0;     // index of the last point of `current` already on the canvas
    this.raf = 0;
    this.epoch = performance.now();
    this.rect = canvas.getBoundingClientRect();

    this.bindEvents();
    this.resize();
  }

  accepts(e) {
    if (e.pointerType === 'pen' || e.pointerType === 'mouse') return true;
    return e.pointerType === 'touch' && this.acceptTouch;
  }

  bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.onUp(e));
    // Stop iOS from scrolling, zooming, or showing the selection loupe / callout.
    const block = (e) => e.preventDefault();
    for (const type of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'contextmenu', 'selectstart']) {
      c.addEventListener(type, block, { passive: false });
    }
    new ResizeObserver(() => this.resize()).observe(c);
  }

  point(e) {
    return {
      x: e.clientX - this.rect.left,
      y: e.clientY - this.rect.top,
      t: e.timeStamp - this.epoch,
      // Mouse reports 0.5 while a button is down; record what the device gives.
      p: e.pressure,
    };
  }

  onDown(e) {
    if (!this.accepts(e) || this.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.rect = this.canvas.getBoundingClientRect();
    this.current = { pointerType: e.pointerType, lineSpacing: this.lineSpacing, points: [this.point(e)] };
    this.drawnUpTo = 0;
    this.scheduleDraw();
    this.hooks.start(this.current);
  }

  onMove(e) {
    if (e.pointerId !== this.pointerId || !this.current) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) this.addPoint(this.point(ev));
    this.scheduleDraw();
    this.hooks.move(this.current);
  }

  onUp(e) {
    if (e.pointerId !== this.pointerId || !this.current) return;
    this.addPoint(this.point(e));
    const stroke = this.current;
    this.current = null;
    this.pointerId = null;
    this.strokes.push(stroke);
    this.history.push({ type: 'add' });
    this.drawPending(stroke);
    this.onChange(stroke);
  }

  addPoint(pt) {
    const pts = this.current.points;
    const last = pts[pts.length - 1];
    if (last && last.x === pt.x && last.y === pt.y) return;
    if (last && pt.t < last.t) pt.t = last.t;
    pts.push(pt);
  }

  scheduleDraw() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.current) this.drawPending(this.current);
    });
  }

  // Draw the segments of `stroke` that are not yet on the canvas.
  drawPending(stroke) {
    const pts = stroke.points;
    const ctx = this.ctx;
    this.applyStyle();
    if (pts.length === 1 && this.drawnUpTo === 0) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, this.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (this.drawnUpTo >= pts.length - 1) return;
    ctx.beginPath();
    ctx.moveTo(pts[this.drawnUpTo].x, pts[this.drawnUpTo].y);
    for (let i = this.drawnUpTo + 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    this.drawnUpTo = pts.length - 1;
  }

  applyStyle() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.inkColor;
    ctx.fillStyle = this.inkColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Redraws every stroke; also picks up the theme's pen colour (css --pen).
  redraw() {
    const { ctx, canvas } = this;
    this.inkColor = getComputedStyle(canvas).getPropertyValue('--pen').trim() || this.inkColor;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    this.applyStyle();
    for (const s of this.strokes) this.drawWhole(s);
    if (this.current) this.drawWhole(this.current);
  }

  drawWhole(stroke) {
    const pts = stroke.points;
    const ctx = this.ctx;
    ctx.beginPath();
    if (pts.length === 1) {
      ctx.arc(pts[0].x, pts[0].y, this.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    if (stroke === this.current) this.drawnUpTo = pts.length - 1;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.rect = this.canvas.getBoundingClientRect();
    const w = Math.round(this.rect.width * dpr);
    const h = Math.round(this.rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  undo() {
    const last = this.history.pop();
    if (!last) return false;
    if (last.type === 'add') this.strokes.pop();
    else if (last.type === 'clear') this.strokes = last.strokes;
    this.redraw();
    this.onChange(null);
    return true;
  }

  clear() {
    if (!this.strokes.length) return;
    this.history.push({ type: 'clear', strokes: this.strokes });
    this.strokes = [];
    this.redraw();
    this.onChange(null);
  }

  load(strokes) {
    this.strokes = strokes;
    this.history = strokes.map(() => ({ type: 'add' }));
    this.redraw();
  }

  toJSON() {
    const r2 = (v) => Math.round(v * 100) / 100;
    return {
      format: 'gregg-ink',
      version: 1,
      created: new Date().toISOString(),
      units: { xy: 'css-px', t: 'ms', p: '0..1' },
      canvas: { width: r2(this.rect.width), height: r2(this.rect.height), devicePixelRatio: window.devicePixelRatio || 1 },
      userAgent: navigator.userAgent,
      strokes: this.strokes.map((s) => ({
        pointerType: s.pointerType,
        lineSpacing: s.lineSpacing,
        points: s.points.map((p) => [r2(p.x), r2(p.y), Math.round(p.t * 10) / 10, r2(p.p)]),
      })),
    };
  }

  static strokesFromJSON(data) {
    return (data?.strokes || []).map((s) => ({
      pointerType: s.pointerType,
      lineSpacing: s.lineSpacing,
      points: s.points.map(([x, y, t, p]) => ({ x, y, t, p })),
    }));
  }
}

// Points per second over the stroke's duration (a check that coalesced events work).
export function sampleRate(stroke) {
  const pts = stroke.points;
  if (pts.length < 2) return 0;
  const dt = (pts[pts.length - 1].t - pts[0].t) / 1000;
  return dt > 0 ? (pts.length - 1) / dt : 0;
}
