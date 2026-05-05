'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit3, Lock, AlertCircle, Loader2, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

type RuleType = 'FORBIDDEN_WORD' | 'REQUIRED_PHRASE' | 'STYLE_LIMIT' | 'PILLAR_REFERENCE';
type Severity = 'info' | 'warning' | 'error';

interface BrandRule {
  id: string;
  workspaceId: string;
  ruleType: RuleType;
  pattern: string;
  patternIsRegex: boolean;
  message: string | null;
  severity: string;
  contentTypeFilter: string[];
  isActive: boolean;
  source: string;
  createdAt: string;
}

interface RuleFormState {
  ruleType: RuleType;
  pattern: string;
  patternIsRegex: boolean;
  message: string;
  severity: Severity;
  isActive: boolean;
}

const DEFAULT_FORM: RuleFormState = {
  ruleType: 'FORBIDDEN_WORD',
  pattern: '',
  patternIsRegex: false,
  message: '',
  severity: 'warning',
  isActive: true,
};

// ─── API ──────────────────────────────────────────────────

const rulesKeys = {
  all: ['brand-rules'] as const,
};

async function fetchRules(): Promise<{ rules: BrandRule[] }> {
  const res = await fetch('/api/brand-rules');
  if (!res.ok) throw new Error('Failed to fetch rules');
  return res.json();
}

async function createRule(body: RuleFormState) {
  const res = await fetch('/api/brand-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create');
  }
  return res.json();
}

async function updateRule(id: string, body: Partial<RuleFormState>) {
  const res = await fetch(`/api/brand-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to update');
  }
  return res.json();
}

async function deleteRule(id: string) {
  const res = await fetch(`/api/brand-rules/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to delete');
  }
  return res.json();
}

interface PreviewResult {
  totalRules: number;
  rulesWithMatches: number;
  totalMatches: number;
  results: Array<{ ruleId?: string; pattern: string; matches: Array<{ value: string; index: number }> }>;
}

async function previewText(text: string): Promise<PreviewResult> {
  const res = await fetch('/api/brand-rules/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to preview');
  }
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  FORBIDDEN_WORD: 'Verboden woord',
  REQUIRED_PHRASE: 'Vereiste formulering',
  STYLE_LIMIT: 'Stijlgrens',
  PILLAR_REFERENCE: 'Pijler-verwijzing',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Component ────────────────────────────────────────────

