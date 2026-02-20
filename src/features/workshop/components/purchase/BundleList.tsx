"use client";

import { BundleCard } from "./BundleCard";
import type { WorkshopBundle } from "../../types/workshop.types";

interface BundleListProps {
  bundles: WorkshopBundle[];
  selectedBundleId: string | null;
  onSelectBundle: (bundleId: string, bundlePrice: number) => void;
}

export function BundleList({
  bundles,
  selectedBundleId,
  onSelectBundle,
}: BundleListProps) {
  return (
    <div data-testid="bundle-list" className="grid grid-cols-1 gap-4">
      {bundles.map((bundle) => (
        <BundleCard
          key={bundle.id}
          bundle={bundle}
          isSelected={selectedBundleId === bundle.id}
          onSelect={() => onSelectBundle(bundle.id, bundle.finalPrice)}
        />
      ))}
    </div>
  );
}
