import { testerApi } from './tester-api';

/**
 * Upload a completed screen recording to S3 via a presigned URL.
 * Returns the S3 key that identifies the uploaded object — store this
 * as `recording_url` on the test submission so it can later be resolved
 * to a signed playback URL by the backend.
 */
export async function uploadRecording(
  testCaseId: string,
  blob: Blob,
): Promise<string> {
  const filename = `recording-${Date.now()}.webm`;
  const contentType = 'video/webm';

  const { upload_url, key } = await testerApi.getPresignedUrl({
    type: 'recording',
    test_case_id: testCaseId,
    filename,
    content_type: contentType,
  });

  const res = await fetch(upload_url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });

  if (!res.ok) {
    throw new Error(`Recording upload failed: ${res.status}`);
  }

  return key;
}
