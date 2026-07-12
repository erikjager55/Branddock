'use client';

import { useTranslation } from 'react-i18next';
import { Download, FileText } from 'lucide-react';
import { Card, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { useInvoices, useDownloadInvoice } from '@/hooks/use-settings';
import { useFormat } from '@/lib/ui-i18n/format';

export function InvoiceHistoryCard() {
  const { t } = useTranslation('settings-billing');
  const { formatDate } = useFormat();
  const billing = useBillingPlan();
  const { data: invoicesData, isLoading } = useInvoices();
  const downloadMutation = useDownloadInvoice();
  const invoices = invoicesData?.invoices ?? [];

  if (billing.isFreeBeta) {
    return null; // No invoices in free beta mode
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('invoices.title')}</h3>
      </div>
      {isLoading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('invoices.empty')}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">{t('invoices.columns.invoice')}</th>
              <th className="px-5 py-3 font-medium">{t('invoices.columns.date')}</th>
              <th className="px-5 py-3 font-medium">{t('invoices.columns.amount')}</th>
              <th className="px-5 py-3 font-medium">{t('invoices.columns.status')}</th>
              <th className="px-5 py-3 font-medium text-right" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-5 py-3 font-medium text-gray-900">
                  {inv.invoiceNumber}
                  {/* Fase 5b: beide VAT-nummers zichtbaar wanneer bekend. */}
                  {(inv.customerVatNumber || inv.sellerVatNumber) && (
                    <p className="mt-0.5 text-xs font-normal text-gray-400">
                      {inv.sellerVatNumber && `${t('invoices.vatSeller', { defaultValue: 'BTW verkoper' })}: ${inv.sellerVatNumber}`}
                      {inv.sellerVatNumber && inv.customerVatNumber && ' · '}
                      {inv.customerVatNumber && `${t('invoices.vatCustomer', { defaultValue: 'BTW klant' })}: ${inv.customerVatNumber}`}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {formatDate(new Date(inv.issuedAt))}
                </td>
                <td className="px-5 py-3 text-gray-900 font-medium tabular-nums">
                  &euro;{inv.amount.toFixed(2)}
                  {/* Fase 5b: BTW-uitsplitsing (Stripe Tax); reverse-charge = "btw verlegd". */}
                  {inv.netAmount !== null && (
                    <p className="mt-0.5 text-xs font-normal text-gray-400">
                      {inv.reverseCharge
                        ? t('invoices.reverseCharge', {
                            defaultValue: 'netto €{{net}} · btw verlegd (reverse charge)',
                            net: inv.netAmount.toFixed(2),
                          })
                        : t('invoices.taxBreakdown', {
                            defaultValue: 'netto €{{net}} · btw €{{tax}}{{rate}}',
                            net: inv.netAmount.toFixed(2),
                            tax: (inv.taxAmount ?? 0).toFixed(2),
                            rate: inv.taxRate ? ` (${Math.round(inv.taxRate * 100)}%)` : '',
                          })}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant={
                      // DB slaat de status uppercase op (PAID/PENDING/…) — normaliseer,
                      // anders valt 'PAID' door naar danger (rood).
                      inv.status?.toLowerCase() === 'paid'
                        ? 'success'
                        : inv.status?.toLowerCase() === 'pending'
                        ? 'warning'
                        : inv.status?.toLowerCase() === 'refunded'
                        ? 'teal'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1).toLowerCase()}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => downloadMutation.mutate(inv.id)}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
