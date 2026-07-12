'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface AutoTopupSettings {
  autoTopupEnabled: boolean;
  autoTopupPackId: string | null;
  autoTopupExposureCap: number;
  sepaMandateStatus: string | null;
  packs: { id: string; credits: number; priceEur: number }[];
}

/** Fase-6-restpunt: auto-topup-instellingen (toggle + pack + plafond). */
function useAutoTopupSettings() {
  const queryClient = useQueryClient();
  const query = useQuery<AutoTopupSettings>({
    queryKey: ['auto-topup-settings'],
    enabled: isTopupEnabled(),
    queryFn: async () => {
      const res = await fetch('/api/billing/auto-topup');
      if (!res.ok) throw new Error('Auto-topup-instellingen ophalen faalde');
      return res.json();
    },
  });
  const mutation = useMutation({
    mutationFn: async (patch: {
      autoTopupEnabled?: boolean;
      autoTopupPackId?: string | null;
      autoTopupExposureCap?: number;
    }) => {
      const res = await fetch('/api/billing/auto-topup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Opslaan faalde');
      return body;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['auto-topup-settings'] }),
  });
  return { ...query, save: mutation };
}

export function PaymentMethodsCard() {
  const { t } = useTranslation('settings-billing');
  const billing = useBillingPlan();
  const { data: paymentData, isLoading } = usePaymentMethods();
  const paymentMethods = paymentData?.paymentMethods ?? [];
  const defaultPayment = paymentMethods.find((m) => m.isDefault);
  const { data: mandate } = useSepaMandate();
  const autoTopup = useAutoTopupSettings();
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

      {/* Fase-6-restpunt: auto-topup-instellingen — alleen relevant mét mandaat. */}
      {mandate?.sepaMandateStatus === 'active' && autoTopup.data && (
        <div className="mt-3 rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('autoTopup.title', { defaultValue: 'Automatisch bijkopen' })}
              </p>
              <p className="text-xs text-gray-500">
                {t('autoTopup.subtitle', {
                  defaultValue: 'Bij een tekort automatisch een pack incasseren via SEPA.',
                })}
              </p>
            </div>
            <Button
              variant={autoTopup.data.autoTopupEnabled ? 'primary' : 'secondary'}
              size="sm"
              disabled={autoTopup.save.isPending || autoTopup.isFetching}
              onClick={() =>
                autoTopup.save.mutate({ autoTopupEnabled: !autoTopup.data?.autoTopupEnabled })
              }
            >
              {autoTopup.data.autoTopupEnabled
                ? t('autoTopup.on', { defaultValue: 'Aan' })
                : t('autoTopup.off', { defaultValue: 'Uit' })}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-gray-600">
              {t('autoTopup.pack', { defaultValue: 'Pack' })}
              <select
                className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                value={autoTopup.data.autoTopupPackId ?? ''}
                disabled={autoTopup.save.isPending}
                onChange={(e) =>
                  autoTopup.save.mutate({ autoTopupPackId: e.target.value || null })
                }
              >
                <option value="">—</option>
                {autoTopup.data.packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.credits} cr · €{p.priceEur}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-gray-600">
              {t('autoTopup.cap', { defaultValue: 'Plafond (onbevestigde credits)' })}
              <input
                type="number"
                min={0}
                max={100000}
                className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs tabular-nums"
                // key: uncontrolled input her-synct met de server-waarde na een
                // refetch/server-clamp (review-W6).
                key={autoTopup.data.autoTopupExposureCap}
                defaultValue={autoTopup.data.autoTopupExposureCap}
                disabled={autoTopup.save.isPending}
                onBlur={(e) => {
                  const v = Math.min(100_000, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                  if (v !== autoTopup.data?.autoTopupExposureCap) {
                    autoTopup.save.mutate({ autoTopupExposureCap: v });
                  }
                }}
              />
            </label>
          </div>
          {autoTopup.save.isError && (
            <p className="mt-2 text-xs text-red-600">
              {autoTopup.save.error instanceof Error
                ? autoTopup.save.error.message
                : t('autoTopup.error', { defaultValue: 'Opslaan faalde' })}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
