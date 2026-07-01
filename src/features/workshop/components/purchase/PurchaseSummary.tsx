"use client";

import { useTranslation } from "react-i18next";
import { ShoppingCart, Eye, Info } from "lucide-react";
import { useFormat } from "@/lib/ui-i18n/format";
import { Button, Card } from "@/components/shared";

interface LineItem {
  label: string;
  amount: number;
}

interface PurchaseSummaryProps {
  lineItems: LineItem[];
  totalPrice: number;
  isPurchasing: boolean;
  canPurchase: boolean;
  onPurchase: () => void;
  onPreviewImpact: () => void;
}

export function PurchaseSummary({
  lineItems,
  totalPrice,
  isPurchasing,
  canPurchase,
  onPurchase,
  onPreviewImpact,
}: PurchaseSummaryProps) {
  const { t } = useTranslation("workshop");
  const { formatCurrency } = useFormat();
  return (
    <div data-testid="purchase-summary" className="sticky top-6">
      <Card padding="none">
        <Card.Header>
          <h3 className="font-semibold text-gray-900">{t("purchase.summary.title")}</h3>
        </Card.Header>
        <Card.Body>
          <div className="space-y-3">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(item.amount, "EUR")}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">{t("purchase.summary.total")}</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalPrice, "EUR")}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                data-testid="purchase-button"
                variant="cta"
                fullWidth
                icon={ShoppingCart}
                onClick={onPurchase}
                isLoading={isPurchasing}
                disabled={!canPurchase}
              >
                {t("purchase.summary.purchase")}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={Eye}
                onClick={onPreviewImpact}
                disabled={!canPurchase}
              >
                {t("purchase.summary.previewImpact")}
              </Button>
            </div>

            <div className="flex items-start gap-2 pt-2 text-xs text-gray-400">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{t("purchase.summary.paymentNotice")}</span>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
