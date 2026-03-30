import { api } from './api';

/**
 * Upload a recording chunk to S3 via presigned URL.
 */
export async function uploadChunk(
  testCaseId: string,
  chunkIndex: number,
  blob: Blob,
): Promise<string> {
  const filename = `chunk-${chunkIndex}.webm`;
  const contentType = 'video/webm';

  const { upload_url, key } = await api.getPresignedUrl({
    type: 'recording',
    test_case_id: testCaseId,
    filename,
    content_type: contentType,
  });

  await fetch(upload_url, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': contentType,
    },
  });

  return key;
}

/**
 * Get the S3 key for the first recording chunk (used as the recording_url reference).
 */
export function getRecordingKey(testCaseId: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `recordings/${date}/${testCaseId}/chunk-0.webm`;
}
