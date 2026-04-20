import { createClient } from './supabase';

const BASE = '/api/v1';

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

// ---- Templates (enforced, read-only) ----

export type TemplateType = 'flow_test' | 'review_test';

export interface EnforcedTemplate {
  id: TemplateType;
  name: string;
  description: string;
  pricing: {
    model: 'fixed' | 'base_plus_bonus';
    base_credits: number;
    cost_per_step?: number;
    bonus_per_finding?: { critical: number; major: number; minor: number };
    max_findings_cap?: number;
  };
  fields: Record<string, {
    required: boolean;
    type: string;
    description: string;
    options?: string[];
  }>;
  step_schema?: Record<string, {
    required: boolean;
    type: string;
    description: string;
  }>;
  finding_schema?: Record<string, {
    required: boolean;
    type: string;
    description: string;
    options?: string[];
  }>;
}

export function listTemplates() {
  return request<{ templates: EnforcedTemplate[] }>('/templates');
}

export function getTemplate(id: string) {
  return request<EnforcedTemplate>(`/templates/${id}`);
}

// ---- Test Cases ----

export interface TestStep {
  instruction: string;
  expected_behavior?: string;
  status?: string;
}

export interface StatusEntry {
  status: string;
  at?: string;
  timestamp?: string;
  note?: string;
}

