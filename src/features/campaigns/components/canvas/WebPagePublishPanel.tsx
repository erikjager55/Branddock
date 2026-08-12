'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  ExternalLink,
  Loader2,
  AlertCircle,
  History,
  RotateCcw,
  Eye,
  CheckCircle2,
  Send,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { Modal } from '@/components/shared';
import { isValidSlug } from '@/lib/landing-pages/publish-page';
import { useFormat } from '@/lib/ui-i18n/format';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { campaignKeys, contentLibraryKeys } from '../../hooks';

// ─── API-shapes (GET /api/landing-pages/[deliverableId]/publishes) ────────

interface PublishVersionDto {
  id: string;
  version: number;
  createdAt: string;
  publishedById: string | null;
  isLive: boolean;
}

interface PublishPageDto {
  landingPageId: string;
  slug: string;
  locale: string;
  status: string;
  publishedAt: string | null;
  liveVersion: number | null;
  publicUrl: string;
  versions: PublishVersionDto[];
}

interface PublishesResponse {
  deliverableId: string;
  deliverableTitle: string;
  workspaceSlug: string | null;
  pages: PublishPageDto[];
}

interface PreviewState {
  publishId: string;
  version: number;
  createdAt: string;
  sectionTypes: string[];
}

// P6 publish-gate — shape van `gate` in de publish-route-responses.
interface GateFindingDto {
  severity: 'blocker' | 'warning';
  code: string;
  message: string;
}

interface GateDto {
  ok: boolean;
  findings: GateFindingDto[];
  blockers: number;
  warnings: number;
}

// P4 lp-page-analytics — shape van GET /api/landing-pages/[deliverableId]/stats.
interface PageStatsDto {
  landingPageId: string;
  slug: string;
  views7: number;
  leads7: number;
  views30: number;
  leads30: number;
}

interface StatsResponse {
  pages: PageStatsDto[];
}

// P3 lp-forms-leads — shape van GET /api/landing-pages/[deliverableId]/submissions.
interface SubmissionDto {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  sourceUrl: string | null;
  createdAt: string;
}

interface SubmissionsResponse {
  total: number;
  recent: SubmissionDto[];
}

export const webPublishKeys = {
  publishes: (deliverableId: string) => ['web-page-publishes', deliverableId] as const,
  stats: (deliverableId: string) => ['web-page-stats', deliverableId] as const,
  submissions: (deliverableId: string) => ['web-page-submissions', deliverableId] as const,
};

/**
 * Compacte lead-preview: de eerste e-mail-achtige waarde uit de submission,
 * anders de eerste niet-lege stringwaarde. Fail-soft op onverwachte shapes.
 */
function submissionPreview(data: Record<string, unknown>): string {
  const values = Object.values(data).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  const email = values.find((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()));
  return (email ?? values[0] ?? '—').slice(0, 80);
}

/** Conversie-label: leads/views als percentage; zonder views geen ratio. */
function conversionLabel(views: number, leads: number): string {
  if (views <= 0) return '—';
  return `${((leads / views) * 100).toFixed(1)}%`;
}

/**
 * Slugify a deliverable title into a publish-slug default that passes
 * `isValidSlug`: lowercase a-z/0-9 with single hyphens, no leading/trailing
 * hyphen, max 80 chars. Diacritics are stripped (é → e) before filtering.
 */
function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Sectie-type-lijst uit een puckData-snapshot (`content[].type`), fail-soft. */
function sectionTypesFromPuckData(puckData: unknown): string[] {
  const content = (puckData as { content?: Array<{ type?: unknown }> } | null)?.content;
  if (!Array.isArray(content)) return [];
  return content
    .map((c) => (typeof c?.type === 'string' ? c.type : null))
    .filter((t): t is string => t !== null);
}

interface WebPagePublishPanelProps {
  deliverableId: string;
}

/**
 * P1 versioned publishes — publish-UI voor Puck-renderbare content-types in
 * Step 4: slug-invoer + "Publiceer" (POST /api/landing-pages/publish), live
 * URL, en de append-only versielijst met per versie "Herstel deze versie"
 * (rollback = pointer-swap) en "Bekijk" (lichtgewicht snapshot-samenvatting).
 * Model: Framer/Netlify — immutable versies, live = pointer.
 */
