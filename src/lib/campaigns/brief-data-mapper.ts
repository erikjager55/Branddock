/**
 * Pure data-mapper: transformeert wizard-output (Campaign + CampaignBlueprint
 * + Persona[] + MediumEnrichment[]) naar een gestructureerd `BriefViewModel`
 * dat `brief-renderer.ts` direct kan consumeren.
 *
 * Defensief tegen ontbrekende of misvormde AI-output (zie gotchas 2026-03-24:
 * `validateOrWarn` laat null-velden door). Alle array-toegang via
 * `(arr ?? []).map()` patroon. Per ontbrekend veld een `BriefMissingDataFlag`
 * zodat de UI gerichte "ontbrekende data: <veld>"-meldingen toont.
 */

import type { Campaign, Persona, MediumEnrichment } from '@prisma/client';
import type {
  CampaignBlueprint,
  AssetPlanDeliverable,
  PrepDeliverable,
  Channel,
  PhaseDuration,
} from '@/lib/campaigns/strategy-blueprint.types';
import type {
  BriefViewModel,
  BriefMissingDataFlag,
  PersonaSegment,
  BriefChannelEntry,
  BriefAssetEntry,
  BriefPrepEntry,
  BriefMessaging,
} from '@/lib/campaigns/brief-types';

/**
 * Subset van `MediumEnrichment` die de mapper nodig heeft. De route fetcht
 * alleen deze velden via `select` om memory + bandwidth te sparen.
 */
export type MediumEnrichmentSlice = Pick<MediumEnrichment, 'platform' | 'format' | 'phaseGuidance'>;

export interface MapToBriefInput {
  campaign: Campaign;
  blueprint: CampaignBlueprint | null;
  personas: Persona[];
  enrichments: MediumEnrichmentSlice[];
  /** Wall-clock voor `meta.generatedAt`. Optioneel — caller die determinisme
   *  wil (smoke-tests, snapshot-renders) injecteert een vaste Date; default
   *  `new Date()` voor productie-renders. Bewust geen `Date.now()` in de
   *  body om de pure-function claim te waarborgen. */
  now?: Date;
}

export interface MapToBriefResult {
  viewModel: BriefViewModel;
  missing: BriefMissingDataFlag[];
}

/**
 * Hoofdmapper. Returns een (viewModel, missing) tuple zodat de renderer
 * de viewModel direct kan tonen en de UI losstaande missing-flags kan
 * weergeven (bv. boven de markdown of als waarschuwing-banner).
 */
export function mapToBriefViewModel(input: MapToBriefInput): MapToBriefResult {
  const { campaign, blueprint, personas, enrichments, now } = input;
  const generatedAt = (now ?? new Date()).toISOString();
  const missing: BriefMissingDataFlag[] = [];

  const durationWeeks = computeDurationWeeks(campaign.startDate, campaign.endDate, blueprint?.channelPlan?.phaseDurations);

  const overview = mapOverview(campaign, blueprint, durationWeeks, missing);
  const audience = mapAudience(personas, missing);
  const messaging = mapMessaging(campaign, blueprint, enrichments, missing);
  const channels = mapChannels(blueprint, missing);
  const assets = mapAssets(blueprint, missing);
  const nextSteps = mapNextSteps(blueprint);

  const viewModel: BriefViewModel = {
    meta: {
      campaignTitle: campaign.title,
      campaignType: campaign.type,
      campaignGoalType: campaign.campaignGoalType ?? null,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      durationWeeks,
      generatedAt,
    },
    overview,
    audience,
    messaging,
    channels,
    assets,
    nextSteps,
  };

  return { viewModel, missing };
}

// ─── Sectie 1 — Overzicht ──────────────────────────────────────

function mapOverview(
  campaign: Campaign,
  blueprint: CampaignBlueprint | null,
  durationWeeks: number | null,
  missing: BriefMissingDataFlag[],
) {
  if (!blueprint?.strategy) {
    missing.push({
      section: 1,
      fieldName: 'blueprint.strategy',
      severity: 'error',
      message: 'Campaign strategy missing — wizard phase 5 (build-strategy) not completed',
    });
  }

  const campaignTheme = blueprint?.strategy?.campaignTheme ?? null;
  const positioningStatement = blueprint?.strategy?.positioningStatement ?? null;

  if (!campaignTheme) {
    missing.push({
      section: 1,
      fieldName: 'strategy.campaignTheme',
      severity: 'warning',
      message: 'Campaign theme missing — no creative positioning',
    });
  }

  return {
    campaignName: campaign.title,
    campaignTheme,
    positioningStatement,
    primaryGoalStatement: campaign.description ?? null,
    goalType: campaign.campaignGoalType ?? null,
    durationWeeks,
    budgetLevel: null,
  };
}

