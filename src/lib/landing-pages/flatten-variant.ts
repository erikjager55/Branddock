import type { LandingPageVariantContent } from "./variant-schema";
import type {
  FaqPageVariantContent,
  LongFormGeoVariantContent,
  MicrositeChapter,
  MicrositeVariantContent,
  PageVariantContent,
  ProductPageVariantContent,
} from "./page-type-schemas";
import { cleanStatSource } from "./sanitize-geo-sources";

/**
 * Plat-tekst-projectie van LandingPageVariantContent voor F-VAL scoring.
 * Concateneert alle copy-velden in display-volgorde (Hero → Trust → Problem
 * → Features → SocialProof → Pricing → FAQ → FinalCta) zodat de runner een
 * representatieve text-blob krijgt om style/judge/rules op uit te voeren.
 *
 * Bewust geen markdown-formatting — de runner werkt op platte tekst en voegt
 * zelf de heuristics-pakketten toe. Veld-namen volgen `landingPageVariantSchema`
 * 1-op-1. Gedeeld door score-variant-fidelity + auto-iterate-variant routes.
 */
export function flattenVariantToText(variant: LandingPageVariantContent): string {
  const parts: string[] = [];

  if (variant.hero.eyebrow) parts.push(variant.hero.eyebrow);
  parts.push(variant.hero.headline);
  parts.push(variant.hero.subhead);
  parts.push(variant.hero.primaryCta);
  if (variant.hero.secondaryCta) parts.push(variant.hero.secondaryCta);

  for (const item of variant.trust.items) {
    parts.push(item.label);
  }

  if (variant.problem) {
    parts.push(variant.problem.heading);
    for (const b of variant.problem.painBullets) parts.push(b);
    parts.push(variant.problem.bridgingSentence);
  }

  parts.push(variant.features.sectionHeading);
  for (const item of variant.features.items) {
    parts.push(item.heading);
    parts.push(item.body);
  }

  for (const t of variant.socialProof.testimonials) {
    parts.push(t.quote);
    // Audit 2026-06-10: authorCompany mag leeg zijn (anti-fabricage fallback) —
    // filter lege delen zodat er geen hangende komma in de judge-input komt.
    parts.push([t.authorName, t.authorRole, t.authorCompany].filter(Boolean).join(", "));
    if (t.outcome) parts.push(t.outcome);
  }
  for (const s of variant.socialProof.impactStats ?? []) {
    parts.push(`${s.value} ${s.label}`);
  }

  if (variant.pricing) {
    for (const tier of variant.pricing.tiers) {
      parts.push(`${tier.name} ${tier.price}`);
      for (const f of tier.features) parts.push(f);
    }
  }

  for (const f of variant.faq.items) {
    parts.push(f.question);
    parts.push(f.answer);
  }

  parts.push(variant.finalCta.heading);
  parts.push(variant.finalCta.riskReducer);
  parts.push(variant.finalCta.primaryCta);

  return parts.filter((p) => typeof p === "string" && p.trim().length > 0).join("\n\n");
}

const joinParts = (parts: Array<string | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0).join("\n\n");

/** W1 — flatten voor FaqPageVariantContent: hero → popular → categorieën → escape → cta. */
function flattenFaqVariant(v: FaqPageVariantContent): string {
  const parts: Array<string | null | undefined> = [v.hero.headline, v.hero.subline];
  for (const qa of v.popularQuestions) parts.push(qa.question, qa.answer);
  for (const cat of v.categories) {
    parts.push(cat.label);
    for (const qa of cat.items) parts.push(qa.question, qa.answer);
  }
  parts.push(v.contactEscape.heading, v.contactEscape.body, v.contactEscape.ctaLabel);
  parts.push(v.closingCta.heading, v.closingCta.ctaLabel);
  return joinParts(parts);
}

