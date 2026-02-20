"use client";

import React from "react";
import { PricingBreakdownRow } from "./PricingBreakdownRow";

// ─── Types ───────────────────────────────────────────────────

interface MethodItem {
  type: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PricingSummaryProps {
  methods: MethodItem[];
}

// ─── Component ───────────────────────────────────────────────

export function PricingSummary({ methods }: PricingSummaryProps) {
  const activeMethodsList = methods.filter((m) => m.quantity > 0);
  const total = activeMethodsList.reduce((sum, m) => sum + m.subtotal, 0);

  if (activeMethodsList.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="space-y-2">
        {activeMethodsList.map((method) => (
          <PricingBreakdownRow
            key={method.type}
            label={method.name}
            quantity={method.quantity}
            unitPrice={method.unitPrice}
            subtotal={method.subtotal}
          />
        ))}
      </div>

      <div className="border-t my-2" />

      <div data-testid="sidebar-total" className="flex justify-between font-semibold text-green-600">
        <span>Total</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