// ─── Sectie 2 — Doelgroep ──────────────────────────────────────

function mapAudience(personas: Persona[], missing: BriefMissingDataFlag[]) {
  if (personas.length === 0) {
    missing.push({
      section: 2,
      fieldName: 'personas',
      severity: 'error',
      message: 'No personas linked to this campaign',
    });
    return { primary: [], secondary: [] };
  }

  const segments: PersonaSegment[] = personas.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? null,
    occupation: p.occupation ?? null,
    ageRange: p.age ?? null,
    // AI-touched velden: kunnen objects bevatten i.p.v. strings (gotcha
    // 2026-03-24). `toDisplayString` haalt het meest descriptieve veld
    // uit een object i.p.v. silent-skip of crash.
    painPoints: normalizeAiStringArray(p.frustrations),
    motivations: normalizeAiStringArray(p.motivations),
    preferredChannels: normalizeAiStringArray(p.preferredChannels),
    buyingTriggers: normalizeAiStringArray(p.buyingTriggers),
  }));

  // Primair = eerste persona, secundair = rest. Geen expliciete prio-flag in schema.
  return {
    primary: segments.slice(0, 1),
    secondary: segments.slice(1),
  };
}

// ─── Sectie 3 — Kernboodschappen ──────────────────────────────

function mapMessaging(
  campaign: Campaign,
  blueprint: CampaignBlueprint | null,
  enrichments: MediumEnrichmentSlice[],
  missing: BriefMissingDataFlag[],
): BriefMessaging {
  const masterMessage = parseMasterMessage(campaign.masterMessage);
  const messaging = blueprint?.strategy?.messagingHierarchy;

  const coreMessage =
    messaging?.campaignMessage ?? masterMessage?.coreClaim ?? null;

  if (!coreMessage) {
    missing.push({
      section: 3,
      fieldName: 'masterMessage.coreClaim',
      severity: 'error',
      message: 'Key message missing — Campaign.masterMessage.coreClaim or strategy.messagingHierarchy.campaignMessage not filled',
    });
  }

  // proofPoints kan onverwacht non-array zijn als AI-output corrupt is —
  // gebruik normalizeAiStringArray om te casten + objects-as-strings te
  // filteren (gotcha 2026-03-24). Same defensive guard voor keyMessages.
  const proofPoints = normalizeAiStringArray(messaging?.proofPoints);
  const supportingMessages = normalizeAiStringArray(campaign.keyMessages);

  // Tone-per-channel: dedupe per platform (er kunnen meerdere
  // MediumEnrichment-records per platform zijn voor verschillende formats),
  // en filter op platforms die daadwerkelijk in de channel-strategy zitten.
  // Zonder filter zouden we tones tonen voor kanalen die niet eens in de
  // campagne worden gebruikt — verwarrend voor de lezer.
  const selectedChannelNames = new Set(
    (blueprint?.channelPlan?.channels ?? []).map((c) => c.name.toLowerCase()),
  );
  const tonePerChannel = dedupeTonePerPlatform(enrichments, selectedChannelNames);

  return {
    coreMessage,
    supportingMessages,
    tonePerChannel,
    proofPoints,
  };
}

function dedupeTonePerPlatform(
  enrichments: MediumEnrichmentSlice[],
  selectedChannelNames: Set<string>,
): { channel: string; tone: string }[] {
  const byPlatform = new Map<string, string>();
  for (const e of enrichments) {
    const platform = e.platform.toLowerCase();
    // Skip platforms die niet in de channel-strategy zitten — voorkomt dat
    // we tones voor 7 kanalen tonen terwijl de campagne er maar 2 gebruikt.
    // Channel.name kan human-readable zijn ("LinkedIn organic") en platform
    // is enum-like ("linkedin"); gebruik startsWith/contains voor match.
    if (selectedChannelNames.size > 0 && !channelMatchesPlatform(selectedChannelNames, platform)) continue;
    if (byPlatform.has(platform)) continue; // dedupe — eerste hit wint
    const guidance = parsePhaseGuidance(e.phaseGuidance);
    const tone = guidance?.awareness?.toneShift ?? null;
    if (!tone) continue;
    byPlatform.set(platform, tone);
  }
  return Array.from(byPlatform.entries()).map(([channel, tone]) => ({
    channel: capitalize(channel),
    tone,
  }));
}

