import { createClient } from './supabase';
import type { FlowTestResult } from './api';

const BASE = '/api/v1/tester';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const method = options?.method?.toUpperCase() || 'GET';
  const needsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    body: needsBody && !options?.body ? '{}' : options?.body,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error?.message || body.error || `Request failed: ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
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
  type: string;
  template_type: 'flow_test' | 'review_test';
  title: string;
  description: string | null;
  url: string | null;
  status: string;
  steps: Array<{ instruction: string; expected?: string }>;
  expected_behavior: string | null;
  context: string | null;
  devices_to_check: string[];
  focus_areas: string[];
  ignore_areas: string | null;
  environment: string | null;
  has_credentials: boolean;
  credentials: Record<string, string> | null;
  assigned_at: string | null;
  info_requests: Array<{ from: string; message: string; at: string; user_id: string }>;
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
  devices: string[];
  region: string;
  is_available: boolean;
  is_active: boolean;
  onboarded: boolean;
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

export interface AvailableTask {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  step_count: number;
  environment: string | null;
  tags: string[];
  required_skills: string[];
  created_at: string;
  request_count: number;
  my_request_status: string | null;
}

interface PaginatedTasks<T> {
  tasks: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

function buildQs(params?: { page?: number; limit?: number; search?: string }) {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const testerApi = {
  getAvailableTasks: (params?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedTasks<AvailableTask>>(`/available${buildQs(params)}`),

  requestTask: (id: string, message?: string) =>
    request<{ id: string; status: string; created_at: string }>(`/available/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  withdrawRequest: (id: string) =>
    request<void>(`/available/${id}/request`, { method: 'DELETE', body: '{}' }),

  getTasks: (params?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedTasks<Task>>(`/tasks${buildQs(params)}`),

  getCompletedTasks: (params?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedTasks<Task & { completed_at: string | null; earnings_cents: number | null }>>(`/tasks/completed${buildQs(params)}`),

  getTask: (id: string) => request<TaskDetail>(`/tasks/${id}`),

  getTaskResult: (id: string) => request<FlowTestResult>(`/tasks/${id}/result`),

  startTask: (id: string) =>
    request<{ status: string; credentials: Record<string, string> | null }>(`/tasks/${id}/start`, {
      method: 'POST',
      body: '{}',
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
    request<{ id: string; step_index: number; status: string; created_at: string }>(
      `/tasks/${taskId}/steps/${stepIndex}`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  submitTest: (taskId: string, data: { verdict: string; summary: string; recording_url?: string; annotations_url?: string }) =>
    request<{ status: string }>(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitReviewFindings: (taskId: string, data: {
    verdict: string;
    summary?: string;
    findings: Array<{
      severity: string;
      category: string;
      description: string;
      screenshot_url?: string;
      device: string;
      location: string;
    }>;
  }) =>
    request<{ status: string }>(`/tasks/${taskId}/findings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestInfo: (taskId: string, message: string) =>
    request<{ status: string; info_requests: Array<{ from: string; message: string; at: string; user_id: string }> }>(
      `/tasks/${taskId}/request-info`,
      { method: 'POST', body: JSON.stringify({ message }) },
    ),

  getPresignedUrl: (data: {
    type: 'screenshot' | 'recording' | 'annotation';
    test_case_id: string;
    filename: string;
    content_type: string;
  }) =>
    request<PresignResponse>('/upload/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Onboarding
  saveOnboardingProfile: (data: { devices: string[]; skills: string[]; languages: string[]; timezone: string }) =>
    request<{ assessment_task_id: string }>(
      '/onboarding/profile',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  getAssessment: () =>
    request<{ assessment: { task_id: string; status: string } | null }>('/onboarding/assessment'),

  getProfile: () => request<TesterProfile>('/profile'),

  updateProfile: (data: { display_name?: string; timezone?: string }) =>
    request<TesterProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleAvailability: (isAvailable: boolean) =>
    request<{ is_available: boolean }>('/availability', {
      method: 'PUT',
      body: JSON.stringify({ is_available: isAvailable }),
    }),

  getEarnings: () =>
    request<{ total_earnings_cents: number; earnings: EarningRecord[] }>('/earnings'),

  // Invites
  getInvites: () =>
    request<{
      max_invites: number;
      used_count: number;
      remaining: number;
      invites: Array<{
        id: string;
        code: string;
        used: boolean;
        used_at: string | null;
        created_at: string;
      }>;
    }>('/invites'),

  generateInvite: () =>
    request<{ id: string; code: string; created_at: string }>('/invites', {
      method: 'POST',
    }),
};
