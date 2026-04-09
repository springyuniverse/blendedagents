import { testerApi } from './tester-api';

/**
 * Annotation payload schema shared between capture (tester side) and playback
 * (builder + tester result view).
 *
 * Coordinates are normalized (0..1) against the canvas width/height at draw
 * time so that playback can rescale to whatever size the <video> is being
 * rendered at.
 *
 * startT / endT are milliseconds elapsed since the recording started. Strokes
 * are considered "live" during playback when startT <= currentT and
 * (endT is undefined OR endT > currentT).
 */
export type AnnotationTool = 'pen' | 'rect' | 'arrow' | 'text' | 'eraser';

export interface Stroke {
  id: string;
  type: Exclude<AnnotationTool, 'eraser'>;
  color: string;
  width: number;
  points: [number, number][];
  text?: string;
  startT: number;
  endT?: number;
}

export interface AnnotationSession {
  version: 1;
  createdAt: string;
  strokes: Stroke[];
}

export const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'] as const;
export const ANNOTATION_DEFAULT_WIDTH = 3;

export async function uploadAnnotations(
  testCaseId: string,
  session: AnnotationSession,
): Promise<string> {
  const filename = `annotations-${Date.now()}.json`;
  const contentType = 'application/json';

  const { upload_url, key } = await testerApi.getPresignedUrl({
    type: 'annotation',
    test_case_id: testCaseId,
    filename,
    content_type: contentType,
  });

  const res = await fetch(upload_url, {
    method: 'PUT',
    body: JSON.stringify(session),
    headers: { 'Content-Type': contentType },
  });

  if (!res.ok) {
    throw new Error(`Annotations upload failed: ${res.status}`);
  }

  return key;
}

export async function fetchAnnotations(downloadUrl: string): Promise<AnnotationSession | null> {
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) return null;
    const json = (await res.json()) as AnnotationSession;
    if (!json || json.version !== 1 || !Array.isArray(json.strokes)) return null;
    return json;
  } catch {
    return null;
  }
}