function channelMatchesPlatform(channelNames: Set<string>, platform: string): boolean {
  // Match op word-boundary om false positives te voorkomen: bv. channel
  // "in-app" mocht NIET matchen met platform "linkedin" (in-app ⊂ linkedin
  // is misleidend). Channel "linkedin organic" SHOULD matchen platform
  // "linkedin" (word-boundary check).
  const platformPattern = new RegExp(`\\b${escapeRegExp(platform)}\\b`, 'i');
  for (const name of channelNames) {
    if (name === platform) return true;
    if (platformPattern.test(name)) return true;
  }
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Sectie 4 — Kanaalstrategie ───────────────────────────────

function mapChannels(blueprint: CampaignBlueprint | null, missing: BriefMissingDataFlag[]) {
  const channelsSrc = blueprint?.channelPlan?.channels ?? [];
  const timing = blueprint?.channelPlan?.timingStrategy ?? null;

  if (channelsSrc.length === 0) {
    missing.push({
      section: 4,
      fieldName: 'channelPlan.channels',
      severity: 'error',
      message: 'No channels selected in the strategy',
    });
  }

  const selected: BriefChannelEntry[] = channelsSrc.map((c: Channel) => ({
    name: c.name,
    role: c.role,
    objective: c.objective,
    contentMix: (c.contentMix ?? []).map((cm) => `${cm.contentType} (${cm.frequency}, ${cm.phase})`),
    budgetAllocation: c.budgetAllocation,
    priority: c.priority,
  }));

  return { selected, timingStrategy: timing };
}

// ─── Sectie 6 — Assets ─────────────────────────────────────────

function mapAssets(blueprint: CampaignBlueprint | null, missing: BriefMissingDataFlag[]) {
  const deliverables = blueprint?.assetPlan?.deliverables ?? [];
  const prep = blueprint?.assetPlan?.prepDeliverables ?? [];

  if (deliverables.length === 0) {
    missing.push({
      section: 6,
      fieldName: 'assetPlan.deliverables',
      severity: 'error',
      message: 'No deliverables in asset plan — wizard phase 6 (elaborate) not completed',
    });
  }

  const toEntry = (d: AssetPlanDeliverable): BriefAssetEntry => ({
    title: d.title,
    contentType: d.contentType,
    channel: d.channel,
    phase: d.phase,
    estimatedEffort: d.estimatedEffort,
    productionPriority: d.productionPriority,
    briefObjective: d.brief?.objective ?? '',
    briefKeyMessage: d.brief?.keyMessage ?? '',
    briefToneDirection: d.brief?.toneDirection ?? '',
    briefCallToAction: d.brief?.callToAction ?? '',
    briefContentOutline: d.brief?.contentOutline ?? [],
    targetPersonas: d.targetPersonas ?? [],
  });

  // Defensive grouping: AI-output kan onverwachte/missing productionPriority
  // hebben. Onbekende waardes vallen terug op should-have i.p.v. silent-drop
  // — anders zien gebruikers assets verdwijnen uit de brief zonder reden.
  // Surface elke unknown waarde als MissingDataFlag zodat de UI signaleert
  // dat de wizard-data wat nakijken behoeft.
  const mustHave: BriefAssetEntry[] = [];
  const shouldHave: BriefAssetEntry[] = [];
  const niceToHave: BriefAssetEntry[] = [];
  const unknownPriorities = new Set<string>();
  for (const d of deliverables) {
    const entry = toEntry(d);
    switch (d.productionPriority) {
      case 'must-have':
        mustHave.push(entry);
        break;
      case 'nice-to-have':
        niceToHave.push(entry);
        break;
      case 'should-have':
        shouldHave.push(entry);
        break;
      default: {
        // TS narrowt productionPriority naar `never` in de default-case
        // (de union dekt alle 3 string-literals). Runtime kan AI-output
        // echter alles emit'en — cast naar `unknown` om defensive te
        // checken zonder TS te misleiden.
        // User-facing label: vermijd interne sentinel-strings als '<missing>';
        // '(empty)' is begrijpelijk én collision-vrij met legitieme priority-
        // waarden.
        const raw: unknown = d.productionPriority;
        const observed =
          typeof raw === 'string' && raw.length > 0 ? raw : '(empty)';
        unknownPriorities.add(observed);
        shouldHave.push(entry);
        break;
      }
    }
  }
  if (unknownPriorities.size > 0) {
    missing.push({
      section: 6,
      fieldName: 'assetPlan.deliverables[].productionPriority',
      severity: 'warning',
      message: `Unknown productionPriority value(s) bucketed to should-have: ${Array.from(unknownPriorities).sort().join(', ')}`,
    });
  }

  return {
    mustHave,
    shouldHave,
    niceToHave,
    prepDeliverables: prep.map(
      (p: PrepDeliverable): BriefPrepEntry => ({
        title: p.title,
        description: p.description,
        category: p.category,
        owner: p.owner,
        estimatedEffort: p.estimatedEffort,
      }),
    ),
  };
}

// ─── Sectie 10 — Volgende stappen ─────────────────────────────

function mapNextSteps(blueprint: CampaignBlueprint | null) {
  const prep = blueprint?.assetPlan?.prepDeliverables ?? [];
  const thisWeek: BriefPrepEntry[] = prep.map((p: PrepDeliverable) => ({
    title: p.title,
    description: p.description,
    category: p.category,
    owner: p.owner,
    estimatedEffort: p.estimatedEffort,
  }));
  return { thisWeek };
}

// ─── Helpers ──────────────────────────────────────────────────

function computeDurationWeeks(
  start: Date | null,
  end: Date | null,
  phaseDurations: PhaseDuration[] | undefined,
): number | null {
  if (start && end) {
    const ms = end.getTime() - start.getTime();
    if (ms > 0) {
      return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
    }
  }
  if (phaseDurations && phaseDurations.length > 0) {
    return phaseDurations.reduce((sum, p) => sum + (p.suggestedWeeks ?? 0), 0);
  }
  return null;
}

interface MasterMessage {
  coreClaim?: string;
  proofPoint?: string;
  emotionalHook?: string;
  primaryCta?: string;
}

function parseMasterMessage(raw: unknown): MasterMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: MasterMessage = {};
  if (typeof obj.coreClaim === 'string') result.coreClaim = obj.coreClaim;
  if (typeof obj.proofPoint === 'string') result.proofPoint = obj.proofPoint;
  if (typeof obj.emotionalHook === 'string') result.emotionalHook = obj.emotionalHook;
  if (typeof obj.primaryCta === 'string') result.primaryCta = obj.primaryCta;
  return Object.keys(result).length > 0 ? result : null;
}

