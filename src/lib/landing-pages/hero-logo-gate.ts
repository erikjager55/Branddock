/**
 * W5 logo L-Fase 2 — hero-pad (plan §5): acteer op de al-gescoorde
 * `logo-fidelity`-dimensie van de vision-judge.
 *
 * De generate-visual route patcht uploads[0] direct als hero en triggert
 * daarna fire-and-forget visual-fidelity-scoring per variant. Tot W5
 * acteerde niets op die scores. Deze gate draait in dezelfde async
 * continuation (geen extra latency op de hero-respons): wanneer de actieve
 * hero logo-fidelity < drempel scoort en een zustervariant wél schoon is,
 * wisselt de hero automatisch naar die schone variant (auto-deselect,
 * deterministisch, $0).
 *
 * Bewust GEEN auto-refine wanneer alle varianten geflagd zijn: het bestaande
 * refine-pad (refine-visual route) voert brand-style-anchors als compose-
 * inputs — precies trigger T2 uit de logo-trace (échte merkfoto's mét logo
 * waarvan multi-ref-fusion het logo verminkt terugkopieert). Auto-refinen
 * zou het defect dus kunnen herintroduceren. In dat geval: structured warn;
 * de handmatige refine-knop (mét logo-fidelity-hint uit extractRefineHint)
 * blijft de escape-hatch.
 *
 * Race-guard: de swap gebeurt alleen wanneer de huidige hero-URL in de
 * settings nog één van de zojuist gegenereerde varianten is — heeft de user
 * intussen handmatig een ander beeld gekozen, dan is de gate een no-op.
 */

import { prisma } from "@/lib/prisma";
import { patchHeroVisualUrl } from "@/lib/deliverable/patch-hero-visual";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/** Plan §5: logo-fidelity < 50 = "logo present but distorted" of erger. */
export const HERO_LOGO_FIDELITY_THRESHOLD = 50;

export interface HeroLogoVariant {
  componentId: string;
  url: string;
  /** logo-fidelity-dimensiescore 0-100; null = niet gescoord/judge geskipt. */
  logoFidelity: number | null;
}

export type HeroLogoDecision =
  | { action: "none"; reason: string }
  | { action: "swap"; from: HeroLogoVariant; to: HeroLogoVariant };

/**
 * Pure beslisfunctie (unit-smokebaar): bepaal of de actieve hero-variant
 * wegens een geflagd logo gewisseld moet worden naar een schone zustervariant.
 *
 * - De actieve hero = de variant waarvan de URL gelijk is aan `currentHeroUrl`.
 *   Geen match → de user koos intussen iets anders → no-op (race-guard).
 * - Hero ongescoord of ≥ drempel → no-op.
 * - Schoonste alternatief = hoogste logo-fidelity ≥ drempel; geen schone
 *   variant → no-op met reden 'no-clean-variant' (caller logt structured warn).
 */
export function decideHeroLogoSwap(
  variants: HeroLogoVariant[],
  currentHeroUrl: string | null | undefined,
): HeroLogoDecision {
  if (variants.length === 0) return { action: "none", reason: "no-variants" };
  const hero = variants.find((v) => v.url === currentHeroUrl);
  if (!hero) return { action: "none", reason: "hero-not-ours" };
  if (hero.logoFidelity === null) return { action: "none", reason: "hero-unscored" };
  if (hero.logoFidelity >= HERO_LOGO_FIDELITY_THRESHOLD) {
    return { action: "none", reason: "hero-clean" };
  }
  const clean = variants
    .filter((v) => v.componentId !== hero.componentId && v.logoFidelity !== null && v.logoFidelity >= HERO_LOGO_FIDELITY_THRESHOLD)
    .sort((a, b) => (b.logoFidelity ?? 0) - (a.logoFidelity ?? 0))[0];
  if (!clean) return { action: "none", reason: "no-clean-variant" };
  return { action: "swap", from: hero, to: clean };
}

