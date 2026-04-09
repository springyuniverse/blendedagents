'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drawStroke, AnnotationToolbar, type AnnotationOverlayProps } from './AnnotationOverlay';
import {
  ANNOTATION_COLORS,
  ANNOTATION_DEFAULT_WIDTH,
  type AnnotationTool,
  type Stroke,
} from '@/lib/annotations';

interface ScreenshotAnnotatorProps {
  /** The raw screenshot to annotate. */
  image: ImageBitmap;
  /** Called when the tester saves. Receives a PNG blob with annotations baked in. */
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Modal that shows a static screenshot with annotation tools overlaid.
 * The tester draws on the image, then clicks Save. The output is a single
 * PNG with the annotations composited in — no separate JSON needed.
 */
export function ScreenshotAnnotator({ image, onSave, onCancel }: ScreenshotAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<AnnotationTool>('arrow');
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [enabled, setEnabled] = useState(true);
  const isDrawingRef = useRef(false);
  const drawingIdRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initial + re-draw whenever strokes change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Size the canvas to the image's intrinsic dimensions, capped to a
    // reasonable display width (the canvas element is styled with max-width
    // via CSS, and we match the backing store to that rendered size).
    const maxW = Math.min(image.width, 960);
    const scale = maxW / image.width;
    const dispW = Math.round(image.width * scale);
    const dispH = Math.round(image.height * scale);

    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the screenshot as background.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw all live strokes.
    for (const s of strokes) {
      if (s.endT !== undefined) continue;
      drawStroke(ctx, s, canvas.width, canvas.height);
    }
  }, [image, strokes]);

  const toNorm = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { nx, ny };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const { nx, ny } = toNorm(e);

    if (tool === 'text') {
      const text = window.prompt('Annotation text:');
      if (text) {
        const id = `s_${Date.now()}`;
        setStrokes((prev) => [...prev, { id, type: 'text', color, width: ANNOTATION_DEFAULT_WIDTH, points: [[nx, ny]], text, startT: 0 }]);
      }
      return;
    }

    if (tool === 'eraser') {
      eraseAt(nx, ny);
      isDrawingRef.current = true;
      return;
    }

    const id = `s_${Date.now()}`;
    drawingIdRef.current = id;
    isDrawingRef.current = true;
    setStrokes((prev) => [...prev, { id, type: tool as Stroke['type'], color, width: ANNOTATION_DEFAULT_WIDTH, points: [[nx, ny]], startT: 0 }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !isDrawingRef.current) return;
    const { nx, ny } = toNorm(e);

    if (tool === 'eraser') {
      eraseAt(nx, ny);
      return;
    }

    const id = drawingIdRef.current;
    if (!id) return;
    setStrokes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      const nextPoints: [number, number][] =
        current.type === 'pen'
          ? [...current.points, [nx, ny]]
          : [current.points[0], [nx, ny]];
      const next = [...prev];
      next[idx] = { ...current, points: nextPoints };
      return next;
    });
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    drawingIdRef.current = null;
  };

  const eraseAt = (nx: number, ny: number) => {
    setStrokes((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const s = prev[i];
        if (s.endT !== undefined) continue;
        if (hitTest(s, nx, ny)) {
          const next = [...prev];
          next[i] = { ...s, endT: 1 }; // mark as erased
          return next;
        }
      }
      return prev;
    });
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      // Check if most recent action was an erase (endT set) or a stroke add.
      const lastErased = prev.reduce((best, s, i) => (s.endT !== undefined && (best === -1 || i > best) ? i : best), -1);
      const lastAdded = prev.length - 1;
      // Compare indices — larger index = more recent.
      if (lastErased > lastAdded) {
        // Un-erase
        const next = [...prev];
        next[lastErased] = { ...next[lastErased], endT: undefined };
        return next;
      }
      // Remove last stroke
      return prev.slice(0, -1);
    });
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      });
      onSave(blob);
    } catch (err) {
      console.error('Failed to export annotated screenshot:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Wire AnnotationToolbar props (it expects the full shape, we provide stubs
  // for fields it doesn't use in this context).
  const toolbarProps: AnnotationOverlayProps = {
    enabled,
    onToggleEnabled: setEnabled,
    tool,
    onToolChange: setTool,
    color,
    onColorChange: setColor,
    strokes,
    onStartStroke: () => {},
    onExtendStroke: () => {},
    onEndStroke: () => {},
    onAddText: () => {},
    onEraseAt: () => {},
    onUndo: undo,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-lifted max-w-[1020px] w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Annotate Screenshot</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-accent-review rounded-lg hover:bg-accent-review/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Screenshot'}
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-center">
            <AnnotationToolbar {...toolbarProps} />
          </div>
          <div className="flex justify-center overflow-auto max-h-[70vh]">
            <canvas
              ref={canvasRef}
              style={{
                cursor: enabled ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
              }}
              className="rounded-lg border border-border"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function hitTest(s: Stroke, nx: number, ny: number): boolean {
  const t = 0.02;
  if (s.type === 'pen') return s.points.some(([px, py]) => Math.hypot(px - nx, py - ny) < t);
  if (s.type === 'rect') {
    const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
    return nx >= Math.min(p0[0], p1[0]) - t && nx <= Math.max(p0[0], p1[0]) + t
      && ny >= Math.min(p0[1], p1[1]) - t && ny <= Math.max(p0[1], p1[1]) + t;
  }
  if (s.type === 'arrow') {
    const [p0, p1] = [s.points[0], s.points[s.points.length - 1]];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(nx - p0[0], ny - p0[1]) < t;
    const u = Math.max(0, Math.min(1, ((nx - p0[0]) * dx + (ny - p0[1]) * dy) / lenSq));
    return Math.hypot(nx - (p0[0] + u * dx), ny - (p0[1] + u * dy)) < t;
  }
  if (s.type === 'text') return Math.hypot(s.points[0][0] - nx, s.points[0][1] - ny) < 0.05;
  return false;
}
