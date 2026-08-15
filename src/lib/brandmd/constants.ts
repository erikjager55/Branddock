// =============================================================
// brand.md — gedeelde constanten
//
// Eén plek voor paden, TTL en versies zodat generator, claim-flow,
// emitter-route, MCP-tool en dashboard nooit uit de pas lopen.
// =============================================================

/** Upstream-specversie waartegen elk gegenereerd bestand valideert (gepind). */
export const BRAND_MD_CORE_VERSION = '0.3.0';

/** Canonieke bestandsnaam per spec 0.3 (uppercase, exact). */
export const BRAND_MD_FILE_NAME = 'BRAND.md';

/** Publieke paden (App Router; buiten de SPA-shell zodat ze zonder auth werken). */
export const BRAND_MD_GENERATOR_PATH = '/brandmd';
export const BRAND_MD_USE_HUB_PATH = '/brandmd/use';
export const BRAND_MD_CLAIM_PATH = '/brandmd/claim';

/** Draft-borging (launch-plan §4b + task-file §Ontwerp claim-borging). */
export const DRAFT_TTL_DAYS = 90;

/** Versie van het draft-payload-schema — gepind zodat oude drafts
 *  materialiseerbaar blijven na code-wijzigingen (fallback: re-scan). */
export const DRAFT_PAYLOAD_VERSION = 1;

/** Rate-limits voor de anonieme generator (kostenparagraaf 2026-08-03):
 *  per IP én per doeldomein, ruim genoeg voor echt gebruik, krap genoeg
 *  tegen scrape-misbruik. */
export const GENERATOR_MAX_RUNS_PER_IP_PER_DAY = 10;
export const GENERATOR_MAX_RUNS_PER_DOMAIN_PER_DAY = 5;
/** Kosten-backstop onafhankelijk van header-spoofing: totaalplafond per dag. */
export const GENERATOR_MAX_RUNS_GLOBAL_PER_DAY = 500;

export function appBaseUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  return base ? base.replace(/\/$/, '') : undefined;
}

export function claimUrl(token: string): string | undefined {
  const base = appBaseUrl();
  return base ? `${base}${BRAND_MD_CLAIM_PATH}/${token}` : undefined;
}

/** Download-link voor in mails — het rauwe token is de capability. */
export function brandMdDownloadUrl(token: string): string | undefined {
  const base = appBaseUrl();
  return base ? `${base}/api/brandmd/download?token=${encodeURIComponent(token)}` : undefined;
}

/** Unsubscribe-link (lifecycle-mails 2.2-2.4) — zelfde token-capability. */
export function brandMdUnsubscribeUrl(token: string): string | undefined {
  const base = appBaseUrl();
  return base ? `${base}/api/brandmd/unsubscribe?token=${encodeURIComponent(token)}` : undefined;
}
