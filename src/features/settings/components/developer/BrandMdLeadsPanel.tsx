'use client';

// =============================================================
// brand.md Leads — developer-paneel (task onderdeel 8, naast
// CreditAdminPanel). Funnel-overzicht met conversie-% per stap
// naast de touchpoints-v2-targets ("waar lekt het" in één blik)
// + per-lead-statusladder met filters (stage / e-mail /
// agency-signaal). DB-gedreven via /api/admin/brandmd-leads.
// =============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Mail, RefreshCw } from 'lucide-react';

type LeadStage =
  | 'SCANNED'
  | 'DOWNLOADED'
  | 'REPORT'
  | 'CLAIMED'
  | 'ACTIVATED'
  | 'TRIAL'
  | 'PAID'
  | 'EXPIRED';

interface FunnelStep {
  stage: LeadStage;
  count: number;
  target: number | null;
  pctOfPrev: number | null;
}

interface Lead {
  domain: string;
  brandName: string;
  stage: LeadStage;
  runs: number;
  bestScore: number | null;
  email: string | null;
  lastActivity: string;
  claimedWorkspaceId: string | null;
  planTier: string | null;
  agencySignal: boolean;
}

interface LeadsResponse {
  funnel: FunnelStep[];
  leads: Lead[];
  totals: { runs: number; leads: number; expired: number; agencySignals: number };
}

const STAGE_LABELS: Record<LeadStage, string> = {
  SCANNED: 'Scanned',
  DOWNLOADED: 'Downloaded',
  REPORT: 'Report (e-mail)',
  CLAIMED: 'Claimed',
  ACTIVATED: 'Activated',
  TRIAL: 'Trial',
  PAID: 'Paid',
  EXPIRED: 'Expired',
};

const STAGE_COLORS: Record<LeadStage, string> = {
  SCANNED: 'bg-gray-100 text-gray-700',
  DOWNLOADED: 'bg-blue-50 text-blue-700',
  REPORT: 'bg-indigo-50 text-indigo-700',
  CLAIMED: 'bg-amber-50 text-amber-700',
  ACTIVATED: 'bg-emerald-50 text-emerald-700',
  TRIAL: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-gray-100 text-gray-400',
};

export function BrandMdLeadsPanel() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<LeadStage | 'ALL'>('ALL');
  const [emailOnly, setEmailOnly] = useState(false);
  const [agencyOnly, setAgencyOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/brandmd-leads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as LeadsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.leads.filter(
      (l) =>
        (stageFilter === 'ALL' || l.stage === stageFilter) &&
        (!emailOnly || !!l.email) &&
        (!agencyOnly || l.agencySignal),
    );
  }, [data, stageFilter, emailOnly, agencyOnly]);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading leads…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-sm text-gray-500">
        <p>Failed to load leads: {error}</p>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">brand.md Leads</h2>
          <p className="text-sm text-gray-500">
            {data.totals.runs} runs · {data.totals.leads} leads · {data.totals.agencySignals} agency
            signals · {data.totals.expired} expired
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Funnel-overzicht vs. targets (touchpoints v2) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.funnel.map((step) => {
          const belowTarget =
            step.target !== null && step.pctOfPrev !== null && step.pctOfPrev < step.target;
          return (
            <div key={step.stage} className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {STAGE_LABELS[step.stage]}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{step.count}</p>
              {step.pctOfPrev !== null && (
                <p className={`text-xs ${belowTarget ? 'text-red-600' : 'text-emerald-600'}`}>
                  {step.pctOfPrev}% of prev
                  {step.target !== null && <span className="text-gray-400"> · target ≥{step.target}%</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as LeadStage | 'ALL')}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="ALL">All stages</option>
          {(Object.keys(STAGE_LABELS) as LeadStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} />
          <Mail className="h-3.5 w-3.5" /> has e-mail
        </label>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={agencyOnly} onChange={(e) => setAgencyOnly(e.target.checked)} />
          <Building2 className="h-3.5 w-3.5" /> agency signal
        </label>
        <span className="text-gray-400">{filtered.length} shown</span>
      </div>

      {/* Per-lead-statusladder */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Stage</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Runs</th>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((lead) => (
              <tr key={lead.domain} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-900">{lead.brandName}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    {lead.domain}
                    {lead.agencySignal && <Building2 className="h-3 w-3 text-amber-500" />}
                  </p>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700">{lead.bestScore ?? '—'}</td>
                <td className="px-4 py-2 text-gray-700">{lead.runs}</td>
                <td className="px-4 py-2 text-gray-500">{lead.email ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{lead.planTier ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{lead.lastActivity.slice(0, 10)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No leads match these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
