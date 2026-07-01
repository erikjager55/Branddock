"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge, Button, Skeleton } from "@/components/shared";
import {
  useCompetitorActivities,
  useAcknowledgeActivities,
} from "../../hooks/use-competitor-activities";
import {
  ACTIVITY_TYPE_LABEL,
  type ActivityFilters,
  type ActivityListItem,
  type ActivitySeverity,
} from "../../types/activity";
import type { BadgeVariant } from "@/components/shared/Badge";

interface ActivityTimelineSectionProps {
  competitorId: string;
}

type DetectionMethodFilter = "ai-classified" | "hash-diff" | "manual" | undefined;

const SEVERITY_VARIANT: Record<ActivitySeverity, BadgeVariant> = {
  MAJOR: "danger",
  NOTABLE: "warning",
  INFO: "info",
};

const METHOD_LABEL: Record<string, string> = {
  "ai-classified": "AI",
  "hash-diff": "Auto",
  "manual": "Manual",
  "rss-feed": "RSS",
};

const INITIAL_LIMIT = 20;

/** Activity timeline section for the competitor detail page. Shows
 *  detected events with filter chips, snapshot-grouping, mark-as-read
 *  flow, and per-type diff-payload visualisation. Read-only — does not
 *  participate in the page edit-mode. */
export function ActivityTimelineSection({ competitorId }: ActivityTimelineSectionProps) {
  const { t } = useTranslation("competitors");
  const [severityFilter, setSeverityFilter] = useState<ActivitySeverity | undefined>(undefined);
  const [methodFilter, setMethodFilter] = useState<DetectionMethodFilter>(undefined);
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const filters: ActivityFilters = useMemo(
    () => ({
      severity: severityFilter,
      detectionMethod: methodFilter,
      limit,
      offset: 0,
    }),
    [severityFilter, methodFilter, limit],
  );

  const { data, isLoading, isError, refetch } = useCompetitorActivities(competitorId, filters);
  const acknowledge = useAcknowledgeActivities(competitorId);

  const groups = useMemo(() => buildSnapshotGroups(data?.items ?? []), [data?.items]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-5">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">{t("activity.loadError")}</span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          {t("activity.tryAgain")}
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  // "Mark all as read" acknowledges every unread activity regardless of the active
  // filter, so badge + enable-gate use the unfiltered totalUnread — not the
  // filter-scoped unreadCount — to keep the label, action and display in sync.
  const totalUnread = data?.totalUnread ?? 0;
  const canLoadMore = items.length < total;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-500" />
          {t("activity.title")}
          {totalUnread > 0 && (
            <Badge variant="danger" className="ml-1">
              {totalUnread}
            </Badge>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => acknowledge.mutate({ all: true })}
          disabled={!totalUnread || acknowledge.isPending}
          isLoading={acknowledge.isPending}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {t("activity.markAllRead")}
        </Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <FilterChip active={severityFilter === undefined} onClick={() => setSeverityFilter(undefined)}>
          {t("activity.filterAll")}
        </FilterChip>
        <FilterChip active={severityFilter === "MAJOR"} onClick={() => setSeverityFilter("MAJOR")}>
          {t("activity.severityMajor")}
        </FilterChip>
        <FilterChip active={severityFilter === "NOTABLE"} onClick={() => setSeverityFilter("NOTABLE")}>
          {t("activity.severityNotable")}
        </FilterChip>
        <FilterChip active={severityFilter === "INFO"} onClick={() => setSeverityFilter("INFO")}>
          {t("activity.severityInfo")}
        </FilterChip>
        <span className="border-l border-gray-200 mx-1" />
        <FilterChip active={methodFilter === undefined} onClick={() => setMethodFilter(undefined)}>
          {t("activity.allSources")}
        </FilterChip>
        <FilterChip
          active={methodFilter === "ai-classified"}
          onClick={() => setMethodFilter("ai-classified")}
        >
          {t("activity.methodAi")}
        </FilterChip>
        <FilterChip active={methodFilter === "hash-diff"} onClick={() => setMethodFilter("hash-diff")}>
          {t("activity.methodAuto")}
        </FilterChip>
        <FilterChip active={methodFilter === "manual"} onClick={() => setMethodFilter("manual")}>
          {t("activity.methodManual")}
        </FilterChip>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          {t("activity.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {groups.map((group, gIdx) => (
            <SnapshotGroup
              key={`${group.snapshotId ?? "single"}-${gIdx}`}
              group={group}
              onAcknowledge={(id) => acknowledge.mutate({ activityIds: [id] })}
              ackPending={acknowledge.isPending}
            />
          ))}
        </ul>
      )}

      {canLoadMore && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + INITIAL_LIMIT)}>
            {t("activity.loadMore", { count: total - items.length })}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "px-2.5 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent"
      }
    >
      {children}
    </button>
  );
}

