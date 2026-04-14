import { createClient } from './supabase';

const BASE = '/api/v1/admin';

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Dev mode
  const devMatch = document.cookie.match(/dev-session=([^;]+)/);
  if (devMatch && devMatch[1].startsWith('admin')) {
    headers['x-dev-role'] = 'admin';
    return headers;
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getHeaders();
  const method = options?.method?.toUpperCase() || 'GET';
  const needsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    body: needsBody && !options?.body ? '{}' : options?.body,
    headers: { ...headers, ...options?.headers },
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

// ---- Auth check ----

/** Returns true if the current user has admin access, false otherwise. */
export async function checkAdminAccess(): Promise<boolean> {
  try {
    await request<{ role: string }>('/me');
    return true;
  } catch {
    return false;
  }
}

// ---- Settings ----

export interface PlatformSettings {
  default_max_invites: number;
  require_invite_code: boolean;
  updated_at: string;
}

export function getPlatformSettings() {
  return request<PlatformSettings>('/settings');
}

export function updatePlatformSettings(data: Partial<Pick<PlatformSettings, 'default_max_invites' | 'require_invite_code'>>) {
  return request<PlatformSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ---- Stats ----

export interface AdminStats {
  builders: number;
  testers: number;
  total_tests: number;
  test_statuses: Record<string, number>;
  avg_completion_minutes: number;
  financials: {
    total_topups_cents: number;
    total_commissions_cents: number;
    total_payouts_cents: number;
    total_charges_cents: number;
  };
}

export function getAdminStats() {
  return request<AdminStats>('/stats');
}

export interface DailyTests { date: string; flow: number; review: number }
export interface DailyRevenue { date: string; topups: number; commissions: number; payouts: number }
export interface DailySignups { date: string; builders: number; testers: number }

export interface AdminActivity {
  daily_tests: DailyTests[];
  daily_revenue: DailyRevenue[];
  daily_signups: DailySignups[];
}

export function getAdminActivity(days = 30) {
  return request<AdminActivity>(`/stats/activity?days=${days}`);
}

// ---- Builders ----

export interface AdminBuilder {
  id: string;
  display_name: string;
  email: string;
  plan_tier: string;
  created_at: string;
  updated_at: string;
  credits_available: number;
  credits_reserved: number;
  test_count: number;
  active_api_keys: number;
}

export interface AdminBuildersResponse {
  builders: AdminBuilder[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function getAdminBuilders(params?: { page?: number; limit?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return request<AdminBuildersResponse>(`/builders${qs ? `?${qs}` : ''}`);
}

export function updateBuilder(id: string, data: { display_name?: string; plan_tier?: string }) {
  return request<AdminBuilder>(`/builders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ---- Testers ----

export interface AdminTester {
  id: string;
  display_name: string;
  email: string;
  region: string;
  skills: string[];
  languages: string[];
  devices: string[];
  is_active: boolean;
  is_available: boolean;
  onboarded: boolean;
  tasks_completed: number;
  tasks_total: number;
  avg_completion_minutes: number;
  earnings_cents: number;
  max_invites: number;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTestersResponse {
  testers: AdminTester[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function getAdminTesters(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return request<AdminTestersResponse>(`/testers${qs ? `?${qs}` : ''}`);
}

export function updateTester(id: string, data: {
  is_active?: boolean; display_name?: string; region?: string; onboarded?: boolean;
  is_available?: boolean; timezone?: string | null;
  skills?: string[]; languages?: string[]; devices?: string[];
  max_invites?: number;
}) {
  return request<AdminTester>(`/testers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ---- Test Cases ----

export interface AdminTestCase {
  id: string;
  title: string;
  template_type: string;
  status: string;
  credit_cost: number;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  builder_name: string;
  builder_email: string;
  tester_name: string | null;
}

export interface AdminTestCasesResponse {
  test_cases: AdminTestCase[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function reassignTestCase(testCaseId: string, testerId: string, reason?: string) {
  return request<Record<string, unknown>>(`/test-cases/${testCaseId}/reassign`, {
    method: 'PATCH',
    body: JSON.stringify({ tester_id: testerId, reason }),
  });
}

export function getActiveTesters() {
  return getAdminTesters({ limit: 100, status: 'active' });
}

export function getAdminTestCases(params?: { page?: number; limit?: number; search?: string; status?: string; template_type?: string; builder_id?: string; tester_id?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.template_type) query.set('template_type', params.template_type);
  if (params?.builder_id) query.set('builder_id', params.builder_id);
  if (params?.tester_id) query.set('tester_id', params.tester_id);
  const qs = query.toString();
  return request<AdminTestCasesResponse>(`/test-cases${qs ? `?${qs}` : ''}`);
}

// ---- Tester Assessment ----

export interface AssessmentStepResult {
  step_index: number;
  status: string;
  severity: string | null;
  actual_behavior: string | null;
  screenshot_url: string | null;
  screenshot_download_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface AssessmentGrade {
  detection_score: number;
  clarity_score: number;
  passed: boolean;
  issues?: { detected: boolean; clarity_points: number }[];
}

export interface TesterAssessment {
  id: string;
  title: string;
  status: string;
  steps: { instruction: string; expected_behavior?: string }[];
  created_at: string;
  completed_at: string | null;
  verdict: string | null;
  summary: string | null;
  steps_passed: number | null;
  steps_failed: number | null;
  steps_blocked: number | null;
  steps_total: number | null;
  grade: AssessmentGrade | null;
  recording_url: string | null;
  recording_download_url: string | null;
  annotations_url: string | null;
  annotations_download_url: string | null;
  step_results: AssessmentStepResult[];
}

export function getTesterAssessment(testerId: string) {
  return request<{ assessment: TesterAssessment | null }>(`/testers/${testerId}/assessment`);
}

// ---- Tester Submissions ----

export interface TesterSubmission {
  id: string;
  title: string;
  template_type: string;
  status: string;
  credit_cost: number;
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  builder_name: string;
  verdict: string | null;
  summary: string | null;
  steps_passed: number | null;
  steps_failed: number | null;
}

export interface TesterSubmissionsResponse {
  submissions: TesterSubmission[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---- Tester Referrals ----

export interface TesterReferral {
  id: string;
  code: string;
  used_by_id: string | null;
  used_at: string | null;
  created_at: string;
  referred_name: string | null;
  referred_email: string | null;
}

export interface TesterReferralsResponse {
  max_invites: number;
  total_generated: number;
  total_used: number;
  invites: TesterReferral[];
}

export function getTesterReferrals(testerId: string) {
  return request<TesterReferralsResponse>(`/testers/${testerId}/referrals`);
}

export function getTesterSubmissions(testerId: string, params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<TesterSubmissionsResponse>(`/testers/${testerId}/submissions${qs ? `?${qs}` : ''}`);
}

// ---- Transactions ----

export interface AdminTransaction {
  id: string;
  type: 'topup' | 'charge' | 'refund' | 'payout' | 'commission';
  credit_amount: number;
  currency_amount_cents: number;
  description: string;
  created_at: string;
  builder_name: string | null;
  tester_name: string | null;
}

export interface AdminTransactionsResponse {
  transactions: AdminTransaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export function getAdminTransactions(params?: { page?: number; limit?: number; type?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.type) query.set('type', params.type);
  const qs = query.toString();
  return request<AdminTransactionsResponse>(`/transactions${qs ? `?${qs}` : ''}`);
}

// ---- Email Templates ----

export interface EmailTemplate {
  name: string;
  subject: string;
  html_content: string;
  description: string;
  category: string;
  variables: string[];
  html_length?: number;
  updated_at: string;
}

export interface EmailTemplatesResponse {
  templates: EmailTemplate[];
}

export function getEmailTemplates() {
  return request<EmailTemplatesResponse>('/email-templates');
}

export function getEmailTemplate(name: string) {
  return request<EmailTemplate>(`/email-templates/${name}`);
}

export function updateEmailTemplate(name: string, data: { subject?: string; html_content?: string }) {
  return request<EmailTemplate>(`/email-templates/${name}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function previewEmailTemplate(name: string) {
  return request<{ html: string }>(`/email-templates/${name}/preview`, { method: 'POST' });
}

export function sendTestEmail(name: string, to: string) {
  return request<{ ok: boolean; sent_to: string }>(`/email-templates/${name}/send-test`, {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}
