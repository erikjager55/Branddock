"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  Check,
  Minus,
  Plus,
  Users,
  Star,
  ShoppingCart,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ── Data ──

const BUNDLES = [
  {
    id: "starter",
    name: "Starter",
    price: 1250,
    discount: 150,
    popular: false,
    features: [
      "2 workshop sessions",
      "Core brand assets",
      "Digital workbook",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 1350,
    discount: 200,
    popular: true,
    features: [
      "4 workshop sessions",
      "All brand assets",
      "Digital workbook",
      "Video recordings",
      "Priority support",
    ],
  },
  {
    id: "complete",
    name: "Complete",
    price: 1400,
    discount: 250,
    popular: false,
    features: [
      "6 workshop sessions",
      "All brand assets",
      "Digital workbook",
      "Video recordings",
      "1-on-1 consultation",
      "Dedicated support",
    ],
  },
];

// ── Component ──

export default function WorkshopPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedBundle, setSelectedBundle] = useState("professional");
  const [quantity, setQuantity] = useState(1);
  const [addFacilitator, setAddFacilitator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const bundle = BUNDLES.find((b) => b.id === selectedBundle)!;
  const facilitatorCost = addFacilitator ? 350 : 0;
  const subtotal = bundle.price * quantity + facilitatorCost;
  const total = subtotal - bundle.discount;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brand Foundation", href: "/knowledge/brand-foundation" },
    { label: "Canvas Workshop" },
  ];

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-6"><Breadcrumb items={breadcrumbItems} /></div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">Canvas Workshop</h1>
            <p className="text-sm text-text-dark/40">Purchase workshop sessions for your team</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Bundles + Options */}
        <div className="flex-1 space-y-6">
          {/* Bundle Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUNDLES.map((b) => (
              <Card
                key={b.id}
                padding="lg"
                selected={selectedBundle === b.id}
                clickable
                onClick={() => setSelectedBundle(b.id)}
                className={cn("relative", b.popular && "ring-2 ring-primary")}
              >
                {b.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="success" size="sm">
                      <Star className="w-3 h-3" /> Most Popular
                    </Badge>
                  </div>
                )}
                <div className="space-y-4 pt-1">
                  <h3 className="text-sm font-semibold text-text-dark">{b.name}</h3>
                  <div>
                    <span className="text-2xl font-bold text-text-dark">&euro;{b.price.toLocaleString()}</span>
                    <Badge variant="success" size="sm" className="ml-2">Save &euro;{b.discount}</Badge>
                  </div>
                  <ul className="space-y-2">
                    {b.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-text-dark/60">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={selectedBundle === b.id ? "primary" : "secondary"}
                    fullWidth
                    size="sm"
                  >
                    {selectedBundle === b.id ? "Selected" : "Select"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Workshop Options */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-4">Workshop Options</h3>
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
                  <span className="text-sm font-semibold text-text-dark w-6 text-center">{quantity}</span>
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
                  <p className="text-xs text-text-dark/30">+&euro;350 per workshop</p>
                </div>
                <Toggle checked={addFacilitator} onChange={setAddFacilitator} size="sm" />
              </div>
            </div>
          </Card>

          {/* Impact Preview */}
          <button
            onClick={() => setShowPreview(true)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Preview Impact on Dashboard &rarr;
          </button>
        </div>

        {/* Right: Purchase Summary */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <Card padding="lg" className="sticky top-20">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              <ShoppingCart className="w-4 h-4 inline -mt-0.5 mr-1.5" />
              Purchase Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-text-dark/60">
                <span>{bundle.name} Bundle {quantity > 1 ? `x${quantity}` : ""}</span>
                <span>&euro;{(bundle.price * quantity).toLocaleString()}</span>
              </div>
              {addFacilitator && (
                <div className="flex justify-between text-text-dark/60">
                  <span>Facilitator</span>
                  <span>+&euro;{facilitatorCost}</span>
                </div>
              )}
              <div className="border-t border-border-dark pt-3 flex justify-between text-text-dark/60">
                <span>Subtotal</span>
                <span>&euro;{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span>-&euro;{bundle.discount}</span>
              </div>
              <div className="border-t border-border-dark pt-3 flex justify-between font-semibold text-text-dark">
                <span>Total</span>
                <span>&euro;{total.toLocaleString()}</span>
              </div>
            </div>
            <Button variant="primary" fullWidth className="mt-6">
              Complete Purchase
            </Button>
          </Card>
        </aside>
      </div>

      {/* Impact Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Dashboard Impact Preview" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-dark/60">After completing the {bundle.name} workshop, your brand assets will be updated:</p>
          <div className="grid grid-cols-2 gap-3">
            {["Golden Circle", "Core Values", "Brand Positioning", "Brand Personality"].map((asset) => (
              <div key={asset} className="flex items-center gap-3 p-3 rounded-lg border border-border-dark">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-dark">{asset}</p>
                  <p className="text-[10px] text-text-dark/40">Before: Draft</p>
                </div>
                <Badge variant="success" size="sm">Validated</Badge>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