interface PhaseGuidance {
  awareness?: { toneShift?: string };
  consideration?: { toneShift?: string };
  decision?: { toneShift?: string };
}

function parsePhaseGuidance(raw: unknown): PhaseGuidance | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: PhaseGuidance = {};
  for (const phase of ['awareness', 'consideration', 'decision'] as const) {
    const inner = obj[phase];
    if (inner && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>;
      if (typeof innerObj.toneShift === 'string') {
        result[phase] = { toneShift: innerObj.toneShift };
      }
    }
  }
  return result;
}

/**
 * Normaliseert een waarde die idealiter een `string[]` is, maar bij AI-output
 * een mix kan zijn van strings + objects (gotcha 2026-03-24). Voor objects
 * wordt het meest descriptieve veld gepakt — `barrier`, `name`, `title`,
 * `description` of een `JSON.stringify` als laatste redmiddel — zodat de UI
 * iets zinvols toont in plaats van te crashen of een leeg veld.
 */
function normalizeAiStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => toDisplayString(item))
    .filter((s): s is string => s.length > 0);
}

function toDisplayString(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item);
  const obj = item as Record<string, unknown>;
  // Probeer veelgebruikte descriptieve velden in volgorde van voorkeur.
  for (const key of ['barrier', 'name', 'title', 'description', 'label', 'value', 'text']) {
    const val = obj[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  // Fallback: alle string-values samenvoegen — voorkomt dat we
  // `[object Object]` tonen wanneer de AI een onverwacht schema gebruikt.
  const stringValues = Object.values(obj).filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (stringValues.length > 0) return stringValues.join(' · ');
  try {
    return JSON.stringify(item);
  } catch {
    return '';
  }
}
