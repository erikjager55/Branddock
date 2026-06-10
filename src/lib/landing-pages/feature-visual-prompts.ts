/**
 * Server-side prompt-builder voor LP feature-beelden (Fase 3,
 * audit 2026-06-10-lp-feature-image-diversity).
 *
 * Vervangt de client-verbatim prompts van buildFeatureVisualInstruction: de
 * route bouwt prompts zelf uit de imageBrief van de copy-LLM (R7) + de
 * gesaneerde stijl-tokens (R1), met per-slot scene-templates, angle-rotatie
 * en een sibling-differentiatie-regel (R4). Pure functies — geen I/O.
 */
import type { BrandTokens } from "./brand-tokens";
import type { ImageBrief } from "./variant-schema";

export interface FeatureSlotInput {
  /** Feature-index binnen de pagina — bepaalt persist-groep + angle-rotatie. */
  index: number;
  heading: string;
  body: string;
  /** Visuele richting uit de copy-LLM; null bij legacy variants → fallback. */
  imageBrief?: ImageBrief | null;
}

export interface FeaturePromptContext {
  brand?: {
    brandImageryStyle?: string | null;
    brandName?: string | null;
  } | null;
  brandTokens?: Pick<BrandTokens, "photography"> | null;
}

export interface BuiltFeaturePrompt {
  index: number;
  prompt: string;
  /** brief.avoid — caller routeert dit naar het userNegations-slot van buildNegativePrompt. */
  avoid: string | null;
  /** Per-slot seed: nano-banana-pro is deterministisch per seed (empirisch
   *  geverifieerd, scripts/experiments/test-nano-banana-seed.ts) — verschillende
   *  seeds garanderen verschillende beelden bij gelijkende prompts. */
  seed: number;
}

/**
 * Compositie-sjabloon per sceneType — vertaalt de brief-typologie naar een
 * concrete camera-instructie. 'person' krijgt expliciet de anti-pose-regel
 * die de hero-pipeline al had en het feature-pad miste (R3/R4).
 */
const SCENE_TYPE_TEMPLATES: Record<ImageBrief["sceneType"], string> = {
  object:
    "Editorial product still-life — the object is the hero of the frame, clean staging, no people",
  process:
    "In-context action shot — hands or a person mid-task, candid, suggested motion, NO posed look at the camera",
  detail:
    "Macro close-up of material and texture — shallow depth of field, the detail fills the frame",
  location:
    "Wide environmental shot of the real setting — natural light, sense of place, people at most incidental in the background",
  person:
    "Candid human moment — over-the-shoulder, profile or working pose; NEVER a frontal posed portrait facing the camera, no crossed arms",
};

/**
 * Gepolariseerde compositie-hoeken voor het fallback-pad (legacy variants
 * zonder imageBrief) — geroteerd per feature-index zodat zelfs zonder brief
 * geen twee slots dezelfde compositie-instructie delen (ANGLE_SETS-patroon
 * uit visual-brief-prompts.ts).
 */
const FALLBACK_ANGLES: readonly string[] = [
  "Macro material close-up — texture fills the frame, shallow depth of field, no people",
  "Hands-at-work in-context shot — candid action, no posed look at the camera",
  "Wide environmental shot of the setting — natural light, sense of place",
  "Object still-life — the subject as hero, clean staging, intentional negative space",
];

const SINGLE_PHOTO_RULE =
  "A SINGLE cohesive full-frame photograph — one continuous scene, NOT a collage/triptych/split-panel/grid; no internal borders or seams. No text, no UI, no infographic, no logo";

/**
 * R1-zijdeur-fix (review 2026-06-10): brand-context bouwt brandImageryStyle als
 * "Photography mood: …. Subjects: …. Composition: …. Guidelines: …" — de
 * integrale string her-importeert de per-beeld dimensies (subjects/compositie)
 * die de token-split juist uit feature-prompts haalde. Parse per marker en
 * lever alleen de deelbare delen (mood + guidelines) voor het feature-pad.
 */
function featureSafeImagerySegments(
  style: string | null | undefined,
): { mood: string | null; guidelines: string | null } {
  if (!style?.trim()) return { mood: null, guidelines: null };
  const markers = [...style.matchAll(/\b(Photography mood|Subjects|Composition|Guidelines):/gi)];
  if (markers.length === 0) return { mood: style.trim(), guidelines: null };
  const segments = markers.map((m, i) => ({
    label: m[1].toLowerCase(),
    text: style.slice((m.index ?? 0), markers[i + 1]?.index ?? style.length).replace(/[.\s]+$/, "").trim(),
  }));
  const mood = segments.find((s) => s.label === "photography mood")?.text ?? null;
  return {
    // Label strippen — anders wordt het "Brand imagery: Photography mood: …".
    mood: mood ? mood.replace(/^photography mood:\s*/i, "").trim() || null : null,
    guidelines: segments.find((s) => s.label === "guidelines")?.text ?? null,
  };
}

/** Begrensde, niet-cryptografische seed (fal verwacht een 32-bit int). */
function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

