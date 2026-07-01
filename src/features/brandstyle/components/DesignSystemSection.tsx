"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Code2,
  Copy,
  CheckCircle2,
  Download,
  ChevronDown,
  Palette,
  Type,
  Square,
  Ruler,
  Layers,
  Blocks,
  RefreshCw,
} from "lucide-react";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { Card, Button, Skeleton } from "@/components/shared";
import { useDesignSystemModel } from "../hooks/useDesignSystemModel";
import { useDesignSystemLint } from "../hooks/useDesignSystemLint";
import { EXPORT_FORMATS } from "../utils/export-formats";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import type { LintFinding, LintSeverity } from "@/lib/export/design-system/linter";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface Props {
  styleguide: BrandStyleguide;
}

export function DesignSystemSection({ styleguide }: Props) {
  const { t } = useTranslation("brandstyle");
  const { data: model, isLoading, isError, refetch, isFetching } = useDesignSystemModel();

  return (
    <div className="space-y-6">
      <Header resolvedAt={model?.meta?.resolvedAt} onRefresh={refetch} isRefreshing={isFetching} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !model ? (
        <Card>
          <p className="text-sm text-gray-600">
            {t("designSystem.modelError")}
          </p>
        </Card>
      ) : (
        <>
          <OverviewGrid model={model} />
          <LinterPanel />
          <ExportPanel />
        </>
      )}

      {!isLoading && model && (
        <ResolverInfo styleguide={styleguide} />
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────

function Header({
  resolvedAt,
  onRefresh,
  isRefreshing,
}: {
  resolvedAt?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { t } = useTranslation("brandstyle");
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Code2 className="h-5 w-5 text-teal-600 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t("designSystem.title")}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("designSystem.subtitle")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {resolvedAt && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            Resolved {formatRelative(resolvedAt)}
          </span>
        )}
        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t("actions.refresh")}
        </Button>
      </div>
    </div>
  );
}

// ─── Overview grid ────────────────────────────────────

interface DesignSystemSummary {
  meta: { name: string };
  colors: Record<string, unknown>;
  typography: Record<string, unknown>;
  rounded: Record<string, unknown>;
  spacing: Record<string, unknown>;
  elevation: Record<string, unknown>;
  components: Record<string, unknown>;
}

