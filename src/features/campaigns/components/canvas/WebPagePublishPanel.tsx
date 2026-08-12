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

export const webPublishKeys = {
  publishes: (deliverableId: string) => ['web-page-publishes', deliverableId] as const,
};

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

  const data = publishesQuery.data;
  const primaryPage = data?.pages[0] ?? null;
  const defaultSlug = primaryPage?.slug ?? slugifyTitle(data?.deliverableTitle ?? '');
  const slug = slugInput ?? defaultSlug;
  const slugIsValid = isValidSlug(slug);

  const publishMutation = useMutation({
    mutationFn: async (publishSlug: string) => {
      const res = await fetch('/api/landing-pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId, slug: publishSlug }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) throw new Error(body.error ?? t('webPublish.publishError'));
      return body;
    },
    onSuccess: () => {
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

  const busy = publishMutation.isPending || rollbackMutation.isPending;

  const handlePublish = () => {
    if (!slugIsValid || busy) return;
    publishMutation.mutate(slug);
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
                onClick={handlePublish}
                disabled={!slugIsValid || busy}
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {publishMutation.isPending ? t('webPublish.publishing') : t('webPublish.publish')}
              </button>
            </div>
            {!slugIsValid && slug.length > 0 && (
              <p className="text-xs text-red-600">{t('webPublish.slugInvalid')}</p>
            )}
          </div>

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