/**
 * Bouw de prompts voor alle feature-slots van één pagina in samenhang: elke
 * prompt kent de subjects van z'n siblings zodat het model expliciet
 * gedifferentieerd wordt aangestuurd (R4 — voorheen 4 onafhankelijke calls
 * met ~600 chars identieke staart).
 *
 * Volgorde binnen de prompt is essentials-eerst (onderwerp → scene → compositie
 * → differentiatie → vorm-regels → stijl → brand) zodat model-truncatie
 * (fal-client cap) nooit het onderwerp raakt.
 */
export function buildFeatureVisualPrompts(
  slots: FeatureSlotInput[],
  pageHeadline: string,
  ctx: FeaturePromptContext | null,
): BuiltFeaturePrompt[] {
  const subjects = slots.map(
    (s) => s.imageBrief?.subject?.trim() || `${s.heading} — ${s.body}`.slice(0, 120),
  );

  return slots.map((slot, i) => {
    const brief = slot.imageBrief ?? null;
    const parts: string[] = [];

    // 1. Onderwerp — uit de brief (concreet, sectie-specifiek) of de copy-fallback.
    if (brief) {
      parts.push(`Editorial feature photograph: ${brief.subject.trim()}`);
    } else {
      parts.push(
        `Editorial feature image illustrating "${slot.heading}" for a landing-page about: ${pageHeadline}`,
      );
      if (slot.body) parts.push(`Depicting: ${slot.body}`);
    }

    // 2. Scene-template (brief) of geroteerde fallback-angle (legacy).
    if (brief) {
      parts.push(SCENE_TYPE_TEMPLATES[brief.sceneType]);
      if (brief.composition?.trim()) parts.push(brief.composition.trim());
    } else {
      parts.push(FALLBACK_ANGLES[slot.index % FALLBACK_ANGLES.length]);
      // Zonder brief: één geroteerd pool-onderwerp als suggestie (geen commando).
      const pool = ctx?.brandTokens?.photography?.subjectPool ?? [];
      if (pool.length > 0) {
        parts.push(`Brand-typical subject cue (optional inspiration): ${pool[slot.index % pool.length]}`);
      }
    }

    // 3. Sibling-differentiatie — het model weet wat de andere beelden tonen.
    const siblingSubjects = subjects.filter((_, j) => j !== i);
    if (siblingSubjects.length > 0) {
      parts.push(
        `Image ${i + 1} of ${slots.length} in one page set — show a clearly different subject, setting and camera distance than the others: ${siblingSubjects.join("; ")}`,
      );
    }

    // 4. Vorm-regels + gesaneerde stijl-laag (mood-only, R1) + brand. De
    // integrale brandImageryStyle wordt bewust NIET gepusht (bevat subjects/
    // compositie van de scrape — de tweede R1-zijdeur, review 2026-06-10):
    // alleen het mood-deel (en dan alleen als de tokens-laag 'm niet al
    // draagt — zelfde bron) + eventuele guidelines.
    parts.push(SINGLE_PHOTO_RULE);
    const styleFragment = ctx?.brandTokens?.photography?.promptFragment?.trim();
    if (styleFragment) parts.push(styleFragment);
    const imagery = featureSafeImagerySegments(ctx?.brand?.brandImageryStyle);
    if (!styleFragment && imagery.mood) parts.push(`Brand imagery: ${imagery.mood}`);
    if (imagery.guidelines) parts.push(`Imagery ${imagery.guidelines.charAt(0).toLowerCase()}${imagery.guidelines.slice(1)}`);
    if (ctx?.brand?.brandName) parts.push(`Brand: ${ctx.brand.brandName}`);

    return {
      index: slot.index,
      prompt: parts.join(". ").replace(/\.\.\s/g, ". ").replace(/\.\.$/, ".") + ".",
      avoid: brief?.avoid?.trim() || null,
      seed: randomSeed(),
    };
  });
}

/** Reden waarom de kwaliteitspoort een regeneratie afdwingt (Fase 4). */
export type FeatureRetryReason =
  | { kind: "low-coherence"; subject: string; rationale?: string | null }
  | { kind: "duplicate"; otherSubject: string };

/**
 * Scherp een gebouwde prompt aan voor een gerichte regeneratie + nieuwe seed.
 * Pure functie (unit-smokebaar). NB: de coherence-dimensie heeft géén template
 * in DIMENSION_REFINE_HINTS (refine-loop is gebouwd voor de 6 visual-dimensies)
 * — vandaar een eigen, copy-gedreven aanscherping i.p.v. extractRefineHint.
 */
export function sharpenFeaturePromptForRetry(
  built: BuiltFeaturePrompt,
  reason: FeatureRetryReason,
): BuiltFeaturePrompt {
  if (reason.kind === "low-coherence") {
    const judgeNote = reason.rationale?.trim() ? ` Judge feedback on the rejected attempt: ${reason.rationale.trim()}` : "";
    return {
      ...built,
      prompt: `CRITICAL: the photograph must literally and unmistakably depict: ${reason.subject}. ${built.prompt}${judgeNote}`,
      seed: randomSeed(),
    };
  }
  return {
    ...built,
    prompt: `${built.prompt} CRITICAL: choose a clearly DIFFERENT subject, setting and camera distance than: ${reason.otherSubject}.`,
    avoid: [built.avoid, `near-duplicate of: ${reason.otherSubject}`].filter(Boolean).join("; "),
    seed: randomSeed(),
  };
}
