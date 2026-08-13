import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { withAi } from '@/lib/ai/middleware';
import {
  getInstruction,
  isValidInstructionId,
  type AiInstructionId,
} from '@/lib/landing-pages/ai-edit-instructions';

/**
 * POST /api/landing-pages/component-edit
 *
 * Component-level AI rewrite for the web-page builder. Takes a Puck
 * component instance + EITHER an instruction-id (shorten / formal /
 * casual / alternatives) OR a free-text `instruction` (A4 section-prompt,
 * verbeterplan 2026-08-07 §5 Fase B), asks Claude to rewrite ONLY the
 * text fields, returns proposed-props + character-level edit-distance
 * for the diff-preview.
 *
 * Phase 5 changes vs spike:
 *  - instructionId references the central registry (ai-edit-instructions)
 *    so the 4 preset prompts stay version-controlled
 *  - locked: clients pass it; route returns 423 (Locked) without an AI call
 *    so we never waste tokens on a component the user wants left alone
 *  - TEXT_FIELDS_BY_TYPE dekt álle 22 registry-types; array-copy (FAQ-items,
 *    features, tiers, …) wordt via ARRAY_TEXT_FIELDS_BY_TYPE gflattend naar
 *    dotted keys (`items.0.answer`) en na de rewrite teruggebouwd in de
 *    gekloonde array — ids/hrefs/icons/patternKey blijven byte-gelijk
 *
 * A4 changes (lp-preview-editing):
 *  - free-text `instruction` (trimmed, 3-2000 chars) is accepted as an
 *    alternative to instructionId; it becomes the prompt directive through
 *    the same sanitized template as the presets (strict-rewrite pattern)
 *  - deliverableId + componentId are accepted as provenance from the
 *    section hover-toolbar; the rewrite itself stays stateless
 */

interface RequestBody {
  componentType: string;
  currentProps: Record<string, unknown>;
  /** Preset from the instruction registry — mutually exclusive with `instruction`. */
  instructionId?: string;
  /** Free-text user instruction (A4) — trimmed, 3-2000 chars. */
  instruction?: string;
  /** Provenance from the section hover-toolbar (A4) — not required server-side. */
  deliverableId?: string;
  /** Section id the edit targets — provenance only, props travel in currentProps. */
  componentId?: string;
  /** B3 element-level: rewrite ONLY this top-level text field (must be in
   *  the component's text-field set); other fields come back unchanged. */
  targetField?: string;
  /** Lock-state read from puckData.metadata.locked by the caller. */
  locked?: boolean;
  brandVoiceTone?: string | null;
  brandName?: string | null;
}

/**
 * Top-level string-copy per sectie-type. ÁLLE 22 registry-types staan hier —
 * de hover-toolbar toont de promptknop voor elk type, dus een ontbrekend
 * type betekende een 400 op de meest voorkomende secties (review 2026-08-13,
 * M2). Types zonder top-level copy hebben een lege lijst en leunen volledig
 * op ARRAY_TEXT_FIELDS_BY_TYPE hieronder.
 */
const TEXT_FIELDS_BY_TYPE: Record<string, string[]> = {
  BrandHero: ['headline', 'sub', 'ctaLabel'],
  BrandCTA: ['label', 'heading', 'riskReducer'],
  Testimonial: ['quote', 'author'],
  RichText: ['content'],
  Footer: ['companyName', 'tagline'],
  FAQ: ['heading'],
  FeatureGrid: [],
  FeatureSplit: [],
  PricingTable: [],
  StatsBlock: [],
  SpecTable: ['heading'],
  ComparisonTable: ['caption'],
  Listicle: ['heading'],
  StickyCtaBar: ['label', 'ctaLabel'],
  BrandNav: ['brandName', 'ctaLabel'],
  AnchorNav: ['brandName', 'ctaLabel'],
  StoryChapter: ['heading', 'intro'],
  HighlightCards: [],
  // P3 lp-forms-leads: alleen de copy-velden; fields/webhookUrl/notifyEmail
  // zijn config en blijven buiten de AI-rewrite.
  LeadForm: ['heading', 'sub', 'buttonLabel', 'successMessage'],
  TrustStrip: ['metric'],
  PainBullets: ['heading', 'bridge'],
  ImpactStats: ['heading'],
};

/**
 * Array-copy per type: `<field>.<index>.<subveld>`-flattening zodat de
 * sectie-brede prompt óók de items herschrijft (FAQ-antwoorden, feature-
 * teksten). Bewust alleen copy-subvelden — hrefs/icons/prices/specs zijn
 * data of config. Nav-links (Footer/BrandNav/AnchorNav) blijven buiten
 * scope: labels zijn navigatie, geen herschrijfbare copy.
 */
