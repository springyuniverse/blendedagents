'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadChunk } from '@/lib/recording';

const CHUNK_INTERVAL_MS = 10_000; // Upload every 10 seconds

export function useScreenRecording(testCaseId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadCurrentChunks = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    chunksRef.current = [];

    const currentIndex = chunkIndexRef.current;
    chunkIndexRef.current += 1;

    try {
      await uploadChunk(testCaseId, currentIndex, blob);
    } catch (err) {
      // Queue locally on failure -- retry on next interval
      console.error('Failed to upload recording chunk:', err);
    }
  }, [testCaseId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      chunkIndexRef.current = 0;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Upload any remaining chunks
        uploadCurrentChunks();
      };

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecording();
      });

      recorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Upload chunks periodically
      intervalRef.current = setInterval(uploadCurrentChunks, CHUNK_INTERVAL_MS);
    } catch (err) {
      console.error('Failed to start screen recording:', err);
      throw err;
    }
  }, [uploadCurrentChunks]);

  const stopRecording = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Final upload
    await uploadCurrentChunks();

    setIsRecording(false);
    mediaRecorderRef.current = null;
  }, [uploadCurrentChunks]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
