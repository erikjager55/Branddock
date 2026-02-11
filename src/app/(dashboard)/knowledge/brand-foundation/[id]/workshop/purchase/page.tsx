"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Minus,
  Plus,
  ShoppingCart,
  Clock,
  Users,
  Monitor,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { WorkshopHeader } from "@/features/knowledge/brand-foundation/WorkshopHeader";
import { useCreateWorkshop } from "@/hooks/api/useWorkshops";
import {
  WORKSHOP_BUNDLES,
  WORKSHOP_INCLUDED_ITEMS,
  WORKSHOP_SPECS,
  WORKSHOP_BASE_PRICE,
  FACILITATOR_PRICE,
  INDIVIDUAL_ASSETS,
} from "@/lib/constants/workshop";
import { cn } from "@/lib/utils";

const specIcons = {
  clock: Clock,
  users: Users,
  monitor: Monitor,
} as const;

export default function WorkshopPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const createWorkshop = useCreateWorkshop();

  const [assetMode, setAssetMode] = useState<"bundles" | "individual">("bundles");
  const [selectedBundle, setSelectedBundle] = useState("professional");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addFacilitator, setAddFacilitator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const bundle = WORKSHOP_BUNDLES.find((b) => b.id === selectedBundle)!;
  const facilitatorCost = addFacilitator ? FACILITATOR_PRICE * quantity : 0;
  const baseTotal = assetMode === "bundles" ? bundle.price * quantity : WORKSHOP_BASE_PRICE * quantity;
  const subtotal = baseTotal + facilitatorCost;
  const discount = assetMode === "bundles" ? bundle.savings : 0;
  const total = subtotal - discount;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brand Assets", href: "/knowledge/brand-foundation" },
    { label: "Canvas Workshop" },
  ];

  const handlePurchase = () => {
    createWorkshop.mutate(
      {
        assetId: id,
        title: "Canvas Workshop",
        type: "golden-circle",
        bundle: assetMode === "bundles" ? selectedBundle : null,
        hasFacilitator: addFacilitator,
        purchaseAmount: total,
        totalSteps: 6,
      },
      {
        onSuccess: () => {
          router.push(`/knowledge/brand-foundation/${id}/workshop/session`);
        },
      }
    );
  };

  const toggleAsset = (asset: string) => {
    setSelectedAssets((prev) =>
      prev.includes(asset) ? prev.filter((a) => a !== asset) : [...prev, asset]
    );
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <WorkshopHeader
        status="PURCHASED"
        subtitle="Purchase and plan your workshop sessions"
        className="mb-8"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Package + Assets + Options */}
        <div className="flex-1 space-y-6">
          {/* Workshop Package */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              Canvas Workshop Package
            </h3>

            {/* What's Included */}
            <div className="mb-5">
              <p className="text-xs font-medium text-text-dark/50 uppercase tracking-wide mb-3">
                What&apos;s Included
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WORKSHOP_INCLUDED_ITEMS.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-text-dark/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-3">
              {WORKSHOP_SPECS.map((spec) => {
                const Icon = specIcons[spec.icon];
                return (
                  <div
                    key={spec.label}
                    className="rounded-lg border border-border-dark bg-background-dark p-3 text-center"
                  >
                    <Icon className="w-4 h-4 text-text-dark/40 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-text-dark">{spec.value}</p>
                    <p className="text-[10px] text-text-dark/40">{spec.label}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Select Brand Assets */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              Select Brand Assets
            </h3>

            {/* Toggle Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-background-dark mb-4">
              <button
                onClick={() => setAssetMode("bundles")}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  assetMode === "bundles"
                    ? "bg-surface-dark text-text-dark"
                    : "text-text-dark/50 hover:text-text-dark"
                )}
              >
                Pre-Selected Bundles
              </button>
              <button
                onClick={() => setAssetMode("individual")}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  assetMode === "individual"
                    ? "bg-surface-dark text-text-dark"
                    : "text-text-dark/50 hover:text-text-dark"
                )}
              >
                Choose Individual
              </button>
            </div>

            {assetMode === "bundles" ? (
              <div className="space-y-3">
                {WORKSHOP_BUNDLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBundle(b.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-4 transition-all",
                      selectedBundle === b.id
                        ? "border-primary bg-primary/5"
                        : "border-border-dark hover:border-border-dark/80"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-dark">
                          {b.name}
                        </span>
                        <Badge
                          variant={b.id === "professional" ? "success" : "default"}
                          size="sm"
                        >
                          {b.badge}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-dark/30 line-through">
                          &euro;{b.originalPrice.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-text-dark">
                          &euro;{b.price.toLocaleString()}
                        </span>
                        <Badge variant="success" size="sm">
                          Save &euro;{b.savings}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-text-dark/50 mb-2">{b.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.assets.map((asset) => (
                        <span
                          key={asset}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-surface-dark border border-border-dark text-text-dark/60"
                        >
                          {asset}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {INDIVIDUAL_ASSETS.map((asset) => (
                  <label
                    key={asset}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all",
                      selectedAssets.includes(asset)
                        ? "border-primary bg-primary/5"
                        : "border-border-dark hover:border-border-dark/80"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedAssets.includes(asset)}
                      onChange={() => toggleAsset(asset)}
                    />
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedAssets.includes(asset)
                          ? "bg-primary border-primary"
                          : "border-border-dark"
                      )}
                    >
                      {selectedAssets.includes(asset) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-text-dark/70">{asset}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>

          {/* Workshop Options */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              Workshop Options
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dark/60">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-semibold text-text-dark w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-8 h-8 rounded border border-border-dark flex items-center justify-center text-text-dark/60 hover:text-text-dark transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-text-dark/60">Add Facilitator</span>
                  <p className="text-xs text-text-dark/30">
                    +&euro;{FACILITATOR_PRICE} per workshop
                  </p>
                </div>
                <Toggle checked={addFacilitator} onChange={setAddFacilitator} size="sm" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Purchase Summary */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <Card padding="lg" className="sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-text-dark/50" />
              <h3 className="text-sm font-semibold text-text-dark">
                Purchase Summary
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-text-dark/60">
                <span>
                  {assetMode === "bundles" ? bundle.name : "Workshop"}{" "}
                  {quantity > 1 ? `x${quantity}` : ""}
                </span>
                <span>&euro;{baseTotal.toLocaleString()}</span>
              </div>
              {addFacilitator && (
                <div className="flex justify-between text-text-dark/60">
                  <span>Facilitator {quantity > 1 ? `x${quantity}` : ""}</span>
                  <span>+&euro;{facilitatorCost.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-border-dark pt-3 flex justify-between text-text-dark/60">
                <span>Subtotal</span>
                <span>&euro;{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Bundle Discount</span>
                  <span>-&euro;{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-border-dark pt-3 flex justify-between font-semibold text-text-dark">
                <span>Total</span>
                <span>&euro;{total.toLocaleString()}</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              className="mt-6"
              onClick={handlePurchase}
              loading={createWorkshop.isPending}
            >
              <ShoppingCart className="w-4 h-4" />
              Purchase Workshop
            </Button>

            <Button
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => setShowPreview(true)}
            >
              Preview Dashboard Impact
            </Button>

            {/* Info Card */}
            <div className="mt-4 rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300/70">
                  After purchase, selected brand assets will be updated to
                  &quot;In Development&quot; status and linked to this workshop.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {/* Impact Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Dashboard Impact Preview"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-dark/60">
            After completing the workshop, your brand assets will be updated:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(assetMode === "bundles" ? [...bundle.assets] : selectedAssets)
              .slice(0, 8)
              .map((asset) => (
                <div
                  key={asset}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border-dark"
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-dark">{asset}</p>
                    <p className="text-[10px] text-text-dark/40">Before: Draft</p>
                  </div>
                  <Badge variant="success" size="sm">
                    Validated
                  </Badge>
                </div>
              ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