/** Parse de logo-fidelity-score uit het gepersisteerde aiJudgeDimensions-JSON. */
export function extractLogoFidelity(aiJudgeDimensions: unknown): number | null {
  if (!aiJudgeDimensions || typeof aiJudgeDimensions !== "object") return null;
  const dims = (aiJudgeDimensions as { dimensions?: Record<string, { score?: unknown }> }).dimensions;
  const score = dims?.["logo-fidelity"]?.score;
  return typeof score === "number" ? score : null;
}

/**
 * Async runner — draait in de fire-and-forget scoring-continuation van de
 * generate-visual route (target='hero'). Leest de zojuist gepersisteerde
 * ContentVisualFidelityScore-rows, beslist, en voert de swap uit:
 * hero-URL re-patch + isSelected-flip op de variant-rows. Gooit nooit.
 */
export async function runHeroLogoGate(input: {
  deliverableId: string;
  workspaceId: string;
  variants: Array<{ componentId: string; url: string }>;
}): Promise<HeroLogoDecision | null> {
  const { deliverableId, workspaceId, variants } = input;
  try {
    if (variants.length === 0) return null;

    const scores = await prisma.contentVisualFidelityScore.findMany({
      where: { workspaceId, componentId: { in: variants.map((v) => v.componentId) } },
      orderBy: { scoredAt: "desc" },
      select: { componentId: true, aiJudgeDimensions: true },
    });
    // Nieuwste score per component (rescores kunnen meerdere rows geven).
    const latestByComponent = new Map<string, unknown>();
    for (const s of scores) {
      if (!latestByComponent.has(s.componentId)) {
        latestByComponent.set(s.componentId, s.aiJudgeDimensions);
      }
    }

    const scoredVariants: HeroLogoVariant[] = variants.map((v) => ({
      ...v,
      logoFidelity: extractLogoFidelity(latestByComponent.get(v.componentId)),
    }));

    // Huidige hero-URL uit de verse settings (race-guard: user kan intussen
    // handmatig gewisseld hebben — dan matcht geen van onze URLs).
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { settings: true },
    });
    const settings = (deliverable?.settings ?? {}) as Record<string, unknown>;
    const sv = settings.structuredVariant as { hero?: { heroVisualUrl?: unknown } } | undefined;
    const currentHeroUrl = typeof sv?.hero?.heroVisualUrl === "string" ? sv.hero.heroVisualUrl : null;

    const decision = decideHeroLogoSwap(scoredVariants, currentHeroUrl);

    if (decision.action === "none") {
      if (decision.reason === "no-clean-variant") {
        // Bewust geen auto-refine (T2 — zie module-docblock). Structured warn
        // conform de silent-return-regel; handmatige refine blijft beschikbaar.
        console.warn("[hero-logo-gate] hero geflagd maar geen schone variant beschikbaar — geen auto-actie", {
          deliverableId,
          logoFidelity: scoredVariants.find((v) => v.url === currentHeroUrl)?.logoFidelity ?? null,
          threshold: HERO_LOGO_FIDELITY_THRESHOLD,
        });
      }
      return decision;
    }

    // Swap: hero-URL atomisch re-patchen + selectie-flip op de variant-rows.
    await patchHeroVisualUrl(deliverableId, decision.to.url);
    await prisma.deliverableComponent.updateMany({
      where: { id: decision.from.componentId },
      data: { isSelected: false },
    });
    await prisma.deliverableComponent.updateMany({
      where: { id: decision.to.componentId },
      data: { isSelected: true },
    });
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.studio(workspaceId));
    console.log(
      "[hero-logo-gate] hero auto-deselect: logo-fidelity %d < %d → schone variant (logo-fidelity %d) — deliverable %s",
      decision.from.logoFidelity,
      HERO_LOGO_FIDELITY_THRESHOLD,
      decision.to.logoFidelity,
      deliverableId,
    );
    return decision;
  } catch (err) {
    // Gate is best-effort: een fout mag de (al geleverde) hero nooit raken.
    console.warn("[hero-logo-gate] gefaald (non-fatal):", err instanceof Error ? err.message : err);
    return null;
  }
}
