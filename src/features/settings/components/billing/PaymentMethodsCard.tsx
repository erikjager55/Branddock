'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ExternalLink, Landmark } from 'lucide-react';
import { Card, Button, Badge } from '@/components/shared';
import { useBillingPlan } from '@/hooks/use-billing';
import { usePaymentMethods } from '@/hooks/use-settings';
import { isTopupEnabled } from '@/lib/stripe/feature-flags';

interface MandateStatus {
  sepaMandateStatus: string | null;
  autoTopupEnabled: boolean;
}

/** Fase 5a: iDEAL→SEPA-mandaat-status + gehoste setup-flow. */
function useSepaMandate() {
  return useQuery<MandateStatus>({
    queryKey: ['sepa-mandate'],
    enabled: isTopupEnabled(),
    queryFn: async () => {
      const res = await fetch('/api/stripe/setup-mandate');
      if (!res.ok) throw new Error('Mandaat-status ophalen faalde');
      return res.json();
    },
  });
}

export function PaymentMethodsCard() {
  const { t } = useTranslation('settings-billing');
  const billing = useBillingPlan();
  const { data: paymentData, isLoading } = usePaymentMethods();
  const paymentMethods = paymentData?.paymentMethods ?? [];
  const defaultPayment = paymentMethods.find((m) => m.isDefault);
  const { data: mandate } = useSepaMandate();
  const [mandateBusy, setMandateBusy] = useState(false);
  const [mandateError, setMandateError] = useState<string | null>(null);

  const startMandateSetup = async () => {
    setMandateBusy(true);
    setMandateError(null);
    try {
      const res = await fetch('/api/stripe/setup-mandate', { method: 'POST' });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Mandaat-setup faalde');
      window.location.href = body.url;
    } catch (err) {
      setMandateError(err instanceof Error ? err.message : 'Mandaat-setup faalde');
      setMandateBusy(false);
    }
  };

  if (billing.isFreeBeta) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('payment.title')}</h3>
        </div>
        <p className="text-sm text-gray-500">
          {t('payment.freeBetaNote')}
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{t('payment.title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => billing.openPortal()}
        >
          {t('common.manage')}
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
              {t('payment.expires', {
                month: defaultPayment.expiryMonth,
                year: defaultPayment.expiryYear,
              })}
            </p>
          </div>
          <Badge variant="teal" size="sm">{t('payment.default')}</Badge>
        </div>
      ) : (
        <div className="text-center py-4">
          <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('payment.none')}</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => billing.openPortal()}
          >
            {t('payment.add')}
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {paymentMethods.length > 1 && (
        <p className="text-xs text-gray-500 mt-2">
          {t('payment.more', { count: paymentMethods.length - 1 })}
        </p>
      )}

      {/* Fase 5a: SEPA-incasso-mandaat (iDEAL-setup) — de basis voor
          auto-topup en recurring. Alleen zichtbaar zodra betalingen aan staan. */}
      {mandate && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-100 p-3">
          <Landmark className="h-6 w-6 flex-shrink-0 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {t('mandate.title', { defaultValue: 'SEPA-incasso (automatisch bijkopen)' })}
            </p>
            <p className="text-xs text-gray-500">
              {mandate.sepaMandateStatus === 'active'
                ? t('mandate.active', { defaultValue: 'Mandaat actief — auto-topup kan incasseren.' })
                : mandate.sepaMandateStatus === 'pending'
                  ? t('mandate.pending', { defaultValue: 'Mandaat wacht op bevestiging via je bank.' })
                  : t('mandate.none', { defaultValue: 'Nog geen mandaat — stel in via iDEAL.' })}
            </p>
            {mandateError && <p className="mt-1 text-xs text-red-600">{mandateError}</p>}
          </div>
          {mandate.sepaMandateStatus === 'active' ? (
            <Badge variant="teal" size="sm">{t('mandate.activeBadge', { defaultValue: 'Actief' })}</Badge>
          ) : (
            <Button variant="secondary" size="sm" disabled={mandateBusy} onClick={startMandateSetup}>
              {mandateBusy
                ? t('common.loading')
                : t('mandate.setup', { defaultValue: 'Instellen via iDEAL' })}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
