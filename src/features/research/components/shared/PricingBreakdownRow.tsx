"use client";

import React from "react";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>
        {label} x {quantity}
      </span>
      <span>{unitPrice === 0 ? t("pricing.free") : `$${subtotal.toLocaleString()}`}</span>
    </div>
  );
}