export function RulesTab() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: rulesKeys.all, queryFn: fetchRules });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [previewText_, setPreviewText_] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  const createMutation = useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rulesKeys.all });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RuleFormState> }) => updateRule(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rulesKeys.all });
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKeys.all }),
  });

  const previewMutation = useMutation({
    mutationFn: previewText,
    onSuccess: (result) => setPreviewResult(result),
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!form.pattern.trim()) {
      setFormError('Pattern mag niet leeg zijn');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (rule: BrandRule) => {
    setEditingId(rule.id);
    setShowForm(true);
    setForm({
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      patternIsRegex: rule.patternIsRegex,
      message: rule.message ?? '',
      severity: (rule.severity as Severity) ?? 'warning',
      isActive: rule.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Fout bij laden: {(error as Error).message}
      </div>
    );
  }

  const rules = data?.rules ?? [];
  const manualRules = rules.filter((r) => !r.source.startsWith('auto:'));
  const autoRules = rules.filter((r) => r.source.startsWith('auto:'));

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Brand Rules</h2>
          <p className="mt-1 text-sm text-gray-600">
            Werkspecifieke verboden woorden, vereiste formuleringen en stijlgrenzen.
            Gegenereerde content wordt hiertegen gecheckt.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(DEFAULT_FORM);
            setShowForm(true);
            setFormError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#0d9488' }}
        >
          <Plus className="h-4 w-4" />
          Regel toevoegen
        </button>
      </div>

      {/* Form modal — inline panel, no overlay for simplicity */}
      {showForm && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {editingId ? 'Regel bewerken' : 'Nieuwe regel'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Type</span>
              <select
                value={form.ruleType}
                onChange={(e) => setForm({ ...form, ruleType: e.target.value as RuleType })}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              >
                {Object.entries(RULE_TYPE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-700">Severity</span>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Pattern</span>
            <input
              type="text"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="bv. synergy, deal, of regex /\\bsynergy\\b/i"
              className="mt-1 block w-full rounded-md border-gray-300 text-sm font-mono"
            />
            <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.patternIsRegex}
                onChange={(e) => setForm({ ...form, patternIsRegex: e.target.checked })}
              />
              Pattern is regex (anders: literal woord-match)
            </label>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Bericht (optioneel)</span>
            <input
              type="text"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Uitleg bij detectie"
              className="mt-1 block w-full rounded-md border-gray-300 text-sm"
            />
          </label>

          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Actief
          </label>

          {formError && (
            <div className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: '#0d9488' }}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Bezig…' : 'Opslaan'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormError(null);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Manual rules list */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Handmatig ({manualRules.length})
        </h3>
        {manualRules.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nog geen handmatige regels.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {manualRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[rule.severity] ?? SEVERITY_COLORS.warning}`}>
                      {rule.severity}
                    </span>
                    <span className="text-xs text-gray-500">{RULE_TYPE_LABELS[rule.ruleType]}</span>
                    {!rule.isActive && (
                      <span className="text-xs text-gray-400">(inactief)</span>
                    )}
                  </div>
                  <code className="mt-1 block truncate text-sm font-mono text-gray-900">
                    {rule.patternIsRegex ? `/${rule.pattern}/i` : rule.pattern}
                  </code>
                  {rule.message && (
                    <p className="mt-0.5 truncate text-xs text-gray-600">{rule.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => startEdit(rule)}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Bewerken"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Regel "${rule.pattern}" verwijderen?`)) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Auto-synced rules */}
      {autoRules.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Lock className="h-3.5 w-3.5 text-gray-400" />
            Auto-gesyncteerd uit Brand Personality ({autoRules.length})
          </h3>
          <p className="mb-2 text-xs text-gray-500">
            Deze regels komen uit <code>BrandPersonality.wordsWeAvoid</code> en worden automatisch
            geüpdatet wanneer dat veld wijzigt. Niet handmatig bewerkbaar — pas Brand Personality aan.
          </p>
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50">
            {autoRules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between px-4 py-2">
                <code className="truncate text-sm font-mono text-gray-700">{rule.pattern}</code>
                <span className="text-xs text-gray-400">{rule.source}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Preview tool */}
      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Test je content</h3>
        <p className="mb-3 text-xs text-gray-600">
          Plak een stuk content en zie welke regels zouden triggeren.
        </p>
        <textarea
          value={previewText_}
          onChange={(e) => setPreviewText_(e.target.value)}
          placeholder="Plak content hier…"
          rows={6}
          className="block w-full rounded-md border-gray-300 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => previewText_.trim() && previewMutation.mutate(previewText_)}
            disabled={previewMutation.isPending || !previewText_.trim()}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: '#0d9488' }}
          >
            {previewMutation.isPending ? 'Bezig…' : 'Test'}
          </button>
          {previewResult && (
            <button
              onClick={() => {
                setPreviewResult(null);
                setPreviewText_('');
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600"
            >
              Wissen
            </button>
          )}
        </div>

        {previewResult && (
          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            {previewResult.rulesWithMatches === 0 ? (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Check className="h-4 w-4" />
                <span>Geen regels getriggerd (gecheckt tegen {previewResult.totalRules} actieve rules).</span>
              </div>
            ) : (
              <div>
                <div className="font-medium text-gray-900">
                  {previewResult.rulesWithMatches} van {previewResult.totalRules} regels getriggerd
                  ({previewResult.totalMatches} matches totaal)
                </div>
                <ul className="mt-2 space-y-1.5">
                  {previewResult.results.map((r, i) => (
                    <li key={i} className="text-xs">
                      <code className="font-mono text-gray-700">{r.pattern}</code>
                      <span className="text-gray-500"> — {r.matches.length}× match: </span>
                      <span className="text-gray-600">
                        {r.matches.slice(0, 3).map((m) => `"${m.value}"`).join(', ')}
                        {r.matches.length > 3 ? ` (+${r.matches.length - 3} meer)` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
