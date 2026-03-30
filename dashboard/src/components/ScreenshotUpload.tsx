'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';

interface ScreenshotUploadProps {
  taskId: string;
  onUploadComplete: (key: string) => void;
}

export function ScreenshotUpload({ taskId, onUploadComplete }: ScreenshotUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Get presigned URL
      const { upload_url, key } = await api.getPresignedUrl({
        type: 'screenshot',
        test_case_id: taskId,
        filename: file.name,
        content_type: file.type,
      });

      // Upload directly to S3
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploadedKey(key);
      onUploadComplete(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedKey(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploadedKey && previewUrl) {
    return (
      <div className="relative">
        <img
          src={previewUrl}
          alt="Screenshot preview"
          className="w-full max-h-48 object-cover rounded-md border border-gray-200"
        />
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-md p-4 cursor-pointer hover:border-gray-300 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
        {isUploading ? (
          <span className="text-xs text-gray-500">Uploading...</span>
        ) : (
          <div className="text-center">
            <svg
              className="w-6 h-6 text-gray-400 mx-auto mb-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
            <span className="text-xs text-gray-500">Click to upload screenshot</span>
          </div>
        )}
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
