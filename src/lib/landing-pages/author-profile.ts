/**
 * GEO/SEO Fase 3 — E-E-A-T author-profiel + freshness-helpers.
 *
 * Het author-profiel leeft additief op `Workspace.authorProfile` (Json). Het
 * voedt het Person+sameAs-knooppunt in BlogPosting JSON-LD — een sterk E-E-A-T-
 * signaal voor AI-answer-engines. We emitten een author UITSLUITEND bij een
 * verifieerbare identiteit (een ingevulde naam); een leeg/ongeldig profiel geeft
 * `null` zodat er niets misleidends in de structured data belandt.
 *
 * Pure functies — geen DB/AI. De caller leest `Workspace.authorProfile` (Json)
 * en geeft de ruwe waarde door aan `resolveAuthorProfile`.
 */

/** Genormaliseerd author-profiel zoals geëmit in JSON-LD (Person). */
export interface AuthorProfile {
  /** Volledige naam — verplicht; zonder naam wordt geen author geëmit. */
  name: string;
  /** Functietitel (bijv. "Head of Content") — optioneel. */
  jobTitle?: string;
  /** Verifieerbare identiteits-URLs (LinkedIn, persoonlijke site) — http(s) only. */
  sameAs?: string[];
}

/**
 * Valideert + normaliseert een ruwe `Workspace.authorProfile`-Json tot een
 * `AuthorProfile`, of `null` wanneer er geen verifieerbare identiteit is.
 * Defensief: Prisma's Json is runtime-onbekend. sameAs wordt gefilterd op
 * http(s)-URLs (geen mailto/relatieve paden in structured data).
 */
export function resolveAuthorProfile(raw: unknown): AuthorProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return null; // geen verifieerbare identiteit → geen author

  const profile: AuthorProfile = { name };
  if (typeof obj.jobTitle === 'string' && obj.jobTitle.trim()) {
    profile.jobTitle = obj.jobTitle.trim();
  }
  if (Array.isArray(obj.sameAs)) {
    const urls = obj.sameAs
      .filter((u): u is string => typeof u === 'string')
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    if (urls.length > 0) profile.sameAs = urls;
  }
  return profile;
}

/** Aantal milliseconden in N dagen. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Default staleness-drempel voor gepubliceerde GEO-content (90 dagen). */
export const DEFAULT_STALENESS_DAYS = 90;

/**
 * Bepaalt of een gepubliceerde pagina "stale" is: laatst gewijzigd langer dan
 * `staleAfterDays` geleden. Pure functie — `now` wordt ingegeven (deterministisch
 * testbaar, geen Date.now() in de lib-laag). Ongeldige/ontbrekende datum → niet
 * stale (fail-soft; we markeren niets ten onrechte).
 */
export function isContentStale(
  lastModifiedIso: string | null | undefined,
  now: Date,
  staleAfterDays: number = DEFAULT_STALENESS_DAYS,
): boolean {
  if (!lastModifiedIso) return false;
  const modified = new Date(lastModifiedIso).getTime();
  if (Number.isNaN(modified)) return false;
  return now.getTime() - modified > staleAfterDays * DAY_MS;
}