// ─── Snapshot grouping ────────────────────────────────────────

interface ActivityGroup {
  snapshotId: string | null;
  detectedAt: string;
  items: ActivityListItem[];
}

function buildSnapshotGroups(items: ActivityListItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.snapshotId && last.snapshotId === item.snapshotId) {
      last.items.push(item);
    } else {
      groups.push({
        snapshotId: item.snapshotId,
        detectedAt: item.detectedAt,
        items: [item],
      });
    }
  }
  return groups;
}

interface SnapshotGroupProps {
  group: ActivityGroup;
  onAcknowledge: (id: string) => void;
  ackPending: boolean;
}

function SnapshotGroup({ group, onAcknowledge, ackPending }: SnapshotGroupProps) {
  const { t } = useTranslation("competitors");
  const showHeader = group.snapshotId !== null && group.items.length > 1;
  const [collapsed, setCollapsed] = useState(false);
  const items = !showHeader || !collapsed ? group.items : [];

  return (
    <>
      {showHeader && (
        <li className="py-2 list-none">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 hover:text-gray-700"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>
              {t("activity.snapshot")} · {safeRelativeTime(group.detectedAt)} · {t("activity.eventCount", { count: group.items.length })}
            </span>
          </button>
        </li>
      )}
      {items.map((item) => (
        <ActivityRow
          key={item.id}
          item={item}
          onAcknowledge={onAcknowledge}
          ackPending={ackPending}
        />
      ))}
    </>
  );
}

// ─── Activity row ─────────────────────────────────────────────

interface ActivityRowProps {
  item: ActivityListItem;
  onAcknowledge: (id: string) => void;
  ackPending: boolean;
}

