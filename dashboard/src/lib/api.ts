import { createClient } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1/tester';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function fetchAPI<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMessage = 'API request failed';
    try {
      const errorBody = await res.json();
      errorMessage = errorBody.error?.message || errorMessage;
    } catch {
      // Response body is not JSON
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  status: string;
  step_count: number;
  environment: string | null;
  assigned_at: string | null;
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  status: string;
  steps: Array<{ instruction: string; expected?: string }>;
  expected_behavior: string | null;
  environment: string | null;
  has_credentials: boolean;
  credentials: Record<string, string> | null;
  assigned_at: string | null;
  step_results: StepResultData[];
}

export interface StepResultData {
  id: string;
  step_index: number;
  status: string;
  severity: string | null;
  actual_behavior: string | null;
  screenshot_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface TesterProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  skills: string[];
  languages: string[];
  region: string;
  is_available: boolean;
  timezone: string | null;
  tasks_total: number;
  tasks_completed: number;
  avg_completion_minutes: number;
  earnings_cents: number;
  created_at: string;
}

export interface EarningRecord {
  id: string;
  test_case_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

export interface PresignResponse {
  upload_url: string;
  key: string;
  expires_in: number;
}

export const api = {
  getTasks: () => fetchAPI<{ tasks: Task[] }>('/tasks'),

  getTask: (id: string) => fetchAPI<TaskDetail>(`/tasks/${id}`),

  startTask: (id: string) =>
    fetchAPI<{ status: string; credentials: Record<string, string> | null }>(`/tasks/${id}/start`, {
      method: 'POST',
    }),

  submitStepResult: (
    taskId: string,
    stepIndex: number,
    data: {
      status: string;
      severity?: string;
      actual_behavior?: string;
      screenshot_url?: string;
      notes?: string;
    },
  ) =>
    fetchAPI<{ id: string; step_index: number; status: string; created_at: string }>(
      `/tasks/${taskId}/steps/${stepIndex}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  submitTest: (taskId: string, data: { verdict: string; summary: string; recording_url?: string }) =>
    fetchAPI<{ status: string }>(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPresignedUrl: (data: {
    type: 'screenshot' | 'recording';
    test_case_id: string;
    filename: string;
    content_type: string;
  }) =>
    fetchAPI<PresignResponse>('/upload/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => fetchAPI<TesterProfile>('/profile'),

  updateProfile: (data: { display_name?: string; timezone?: string }) =>
    fetchAPI<TesterProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleAvailability: (isAvailable: boolean) =>
    fetchAPI<{ is_available: boolean }>('/availability', {
      method: 'PUT',
      body: JSON.stringify({ is_available: isAvailable }),
    }),

  getEarnings: () =>
    fetchAPI<{ total_earnings_cents: number; earnings: EarningRecord[] }>('/earnings'),
};
