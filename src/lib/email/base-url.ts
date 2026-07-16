// =============================================================
// Canonieke basis-URL voor links in e-mails — één bron-of-truth.
//
// Waarom: links in mails werden op drie plekken verschillend gebouwd en
// braken na de domein-cutover (2026-07-16):
//  - notify-run-finished: `BETTER_AUTH_URL ?? localhost` — maar op prod is
//    BETTER_AUTH_URL bewust een LEGE STRING (Better Auth host-inferentie),
//    en '' ?? x geeft '' → kapotte relatieve links.
//  - invite-route: fallback naar de marketing-apex i.p.v. de app-host.
//  - Better-Auth-mails (verificatie/reset): de url-origin volgt het request,
//    dus wie via de oude vercel-URL werkt kreeg vercel-links.
//
// NEXT_PUBLIC_APP_URL is sinds de cutover de canonieke app-host
// (https://app.branddock.app) en staat op prod. Lokaal valt dit terug op
// BETTER_AUTH_URL (http://localhost:3000) zodat dev-mail-links blijven werken.
// =============================================================

/** De canonieke basis-URL (zonder trailing slash) voor app-links in e-mails. */
export function emailBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    'http://localhost:3000';
  return base.replace(/\/$/, '');
}

/**
 * Herschrijf de origin van een (door Better Auth gegenereerde) URL naar de
 * canonieke app-host. Tokens in path/query blijven intact — die zijn
 * host-onafhankelijk. Zonder geconfigureerde canonieke host (dev) of bij een
 * niet-parsebare URL wordt de input ongewijzigd teruggegeven.
 *
 * NB: Better Auth resolvet de relatieve `redirectTo` op request-time naar een
 * ABSOLUTE `callbackURL`-queryparam ín de mail-URL. Alleen de buitenste origin
 * herschrijven is dus niet genoeg: na de token-verificatie redirect Better Auth
 * naar die geneste URL en belandt de gebruiker alsnog op de legacy-host
 * (gebeurde 2026-07-16: reset aangevraagd op *.vercel.app → verificatie op de
 * app-host → redirect terug naar *.vercel.app). Daarom herschrijven we ook
 * absolute URL's in queryparams.
 */
export function canonicalizeEmailUrl(url: string): string {
  const canonical = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!canonical) return url;
  try {
    const base = new URL(canonical);
    const parsed = new URL(url);
    parsed.protocol = base.protocol;
    parsed.host = base.host;
    // Geneste absolute URL's (callbackURL/redirectTo e.d.) mee-canonicaliseren.
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!/^https?:\/\//i.test(value)) continue;
      try {
        const nested = new URL(value);
        nested.protocol = base.protocol;
        nested.host = base.host;
        parsed.searchParams.set(key, nested.toString());
      } catch {
        // niet-parsebare waarde — laten staan
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