export function WebPagePublishPanel({ deliverableId }: WebPagePublishPanelProps) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  const { formatDate } = useFormat();
  const queryClient = useQueryClient();
  const setApprovalState = useCanvasStore((s) => s.setApprovalState);

  // Slug is user-overridable; null = nog niet aangeraakt → afgeleide default
  // (bestaande pagina-slug, anders geslugificeerde deliverable-titel).
  const [slugInput, setSlugInput] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const publishesQuery = useQuery({
    queryKey: webPublishKeys.publishes(deliverableId),
    queryFn: async (): Promise<PublishesResponse> => {
      const res = await fetch(`/api/landing-pages/${deliverableId}/publishes`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? t('webPublish.loadError'));
      }
      return (await res.json()) as PublishesResponse;
    },
    enabled: Boolean(deliverableId),
  });

  // P4 — views/leads/conversie per pagina (first-party, cookieloos).
  const statsQuery = useQuery({
    queryKey: webPublishKeys.stats(deliverableId),
    queryFn: async (): Promise<StatsResponse> => {
      const res = await fetch(`/api/landing-pages/${deliverableId}/stats`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? t('webPublish.stats.loadError'));
      }
      return (await res.json()) as StatsResponse;
    },
    enabled: Boolean(deliverableId),
  });

  // P3 — leads (form-submissions): totaal + laatste 5.
  const submissionsQuery = useQuery({
    queryKey: webPublishKeys.submissions(deliverableId),
    queryFn: async (): Promise<SubmissionsResponse> => {
      const res = await fetch(`/api/landing-pages/${deliverableId}/submissions`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? t('webPublish.leads.loadError'));
      }
      return (await res.json()) as SubmissionsResponse;
    },
    enabled: Boolean(deliverableId),
  });

  const data = publishesQuery.data;
  const primaryPage = data?.pages[0] ?? null;
  const defaultSlug = primaryPage?.slug ?? slugifyTitle(data?.deliverableTitle ?? '');
  const slug = slugInput ?? defaultSlug;
  const slugIsValid = isValidSlug(slug);

  // P6 — publish-gate-bevindingen uit de dry-run (of een geweigerde publish).
  const [gate, setGate] = useState<GateDto | null>(null);
  const [gateChecking, setGateChecking] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: async (input: { publishSlug: string; acknowledgeWarnings: boolean }) => {
      const res = await fetch('/api/landing-pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId,
          slug: input.publishSlug,
          acknowledgeWarnings: input.acknowledgeWarnings,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string; gate?: GateDto };
      if (!res.ok) {
        // Server hercheckt de gate altijd — toon verse bevindingen bij weigering.
        if (body.gate) setGate(body.gate);
        throw new Error(body.error ?? t('webPublish.publishError'));
      }
      return body;
    },
    onSuccess: () => {
      setGate(null);
      // Route zet de deliverable op PUBLISHED — canvas-store + lijst-caches
      // mee-syncen zodat statusbanner en Content Library niet stale zijn.
      setApprovalState({
        approvalStatus: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        publishedVia: 'webpage',
      });
      queryClient.invalidateQueries({ queryKey: webPublishKeys.publishes(deliverableId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: contentLibraryKeys.all });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (publishId: string) => {
      const res = await fetch(`/api/landing-pages/${deliverableId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; liveVersion?: number };
      if (!res.ok) throw new Error(body.error ?? t('webPublish.rollbackError'));
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webPublishKeys.publishes(deliverableId) });
    },
  });

  const busy = publishMutation.isPending || rollbackMutation.isPending || gateChecking;

  /**
   * P6 twee-fasen-publish: (1) dry-run gate → blockers stoppen hard,
   * warnings vragen expliciete bevestiging; (2) schone gate of bevestigde
   * warnings → echte publish (server hercheckt altijd).
   */
  const handlePublish = async (acknowledgeWarnings = false) => {
    if (!slugIsValid || busy) return;
    if (!acknowledgeWarnings) {
      setGate(null);
      setGateError(null);
      setGateChecking(true);
      try {
        const res = await fetch('/api/landing-pages/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliverableId, slug, dryRun: true }),
        });
        const body = (await res.json().catch(() => ({}))) as { gate?: GateDto; error?: string };
        if (!res.ok || !body.gate) {
          throw new Error(body.error ?? t('webPublish.gate.checkFailed'));
        }
        if (body.gate.findings.length > 0) {
          setGate(body.gate);
          return; // blockers: hard stop; warnings: user bevestigt via de banner
        }
      } catch (err) {
        setGate(null);
        setGateError(err instanceof Error ? err.message : t('webPublish.gate.checkFailed'));
        return;
      } finally {
        setGateChecking(false);
      }
    }
    publishMutation.mutate({ publishSlug: slug, acknowledgeWarnings });
  };

  const handleRollback = (version: PublishVersionDto) => {
    if (busy || version.isLive) return;
    if (!window.confirm(t('webPublish.restoreConfirm', { version: version.version }))) return;
    rollbackMutation.mutate(version.id);
  };

  const handlePreview = async (version: PublishVersionDto) => {
    setPreviewError(null);
    setPreviewLoading(true);
    setPreview({
      publishId: version.id,
      version: version.version,
      createdAt: version.createdAt,
      sectionTypes: [],
    });
    try {
      const res = await fetch(
        `/api/landing-pages/${deliverableId}/publish-preview?publishId=${encodeURIComponent(version.id)}`,
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        puckData?: unknown;
        version?: number;
        createdAt?: string;
      };
      if (!res.ok) throw new Error(body.error ?? t('webPublish.previewError'));
      setPreview({
        publishId: version.id,
        version: body.version ?? version.version,
        createdAt: body.createdAt ?? version.createdAt,
        sectionTypes: sectionTypesFromPuckData(body.puckData),
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : t('webPublish.previewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const mutationError = publishMutation.error ?? rollbackMutation.error;
  const versionDate = (iso: string) =>
    formatDate(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">{t('webPublish.title')}</h3>
        {primaryPage?.liveVersion != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {t('webPublish.liveBadge', { version: primaryPage.liveVersion })}
          </span>
        )}
      </div>

      {/* Loading state (verplicht) */}
      {publishesQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('webPublish.loading')}
        </div>
      )}

      {/* Error state (verplicht) */}
      {publishesQuery.isError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">
            {publishesQuery.error instanceof Error
              ? publishesQuery.error.message
              : t('webPublish.loadError')}
          </span>
          <button
            type="button"
            onClick={() => publishesQuery.refetch()}
            className="text-xs font-medium underline underline-offset-2 hover:text-red-900"
          >
            {t('webPublish.retry')}
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Slug + publish action */}
          <div className="space-y-1.5">
            <label htmlFor="web-publish-slug" className="text-xs font-medium text-gray-600">
              {t('webPublish.slugLabel')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
                <span className="truncate text-gray-400">
                  {data.workspaceSlug ? `${data.workspaceSlug}.branddock.app/` : '/'}
                </span>
                <input
                  id="web-publish-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder={t('webPublish.slugPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={!slugIsValid || busy}
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishMutation.isPending || gateChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {gateChecking
                  ? t('webPublish.gate.checking')
                  : publishMutation.isPending
                    ? t('webPublish.publishing')
                    : t('webPublish.publish')}
              </button>
            </div>
            {!slugIsValid && slug.length > 0 && (
              <p className="text-xs text-red-600">{t('webPublish.slugInvalid')}</p>
            )}
          </div>

          {/* P6 — publish-gate-bevindingen: blockers stoppen hard (rood),
              warnings tonen een expliciete "Toch publiceren"-bevestiging. */}
          {gateError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {gateError}
            </div>
          )}
          {gate && gate.findings.length > 0 && (
            <div
              className={`space-y-2 rounded-md border p-3 text-sm ${
                gate.blockers > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
              }`}
              role="alert"
            >
              <p className={`font-medium ${gate.blockers > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                {gate.blockers > 0 ? t('webPublish.gate.blockedTitle') : t('webPublish.gate.warningTitle')}
              </p>
              <ul className="space-y-1">
                {gate.findings.map((finding, i) => (
                  <li key={`${finding.code}-${i}`} className="flex items-start gap-2">
                    {finding.severity === 'blocker' ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                    )}
                    <span className={finding.severity === 'blocker' ? 'text-red-700' : 'text-amber-700'}>
                      {t(`webPublish.gate.codes.${finding.code}`, { defaultValue: finding.message })}
                      <span className="block text-xs opacity-70">{finding.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {gate.blockers === 0 && (
                <button
                  type="button"
                  onClick={() => void handlePublish(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {t('webPublish.gate.publishAnyway')}
                </button>
              )}
            </div>
          )}

          {/* Mutation errors (verplicht) */}
          {mutationError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {mutationError instanceof Error ? mutationError.message : t('webPublish.publishError')}
            </div>
          )}

          {/* Live URL per page (doorgaans één; één per locale mogelijk) */}
          {data.pages
            .filter((page) => page.status === 'PUBLISHED')
            .map((page) => (
              <a
                key={page.landingPageId}
                href={page.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{page.publicUrl}</span>
              </a>
            ))}

          {/* Versielijst */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <History className="h-3.5 w-3.5" />
              {t('webPublish.versionsTitle')}
            </div>
            {data.pages.every((page) => page.versions.length === 0) ? (
              <p className="text-sm text-gray-500">{t('webPublish.noVersions')}</p>
            ) : (
              data.pages
                .filter((page) => page.versions.length > 0)
                .map((page) => (
                  <ul key={page.landingPageId} className="divide-y divide-gray-100 rounded-md border border-gray-100">
                    {page.versions.map((version) => (
                      <li key={version.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <span className="text-sm font-medium tabular-nums text-gray-900">
                          {t('webPublish.versionLabel', { version: version.version })}
                        </span>
                        <span className="text-xs text-gray-500">{versionDate(version.createdAt)}</span>
                        {version.isLive && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {t('webPublish.live')}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => handlePreview(version)}
                          disabled={previewLoading}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('webPublish.view')}
                        </button>
                        {!version.isLive && (
                          <button
                            type="button"
                            onClick={() => handleRollback(version)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {rollbackMutation.isPending && rollbackMutation.variables === version.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            {t('webPublish.restore')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ))
            )}
          </div>

          {/* P4 — first-party meting: views / leads / conversie per pagina. */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('webPublish.stats.title')}
            </div>
            {statsQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('webPublish.stats.loading')}
              </div>
            )}
            {statsQuery.isError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {statsQuery.error instanceof Error ? statsQuery.error.message : t('webPublish.stats.loadError')}
              </div>
            )}
            {statsQuery.data && (
              statsQuery.data.pages.length === 0 ? (
                <p className="text-sm text-gray-500">{t('webPublish.stats.empty')}</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
                  {statsQuery.data.pages.map((page) => (
                    <li key={page.landingPageId} className="space-y-1 px-3 py-2">
                      <p className="truncate text-xs font-medium text-gray-500">/{page.slug}</p>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span className="text-gray-900">
                          <span className="font-semibold tabular-nums">{page.views30}</span>{' '}
                          <span className="text-xs text-gray-500">{t('webPublish.stats.views')}</span>
                        </span>
                        <span className="text-gray-900">
                          <span className="font-semibold tabular-nums">{page.leads30}</span>{' '}
                          <span className="text-xs text-gray-500">{t('webPublish.stats.leads')}</span>
                        </span>
                        <span className="text-gray-900">
                          <span className="font-semibold tabular-nums">{conversionLabel(page.views30, page.leads30)}</span>{' '}
                          <span className="text-xs text-gray-500">{t('webPublish.stats.conversion')}</span>
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {t('webPublish.stats.last7Summary', { views: page.views7, leads: page.leads7 })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>

          {/* P3 — leads: totaal + de laatste 5 submissions. */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Inbox className="h-3.5 w-3.5" />
              {t('webPublish.leads.title', { count: submissionsQuery.data?.total ?? 0 })}
            </div>
            {submissionsQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('webPublish.leads.loading')}
              </div>
            )}
            {submissionsQuery.isError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {submissionsQuery.error instanceof Error ? submissionsQuery.error.message : t('webPublish.leads.loadError')}
              </div>
            )}
            {submissionsQuery.data && (
              submissionsQuery.data.recent.length === 0 ? (
                <p className="text-sm text-gray-500">{t('webPublish.leads.empty')}</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
                  {submissionsQuery.data.recent.map((submission) => (
                    <li key={submission.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                        {submissionPreview(submission.data)}
                      </span>
                      <span className="text-xs tabular-nums text-gray-500">
                        {versionDate(submission.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </>
      )}

      {/* Versie-preview: lichtgewicht snapshot-samenvatting (versie, datum,
          sectie-types). Geen Puck-<Render> hier.
          TODO(E1): visuele preview via PageRender zodra de eigen render-kern
          (page-render-own-loop) er is. */}
      <Modal
        isOpen={preview !== null}
        onClose={() => {
          setPreview(null);
          setPreviewError(null);
        }}
        title={preview ? t('webPublish.previewTitle', { version: preview.version }) : ''}
        subtitle={preview ? t('webPublish.previewPublishedAt', { date: versionDate(preview.createdAt) }) : undefined}
        size="md"
      >
        {previewLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('webPublish.previewLoading')}
          </div>
        )}
        {previewError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {previewError}
          </div>
        )}
        {!previewLoading && !previewError && preview && (
          <div className="space-y-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('webPublish.previewSections', { count: preview.sectionTypes.length })}
            </p>
            {preview.sectionTypes.length === 0 ? (
              <p className="text-sm text-gray-500">{t('webPublish.previewEmpty')}</p>
            ) : (
              <ol className="space-y-1">
                {preview.sectionTypes.map((type, index) => (
                  <li
                    key={`${type}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                  >
                    <span className="w-5 text-right text-xs tabular-nums text-gray-400">{index + 1}</span>
                    {type}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
