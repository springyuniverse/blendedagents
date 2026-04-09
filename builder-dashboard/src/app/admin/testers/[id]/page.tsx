'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminTesters, updateTester, getTesterSubmissions, getTesterAssessment, getTesterReferrals, type AdminTester, type TesterSubmission, type TesterAssessment, type AssessmentStepResult, type TesterReferral } from '@/lib/admin-api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft, Shield, ShieldOff, MapPin, Clock, DollarSign, Globe,
  Monitor, Wrench, Languages, Mail, Calendar, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, ClipboardList, Pencil, Check, X, GraduationCap,
  Play, Image, ExternalLink, Gift, Link2,
} from 'lucide-react';

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-sm text-text-muted">—</span>;
  const color = verdict === 'pass' ? 'bg-accent-review/10 text-accent-review'
    : verdict === 'fail' ? 'bg-accent-danger/10 text-accent-danger'
    : 'bg-accent-warning/10 text-accent-warning';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${color}`}>
      {verdict}
    </span>
  );
}

function InfoItem({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" strokeWidth={1.5} />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <div className="text-sm text-text-primary mt-0.5">{value || '—'}</div>
      </div>
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) { onChange([...value, trimmed]); setInput(''); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-admin/8 text-accent-admin text-[11px] font-medium rounded">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-accent-danger"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-primary">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent-admin' : 'bg-surface-secondary border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

function EditInlineModal({ tester, onClose }: { tester: AdminTester; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(tester.display_name);
  const [email] = useState(tester.email);
  const [region, setRegion] = useState(tester.region);
  const [timezone, setTimezone] = useState(tester.timezone ?? '');
  const [onboarded, setOnboarded] = useState(tester.onboarded);
  const [isActive, setIsActive] = useState(tester.is_active);
  const [isAvailable, setIsAvailable] = useState(tester.is_available);
  const [maxInvites, setMaxInvites] = useState(tester.max_invites ?? 0);
  const [skills, setSkills] = useState<string[]>(tester.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(tester.languages ?? []);
  const [devices, setDevices] = useState<string[]>(tester.devices ?? []);

  const mutation = useMutation({
    mutationFn: () => updateTester(tester.id, {
      display_name: name, region, timezone: timezone || null,
      onboarded, is_active: isActive, is_available: isAvailable,
      skills, languages, devices, max_invites: maxInvites,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-testers'] });
      qc.invalidateQueries({ queryKey: ['admin-testers-detail'] });
      onClose();
    },
  });

  const inputClass = "w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-lifted w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text-primary">Edit Tester</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          {/* Identity */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email</label>
            <p className="text-sm text-text-muted px-3 py-2">{email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Region</label>
              <input value={region} onChange={e => setRegion(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Timezone</label>
              <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. America/New_York" className={inputClass} />
            </div>
          </div>

          {/* Toggles */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <ToggleSwitch checked={isActive} onChange={setIsActive} label="Active" />
            <ToggleSwitch checked={onboarded} onChange={setOnboarded} label="Onboarded" />
            <ToggleSwitch checked={isAvailable} onChange={setIsAvailable} label="Available" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Max Invites</label>
            <input type="number" min={0} max={100} value={maxInvites}
              onChange={e => setMaxInvites(parseInt(e.target.value) || 0)}
              className={inputClass} />
            <p className="text-xs text-text-muted mt-0.5">Number of invite codes this tester can generate</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Skills</label>
            <TagInput value={skills} onChange={setSkills} placeholder="Add skill and press Enter" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Languages</label>
            <TagInput value={languages} onChange={setLanguages} placeholder="Add language and press Enter" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Devices</label>
            <TagInput value={devices} onChange={setDevices} placeholder="Add device and press Enter" />
          </div>

          {mutation.isError && <p className="text-[13px] text-accent-danger">{(mutation.error as Error).message}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 bg-accent-admin text-white text-sm font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTesterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [subPage, setSubPage] = useState(1);
  const [editing, setEditing] = useState(false);

  // Fetch tester from the list (reuse cache) — find by id
  const { data: testersData } = useQuery({
    queryKey: ['admin-testers-detail', id],
    queryFn: async () => {
      // Direct query with search won't work by ID, so fetch first page and check cache
      // In practice we fetch all testers pages, but for simplicity we'll just fetch with a large limit
      const res = await getAdminTesters({ limit: 100 });
      return res;
    },
  });

  const tester = testersData?.testers.find(t => t.id === id);

  const { data: assessmentData, isLoading: assessLoading } = useQuery({
    queryKey: ['admin-tester-assessment', id],
    queryFn: () => getTesterAssessment(id),
    enabled: !!tester,
  });

  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ['admin-tester-referrals', id],
    queryFn: () => getTesterReferrals(id),
    enabled: !!tester,
  });

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-tester-submissions', id, subPage],
    queryFn: () => getTesterSubmissions(id, { page: subPage, limit: 10 }),
    enabled: !!tester,
  });

  const toggleActivation = useMutation({
    mutationFn: ({ is_active }: { is_active: boolean }) => updateTester(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-testers'] });
      qc.invalidateQueries({ queryKey: ['admin-testers-detail'] });
    },
  });

  if (!tester) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusLabel = !tester.onboarded ? 'Pending Onboarding' : tester.is_active ? 'Active' : 'Inactive';
  const statusColor = !tester.onboarded ? 'text-accent-warning' : tester.is_active ? 'text-accent-review' : 'text-accent-danger';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => router.push('/admin/testers')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to Testers
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">{tester.display_name}</h1>
          <p className="text-sm text-text-muted mt-0.5">{tester.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-secondary transition-colors">
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            Edit
          </button>
          <button
            onClick={() => toggleActivation.mutate({ is_active: !tester.is_active })}
            disabled={toggleActivation.isPending}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              tester.is_active
                ? 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20 hover:bg-accent-danger/15'
                : 'bg-accent-review/10 text-accent-review border border-accent-review/20 hover:bg-accent-review/15'
            }`}
          >
            {tester.is_active ? <ShieldOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />}
            {tester.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Profile + Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="col-span-2 bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-x-8">
            <InfoItem icon={Mail} label="Email" value={tester.email} />
            <InfoItem icon={MapPin} label="Region" value={tester.region?.toUpperCase()} />
            <InfoItem icon={Globe} label="Timezone" value={tester.timezone} />
            <InfoItem icon={Calendar} label="Joined" value={new Date(tester.created_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} />
            <InfoItem icon={Wrench} label="Skills" value={
              (tester.skills ?? []).length > 0
                ? <div className="flex flex-wrap gap-1.5 mt-0.5">{tester.skills.map(s => <span key={s} className="px-2 py-0.5 bg-accent-admin/8 text-accent-admin text-[11px] font-medium rounded">{s}</span>)}</div>
                : null
            } />
            <InfoItem icon={Languages} label="Languages" value={
              (tester.languages ?? []).length > 0
                ? <div className="flex flex-wrap gap-1.5 mt-0.5">{tester.languages.map(l => <span key={l} className="px-2 py-0.5 bg-surface-secondary text-text-secondary text-[11px] font-medium rounded">{l}</span>)}</div>
                : null
            } />
            <InfoItem icon={Monitor} label="Devices" value={
              (tester.devices ?? []).length > 0
                ? <div className="flex flex-wrap gap-1.5 mt-0.5">{tester.devices.map(d => <span key={d} className="px-2 py-0.5 bg-surface-secondary text-text-secondary text-[11px] font-medium rounded">{d}</span>)}</div>
                : null
            } />
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Stats</h2>
          <div className={`text-sm font-medium ${statusColor}`}>{statusLabel}</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" strokeWidth={1.5} />Onboarded</span>
              {tester.onboarded
                ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-review/10 text-accent-review">Completed</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-warning/10 text-accent-warning">Pending</span>
              }
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Tasks Completed</span>
              <span className="text-sm font-mono text-text-primary">{tester.tasks_completed}/{tester.tasks_total}</span>
            </div>
            <div className="w-full bg-surface-secondary rounded-full h-1.5">
              <div className="bg-accent-admin rounded-full h-1.5" style={{ width: `${tester.tasks_total > 0 ? (tester.tasks_completed / tester.tasks_total * 100) : 0}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Avg Completion</span>
              <div className="flex items-center gap-1 text-sm font-mono text-text-primary">
                <Clock className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                {tester.avg_completion_minutes > 0 ? `${Math.round(tester.avg_completion_minutes)}m` : '—'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Total Earnings</span>
              <div className="flex items-center gap-1 text-sm font-mono text-text-primary">
                <DollarSign className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                {(tester.earnings_cents / 100).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Available</span>
              <span className={`text-xs font-medium ${tester.is_available ? 'text-accent-review' : 'text-text-muted'}`}>
                {tester.is_available ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Report */}
      {assessLoading ? (
        <div className="bg-surface border border-border rounded-lg p-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assessmentData?.assessment ? (() => {
        const a = assessmentData.assessment;
        const grade = a.grade;
        return (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">Onboarding Assessment</h2>
                    <p className="text-xs text-text-muted">{a.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.verdict && (
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                      a.verdict === 'pass' ? 'bg-accent-review/10 text-accent-review'
                      : a.verdict === 'fail' ? 'bg-accent-danger/10 text-accent-danger'
                      : 'bg-accent-warning/10 text-accent-warning'
                    }`}>
                      Verdict: {a.verdict.toUpperCase()}
                    </span>
                  )}
                  {grade && (
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                      grade.passed ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-danger/10 text-accent-danger'
                    }`}>
                      Auto-grade: {grade.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grade scores */}
            {grade && (
              <div className="px-5 py-4 border-b border-border bg-surface-secondary/30">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Issues Detected</p>
                    <p className="text-lg font-bold text-text-primary font-mono">{grade.detection_score}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Clarity Score</p>
                    <p className="text-lg font-bold text-text-primary font-mono">{typeof grade.clarity_score === 'number' ? grade.clarity_score.toFixed(1) : grade.clarity_score}/2.0</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Steps</p>
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <span className="flex items-center gap-0.5 text-accent-review"><CheckCircle2 className="w-3.5 h-3.5" />{a.steps_passed ?? 0}</span>
                      <span className="flex items-center gap-0.5 text-accent-danger"><XCircle className="w-3.5 h-3.5" />{a.steps_failed ?? 0}</span>
                      <span className="text-text-muted">/ {a.steps_total ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {a.summary && (
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs text-text-muted mb-1">Tester&apos;s Summary</p>
                <p className="text-sm text-text-primary leading-relaxed">{a.summary}</p>
              </div>
            )}

            {/* Recording */}
            {a.recording_download_url && (
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs text-text-muted mb-2">Screen Recording</p>
                <video
                  src={a.recording_download_url}
                  controls
                  className="w-full rounded-lg border border-border bg-black max-h-[400px]"
                />
              </div>
            )}

            {/* Step-by-step results */}
            <div className="divide-y divide-border-subtle">
              {(a.steps ?? []).map((step: { instruction: string; expected_behavior?: string }, idx: number) => {
                const result = a.step_results.find((r: AssessmentStepResult) => r.step_index === idx);
                const statusColor = result?.status === 'passed' ? 'text-accent-review'
                  : result?.status === 'failed' ? 'text-accent-danger'
                  : result?.status === 'blocked' ? 'text-accent-warning'
                  : 'text-text-muted';
                const statusBg = result?.status === 'passed' ? 'bg-accent-review'
                  : result?.status === 'failed' ? 'bg-accent-danger'
                  : result?.status === 'blocked' ? 'bg-accent-warning'
                  : 'bg-text-muted';

                return (
                  <div key={idx} className="px-5 py-4 hover:bg-surface-secondary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${statusBg}/15`}>
                        <span className={`text-xs font-bold ${statusColor}`}>{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-text-primary font-medium">{step.instruction}</p>
                            {step.expected_behavior && (
                              <p className="text-xs text-text-muted mt-0.5">Expected: {step.expected_behavior}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {result?.severity && (
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                                result.severity === 'critical' ? 'bg-accent-danger/10 text-accent-danger'
                                : result.severity === 'major' ? 'bg-accent-warning/10 text-accent-warning'
                                : 'bg-surface-secondary text-text-muted'
                              }`}>{result.severity}</span>
                            )}
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                              result?.status === 'passed' ? 'bg-accent-review/10 text-accent-review'
                              : result?.status === 'failed' ? 'bg-accent-danger/10 text-accent-danger'
                              : result?.status === 'blocked' ? 'bg-accent-warning/10 text-accent-warning'
                              : 'bg-surface-secondary text-text-muted'
                            }`}>{result?.status || 'pending'}</span>
                          </div>
                        </div>
                        {result?.actual_behavior && (
                          <div className="mt-2 px-3 py-2 bg-surface-secondary rounded-md">
                            <p className="text-xs text-text-muted mb-0.5">Actual behavior:</p>
                            <p className="text-sm text-text-primary">{result.actual_behavior}</p>
                          </div>
                        )}
                        {result?.notes && (
                          <div className="mt-1.5 px-3 py-2 bg-surface-secondary rounded-md">
                            <p className="text-xs text-text-muted mb-0.5">Notes:</p>
                            <p className="text-sm text-text-secondary">{result.notes}</p>
                          </div>
                        )}
                        {result?.screenshot_download_url && (
                          <div className="mt-2">
                            <a href={result.screenshot_download_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-accent-admin hover:text-accent-admin/80 font-medium transition-colors">
                              <Image className="w-3.5 h-3.5" strokeWidth={1.5} />
                              View Screenshot
                              <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {a.completed_at && (
              <div className="px-5 py-3 border-t border-border text-xs text-text-muted">
                Completed {new Date(a.completed_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(a.completed_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        );
      })() : (
        <div className="bg-surface border border-border rounded-lg px-5 py-8 text-center">
          <GraduationCap className="w-6 h-6 text-text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-text-muted">No assessment submitted yet.</p>
        </div>
      )}

      {/* Referrals */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Referrals</h2>
              <p className="text-xs text-text-muted">
                {referralsData ? `${referralsData.total_used} used of ${referralsData.total_generated} generated (${referralsData.max_invites} slots)` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {referralsLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !referralsData || referralsData.invites.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            {referralsData?.max_invites === 0 ? 'No invite slots assigned.' : 'No invite codes generated yet.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Code</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Referred Tester</th>
                <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {referralsData.invites.map((inv: TesterReferral) => (
                <tr key={inv.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-sm text-text-primary tracking-wide">{inv.code}</span>
                  </td>
                  <td className="px-5 py-3">
                    {inv.used_by_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-secondary text-text-secondary border border-border">Used</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-accent-review/10 text-accent-review border border-accent-review/20">Available</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {inv.used_by_id ? (
                      <Link href={`/admin/testers/${inv.used_by_id}`} className="text-sm text-accent-admin hover:underline flex items-center gap-1">
                        <Link2 className="w-3 h-3" strokeWidth={1.5} />
                        {inv.referred_name || inv.referred_email || inv.used_by_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted">--</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[13px] font-mono text-text-muted">
                    {new Date(inv.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Submissions */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Submissions</h2>
              <p className="text-xs text-text-muted">{submissions?.total ?? 0} assigned test cases</p>
            </div>
          </div>
        </div>

        {subsLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (submissions?.submissions ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">No submissions yet.</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Test Case</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Type</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Verdict</th>
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Builder</th>
                  <th className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Steps</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Cost</th>
                  <th className="text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-2.5">Completed</th>
                </tr>
              </thead>
              <tbody>
                {submissions!.submissions.map((s: TesterSubmission) => (
                  <tr key={s.id} className="border-b border-border-subtle hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-primary truncate max-w-[220px]">{s.title}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                        s.template_type === 'review_test' ? 'bg-accent-review/10 text-accent-review' : 'bg-accent-flow/10 text-accent-flow'
                      }`}>
                        {s.template_type === 'review_test' ? 'Review' : 'Flow'}
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3"><VerdictBadge verdict={s.verdict} /></td>
                    <td className="px-5 py-3 text-sm text-text-secondary">{s.builder_name || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {s.steps_passed != null || s.steps_failed != null ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-mono">
                          <span className="flex items-center gap-0.5 text-accent-review"><CheckCircle2 className="w-3 h-3" />{s.steps_passed ?? 0}</span>
                          <span className="flex items-center gap-0.5 text-accent-danger"><XCircle className="w-3 h-3" />{s.steps_failed ?? 0}</span>
                        </div>
                      ) : <span className="text-sm text-text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-mono text-text-primary">{s.credit_cost}</td>
                    <td className="px-5 py-3 text-right text-[13px] font-mono text-text-muted">
                      {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {submissions && submissions.total_pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-text-muted">
                  Showing {((subPage - 1) * submissions.per_page) + 1}–{Math.min(subPage * submissions.per_page, submissions.total)} of {submissions.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage <= 1}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-text-secondary px-2 font-mono">{subPage} / {submissions.total_pages}</span>
                  <button onClick={() => setSubPage(p => Math.min(submissions.total_pages, p + 1))} disabled={subPage >= submissions.total_pages}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editing && <EditInlineModal tester={tester} onClose={() => setEditing(false)} />}
    </div>
  );
}
