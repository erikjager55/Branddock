"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";

// ─── Types ───────────────────────────────────────────────────

interface PricingBreakdownRowProps {
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ─── Component ───────────────────────────────────────────────

export function PricingBreakdownRow({
  label,
  quantity,
  unitPrice,
  subtotal,
}: PricingBreakdownRowProps) {
  const { t } = useTranslation("research");
  const { formatCurrency } = useFormat();

  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>
        {label} x {quantity}
      </span>
      <span>{unitPrice === 0 ? t("pricing.free") : formatCurrency(subtotal, "USD")}</span>
    </div>
  );
}
