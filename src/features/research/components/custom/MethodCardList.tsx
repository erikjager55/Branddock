"use client";

import React from "react";
import type { MethodConfig } from "../../types/research.types";
import { MethodCard } from "./MethodCard";

// ─── Types ───────────────────────────────────────────────────

interface MethodCardListProps {
  methods: MethodConfig[];
  quantities: Record<string, number>;
  onQuantityChange: (type: string, qty: number) => void;
}

// ─── Component ───────────────────────────────────────────────

export function MethodCardList({
  methods,
  quantities,
  onQuantityChange,
}: MethodCardListProps) {
  return (
    <div data-testid="method-card-list" className="space-y-4">
      {methods.map((method) => (
        <MethodCard
          key={method.type}
          type={method.type}
          name={method.name}
          description={method.description}
          price={method.price}
          unit={method.unit}
          confidence={method.confidence}
          quantity={quantities[method.type] ?? 0}
          onQuantityChange={(qty) => onQuantityChange(method.type, qty)}
        />
      ))}
    </div>
  );
}