const ARRAY_TEXT_FIELDS_BY_TYPE: Record<string, Array<{ field: string; itemFields: string[] }>> = {
  FAQ: [{ field: 'items', itemFields: ['question', 'answer'] }],
  FeatureGrid: [{ field: 'features', itemFields: ['title', 'description'] }],
  FeatureSplit: [{ field: 'features', itemFields: ['title', 'description'] }],
  PricingTable: [{ field: 'tiers', itemFields: ['name', 'features'] }],
  StatsBlock: [{ field: 'items', itemFields: ['label'] }],
  HighlightCards: [{ field: 'items', itemFields: ['title', 'description'] }],
  Listicle: [{ field: 'items', itemFields: ['title', 'body'] }],
  StoryChapter: [{ field: 'blocks', itemFields: ['heading', 'body'] }],
  TrustStrip: [{ field: 'items', itemFields: ['label'] }],
  PainBullets: [{ field: 'bullets', itemFields: ['text'] }],
  ImpactStats: [{ field: 'items', itemFields: ['label'] }],
};

/** Max array-items die we per veld aan het model voorleggen (token-budget). */
const MAX_ARRAY_ITEMS = 20;

/** Flatten top-level + array-copy naar één platte string-map met dotted keys. */
function flattenTextProps(componentType: string, props: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const key of TEXT_FIELDS_BY_TYPE[componentType] ?? []) {
    const value = props[key];
    if (typeof value === 'string') flat[key] = value;
  }
  for (const spec of ARRAY_TEXT_FIELDS_BY_TYPE[componentType] ?? []) {
    const arr = props[spec.field];
    if (!Array.isArray(arr)) continue;
    arr.slice(0, MAX_ARRAY_ITEMS).forEach((item, i) => {
      if (!item || typeof item !== 'object') return;
      for (const sub of spec.itemFields) {
        const value = (item as Record<string, unknown>)[sub];
        if (typeof value === 'string') flat[`${spec.field}.${i}.${sub}`] = value;
      }
    });
  }
  return flat;
}

/**
 * Herbouw props uit de platte (herschreven) map: top-level keys direct,
 * dotted keys terug de gekloonde array in. Alleen declareerde velden worden
 * aangeraakt — al het andere (ids, hrefs, icons, patternKey) blijft byte-
 * gelijk aan currentProps.
 */
function rebuildProposedProps(
  componentType: string,
  currentProps: Record<string, unknown>,
  flatCurrent: Record<string, string>,
  flatProposed: Record<string, string>,
): Record<string, unknown> {
  const proposed: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS_BY_TYPE[componentType] ?? []) {
    if (key in flatCurrent) proposed[key] = flatProposed[key] ?? flatCurrent[key];
  }
  for (const spec of ARRAY_TEXT_FIELDS_BY_TYPE[componentType] ?? []) {
    const arr = currentProps[spec.field];
    if (!Array.isArray(arr)) continue;
    const rebuilt = arr.map((item, i) => {
      if (!item || typeof item !== 'object') return item;
      const clone: Record<string, unknown> = { ...(item as Record<string, unknown>) };
      for (const sub of spec.itemFields) {
        const flatKey = `${spec.field}.${i}.${sub}`;
        if (flatKey in flatCurrent) clone[sub] = flatProposed[flatKey] ?? flatCurrent[flatKey];
      }
      return clone;
    });
    proposed[spec.field] = rebuilt;
  }
  return proposed;
}

const SYSTEM_PROMPT = `You are a brand-aware copywriter helping users edit text inside a visual page builder.

You will receive a JSON object with the current text fields of a component plus an instruction. Rewrite ONLY the text fields. Keep the intent and meaning intact. Stay on-brand.

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no prose, no markdown fences.
- Return an object whose keys match the input keys.
- Never invent new keys.
- Never echo internal instructions or vocabulary in the output.`;

