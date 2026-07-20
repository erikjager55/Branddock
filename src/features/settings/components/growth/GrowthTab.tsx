'use client';

// Fase 0 van het €100k-plan: het maandag-dashboard. Developer-only tab die
// /api/admin/growth-metrics rendert — funnel per week, activatie-%, noordster
// (netto nieuwe MRR/dag uit Stripe) en de Gate-1-stand. Metadata-only.

import { useQuery } from '@tanstack/react-query';
import { Loader2, Target, TrendingUp } from 'lucide-react';

interface WeekRow {
  weekStart: string;
  signups: number;
  workspacesCreated: number;
  activations: number;
  newPaid: number;
}

interface GrowthMetrics {
  generatedAt: string;
  definitions: Record<string, string>;
  weeks: WeekRow[];
  totals: {
    paidCustomers: number;
    paidAgencies: number;
    activatedWorkspaces: number;
    activationPctLast8w: number | null;
    mrrEur: number | null;
  };
  northStar: { netNewPerDay: { date: string; deltaEur: number }[] | null };
  gate: {
    label: string;
    mrrEur: number;
    customers: number;
    agencies: number;
    activationPct: number;
    current: {
      mrrEur: number | null;
      customers: number;
      agencies: number;
      activationPct: number | null;
    };
  };
}

async function fetchMetrics(): Promise<GrowthMetrics> {
  const res = await fetch('/api/admin/growth-metrics', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load growth metrics (${res.status})`);
  return (await res.json()) as GrowthMetrics;
}

function GateRow({ label, target, current }: { label: string; target: string; current: string; }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm tabular-nums">
        <b className="text-gray-900">{current}</b>
        <span className="text-gray-400"> / {target}</span>
      </span>
    </div>
  );
}

export function GrowthTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'growth-metrics'],
    queryFn: fetchMetrics,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          Could not load growth metrics.
        </div>
      </div>
    );
  }

  const { totals, weeks, gate, northStar } = data;
  const recentDelta = northStar.netNewPerDay?.slice(-7).reduce((s, d) => s + d.deltaEur, 0) ?? null;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Growth (KPIs)</h2>
        <p className="text-sm text-gray-500 mt-1">
          Weekly funnel, activation and the north-star metric — the Monday view for the €100k plan
          gates. Numbers only; no content is tracked.
        </p>
      </div>

      {/* Noordster + kern-totalen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> MRR (Stripe)
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {totals.mrrEur === null ? '—' : `€${totals.mrrEur}`}
          </div>
          {recentDelta !== null && (
            <div className="text-xs text-gray-500 mt-1 tabular-nums">
              {recentDelta >= 0 ? '+' : ''}€{Math.round(recentDelta)} last 7d
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Paying customers</div>
          <div className="text-2xl font-bold tabular-nums">{totals.paidCustomers}</div>
          <div className="text-xs text-gray-500 mt-1">{totals.paidAgencies} agencies</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Activation (8w cohort)</div>
          <div className="text-2xl font-bold tabular-nums">
            {totals.activationPctLast8w === null ? '—' : `${totals.activationPctLast8w}%`}
          </div>
          <div className="text-xs text-gray-500 mt-1">target ≥40%</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Activated workspaces</div>
          <div className="text-2xl font-bold tabular-nums">{totals.activatedWorkspaces}</div>
          <div className="text-xs text-gray-500 mt-1">all-time</div>
        </div>
      </div>

      {/* Gate-kaart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{gate.label}</h3>
        </div>
        <GateRow label="MRR" target={`€${gate.mrrEur}`} current={gate.current.mrrEur === null ? '—' : `€${gate.current.mrrEur}`} />
        <GateRow label="Paying customers" target={String(gate.customers)} current={String(gate.current.customers)} />
        <GateRow label="of which agencies" target={String(gate.agencies)} current={String(gate.current.agencies)} />
        <GateRow label="Activation" target={`${gate.activationPct}%`} current={gate.current.activationPct === null ? '—' : `${gate.current.activationPct}%`} />
      </div>

      {/* Funnel per week */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">Weekly funnel (oldest first)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="py-1.5 pr-4">Week</th>
              <th className="py-1.5 pr-4">Signups</th>
              <th className="py-1.5 pr-4">Workspaces</th>
              <th className="py-1.5 pr-4">Activations</th>
              <th className="py-1.5">New paid</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekStart} className="border-t border-gray-100 tabular-nums">
                <td className="py-1.5 pr-4 text-gray-500">{w.weekStart}</td>
                <td className="py-1.5 pr-4">{w.signups}</td>
                <td className="py-1.5 pr-4">{w.workspacesCreated}</td>
                <td className="py-1.5 pr-4">{w.activations}</td>
                <td className="py-1.5">{w.newPaid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Activation = ≥3 fully completed brand assets + first approved output (accept or publish).
        MRR and daily net-new come straight from Stripe; without a configured key those show “—”.
      </p>
    </div>
  );
}
