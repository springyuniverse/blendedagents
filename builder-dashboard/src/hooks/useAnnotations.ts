'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ANNOTATION_COLORS,
  ANNOTATION_DEFAULT_WIDTH,
  type AnnotationSession,
  type AnnotationTool,
  type Stroke,
  uploadAnnotations,
} from '@/lib/annotations';

/**
 * Drives the annotation capture experience for a single recording session.
 *
 * Lifecycle:
 *   1. Consumer calls beginSession() when screen recording starts. That wipes
 *      any previous strokes and stamps startMs.
 *   2. Consumer calls draw helpers as the tester interacts with the canvas.
 *   3. Consumer calls finalizeSession(testCaseId) once the recording stops.
 *      This uploads the current stroke set as a JSON payload and returns the
 *      resulting S3 key (or null if there are no strokes / upload failed).
 *
 * Strokes use normalized 0..1 coordinates so playback can scale to any video
 * element size.
 */
export function useAnnotations() {
  const [tool, setTool] = useState<AnnotationTool>('pen');
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const startMsRef = useRef<number | null>(null);
  const drawingStrokeIdRef = useRef<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  const beginSession = useCallback(() => {
    startMsRef.current = Date.now();
    drawingStrokeIdRef.current = null;
    lastKeyRef.current = null;
    setStrokes([]);
  }, []);

  const tNow = useCallback(() => {
    return startMsRef.current === null ? 0 : Date.now() - startMsRef.current;
  }, []);

  const isActive = useCallback(() => startMsRef.current !== null, []);

  /**
   * Start a new stroke at the given normalized coordinate.
   * Used by pen, rect, and arrow tools.
   */
  const startStroke = useCallback((nx: number, ny: number) => {
    if (startMsRef.current === null) return;
    if (tool === 'eraser' || tool === 'text') return;

    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    drawingStrokeIdRef.current = id;

    const stroke: Stroke = {
      id,
      type: tool,
      color,
      width: ANNOTATION_DEFAULT_WIDTH,
      points: [[nx, ny]],
      startT: tNow(),
    };
    setStrokes((prev) => [...prev, stroke]);
  }, [tool, color, tNow]);

  /**
   * Extend the active stroke with a new point. For pen this appends; for
   * rect/arrow only the last point matters (the stroke is defined by start +
   * current).
   */
  const extendStroke = useCallback((nx: number, ny: number) => {
    const id = drawingStrokeIdRef.current;
    if (!id) return;
    setStrokes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      let nextPoints: [number, number][];
      if (current.type === 'pen') {
        nextPoints = [...current.points, [nx, ny]];
      } else {
        // rect / arrow — keep first point, replace the "current" endpoint
        nextPoints = [current.points[0], [nx, ny]];
      }
      const next = [...prev];
      next[idx] = { ...current, points: nextPoints };
      return next;
    });
  }, []);

  const endStroke = useCallback(() => {
    drawingStrokeIdRef.current = null;
  }, []);

  /**
   * Place a text annotation at the given coordinate.
   */
  const addText = useCallback((nx: number, ny: number, text: string) => {
    if (startMsRef.current === null) return;
    if (!text.trim()) return;
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stroke: Stroke = {
      id,
      type: 'text',
      color,
      width: ANNOTATION_DEFAULT_WIDTH,
      points: [[nx, ny]],
      text,
      startT: tNow(),
    };
    setStrokes((prev) => [...prev, stroke]);
  }, [color, tNow]);

  /**
   * Eraser: mark the most recent stroke that contains the point as "ended"
   * at the current time. On playback it will disappear at that moment.
   */
  const eraseAt = useCallback((nx: number, ny: number) => {
    const now = tNow();
    setStrokes((prev) => {
      // Iterate from newest to oldest and erase the first hit.
      for (let i = prev.length - 1; i >= 0; i--) {
        const s = prev[i];
        if (s.endT !== undefined) continue;
        if (strokeContainsPoint(s, nx, ny)) {
          const next = [...prev];
          next[i] = { ...s, endT: now };
          return next;
        }
      }
      return prev;
    });
  }, [tNow]);

  /**
   * Undo removes the most recently added stroke OR un-erases the most recent
   * eraser action, whichever happened last.
   */
  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      // Find the stroke with the largest startT OR endT.
      let bestIdx = -1;
      let bestAction: 'add' | 'erase' = 'add';
      let bestT = -1;
      for (let i = 0; i < prev.length; i++) {
        const s = prev[i];
        if (s.startT > bestT) {
          bestT = s.startT;
          bestIdx = i;
          bestAction = 'add';
        }
        if (s.endT !== undefined && s.endT > bestT) {
          bestT = s.endT;
          bestIdx = i;
          bestAction = 'erase';
        }
      }
      if (bestIdx === -1) return prev;
      const next = [...prev];
      if (bestAction === 'add') {
        next.splice(bestIdx, 1);
      } else {
        next[bestIdx] = { ...next[bestIdx], endT: undefined };
      }
      return next;
    });
  }, []);

  const finalizeSession = useCallback(async (testCaseId: string): Promise<string | null> => {
    startMsRef.current = null;
    drawingStrokeIdRef.current = null;

    if (strokes.length === 0) {
      return null;
    }

    setIsFinalizing(true);
    try {
      const session: AnnotationSession = {
        version: 1,
        createdAt: new Date().toISOString(),
        strokes,
      };
      const key = await uploadAnnotations(testCaseId, session);
      lastKeyRef.current = key;
      return key;
    } catch (err) {
      console.error('Failed to upload annotations:', err);
      return null;
    } finally {
      setIsFinalizing(false);
    }
  }, [strokes]);

  return {
    tool,
    setTool,
    color,
    setColor,
    strokes,
    isFinalizing,
    isActive,
    beginSession,
    startStroke,
    extendStroke,
    endStroke,
    addText,
    eraseAt,
    undo,
    finalizeSession,
    lastKey: () => lastKeyRef.current,
  };
}

function strokeContainsPoint(stroke: Stroke, nx: number, ny: number): boolean {
  const tolerance = 0.02; // ~2% of canvas
  if (stroke.type === 'pen') {
    return stroke.points.some(([px, py]) => Math.hypot(px - nx, py - ny) < tolerance);
  }
  if (stroke.type === 'rect') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    const minX = Math.min(p0[0], p1[0]) - tolerance;
    const maxX = Math.max(p0[0], p1[0]) + tolerance;
    const minY = Math.min(p0[1], p1[1]) - tolerance;
    const maxY = Math.max(p0[1], p1[1]) + tolerance;
    return nx >= minX && nx <= maxX && ny >= minY && ny <= maxY;
  }
  if (stroke.type === 'arrow') {
    // Treat arrow as a line from p0 to p1 — hit-test by distance to segment.
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    return distanceToSegment(nx, ny, p0[0], p0[1], p1[0], p1[1]) < tolerance;
  }
  if (stroke.type === 'text') {
    const [px, py] = stroke.points[0];
    return Math.hypot(px - nx, py - ny) < 0.05;
  }
  return false;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