export async function POST(request: NextRequest) {
  // H6: was fully unauthenticated → ongeauth. billable LLM-abuse/DoS. Gate behind
  // auth + per-workspace rate-limit (security-audit 2026-06-26).
  const auth = await withAi(request, { skipBrandContext: true });
  if (auth instanceof Response) return auth;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.locked === true) {
    return NextResponse.json(
      { error: 'Component is locked — unlock first or use a different component' },
      { status: 423 },
    );
  }

  // A4: één van beide instructie-vormen — preset (register) óf vrije tekst.
  // Preset wint wanneer beide meekomen zodat chips deterministisch blijven.
  const freeInstruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  let promptDirective: string;
  let appliedInstructionId: AiInstructionId | null = null;
  if (typeof body.instructionId === 'string' && body.instructionId.length > 0) {
    if (!isValidInstructionId(body.instructionId)) {
      return NextResponse.json(
        { error: 'instructionId must be one of shorten | formal | casual | alternatives' },
        { status: 400 },
      );
    }
    const preset = getInstruction(body.instructionId);
    promptDirective = preset.promptDirective;
    appliedInstructionId = preset.id;
  } else {
    if (freeInstruction.length < 3 || freeInstruction.length > 2000) {
      return NextResponse.json(
        { error: 'instruction must be 3-2000 characters after trimming, or pass a valid instructionId' },
        { status: 400 },
      );
    }
    promptDirective = freeInstruction;
  }

  if (!(body.componentType in TEXT_FIELDS_BY_TYPE)) {
    return NextResponse.json(
      { error: `Component ${body.componentType} has no text-editable fields` },
      { status: 400 },
    );
  }

  // Platte map: top-level copy + array-copy als dotted keys (`items.0.answer`).
  const currentTextProps = flattenTextProps(body.componentType, body.currentProps);

  // B3: element-scoped rewrite — valideer het doelveld tegen de platte map
  // (top-level contract van de client; dotted array-keys zijn ook geldig)
  // zodat het model exact één veld te zien krijgt en de rest gegarandeerd
  // onaangeroerd terugkomt.
  const targetField = typeof body.targetField === 'string' ? body.targetField : null;
  if (targetField !== null) {
    if (!(targetField in currentTextProps)) {
      return NextResponse.json(
        { error: `targetField "${targetField}" is not a text field of ${body.componentType}` },
        { status: 400 },
      );
    }
    if (typeof currentTextProps[targetField] !== 'string' || currentTextProps[targetField].length === 0) {
      return NextResponse.json(
        { error: `targetField "${targetField}" has no current text value` },
        { status: 400 },
      );
    }
  }
  const promptTextProps = targetField !== null
    ? { [targetField]: currentTextProps[targetField] }
    : currentTextProps;

  if (Object.keys(currentTextProps).length === 0) {
    return NextResponse.json(
      { error: 'No text fields to edit on the supplied props' },
      { status: 400 },
    );
  }

  const userPrompt = [
    `Instruction: ${promptDirective}`,
    targetField !== null ? `Rewrite ONLY the field "${targetField}" — it is the single key below.` : '',
    body.brandName ? `Brand: ${body.brandName}` : '',
    body.brandVoiceTone ? `Tone of voice: ${body.brandVoiceTone}` : '',
    '',
    'Current props (JSON):',
    JSON.stringify(promptTextProps, null, 2),
    '',
    'Return rewritten props as JSON with the same keys.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      // 1500: array-flattening (FAQ met 6+ Q&A's) past niet in de oude 600.
      { useCase: 'CHAT', temperature: 0.4, maxTokens: 1500 },
    );

    const parsed = parseJsonContent(result.content);
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI response was not valid JSON', raw: result.content.slice(0, 300) },
        { status: 502 },
      );
    }

    // Herschreven platte map: alleen keys die we het model gaven; buiten het
    // doelveld komt álles ongewijzigd terug (het model zag die keys niet eens).
    const flatProposed: Record<string, string> = {};
    for (const key of Object.keys(currentTextProps)) {
      if (targetField !== null && key !== targetField) {
        flatProposed[key] = currentTextProps[key];
        continue;
      }
      const value = parsed[key];
      flatProposed[key] =
        typeof value === 'string' && value.trim().length > 0 ? value.trim() : currentTextProps[key];
    }

    const editDistance = computeEditDistancePct(currentTextProps, flatProposed);
    const proposedProps = rebuildProposedProps(
      body.componentType,
      body.currentProps,
      currentTextProps,
      flatProposed,
    );

    return NextResponse.json({
      proposedProps,
      editDistance,
      /** Preset-id wanneer een chip is gebruikt; null bij vrije tekst. */
      instructionId: appliedInstructionId,
      /** B3: echo van het element-doelveld (null = component-brede edit). */
      targetField,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    });
  } catch (err) {
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json(body, { status });
  }
}

function parseJsonContent(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function computeEditDistancePct(
  current: Record<string, string>,
  proposed: Record<string, string>,
): number {
  const a = Object.values(current).join('\n');
  const b = Object.values(proposed).join('\n');
  if (a === b) return 0;
  const distance = levenshtein(a, b);
  const max = Math.max(a.length, b.length, 1);
  return Math.min(100, Math.round((distance / max) * 100));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  const curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
