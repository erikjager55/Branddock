// App-host voor de "naar-de-app" CTA's op de marketing-site.
//
// Zolang marketing en app op dezelfde host draaien (nu: branddock-7y9n.vercel.app)
// blijft NEXT_PUBLIC_APP_URL leeg → de links zijn relatief (`/?utm_...`) en werken.
// Zodra marketing op de apex (branddock.app) en de app op app.branddock.app staan
// (zie custom-domain-branddock-app runbook), zet je NEXT_PUBLIC_APP_URL op
// `https://app.branddock.app` → de CTA's linken dan absoluut naar de app-host.

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

/** Bouwt een link naar de app; absoluut als NEXT_PUBLIC_APP_URL gezet is, anders relatief. */
export function appHref(path: string): string {
  return `${APP_URL}${path}`;
}
