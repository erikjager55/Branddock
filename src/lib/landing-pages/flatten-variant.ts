import type { LandingPageVariantContent } from "./variant-schema";

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
    parts.push(`${t.authorName}, ${t.authorRole}, ${t.authorCompany}`);
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