export interface TestCase {
  id: string;
  title: string;
  template_type: TemplateType;
  description?: string;
  url: string;
  status: string;
  // Flow test fields
  steps?: TestStep[];
  expected_behavior?: string;
  // Review test fields
  context?: string;
  devices_to_check?: string[];
  focus_areas?: string[];
  ignore_areas?: string;
  // Shared
  step_count?: number;
  credit_cost: number;
  has_credentials?: boolean;
  environment?: string;
  tags?: string[];
  external_id?: string;
  callback_url?: string;
  status_history?: StatusEntry[];
  info_requests?: Array<{ from: string; message: string; at: string; user_id: string }>;
  assigned_tester_id?: string;
  assigned_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
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

export interface TestCaseListResponse {
  test_cases: TestCase[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  next_cursor: string | null;
  has_more: boolean;
}

export async function listTestCases(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return request<TestCaseListResponse>(`/test-cases${qs ? `?${qs}` : ''}`);
}

export function getTestCase(id: string) {
  return request<TestCase>(`/test-cases/${id}`);
}

export interface CreateFlowTestInput {
  template_type: 'flow_test';
  title: string;
  description?: string;
  staging_url: string;
  steps: { instruction: string; expected_behavior?: string }[];
  expected_behavior: string;
  credentials?: Record<string, string>;
  environment?: string;
  tags?: string[];
  external_id?: string;
  callback_url?: string;
}

export interface CreateReviewTestInput {
  template_type: 'review_test';
  title: string;
  description?: string;
  staging_url: string;
  context: string;
  devices_to_check: string[];
  focus_areas?: string[];
  ignore_areas?: string;
  credentials?: Record<string, string>;
  environment?: string;
  tags?: string[];
  external_id?: string;
  callback_url?: string;
}

export type CreateTestCaseInput = CreateFlowTestInput | CreateReviewTestInput;

export function createTestCase(input: CreateTestCaseInput) {
  return request<TestCase>('/test-cases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function cancelTestCase(id: string) {
  return request<void>(`/test-cases/${id}`, { method: 'DELETE' });
}

export function replyToInfoRequest(id: string, message: string) {
  return request<{ status: string; info_requests: Array<{ from: string; message: string; at: string; user_id: string }> }>(
    `/test-cases/${id}/info-reply`,
    { method: 'POST', body: JSON.stringify({ message }) },
  );
}

export function updateTestCaseStatus(id: string, status: string) {
  return request<TestCase>(`/test-cases/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---- Test Results ----

export interface StepResult {
  step_index: number;
  instruction: string;
  status: string;
  severity?: string;
  actual_behavior?: string;
  notes?: string;
  screenshot_url?: string;
  screenshot_download_url?: string;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  category: 'functionality' | 'layout' | 'content' | 'typography' | 'forms' | 'images';
  description: string;
  screenshot_url?: string;
  device: string;
  location: string;
}

export interface FlowTestResult {
  test_case_id: string;
  template_type: 'flow_test';
  status: string;

  // Test case details
  title: string;
  description: string | null;
  url: string | null;
  expected_behavior: string | null;
  environment: string | null;
  tags: string[];

  // Verdict
  verdict: string | null;
  summary: string | null;

  // Steps
  steps_passed: number;
  steps_failed: number;
  steps_total: number;
  per_step_results: StepResult[];

  // Recording
  recording_url: string | null;
  recording_download_url: string | null;
  annotations_url: string | null;
  annotations_download_url: string | null;

  completed_at: string | null;
}

export interface ReviewTestResult {
  test_case_id: string;
  template_type: 'review_test';
  status: string;
  verdict: string | null;
  summary: string | null;
  total_findings: number;
  findings: Finding[];
  credits_breakdown: {
    base: number;
    bonus: number;
    total: number;
  };
  completed_at: string | null;
}

export type TestResult = FlowTestResult | ReviewTestResult;

export function getTestResults(testCaseId: string) {
  return request<TestResult>(`/test-cases/${testCaseId}/results`);
}

// ---- Credits ----

export interface CreditBalance {
  available_credits: number;
  reserved_credits: number;
  total_credits_used: number;
  per_credit_rate: number;
  per_credit_rate_cents: number;
}

export function getBalance() {
  return request<CreditBalance>('/credits/balance');
}

export interface CreditEstimate {
  amount_cents: number;
  amount: number;
  credits: number;
  per_credit_cents: number;
  per_credit: number;
  discount_label: string;
}

export function estimateCredits(amountCents: number) {
  return request<CreditEstimate>(`/credits/estimate?amount_cents=${amountCents}`);
}

export interface TopupResponse {
  checkout_url: string;
  session_id: string;
  credits: number;
  amount_cents: number;
}

export function topup(amountCents: number) {
  return request<TopupResponse>('/credits/topup', {
    method: 'POST',
    body: JSON.stringify({ amount_cents: amountCents }),
  });
}

export interface Transaction {
  id: string;
  type: 'topup' | 'charge' | 'refund' | 'payout' | 'commission';
  credit_amount: number;
  currency_amount: number;
  currency_amount_cents: number;
  description: string;
  test_case_id: string | null;
  created_at: string;
}

export function getTransactions(cursor?: string) {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return request<{ transactions: Transaction[]; next_cursor: string | null; has_more: boolean }>(`/credits/transactions${qs}`);
}

// ---- Tweet Reward ----

export interface TweetRewardStatus {
  claimed: boolean;
  reward: {
    tweet_url: string;
    credits_awarded: number;
    status: 'pending' | 'approved' | 'rejected' | 'revoked';
    rejection_reason: string | null;
    created_at: string;
  } | null;
}

export function getTweetRewardStatus() {
  return request<TweetRewardStatus>('/credits/tweet-reward');
}

export function claimTweetReward(tweetUrl: string) {
  return request<{ success: boolean; status: string; message: string }>('/credits/tweet-reward', {
    method: 'POST',
    body: JSON.stringify({ tweet_url: tweetUrl }),
  });
}

// ---- API Keys ----

export interface ApiKey {
  id: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export function listApiKeys() {
  return request<{ data: ApiKey[] }>('/api-keys');
}

export function createApiKey(label?: string) {
  return request<{ id: string; key: string; label: string | null }>('/api-keys', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function revokeApiKey(id: string) {
  return request<void>(`/api-keys/${id}`, { method: 'DELETE' });
}

// ---- Webhooks ----

export interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
}

export function updateWebhook(config: { url: string; secret: string }) {
  return request<WebhookConfig>('/webhook', {
    method: 'PUT',
    body: JSON.stringify({ webhook_url: config.url, webhook_secret: config.secret }),
  });
}

export function pingWebhook() {
  return request<{ success: boolean }>('/webhook/ping', { method: 'POST', body: '{}' });
}

export interface WebhookDelivery {
  id: string;
  test_case_id: string;
  event_type: string;
  url: string;
  response_status: number | null;
  attempt_count: number;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookHistoryResponse {
  deliveries: WebhookDelivery[];
  next_cursor: string | null;
  has_more: boolean;
}

export function getWebhookHistory(cursor?: string) {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return request<WebhookHistoryResponse>(`/webhook/history${qs}`);
}
