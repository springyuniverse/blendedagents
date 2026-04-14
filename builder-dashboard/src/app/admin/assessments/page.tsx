'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAssessments,
  getAssessmentDetail,
  type AssessmentSummary,
  type AssessmentDetail,
} from '@/lib/admin-api';
import {
  GraduationCap,
  Bug,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Eye,
  BarChart3,
  Clock,
  Tag,
} from 'lucide-react';

const DIFFICULTY_COLORS: Record<string, string> = {
  'easy-medium': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'medium': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'medium-hard': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'hard': 'bg-red-500/10 text-red-600 border-red-200',
  'very-hard': 'bg-purple-500/10 text-purple-600 border-purple-200',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  'easy-medium': 'Easy-Medium',
  'medium': 'Medium',
  'medium-hard': 'Medium-Hard',
  'hard': 'Hard',
  'very-hard': 'Very Hard',
};

const CATEGORY_COLORS: Record<string, string> = {
  visual: 'bg-sky-500/10 text-sky-600',
  functional: 'bg-violet-500/10 text-violet-600',
  logic: 'bg-amber-500/10 text-amber-600',
  edge_case: 'bg-rose-500/10 text-rose-600',
  ux: 'bg-teal-500/10 text-teal-600',
  data_integrity: 'bg-red-500/10 text-red-600',
  state: 'bg-indigo-500/10 text-indigo-600',
  security: 'bg-orange-500/10 text-orange-600',
  state_management: 'bg-indigo-500/10 text-indigo-600',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface-secondary/50 rounded-lg px-4 py-3">
      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-text-primary mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

const emptyStats: AssessmentSummary['stats'] = { total_assigned: 0, total_completed: 0, total_passed: 0, pass_rate: 0, avg_detection: 0, avg_clarity: 0 };

function AssessmentCard({ a, onClick }: { a: AssessmentSummary; onClick: () => void }) {
  const stats = a.stats || emptyStats;
  const passRate = stats.pass_rate;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-border rounded-xl p-5 hover:border-accent-admin/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-admin transition-colors truncate">
            {a.title.replace('Onboarding Assessment: ', '')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{a.description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 ml-3" strokeWidth={1.5} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[a.difficulty] || 'text-text-muted'}`}>
          {DIFFICULTY_LABELS[a.difficulty] || a.difficulty}
        </span>
        <span className="text-[11px] text-text-muted flex items-center gap-1">
          <Bug className="w-3 h-3" strokeWidth={1.5} /> {a.bug_count} bugs
        </span>
        <span className="text-[11px] text-text-muted flex items-center gap-1">
          <Target className="w-3 h-3" strokeWidth={1.5} /> {a.pass_detection}/{a.bug_count} to pass
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {a.categories.map((cat, i) => (
          <span key={i} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cat] || 'bg-surface-secondary text-text-muted'}`}>
            {cat.replace('_', ' ')}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
        <div>
          <p className="text-[10px] text-text-muted">Assigned</p>
          <p className="text-sm font-semibold text-text-primary">{stats.total_assigned}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Completed</p>
          <p className="text-sm font-semibold text-text-primary">{stats.total_completed}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Pass Rate</p>
          <p className={`text-sm font-semibold ${passRate >= 50 ? 'text-accent-review' : passRate > 0 ? 'text-accent-warning' : 'text-text-muted'}`}>
            {stats.total_completed > 0 ? `${passRate}%` : '—'}
          </p>
        </div>
      </div>
    </button>
  );
}

function DetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-assessment-detail', id],
    queryFn: () => getAssessmentDetail(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;
  const a = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">{a.title.replace('Onboarding Assessment: ', '')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{a.description}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${DIFFICULTY_COLORS[a.difficulty] || ''}`}>
          {DIFFICULTY_LABELS[a.difficulty] || a.difficulty}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="Assigned" value={a.stats?.total_assigned || 0} />
        <StatCard label="Completed" value={a.stats?.total_completed || 0} />
        <StatCard label="Passed" value={a.stats?.total_passed || 0} />
        <StatCard label="Pass Rate" value={(a.stats?.total_completed || 0) > 0 ? `${a.stats.pass_rate}%` : '—'} />
        <StatCard label="Avg Detection" value={a.stats?.avg_detection || 0} sub={`of ${a.bug_count}`} />
        <StatCard label="Avg Clarity" value={a.stats?.avg_clarity || 0} sub={`of 2.0`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Steps */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent-admin" strokeWidth={1.5} />
              Test Steps ({a.steps.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {a.steps.map((step, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-accent-admin/10 text-accent-admin text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary leading-relaxed">{step.instruction}</p>
                    <p className="text-[11px] text-text-muted mt-1 italic">Expected: {step.expected}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Planted Bugs */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Bug className="w-4 h-4 text-accent-danger" strokeWidth={1.5} />
              Planted Bugs ({a.config.planted_issues.length})
              <span className="text-[11px] font-normal text-text-muted ml-auto">
                Pass: {a.config.pass_detection}/{a.config.planted_issues.length} detect, {a.config.pass_clarity} clarity
              </span>
            </h2>
          </div>
          <div className="divide-y divide-border">
            {a.config.planted_issues.map((bug, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-text-muted">Step {bug.step_index + 1}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[bug.category] || 'bg-surface-secondary text-text-muted'}`}>
                    {bug.category.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    {bug.acceptable_severities.map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 bg-surface-secondary rounded text-text-muted">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {bug.keywords.map((kw, j) => (
                    <code key={j} className="text-[10px] px-1.5 py-0.5 bg-accent-admin/5 text-accent-admin/70 rounded font-mono">{kw}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      {a.recent_submissions && a.recent_submissions.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-admin" strokeWidth={1.5} />
              Recent Submissions ({a.recent_submissions.length})
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Tester</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Detection</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Clarity</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Result</th>
                <th className="text-left px-5 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {a.recent_submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-5 py-2.5">
                    <p className="text-sm text-text-primary">{sub.tester_name || 'Unknown'}</p>
                    <p className="text-[11px] text-text-muted">{sub.tester_email}</p>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[11px] font-medium ${sub.status === 'completed' ? 'text-accent-review' : 'text-text-muted'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-sm text-text-primary">
                    {sub.grade ? sub.grade.detection_score : '—'}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-sm text-text-primary">
                    {sub.grade ? sub.grade.clarity_score : '—'}
                  </td>
                  <td className="px-5 py-2.5">
                    {sub.grade ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${sub.grade.passed ? 'text-accent-review' : 'text-accent-danger'}`}>
                        {sub.grade.passed ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> : <XCircle className="w-3 h-3" strokeWidth={2} />}
                        {sub.grade.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted">pending</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-text-muted">
                    {sub.completed_at
                      ? new Date(sub.completed_at).toLocaleDateString()
                      : new Date(sub.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AssessmentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-assessments'],
    queryFn: getAssessments,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedId) {
    return <DetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const assessments = data?.assessments || [];
  const totalAssigned = assessments.reduce((sum, a) => sum + (a.stats?.total_assigned || 0), 0);
  const totalCompleted = assessments.reduce((sum, a) => sum + (a.stats?.total_completed || 0), 0);
  const totalPassed = assessments.reduce((sum, a) => sum + (a.stats?.total_passed || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Assessments</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {assessments.length} assessments &mdash; randomly assigned to new testers during onboarding
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Assessments" value={assessments.length} />
        <StatCard label="Testers Assessed" value={totalAssigned} />
        <StatCard label="Completed" value={totalCompleted} />
        <StatCard label="Overall Pass Rate" value={totalCompleted > 0 ? `${Math.round((totalPassed / totalCompleted) * 100)}%` : '—'} />
      </div>

      {/* Assessment cards */}
      <div className="grid grid-cols-2 gap-4">
        {assessments.map(a => (
          <AssessmentCard key={a.id} a={a} onClick={() => setSelectedId(a.id)} />
        ))}
      </div>
    </div>
  );
}
