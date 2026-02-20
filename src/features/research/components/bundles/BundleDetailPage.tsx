"use client";

import React from "react";
import { ArrowLeft, CheckCircle, FileText, FlaskConical } from "lucide-react";
import { Button, Skeleton } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useBundleDetail, useSelectBundle } from "../../hooks";
import { BundleBadge } from "./BundleBadge";
import { BundleStatsBar } from "./BundleStatsBar";
import { TrustSignals } from "./TrustSignals";

// ─── Types ───────────────────────────────────────────────────

interface BundleDetailPageProps {
  bundleId: string | null;
  onBack: () => void;
  onNavigate: (section: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function BundleDetailPage({
  bundleId,
  onBack,
  onNavigate,
}: BundleDetailPageProps) {
  const { data, isLoading } = useBundleDetail(bundleId);
  const selectBundle = useSelectBundle();

  if (!bundleId) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bundles
          </button>
          <p className="text-gray-500">No bundle selected.</p>
        </div>
      </PageShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-6">
          <Skeleton className="rounded" width={120} height={16} />
          <Skeleton className="rounded" width="60%" height={32} />
          <Skeleton className="rounded" width="100%" height={80} />
          <Skeleton className="rounded" width="100%" height={200} />
        </div>
      </PageShell>
    );
  }

  const { bundle, savings } = data;

  function handleSelectBundle() {
    if (!bundleId) return;
    selectBundle.mutate(bundleId, {
      onSuccess: () => {
        onNavigate("research-hub");
      },
    });
  }

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="bundle-detail-page" className="space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bundles
        </button>

        {/* Main card */}
        <div className="border-2 border-primary rounded-xl p-6 bg-white">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2">
            {bundle.isRecommended && <BundleBadge type="recommended" />}
            {bundle.isPopular && <BundleBadge type="popular" />}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{bundle.name}</h1>

          {/* Price row */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-primary">
              ${bundle.price.toLocaleString()}
            </span>
            {bundle.originalPrice && bundle.originalPrice > bundle.price && (
              <span className="text-lg line-through text-gray-400">
                ${bundle.originalPrice.toLocaleString()}
              </span>
            )}
            {savings > 0 && (
              <span className="bg-primary/15 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
                Save ${savings.toLocaleString()}
              </span>
            )}
          </div>

          {/* Description */}
          {bundle.description && (
            <p className="text-gray-600 mb-4">{bundle.description}</p>
          )}

          {/* Stats bar */}
          <BundleStatsBar
            timeline={bundle.timeline}
            assetCount={bundle.assets.length}
            methodCount={bundle.methods.length}
            savings={savings}
          />
        </div>

        {/* Assets section */}
        {bundle.assets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Included Assets
            </h2>
            <div className="space-y-2">
              {bundle.assets.map((asset, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-white rounded-lg border p-3"
                >
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {asset.assetName}
                    </div>
                    {asset.assetDescription && (
                      <div className="text-xs text-gray-500">
                        {asset.assetDescription}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methods section */}
        {bundle.methods.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Research Methods
            </h2>
            <div className="space-y-2">
              {bundle.methods.map((method, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-white rounded-lg border p-3"
                >
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {method.methodName}
                    </div>
                    {method.description && (
                      <div className="text-xs text-gray-500">
                        {method.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3">
          <Button
            data-testid="select-bundle-button"
            variant="primary"
            className="flex-1"
            onClick={handleSelectBundle}
            isLoading={selectBundle.isPending}
          >
            Select This Bundle
          </Button>
          <Button variant="secondary" onClick={onBack}>
            Learn More
          </Button>
        </div>

        {/* Trust signals */}
        {bundle.trustSignals && bundle.trustSignals.length > 0 && (
          <TrustSignals signals={bundle.trustSignals} />
        )}
      </div>
    </PageShell>
  );
}
