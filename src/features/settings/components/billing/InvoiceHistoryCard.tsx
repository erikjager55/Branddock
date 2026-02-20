'use client';

import { Download, FileText } from 'lucide-react';
import { Card, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { useInvoices, useDownloadInvoice } from '@/hooks/use-settings';

export function InvoiceHistoryCard() {
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
        <h3 className="text-sm font-semibold text-gray-900">Billing History</h3>
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
          <p className="text-sm text-gray-500">No invoices yet</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
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
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {new Date(inv.issuedAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-gray-900 font-medium tabular-nums">
                  &euro;{(inv.amount / 100).toFixed(2)}
                </td>
                <td className="px-5 py-3">
                  <Badge
                    variant={
                      inv.status === 'paid'
                        ? 'success'
                        : inv.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {inv.status}
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