/** W1 — flatten voor ProductPageVariantContent in display-volgorde (plan §2.1). */
function flattenProductVariant(v: ProductPageVariantContent): string {
  const parts: Array<string | null | undefined> = [
    v.hero.headline, v.hero.subline, v.hero.primaryCta, v.hero.secondaryCta,
    v.problem.heading, v.problem.body,
    v.solution.heading, v.solution.body,
  ];
  for (const f of v.features) parts.push(f.heading, f.body);
  for (const u of v.useCases ?? []) parts.push(u.heading, u.body);
  for (const s of v.specs ?? []) parts.push(`${s.label}: ${s.value}`);
  for (const p of v.processSteps ?? []) parts.push(p.heading, p.body);
  if (v.pricing) parts.push(v.pricing.heading, v.pricing.body);
  for (const qa of v.faq) parts.push(qa.question, qa.answer);
  parts.push(v.finalCta.heading, v.finalCta.body, v.finalCta.primaryCta, v.finalCta.secondaryCta);
  return joinParts(parts);
}

/** GEO Fase 2 — flatten voor LongFormGeoVariantContent in display-volgorde. */
function flattenGeoArticleVariant(v: LongFormGeoVariantContent): string {
  const parts: Array<string | null | undefined> = [v.hero.headline, v.hero.subline, v.answerFirstIntro];
  for (const b of v.tldr) parts.push(b);
  for (const s of v.sections) parts.push(s.heading, s.body);
  for (const st of v.citeableStats) {
    const src = cleanStatSource(st.source);
    parts.push(src ? `${st.value} ${st.label} (${src})` : `${st.value} ${st.label}`);
  }
  for (const d of v.definitions ?? []) parts.push(d.term, d.definition);
  if (v.comparison) {
    parts.push(v.comparison.caption);
    parts.push(v.comparison.columns.join(" "));
    for (const r of v.comparison.rows) parts.push([r.label, ...r.cells].join(" "));
  }
  for (const it of v.listItems ?? []) parts.push(it.title, it.body);
  for (const qa of v.qa) parts.push(qa.question, qa.answer);
  for (const src of v.sources ?? []) parts.push(src.title);
  parts.push(v.finalCta.heading, v.finalCta.ctaLabel);
  return joinParts(parts);
}

function flattenChapter(c: MicrositeChapter | null | undefined): Array<string | null | undefined> {
  if (!c) return [];
  const parts: Array<string | null | undefined> = [c.heading, c.intro];
  for (const b of c.blocks) parts.push(b.heading, b.body);
  if (c.stat) parts.push(`${c.stat.value} ${c.stat.context}`);
  if (c.quote) parts.push(c.quote.text, c.quote.attribution);
  return parts;
}

/** W1 — flatten voor MicrositeVariantContent: hero → chapters → join. */
function flattenMicrositeVariant(v: MicrositeVariantContent): string {
  const parts: Array<string | null | undefined> = [
    v.heroManifest.headline, v.heroManifest.subline, v.heroManifest.primaryCta,
    ...flattenChapter(v.story),
    ...flattenChapter(v.impact),
    ...flattenChapter(v.community),
    v.join.heading, v.join.body, v.join.primaryCta, v.join.deadline,
  ];
  return joinParts(parts);
}

/**
 * W1 — type-aware flatten voor F-VAL scoring over de PageVariantContent-union.
 * Dispatcht op shape (structureel, geen contentType nodig): deterministische
 * volgorde per type zodat scoring stabiel blijft. LP-varianten lopen door de
 * bestaande flattenVariantToText ongewijzigd.
 */
export function flattenPageVariantToText(variant: PageVariantContent): string {
  if ("heroManifest" in variant) return flattenMicrositeVariant(variant);
  if ("popularQuestions" in variant) return flattenFaqVariant(variant);
  if ("solution" in variant) return flattenProductVariant(variant);
  if ("geoArticle" in variant) return flattenGeoArticleVariant(variant);
  return flattenVariantToText(variant);
}
