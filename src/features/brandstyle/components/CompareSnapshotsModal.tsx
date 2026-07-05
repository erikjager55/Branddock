"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";
import { Modal, Skeleton } from "@/components/shared";
import { useSnapshotDiff } from "../hooks/useSnapshots";
import { SnapshotDiffPanel } from "./SnapshotDiffPanel";
import type { SnapshotSummary } from "@/lib/brandstyle/snapshots/types";

interface Props {
  snapshots: SnapshotSummary[];
  onClose: () => void;
}

export function CompareSnapshotsModal({ snapshots, onClose }: Props) {
  const { t } = useTranslation("brandstyle");
  // Default: latest vs second-latest
  const [fromId, setFromId] = useState<string>(snapshots[1]?.id ?? '');
  const [toId, setToId] = useState<string>(snapshots[0]?.id ?? '');

  const diff = useSnapshotDiff(fromId, toId);

  return (
    <Modal isOpen={true} onClose={onClose} title={t("history.compareTitle")} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <SnapshotPicker
            label={t("history.from")}
            value={fromId}
            onChange={setFromId}
            snapshots={snapshots}
          />
          <SnapshotPicker
            label={t("history.to")}
            value={toId}
            onChange={setToId}
            snapshots={snapshots}
          />
        </div>

        {fromId === toId ? (
          <p className="text-sm text-gray-500">{t("history.pickTwo")}</p>
        ) : diff.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : diff.data ? (
          <SnapshotDiffPanel diff={diff.data.diff} summary={diff.data.summary} />
        ) : (
          <p className="text-sm text-gray-600">{t("history.diffError")}</p>
        )}
      </div>
    </Modal>
  );
}

function SnapshotPicker({
  label,
  value,
  onChange,
  snapshots,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  snapshots: SnapshotSummary[];
}) {
  const { formatDate } = useFormat();
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {snapshots.map((s) => {
          const date = formatDate(new Date(s.capturedAt), {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          const labelText = s.notes ? `${date} — ${s.notes}` : date;
          return (
            <option key={s.id} value={s.id}>{labelText}</option>
          );
        })}
      </select>
    </div>
  );
}
