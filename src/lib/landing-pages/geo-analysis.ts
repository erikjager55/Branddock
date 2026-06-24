/**
 * GEO/SEO Fase 3 — meet-haak. Bouwt een deterministische GEO-optimalisatie-
 * analyse voor een gepubliceerd long-form GEO-artikel: de F-VAL GEO-score +
 * signalen + verbeterpunten, de geëmitte schema.org-types (BlogPosting/FAQPage/
 * DefinedTermSet) en de canonical URL. Wordt bij publish op
 * `Deliverable.settings.geoOptimizationAnalysis` gepersisteerd zodat een latere
 * GEO-dashboard/meting de data heeft — de externe crawler-citatie-meting zelf is
 * out-of-scope (alleen de data-haak).
 *
 * Pure functie — geen DB/AI (computeGeoScore is judge-vrij + in-process).
 */
import { computeGeoScore, type GeoSignalScores } from '../brand-fidelity/geo-fidelity-scorer';
import { cleanStatSource } from './sanitize-geo-sources';
import { buildBlogPostingJsonLd } from './page-json-ld';
import type { LongFormGeoVariantContent } from './page-type-schemas';

/**
 * Bouwt een GEO-score-representatieve tekst uit de gestructureerde geoArticle.
 * NIET de render-flatten (die zet de korte hero-headline eerst, waardoor de
 * answer-first-heuristiek de headline meet i.p.v. answerFirstIntro). Hier komt
 * answerFirstIntro als eerste alinea, een gelabelde TL;DR + genummerde listItems
 * leveren de structurele cues, en citeableStats dragen hun bron mee — zodat elke
 * heuristiek het bedoelde GEO-veld meet.
 */
function buildGeoScoringText(v: LongFormGeoVariantContent): string {
  const parts: string[] = [v.answerFirstIntro];
  if (v.tldr.length > 0) parts.push(`TL;DR: ${v.tldr.join(' ')}`);
  for (const s of v.sections) parts.push(s.body);
  for (const qa of v.qa) parts.push(`${qa.question}\n${qa.answer}`);
  for (const item of v.listItems ?? []) parts.push(`${item.rank}. ${item.title}: ${item.body}`);
  for (const stat of v.citeableStats) {
    const src = cleanStatSource(stat.source);
    parts.push(src ? `${stat.label}: ${stat.value} (bron: ${src}).` : `${stat.label}: ${stat.value}.`);
  }
  return parts.join('\n\n');
}

export interface GeoOptimizationAnalysis {
  /** F-VAL GEO-composietscore 0-100 (deterministisch). */
  geoScore: number;
  /** De vijf onderliggende GEO-signalen. */
  signals: GeoSignalScores;
  /** Mensleesbare verbeterpunten (zwakke signalen). */
  findings: string[];
  /** schema.org-@types die de pagina emit (BlogPosting + evt. FAQPage/DefinedTermSet). */
  schemaTypes: string[];
  /** De canonical URL zoals gezien op meetmoment (drift-detectie bij rename/slug). */
  canonicalUrl: string;
  /** ISO-timestamp van de meting (anker voor 90-dagen-staleness via isContentStale). */
  measuredAt: string;
}

/**
 * Bereken de GEO-optimalisatie-analyse voor één gepubliceerd GEO-artikel.
 * `now` wordt ingegeven (deterministisch testbaar). schemaTypes komen uit de
 * échte JSON-LD-builder zodat ze altijd matchen met wat de pagina emit.
 */
export function buildGeoOptimizationAnalysis(opts: {
  variant: LongFormGeoVariantContent;
  canonicalUrl: string;
  now: Date;
}): GeoOptimizationAnalysis {
  const geo = computeGeoScore(buildGeoScoringText(opts.variant));
  const jsonLd = buildBlogPostingJsonLd(opts.variant);
  const graph = (jsonLd['@graph'] as Array<{ '@type'?: unknown }>) ?? [];
  const schemaTypes = graph
    .map((n) => (typeof n['@type'] === 'string' ? (n['@type'] as string) : null))
    .filter((t): t is string => t !== null);

  return {
    geoScore: geo.score,
    signals: geo.signals,
    findings: geo.findings,
    schemaTypes,
    canonicalUrl: opts.canonicalUrl,
    measuredAt: opts.now.toISOString(),
  };
}
