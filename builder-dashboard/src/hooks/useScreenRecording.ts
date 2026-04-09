'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadRecording } from '@/lib/recording';

/**
 * Screen recording hook.
 *
 * MediaRecorder only writes the WebM container header into the FIRST emitted
 * slice — subsequent slices are headerless fragments that no player can decode
 * on their own. We therefore buffer every slice in memory and upload a single
 * consolidated .webm file when the tester stops the recording. stopRecording()
 * resolves with the uploaded S3 key (or null if nothing was captured / upload
 * failed) so the caller can attach it to the test submission.
 */
export function useScreenRecording(testCaseId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordings, setRecordings] = useState<Array<{ id: string; previewUrl: string; key: string | null }>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');
  const lastKeyRef = useRef<string | null>(null);
  const stopResolversRef = useRef<Array<(key: string | null) => void>>([]);

  const finalizeUpload = useCallback(async (): Promise<string | null> => {
    if (chunksRef.current.length === 0) return null;

    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    chunksRef.current = [];

    // Create a local preview URL immediately so the tester can review
    // the recording while the upload runs in the background.
    const localUrl = URL.createObjectURL(blob);
    const recordingId = `rec_${Date.now()}`;
    setRecordings((prev) => [...prev, { id: recordingId, previewUrl: localUrl, key: null }]);

    setIsUploading(true);
    try {
      const key = await uploadRecording(testCaseId, blob);
      lastKeyRef.current = key;
      // Update the recording entry with the uploaded S3 key.
      setRecordings((prev) => prev.map((r) => r.id === recordingId ? { ...r, key } : r));
      return key;
    } catch (err) {
      console.error('Failed to upload screen recording:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [testCaseId]);

  const startRecording = useCallback(async () => {
    const capturedStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

    streamRef.current = capturedStream;
    setStream(capturedStream);
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(capturedStream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      // Stop tracks once the recorder has drained its final chunk.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
      }
      const key = await finalizeUpload();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      const resolvers = stopResolversRef.current;
      stopResolversRef.current = [];
      for (const resolve of resolvers) resolve(key);
    };

    // If the user ends sharing via the browser's own UI, trigger the same
    // stop path so the final chunk is flushed and uploaded.
    capturedStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    });

    // 1s timeslice keeps memory pressure reasonable while still producing a
    // single continuous WebM when the chunks are concatenated on stop.
    recorder.start(1000);
    setIsRecording(true);
  }, [finalizeUpload]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    // If onstop has already finalized and torn the recorder down, just return
    // whatever key we cached from the last upload.
    if (!mediaRecorderRef.current) {
      return lastKeyRef.current;
    }

    // Either still actively recording, OR stop() has been called and we're
    // waiting for onstop + upload to finish. In both cases we queue a resolver
    // that onstop will call once the upload completes.
    return new Promise<string | null>((resolve) => {
      stopResolversRef.current.push(resolve);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    });
  }, []);

  const removeRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((r) => r.id !== id);
      // Update lastKeyRef to the most recent remaining recording.
      lastKeyRef.current = next.length > 0 ? (next[next.length - 1].key ?? lastKeyRef.current) : null;
      return next;
    });
  }, []);

  return { isRecording, isUploading, stream, recordings, startRecording, stopRecording, removeRecording };
}
