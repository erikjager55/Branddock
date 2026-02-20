'use client';

import { CreditCard, ExternalLink } from 'lucide-react';
import { Card, Button, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { usePaymentMethods } from '@/hooks/use-settings';

export function PaymentMethodsCard() {
  const billing = useBillingPlan();
  const { data: paymentData, isLoading } = usePaymentMethods();
  const paymentMethods = paymentData?.paymentMethods ?? [];
  const defaultPayment = paymentMethods.find((m) => m.isDefault);

  if (billing.isFreeBeta) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Payment Method</h3>
        </div>
        <p className="text-sm text-gray-500">
          No payment method required during beta
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Payment Method</h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => billing.openPortal()}
        >
          Manage
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isLoading ? (
        <div className="animate-pulse h-14 bg-gray-100 rounded-lg" />
      ) : defaultPayment ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <CreditCard className="h-8 w-8 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {defaultPayment.type} ••••{defaultPayment.last4}
            </p>
            <p className="text-xs text-gray-500">
              Expires {defaultPayment.expiryMonth}/{defaultPayment.expiryYear}
            </p>
          </div>
          <Badge variant="teal" size="sm">Default</Badge>
        </div>
      ) : (
        <div className="text-center py-4">
          <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No payment method on file</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => billing.openPortal()}
          >
            Add Payment Method
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {paymentMethods.length > 1 && (
        <p className="text-xs text-gray-500 mt-2">
          +{paymentMethods.length - 1} more payment method
          {paymentMethods.length - 1 > 1 ? 's' : ''}
        </p>
      )}
    </Card>
  );
}
