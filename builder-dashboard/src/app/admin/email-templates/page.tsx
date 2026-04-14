'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
  type EmailTemplate,
} from '@/lib/admin-api';
import { Mail, X, Eye, Send, Save, ChevronRight, Code, Tag } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  builder: 'Builder',
  tester: 'Tester',
  system: 'System',
};

const CATEGORY_COLORS: Record<string, string> = {
  builder: 'bg-accent-admin/8 text-accent-admin',
  tester: 'bg-accent-review/8 text-accent-review',
  system: 'bg-text-muted/10 text-text-muted',
};

export default function EmailTemplatesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [dirty, setDirty] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: getEmailTemplates,
  });

  const templateQuery = useQuery({
    queryKey: ['admin-email-template', selected],
    queryFn: () => getEmailTemplate(selected!),
    enabled: !!selected,
  });

  useEffect(() => {
    if (templateQuery.data) {
      setSubject(templateQuery.data.subject);
      setHtml(templateQuery.data.html_content);
      setDirty(false);
      setTab('editor');
    }
  }, [templateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateEmailTemplate(selected!, { subject, html_content: html }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-email-templates'] });
      qc.invalidateQueries({ queryKey: ['admin-email-template', selected] });
      setDirty(false);
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => previewEmailTemplate(selected!),
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setTab('preview');
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendTestEmail(selected!, testEmail),
  });

  const handlePreview = () => {
    if (dirty) {
      // Preview from current editor content with raw variable placeholders
      setPreviewHtml(html);
      setTab('preview');
    } else {
      previewMutation.mutate();
    }
  };

  useEffect(() => {
    if (tab === 'preview' && iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [tab, previewHtml]);

  const templates = data?.templates || [];
  const filtered = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory);

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Email Templates</h1>
        <p className="text-sm text-text-muted mt-0.5">{templates.length} templates &mdash; edit content, preview, and send tests</p>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        {/* Left: Template List */}
        <div className="w-72 shrink-0 space-y-3">
          {/* Category filter */}
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterCategory === cat
                    ? 'bg-accent-admin/10 text-accent-admin'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="space-y-0.5">
            {filtered.map(t => (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                  selected === t.name
                    ? 'bg-accent-admin/8 border border-accent-admin/20'
                    : 'hover:bg-surface-secondary border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    selected === t.name ? 'text-accent-admin' : 'text-text-primary'
                  }`}>
                    {t.name}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ${
                    selected === t.name ? 'text-accent-admin' : 'text-text-muted opacity-0 group-hover:opacity-100'
                  }`} strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[t.category] || 'text-text-muted'}`}>
                    {CATEGORY_LABELS[t.category] || t.category}
                  </span>
                  <span className="text-[11px] text-text-muted truncate">{t.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Editor / Preview */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="h-full flex items-center justify-center border border-dashed border-border rounded-xl">
              <div className="text-center">
                <Mail className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-text-muted">Select a template to edit</p>
              </div>
            </div>
          ) : templateQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-accent-admin border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-text-primary">{selected}</h2>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    CATEGORY_COLORS[templateQuery.data?.category || ''] || ''
                  }`}>
                    {CATEGORY_LABELS[templateQuery.data?.category || ''] || ''}
                  </span>
                  {dirty && <span className="text-[10px] text-accent-warning font-medium">Unsaved changes</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTab('editor')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                      tab === 'editor' ? 'bg-accent-admin/10 text-accent-admin' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" strokeWidth={1.5} /> Editor
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                      tab === 'preview' ? 'bg-accent-admin/10 text-accent-admin' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.5} /> Preview
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="px-5 py-3 border-b border-border">
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Subject Line</label>
                <input
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setDirty(true); }}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-admin/50"
                />
              </div>

              {/* Content area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {tab === 'editor' ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={html}
                      onChange={e => { setHtml(e.target.value); setDirty(true); }}
                      spellCheck={false}
                      className="flex-1 w-full p-4 bg-bg font-mono text-xs text-text-primary leading-relaxed resize-none focus:outline-none"
                      placeholder="HTML template content..."
                    />
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="w-full h-full bg-white"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>

              {/* Variables reference */}
              {tab === 'editor' && templateQuery.data?.variables && templateQuery.data.variables.length > 0 && (
                <div className="px-5 py-2.5 border-t border-border bg-surface-secondary/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
                    {templateQuery.data.variables.map(v => (
                      <code key={v} className="text-[11px] px-1.5 py-0.5 bg-accent-admin/8 text-accent-admin rounded font-mono">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!dirty || saveMutation.isPending}
                    className="px-3 py-1.5 bg-accent-admin text-white text-xs font-medium rounded-lg hover:bg-accent-admin/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  {saveMutation.isSuccess && !dirty && (
                    <span className="text-xs text-accent-review">Saved</span>
                  )}
                  {saveMutation.isError && (
                    <span className="text-xs text-accent-danger">{(saveMutation.error as Error).message}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="test@email.com"
                    className="px-2.5 py-1.5 bg-surface-secondary border border-border rounded-lg text-xs text-text-primary w-44 focus:outline-none focus:ring-1 focus:ring-accent-admin/50"
                  />
                  <button
                    onClick={() => sendMutation.mutate()}
                    disabled={!testEmail || sendMutation.isPending}
                    className="px-3 py-1.5 border border-border text-xs font-medium rounded-lg hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-text-primary"
                  >
                    <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {sendMutation.isPending ? 'Sending...' : 'Send Test'}
                  </button>
                  {sendMutation.isSuccess && (
                    <span className="text-xs text-accent-review">Sent!</span>
                  )}
                  {sendMutation.isError && (
                    <span className="text-xs text-accent-danger">{(sendMutation.error as Error).message}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
