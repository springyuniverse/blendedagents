const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Auth / Me ----

export interface BuilderInfo {
  id: string;
  name: string;
  email: string;
  company?: string;
  plan: string;
  created_at: string;
}

export function getMe() {
  return request<BuilderInfo>('/me');
}

// ---- Test Cases ----

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  staging_url: string;
  status: string;
  steps: TestStep[];
  credit_cost: number;
  tags?: string[];
  external_id?: string;
  callback_url?: string;
  status_history?: StatusEntry[];
  created_at: string;
  updated_at: string;
}

export interface TestStep {
  instruction: string;
  expected_behavior?: string;
  status?: string;
}

export interface StatusEntry {
  status: string;
  timestamp: string;
  note?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function listTestCases(params?: { page?: number; status?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return request<PaginatedResponse<TestCase>>(`/test-cases${qs ? `?${qs}` : ''}`);
}

export function getTestCase(id: string) {
  return request<TestCase>(`/test-cases/${id}`);
}

export interface CreateTestCaseInput {
  title: string;
  description?: string;
  staging_url: string;
  steps: { instruction: string; expected_behavior?: string }[];
  credentials?: Record<string, string>;
  environment?: Record<string, string>;
  tags?: string[];
  external_id?: string;
  callback_url?: string;
}

export function createTestCase(input: CreateTestCaseInput) {
  return request<TestCase>('/test-cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function cancelTestCase(id: string) {
  return request<void>(`/test-cases/${id}`, { method: 'DELETE' });
}

// ---- Test Results ----

export interface TestResult {
  id: string;
  test_case_id: string;
  verdict: 'pass' | 'fail' | 'partial' | 'blocked';
  summary: string;
  step_results: StepResult[];
  completed_at: string;
}

export interface StepResult {
  step_index: number;
  instruction: string;
  status: string;
  notes?: string;
  screenshot_url?: string;
}

export function getTestResults(testCaseId: string) {
  return request<TestResult>(`/test-cases/${testCaseId}/results`);
}

// ---- Templates ----

export interface Template {
  id: string;
  title: string;
  description?: string;
  staging_url?: string;
  steps: { instruction: string; expected_behavior?: string }[];
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export function listTemplates() {
  return request<{ data: Template[] }>('/templates');
}

export function getTemplate(id: string) {
  return request<Template>(`/templates/${id}`);
}

export interface TemplateInput {
  title: string;
  description?: string;
  staging_url?: string;
  steps: { instruction: string; expected_behavior?: string }[];
  tags?: string[];
}

export function createTemplate(input: TemplateInput) {
  return request<Template>('/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTemplate(id: string, input: TemplateInput) {
  return request<Template>(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTemplate(id: string) {
  return request<void>(`/templates/${id}`, { method: 'DELETE' });
}

export function useTemplate(id: string, overrides?: Partial<CreateTestCaseInput>) {
  return request<TestCase>(`/templates/${id}/use`, {
    method: 'POST',
    body: JSON.stringify(overrides || {}),
  });
}

// ---- Credits ----

export interface CreditBalance {
  available: number;
  reserved: number;
  total: number;
  rate_per_credit?: number;
}

export function getBalance() {
  return request<CreditBalance>('/credits/balance');
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  popular?: boolean;
}

export function getPacks() {
  return request<{ data: CreditPack[] }>('/credits/packs');
}

export interface TopupResponse {
  checkout_url: string;
}

export function topup(packId: string) {
  return request<TopupResponse>('/credits/topup', {
    method: 'POST',
    body: JSON.stringify({ pack_id: packId }),
  });
}

export interface Transaction {
  id: string;
  type: 'topup' | 'charge' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  created_at: string;
}

export function getTransactions(page?: number) {
  const qs = page ? `?page=${page}` : '';
  return request<PaginatedResponse<Transaction>>(`/credits/transactions${qs}`);
}

// ---- Webhooks ----

export interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
}

export function updateWebhook(config: { url: string; secret?: string }) {
  return request<WebhookConfig>('/webhook', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function pingWebhook() {
  return request<{ success: boolean }>('/webhook/ping', { method: 'POST' });
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status_code: number;
  success: boolean;
  delivered_at: string;
  response_time_ms: number;
}

export function getWebhookHistory(page?: number) {
  const qs = page ? `?page=${page}` : '';
  return request<PaginatedResponse<WebhookDelivery>>(`/webhook/history${qs}`);
}
