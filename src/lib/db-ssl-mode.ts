// =============================================================
// sslmode-semantiek van `pg` — vandaag streng, na de major zwakker
//
// `pg` waarschuwt sinds 8.20:
//
//   The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases
//   for 'verify-full'. In the next major version (pg-connection-string v3.0.0
//   and pg v9.0.0), these modes will adopt standard libpq semantics, which
//   have weaker security guarantees.
//
// Vandaag betekent onze `sslmode=require` dus verify-full: certificaat én
// hostnaam worden gecontroleerd. Ná de major betekent dezelfde string alleen
// nog "versleuteld" — zonder die twee controles. Er breekt niets, er komt geen
// foutmelding, en de garantie zakt stil. De faalmodus is stilte, en dat is
// precies het patroon waar dit project vaker op is gestuit.
//
// Gemeten tegen `branddock-prod` (2026-08-18): `verify-full` verbindt in 189ms,
// `require` in 471ms — Neon levert een geldig publiek certificaat, dus de
// strengste modus kost niets. Veelzeggend: `no-verify` verbindt óók gewoon.
// Precies daarom is een expliciete modus in de string nodig en niet een aanname.
// =============================================================

/** Modi die ná de pg-major zwakker worden dan ze vandaag zijn. */
const WEAKENING_MODES = new Set(["require", "prefer", "verify-ca"]);

/**
 * Modi die vandaag al zwak zijn — ze wórden niet zwakker, ze zíjn het.
 *
 * Dit onderscheid is bewust: een `weakening`-oordeel gaat over de pg-major,
 * een `weak`-oordeel over de verbinding nú. Ze in één niveau gooien zou de
 * functie over haar eigen onderwerp laten liegen (`no-verify` wordt echt niet
 * zwakker door de major). Ze allebei laten passeren was het gat dat dit
 * niveau dicht: tot 2026-08-19 gaf `no-verify` gewoon `ok`, en
 * `env-validation.ts` las dat als "geen bezwaar" — óók met
 * `DATABASE_SSL_STRICT=true`. De strengste stand liet de zwakste modus door.
 */
const ALREADY_WEAK_MODES = new Set(["disable", "allow", "no-verify"]);

/** Wat libpq + node-postgres samen accepteren. Alles daarbuiten is een typfout. */
const KNOWN_MODES = new Set([
  "verify-full",
  ...WEAKENING_MODES,
  ...ALREADY_WEAK_MODES,
]);

export type SslModeVerdict =
  | { level: "ok"; mode: string }
  | { level: "weakening"; mode: string; message: string }
  | { level: "weak"; mode: string; message: string }
  | { level: "unknown"; mode: string; message: string }
  | { level: "missing"; message: string }
  | { level: "not-applicable"; reason: string };

/**
 * Beoordeel de `sslmode` van een connection string.
 *
 * Pure functie — geen env-toegang, geen I/O — zodat het oordeel toetsbaar is
 * zonder de app te booten.
 *
 * @param url         de `DATABASE_URL`
 * @param isProduction of dit een productie-omgeving is; lokaal draait Postgres
 *   zonder TLS en dan is een ontbrekende `sslmode` juist correct.
 */
export function judgeDatabaseSslMode(url: string | undefined, isProduction: boolean): SslModeVerdict {
  if (!url) return { level: "not-applicable", reason: "geen DATABASE_URL" };

  let mode: string | null = null;
  try {
    mode = new URL(url).searchParams.get("sslmode");
  } catch {
    // Een string die geen geldige URL is, valt buiten dit oordeel: de
    // bestaande DATABASE_URL-validatie klaagt daar al over.
    return { level: "not-applicable", reason: "DATABASE_URL is geen geldige URL" };
  }

  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  if (!isProduction && isLocal) {
    return { level: "not-applicable", reason: "lokale database zonder TLS" };
  }

  if (!mode) {
    return {
      level: "missing",
      message:
        "DATABASE_URL draagt geen sslmode. Vandaag valt pg terug op verify-full-gedrag, " +
        "maar na de major (pg v9) is dat niet meer zo. Zet expliciet sslmode=verify-full.",
    };
  }

  if (ALREADY_WEAK_MODES.has(mode)) {
    return {
      level: "weak",
      mode,
      message:
        `DATABASE_URL gebruikt sslmode=${mode}. Dat is vandaag al zwak: ` +
        (mode === "disable"
          ? "de verbinding is niet eens versleuteld."
          : "versleuteld zonder certificaat- of hostnaamcontrole, dus kwetsbaar voor een man-in-the-middle.") +
        " Dit wordt niet zwakker door de pg-major — het ís het al. " +
        "Zet sslmode=verify-full — geverifieerd werkend tegen Neon, en sneller.",
    };
  }

  if (!KNOWN_MODES.has(mode)) {
    return {
      level: "unknown",
      mode,
      message:
        `DATABASE_URL draagt sslmode=${mode}, en dat is geen modus die libpq of ` +
        "node-postgres kent. Waarschijnlijk een typfout; het gedrag is dan niet wat " +
        "de string suggereert. Zet sslmode=verify-full.",
    };
  }

  if (WEAKENING_MODES.has(mode)) {
    return {
      level: "weakening",
      mode,
      message:
        `DATABASE_URL gebruikt sslmode=${mode}. Dat gedraagt zich vandaag als verify-full, ` +
        "maar wordt na de pg-major libpq-semantiek: versleuteld zónder certificaat- en " +
        "hostnaamcontrole. Dezelfde string, zwakkere garantie, geen foutmelding. " +
        "Zet sslmode=verify-full — geverifieerd werkend tegen Neon.",
    };
  }

  return { level: "ok", mode };
}

/**
 * Moet de applicatie weigeren te starten op dit oordeel?
 *
 * Bewust een aparte pure functie en niet een `if` in `env-validation.ts`: de
 * beslissing zat daar tot 2026-08-19 verstopt in een opsomming van slechte
 * niveaus (`weakening || missing`), en juist die opsomming was het gat —
 * `no-verify` stond er niet in en passeerde stil, óók onder
 * `DATABASE_SSL_STRICT=true`.
 *
 * Nu een allowlist: alleen `ok` en `not-applicable` komen door. Een nieuw
 * niveau is daarmee standaard blokkerend in plaats van standaard toegestaan —
 * de veilige kant van een vergissing.
 *
 * @param verdict het oordeel uit {@link judgeDatabaseSslMode}
 * @param strict  of `DATABASE_SSL_STRICT=true` staat
 * @returns of de startup hard moet falen
 */
export function shouldFailStartup(verdict: SslModeVerdict, strict: boolean): boolean {
  if (verdict.level === "ok" || verdict.level === "not-applicable") return false;
  return strict;
}