function ActivityRow({ item, onAcknowledge, ackPending }: ActivityRowProps) {
  const { t } = useTranslation("competitors");
  const [expanded, setExpanded] = useState(false);
  const isAcked = item.acknowledgedAt !== null;

  return (
    <li className="py-3 list-none">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {ACTIVITY_TYPE_LABEL[item.type] ?? item.type}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">
              {METHOD_LABEL[item.detectionMethod] ?? item.detectionMethod}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{safeRelativeTime(item.detectedAt)}</span>
          </div>
          <p className="text-sm text-gray-700">{item.summary}</p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1.5 text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? t("activity.hideDetails") : t("activity.showDetails")}
          </button>
          {expanded && (
            <div className="mt-2">
              <DiffPayloadRender payload={item.diffPayload} />
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {isAcked ? (
            <span
              title={
                item.acknowledgedBy?.name
                  ? t("activity.ackdBy", { name: item.acknowledgedBy.name })
                  : t("activity.ackd")
              }
              className="inline-flex items-center text-gray-400"
            >
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              disabled={ackPending}
              onClick={() => onAcknowledge(item.id)}
              className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50"
            >
              {t("activity.markRead")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Diff-payload visualisation ───────────────────────────────

interface DiffPayloadRenderProps {
  payload: unknown;
}

function DiffPayloadRender({ payload }: DiffPayloadRenderProps) {
  const { t } = useTranslation("competitors");
  if (!payload || typeof payload !== "object") {
    return <FallbackJson value={payload} />;
  }
  const obj = payload as Record<string, unknown>;
  const kind = typeof obj.kind === "string" ? obj.kind : null;

  if (kind === "field-change") {
    return (
      <BeforeAfterGrid
        label={typeof obj.field === "string" ? obj.field : t("activity.diff.field")}
        before={asString(obj.before)}
        after={asString(obj.after)}
      />
    );
  }

  if (kind === "pricing-change") {
    return (
      <div className="space-y-2">
        <BeforeAfterGrid
          label={t("activity.diff.pricingModel")}
          before={asString(obj.modelBefore)}
          after={asString(obj.modelAfter)}
        />
        {(asString(obj.detailsBefore) || asString(obj.detailsAfter)) && (
          <BeforeAfterGrid
            label={t("activity.diff.pricingDetails")}
            before={asString(obj.detailsBefore)}
            after={asString(obj.detailsAfter)}
          />
        )}
      </div>
    );
  }

  if (kind === "list-change") {
    const added = Array.isArray(obj.added) ? (obj.added as unknown[]).filter(isString) : [];
    const removed = Array.isArray(obj.removed) ? (obj.removed as unknown[]).filter(isString) : [];
    return (
      <div className="space-y-2 text-xs">
        {added.length > 0 && (
          <div>
            <div className="text-gray-500 mb-1">{t("activity.diff.added")}</div>
            <div className="flex flex-wrap gap-1">
              {added.map((v) => (
                <span
                  key={`add-${v}`}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
        {removed.length > 0 && (
          <div>
            <div className="text-gray-500 mb-1">{t("activity.diff.removed")}</div>
            <div className="flex flex-wrap gap-1">
              {removed.map((v) => (
                <span
                  key={`rem-${v}`}
                  className="px-2 py-0.5 rounded bg-red-50 text-red-700 line-through"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (kind === "workflow-change") {
    return (
      <BeforeAfterGrid
        label={typeof obj.field === "string" ? obj.field : t("activity.diff.workflow")}
        before={asString(obj.before)}
        after={asString(obj.after)}
      />
    );
  }

  if (kind === "pattern-change") {
    const fields = Array.isArray(obj.fields) ? (obj.fields as unknown[]).filter(isString) : [];
    return (
      <div className="space-y-2 text-xs">
        {typeof obj.rationale === "string" && (
          <p className="text-gray-700">
            <strong>{t("activity.diff.rationale")}</strong> {obj.rationale}
          </p>
        )}
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fields.map((f) => (
              <span key={f} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === "content-event") {
    const title = asString(obj.title);
    const url = asString(obj.url);
    const publishedAt = asString(obj.publishedAt);
    return (
      <div className="text-xs text-gray-700 space-y-1">
        {title && <div className="font-medium">{title}</div>}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-emerald-700 hover:underline break-all"
          >
            {url}
          </a>
        )}
        {publishedAt && (
          <div className="text-gray-500">{t("activity.diff.published", { date: publishedAt })}</div>
        )}
      </div>
    );
  }

  return <FallbackJson value={payload} />;
}

interface BeforeAfterGridProps {
  label: string;
  before: string | null;
  after: string | null;
}

function BeforeAfterGrid({ label, before, after }: BeforeAfterGridProps) {
  const { t } = useTranslation("competitors");
  return (
    <div className="text-xs">
      <div className="text-gray-500 mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-red-50 p-2 text-red-800">
          <div className="text-[10px] uppercase tracking-wide text-red-500 mb-1">{t("activity.diff.before")}</div>
          <div className="line-through whitespace-pre-wrap break-words">{before ?? t("activity.diff.empty")}</div>
        </div>
        <div className="rounded bg-emerald-50 p-2 text-emerald-800">
          <div className="text-[10px] uppercase tracking-wide text-emerald-600 mb-1">{t("activity.diff.after")}</div>
          <div className="whitespace-pre-wrap break-words">{after ?? t("activity.diff.empty")}</div>
        </div>
      </div>
    </div>
  );
}

function FallbackJson({ value }: { value: unknown }) {
  return (
    <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto text-gray-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return String(v);
}

function safeRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}
