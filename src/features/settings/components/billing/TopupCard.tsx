'use client';

import { useTranslation } from 'react-i18next';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Card, Button, Badge } from '@/components/shared';
import { useTopupPacks, useTopup, useCreditBalance } from '@/hooks/use-credits';

/**
 * Prepaid credit-pack-aankoop: toont de TOPUP_PACKS-catalogus + een "Kopen"-knop
 * per pack die een Stripe Checkout-sessie start (redirect). Verborgen voor
 * unlimited-orgs (die hebben geen top-up nodig).
 */
export function TopupCard() {
  const { t } = useTranslation('settings-billing');
  const { data: balance } = useCreditBalance();
  const { data: packs, isLoading } = useTopupPacks();
  const topup = useTopup();

  if (balance?.unlimited) return null;

  return (
    <Card padding="lg">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        {t('topup.title', { defaultValue: 'Credits bijkopen' })}
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        {t('topup.subtitle', { defaultValue: 'Eenmalige prepaid-packs — direct beschikbaar na betaling.' })}
      </p>

      {isLoading || !packs ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {packs.map((pack) => {
            const loading = topup.isPending && topup.variables === pack.id;
            return (
              <div key={pack.id} className="flex flex-col rounded-xl border border-gray-200 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-lg font-bold text-gray-900">{pack.credits.toLocaleString()}</div>
                  {pack.discountPct > 0 && (
                    <Badge variant="teal" size="sm">-{pack.discountPct}%</Badge>
                  )}
                </div>
                <div className="mb-4 text-xs text-gray-500">
                  credits &middot; &euro;{pack.priceEur}
                </div>
                <div className="mt-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={topup.isPending}
                    onClick={() => topup.mutate(pack.id)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t('topup.redirecting', { defaultValue: 'Doorsturen…' })}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t('topup.buy', { defaultValue: 'Kopen' })}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {topup.isError && (
        <p className="mt-3 text-xs text-red-600">
          {(topup.error as Error)?.message ?? t('topup.error', { defaultValue: 'Aankoop kon niet gestart worden.' })}
        </p>
      )}
    </Card>
  );
}