function OverviewGrid({ model }: { model: DesignSystemSummary }) {
  const { t } = useTranslation("brandstyle");
  const cards = [
    { key: 'colors', icon: Palette, count: Object.keys(model.colors).length, unit: 'roles' },
    { key: 'typography', icon: Type, count: Object.keys(model.typography).length, unit: 'roles' },
    { key: 'rounded', icon: Square, count: Object.keys(model.rounded).length, unit: 'levels' },
    { key: 'spacing', icon: Ruler, count: Object.keys(model.spacing).length, unit: 'levels' },
    { key: 'elevation', icon: Layers, count: Object.keys(model.elevation).length, unit: 'levels' },
    { key: 'components', icon: Blocks, count: Object.keys(model.components).length, unit: 'variants' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.key}>
          <div className="flex items-start gap-2">
            <c.icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t(`designSystem.overview.${c.key}`)}</p>
              <p className="text-2xl font-semibold text-gray-900">{c.count}</p>
              <p className="text-[11px] text-gray-400">{t(`designSystem.overview.${c.unit}`)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Linter panel ─────────────────────────────────────

function LinterPanel() {
  const { t } = useTranslation("brandstyle");
  const { data, isLoading, isError } = useDesignSystemLint();
  const setActiveTab = useBrandstyleStore((s) => s.setActiveTab);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }
  if (isError || !data) return null;

  const { findings, errorCount, warningCount, infoCount, passed } = data;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("designSystem.linter.title")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("designSystem.linter.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SeverityBadge severity="error" count={errorCount} />
          <SeverityBadge severity="warning" count={warningCount} />
          <SeverityBadge severity="info" count={infoCount} />
        </div>
      </div>

      {passed && findings.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded">
          <CheckCircle2 className="w-4 h-4" />
          {t("designSystem.linter.pass")}
        </div>
      ) : (
        <ul className="space-y-2">
          {findings.map((f, i) => (
            <FindingRow
              key={i}
              finding={f}
              onNavigate={(tab) => {
                if (tab === 'design_system') return;
                setActiveTab(tab);
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function SeverityBadge({ severity, count }: { severity: LintSeverity; count: number }) {
  if (count === 0) return null;
  const styles: Record<LintSeverity, string> = {
    error: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${styles[severity]}`}>
      {count} {severity}{count === 1 ? '' : 's'}
    </span>
  );
}

function FindingRow({
  finding,
  onNavigate,
}: {
  finding: LintFinding;
  onNavigate: (tab: LintFinding['source']['tab']) => void;
}) {
  const { t } = useTranslation("brandstyle");
  const Icon = finding.severity === 'error' ? XCircle : finding.severity === 'warning' ? AlertTriangle : Info;
  const color =
    finding.severity === 'error' ? 'text-red-600' : finding.severity === 'warning' ? 'text-amber-600' : 'text-blue-600';

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-gray-900">{finding.message}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <code className="text-[10px] text-gray-400 font-mono">{finding.rule}</code>
          <button
            type="button"
            onClick={() => onNavigate(finding.source.tab)}
            className="text-[11px] text-teal-700 hover:underline"
          >
            {t("designSystem.linter.goToTab", { tab: finding.source.tab.replace('_', ' ') })}
          </button>
        </div>
      </div>
    </li>
  );
}

// ─── Export panel ─────────────────────────────────────

function ExportPanel() {
  const { t } = useTranslation("brandstyle");
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <Download className="h-5 w-5 text-gray-400 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("designSystem.exports.title")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("designSystem.exports.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXPORT_FORMATS.map((f) => (
          <ExportFormatRow key={f.id} format={f} />
        ))}
      </div>
    </Card>
  );
}

function ExportFormatRow({ format }: { format: typeof EXPORT_FORMATS[number] }) {
  const { t } = useTranslation("brandstyle");
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const disabled = format.status === 'soon';

  const handleDownload = () => {
    if (disabled) return;
    // Browser download via direct link
    const a = document.createElement('a');
    a.href = format.endpoint;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    if (disabled) return;
    try {
      const res = await fetch(format.endpoint);
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-3 ${disabled ? 'bg-gray-50 opacity-70' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{format.label}</p>
            {disabled && (
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {t("designSystem.exports.comingSoon")}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{format.description}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {t("designSystem.exports.consumers", { list: format.consumers.join(' · ') })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="secondary" size="sm" onClick={handleDownload} disabled={disabled}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {t("actions.download")}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopy} disabled={disabled}>
          {copyState === 'copied' ? (
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1.5" />
          )}
          {copyState === 'copied' ? t("actions.copied") : copyState === 'error' ? t("actions.failed") : t("actions.copy")}
        </Button>
      </div>
    </div>
  );
}

// ─── Resolver info ────────────────────────────────────

function ResolverInfo({ styleguide }: { styleguide: BrandStyleguide }) {
  const { t } = useTranslation("brandstyle");
  const [open, setOpen] = useState(false);
  const tokens = (styleguide.semanticTokens as { diagnostics?: { wcagWarnings?: unknown[]; unresolvedRoles?: string[] } } | null) ?? null;
  const warnings = (tokens?.diagnostics?.wcagWarnings ?? []) as Array<{ role: string; message: string }>;
  const unresolved = tokens?.diagnostics?.unresolvedRoles ?? [];

  if (warnings.length === 0 && unresolved.length === 0) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{t("designSystem.resolver.title")}</span>
          <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            {t("designSystem.resolver.issueCount", { count: warnings.length + unresolved.length })}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-xs text-gray-700">
          {unresolved.length > 0 && (
            <p>
              <span className="font-semibold text-amber-700">{t("designSystem.resolver.unresolved")}</span>{' '}
              {unresolved.join(', ')}
            </p>
          )}
          {warnings.map((w, i) => (
            <p key={i}>
              <span className="font-semibold text-amber-700">{t("designSystem.resolver.wcag")}</span> <code>{w.role}</code> — {w.message}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
