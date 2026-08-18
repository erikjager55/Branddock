import { AIErrorCard } from 'branddock-app';

export const MetOpnieuw = () => (
  <AIErrorCard
    message="Het model was tijdelijk overbelast. Je credits zijn niet belast."
    onRetry={() => {}}
  />
);

export const BezigMetOpnieuw = () => (
  <AIErrorCard message="Opnieuw proberen..." onRetry={() => {}} isRetrying />
);

export const ZonderActie = () => (
  <AIErrorCard message="Deze generatie is geannuleerd omdat je de Canvas verliet." />
);
