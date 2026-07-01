"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, ClipboardList } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/shared";
import type { PendingValidationItem } from "../../types/research.types";
import { useValidateMethod } from "../../hooks";

// ─── Types ───────────────────────────────────────────────────

interface ValidationNeededSectionProps {
  items: PendingValidationItem[] | undefined;
}

// ─── Component ───────────────────────────────────────────────

export function ValidationNeededSection({ items }: ValidationNeededSectionProps) {
  const { t } = useTranslation("research");
  const validate = useValidateMethod();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = (itemId: string) => {
    setPendingId(itemId);
    setError(null);
    validate.mutate(itemId, {
      onSuccess: () => setPendingId(null),
      onError: (err) => {
        setError(err instanceof Error ? err.message : t("validationNeeded.validateError"));
        setPendingId(null);
      },
    });
  };

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">{t("validationNeeded.heading")}</h3>
        <EmptyState
          icon={ClipboardList}
          title={t("validationNeeded.empty.title")}
          description={t("validationNeeded.empty.description")}
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t("validationNeeded.heading")}</h3>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isPending = pendingId === item.id;
          return (
            <div
              key={item.id}
              className="bg-white rounded-lg border p-4 flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-gray-900">{item.assetName}</span>
                <span className="ml-2 text-xs text-gray-500">{item.assetType}</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="warning">{t("validationNeeded.readyBadge")}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={CheckCircle}
                  onClick={() => handleValidate(item.id)}
                  isLoading={isPending}
                  disabled={validate.isPending}
                >
                  {t("validationNeeded.validate")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
