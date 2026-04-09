'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ANNOTATION_COLORS, type Stroke, type AnnotationTool } from '@/lib/annotations';

export interface AnnotationOverlayProps {
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  tool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokes: Stroke[];
  onStartStroke: (nx: number, ny: number) => void;
  onExtendStroke: (nx: number, ny: number) => void;
  onEndStroke: () => void;
  onAddText: (nx: number, ny: number, text: string) => void;
  onEraseAt: (nx: number, ny: number) => void;
  onUndo: () => void;
}

/**
 * Transparent drawing canvas. Renders absolutely within its parent container
 * (wrap in a `position: relative` element). Intercepts pointer events only
 * when `enabled` is true; otherwise strokes are visible but clicks pass
 * through.
 *
 * Coordinates are normalized 0..1 relative to canvas width/height so playback
 * can rescale to the video element's actual dimensions.
 */
export function AnnotationCanvas(props: AnnotationOverlayProps) {
  const {
    enabled, tool,
    strokes,
    onStartStroke, onExtendStroke, onEndStroke,
    onAddText, onEraseAt,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };

    const redraw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of strokes) {
        if (s.endT !== undefined) continue;
        drawStroke(ctx, s, canvas.width, canvas.height);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [strokes]);

  const toLocal = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    return { nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const { nx, ny } = toLocal(e);

    if (tool === 'text') {
      const text = window.prompt('Annotation text:');
      if (text) onAddText(nx, ny, text);
      return;
    }
    if (tool === 'eraser') {
      onEraseAt(nx, ny);
      isDrawingRef.current = true;
      return;
    }
    isDrawingRef.current = true;
    onStartStroke(nx, ny);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !isDrawingRef.current) return;
    const { nx, ny } = toLocal(e);
    if (tool === 'eraser') {
      onEraseAt(nx, ny);
      return;
    }
    onExtendStroke(nx, ny);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (tool !== 'eraser' && tool !== 'text') {
      onEndStroke();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[10] rounded-xl"
      style={{
        pointerEvents: enabled ? 'auto' : 'none',
        cursor: enabled ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

/** Composite: canvas + toolbar together. Kept for convenience. */
export function AnnotationOverlay(props: AnnotationOverlayProps) {
  return (
    <>
      <AnnotationCanvas {...props} />
      <AnnotationToolbar {...props} />
    </>
  );
}

export function AnnotationToolbar({
  enabled, onToggleEnabled, tool, onToolChange, color, onColorChange, onUndo,
}: AnnotationOverlayProps) {
  const tools: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
    { id: 'pen', label: 'Pen', icon: <PenIcon /> },
    { id: 'rect', label: 'Rectangle', icon: <RectIcon /> },
    { id: 'arrow', label: 'Arrow', icon: <ArrowIcon /> },
    { id: 'text', label: 'Text', icon: <TextIcon /> },
    { id: 'eraser', label: 'Eraser', icon: <EraserIcon /> },
  ];

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPos({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
  };
  const onHandleUp = () => { draggingRef.current = false; };

  return (
    <div
      className="fixed top-4 right-4 z-[70] flex items-center gap-1 bg-surface border border-border rounded-xl shadow-lifted px-2 py-1.5 select-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      role="toolbar"
      aria-label="Annotation toolbar"
    >
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="cursor-grab active:cursor-grabbing px-1 py-2 text-text-muted hover:text-text-secondary"
        title="Drag to move"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="3" r="1.2" /><circle cx="8" cy="3" r="1.2" />
          <circle cx="2" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" />
          <circle cx="2" cy="13" r="1.2" /><circle cx="8" cy="13" r="1.2" />
        </svg>
      </div>

      <button
        type="button"
        onClick={() => onToggleEnabled(!enabled)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          enabled
            ? 'bg-accent-review text-white'
            : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
        }`}
        title={enabled ? 'Disable drawing (click to pass through)' : 'Enable drawing'}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${enabled ? 'bg-white' : 'bg-text-muted'}`} />
        {enabled ? 'Draw' : 'Off'}
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onToolChange(t.id)}
          disabled={!enabled}
          title={t.label}
          className={`p-1.5 rounded-md transition-colors ${
            tool === t.id ? 'bg-accent-review/15 text-accent-review' : 'text-text-secondary hover:bg-surface-secondary'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      {ANNOTATION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onColorChange(c)}
          disabled={!enabled}
          title={c}
          className={`w-5 h-5 rounded-full border-2 transition-transform ${
            color === c ? 'border-white scale-110' : 'border-transparent'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          style={{ backgroundColor: c }}
        />
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!enabled}
        title="Undo last stroke"
        className="p-1.5 rounded-md text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UndoIcon />
      </button>
    </div>
  );
}

// --- Canvas drawing ---

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width * (window.devicePixelRatio || 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.type === 'pen') {
    ctx.beginPath();
    for (let i = 0; i < stroke.points.length; i++) {
      const [nx, ny] = stroke.points[i];
      const x = nx * w;
      const y = ny * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (stroke.type === 'rect') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    const x0 = p0[0] * w;
    const y0 = p0[1] * h;
    const x1 = p1[0] * w;
    const y1 = p1[1] * h;
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  } else if (stroke.type === 'arrow') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    const x0 = p0[0] * w;
    const y0 = p0[1] * h;
    const x1 = p1[0] * w;
    const y1 = p1[1] * h;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // Arrowhead
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const headLen = Math.max(10, stroke.width * 4) * (window.devicePixelRatio || 1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  } else if (stroke.type === 'text' && stroke.text) {
    const [nx, ny] = stroke.points[0];
    const x = nx * w;
    const y = ny * h;
    const size = 16 * (window.devicePixelRatio || 1);
    ctx.font = `600 ${size}px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    // Subtle backdrop so text is readable over any screen.
    const metrics = ctx.measureText(stroke.text);
    const padX = 6 * (window.devicePixelRatio || 1);
    const padY = 4 * (window.devicePixelRatio || 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - padX, y - padY, metrics.width + padX * 2, size + padY * 2);
    ctx.fillStyle = stroke.color;
    ctx.fillText(stroke.text, x, y);
  }

  ctx.restore();
}

// --- Icons ---

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function RectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="9 5 19 5 19 15" />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}
function EraserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  );
}
