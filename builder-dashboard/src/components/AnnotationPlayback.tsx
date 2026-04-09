'use client';

import { useEffect, useRef, useState } from 'react';
import { drawStroke } from './tester/AnnotationOverlay';
import { fetchAnnotations, type AnnotationSession } from '@/lib/annotations';

interface AnnotationPlaybackProps {
  videoUrl: string;
  annotationsUrl?: string | null;
}

/**
 * Video player with a synchronized annotation overlay.
 *
 * On mount (when annotationsUrl is provided) the JSON stroke payload is
 * fetched once. A requestAnimationFrame loop reads video.currentTime and
 * redraws the canvas with whichever strokes are "live" at that moment —
 * i.e. startT has been reached and endT (if any) hasn't yet.
 *
 * Coordinates in the JSON are normalized 0..1 so the overlay scales to
 * whatever size the video element renders at. A ResizeObserver keeps the
 * canvas backing store in sync with the visible video.
 */
export function AnnotationPlayback({ videoUrl, annotationsUrl }: AnnotationPlaybackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<AnnotationSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Fetch annotation payload once.
  useEffect(() => {
    if (!annotationsUrl) {
      setSessionLoaded(true);
      return;
    }
    let cancelled = false;
    fetchAnnotations(annotationsUrl).then((session) => {
      if (cancelled) return;
      sessionRef.current = session;
      setSessionLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [annotationsUrl]);

  // Keep the canvas backing store sized to the video's actual rendered size.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const resize = () => {
      const rect = video.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(video);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  // rAF loop: read currentTime, redraw visible strokes.
  useEffect(() => {
    if (!sessionLoaded) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let rafId = 0;

    const tick = () => {
      const session = sessionRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (session) {
          const currentT = video.currentTime * 1000;
          for (const stroke of session.strokes) {
            if (stroke.startT > currentT) continue;
            if (stroke.endT !== undefined && stroke.endT <= currentT) continue;
            drawStroke(ctx, stroke, canvas.width, canvas.height);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [sessionLoaded]);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full rounded-lg border border-border block"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none rounded-lg"
      />
    </div>
  );
}
