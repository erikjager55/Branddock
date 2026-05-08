/**
 * Pure markdown-renderer voor `BriefViewModel` → 10-secties Linfi-stijl
 * campagne-brief. Geen IO, geen AI: consumeert het ViewModel uit
 * `brief-data-mapper.ts` en (optioneel) een `WeekTheme[]` uit de
 * week-thema-prompt voor sectie 5. Ontbrekende velden tonen gerichte
 * "ontbrekende data: <veld>"-meldingen i.p.v. blank renderen.
 */

import type {
  BriefViewModel,
  WeekTheme,
  BriefAssetEntry,
  BriefPrepEntry,
} from '@/lib/campaigns/brief-types';
import { BRIEF_FOLLOWUP_FEATURES } from '@/lib/campaigns/brief-types';

export interface RenderBriefInput {
  viewModel: BriefViewModel;
  /** Optioneel: week-thema-output uit `brief-week-theme-prompt.ts`. Indien
   *  ontbrekend, toont sectie 5 een fallback-melding met retry-context. */
  weekThemes?: WeekTheme[];
  /** Optioneel: foutbericht als week-thema-AI-call faalde. */
  weekThemeError?: string | null;
}

/**
 * Rendert het complete BriefViewModel naar één markdown-string.
 * Volgorde: header → secties 1-10 in Linfi-volgorde.
 */
export function renderBriefMarkdown(input: RenderBriefInput): string {
  const { viewModel, weekThemes, weekThemeError } = input;
  const parts: string[] = [];

  parts.push(renderHeader(viewModel));
  parts.push(renderSection1Overview(viewModel));
  parts.push(renderSection2Audience(viewModel));
  parts.push(renderSection3Messaging(viewModel));
  parts.push(renderSection4Channels(viewModel));
  parts.push(renderSection5Calendar(viewModel, weekThemes, weekThemeError));
  parts.push(renderSection6Assets(viewModel));
  parts.push(renderSection7MetricsPlaceholder());
  parts.push(renderSection8BudgetPlaceholder());
  parts.push(renderSection9RisksPlaceholder());
  parts.push(renderSection10NextSteps(viewModel));

  return parts.join('\n\n');
}

// ─── Header ───────────────────────────────────────────────────

function renderHeader(vm: BriefViewModel): string {
  const lines = [`# Campaign brief — ${escape(vm.meta.campaignTitle)}`];
  const metaLine: string[] = [];
  if (vm.meta.campaignType) metaLine.push(`Type: ${vm.meta.campaignType}`);
  if (vm.meta.campaignGoalType) metaLine.push(`Goal: ${vm.meta.campaignGoalType}`);
  if (vm.meta.durationWeeks) metaLine.push(`Duration: ${vm.meta.durationWeeks} weeks`);
  if (vm.meta.startDate && vm.meta.endDate) {
    metaLine.push(`Period: ${formatDate(vm.meta.startDate)} → ${formatDate(vm.meta.endDate)}`);
  }
  if (metaLine.length > 0) lines.push(`*${metaLine.join(' · ')}*`);
  return lines.join('\n');
}

// ─── Sectie 1 — Campagne overzicht ────────────────────────────

function renderSection1Overview(vm: BriefViewModel): string {
  const lines = ['## 1. Campaign overview'];
  if (vm.overview.campaignTheme) {
    lines.push(`**Theme**: ${escape(vm.overview.campaignTheme)}`);
  }
  if (vm.overview.positioningStatement) {
    lines.push('', '**Positioning**', vm.overview.positioningStatement);
  } else {
    lines.push('', missingField('positioningStatement'));
  }
  if (vm.overview.primaryGoalStatement) {
    lines.push('', '**Primary goal**', vm.overview.primaryGoalStatement);
  }
  if (vm.overview.goalType) {
    lines.push('', `**Goal type**: ${escape(vm.overview.goalType)}`);
  }
  return lines.join('\n');
}

// ─── Sectie 2 — Doelgroep ──────────────────────────────────────

function renderSection2Audience(vm: BriefViewModel): string {
  const lines = ['## 2. Audience'];
  if (vm.audience.primary.length === 0) {
    lines.push(missingField('personas (primary segment)'));
    return lines.join('\n');
  }

  for (const persona of vm.audience.primary) {
    lines.push('', `### Primary segment — ${escape(persona.name)}`);
    if (persona.tagline) lines.push(`*${escape(persona.tagline)}*`);
    if (persona.occupation) lines.push(`**Role**: ${escape(persona.occupation)}`);
    if (persona.ageRange) lines.push(`**Age**: ${escape(persona.ageRange)}`);
    appendBulletList(lines, '**Pain points**', persona.painPoints);
    appendBulletList(lines, '**Motivations**', persona.motivations);
    appendBulletList(lines, '**Channels**', persona.preferredChannels);
    appendBulletList(lines, '**Buying triggers**', persona.buyingTriggers);
  }

  for (const persona of vm.audience.secondary) {
    lines.push('', `### Secondary segment — ${escape(persona.name)}`);
    if (persona.tagline) lines.push(`*${escape(persona.tagline)}*`);
    if (persona.occupation) lines.push(`**Role**: ${escape(persona.occupation)}`);
    appendBulletList(lines, '**Pain points**', persona.painPoints);
    appendBulletList(lines, '**Motivations**', persona.motivations);
  }

  return lines.join('\n');
}

// ─── Sectie 3 — Kernboodschappen ──────────────────────────────

function renderSection3Messaging(vm: BriefViewModel): string {
  const lines = ['## 3. Key messages'];
  if (vm.messaging.coreMessage) {
    lines.push('', '**Key message**', vm.messaging.coreMessage);
  } else {
    lines.push('', missingField('key message (masterMessage.coreClaim)'));
  }
  appendBulletList(lines, '**Supporting messages**', vm.messaging.supportingMessages);
  appendBulletList(lines, '**Proof points**', vm.messaging.proofPoints);

  if (vm.messaging.tonePerChannel.length > 0) {
    lines.push('', '**Tone per channel**');
    for (const entry of vm.messaging.tonePerChannel) {
      lines.push(`- **${escape(entry.channel)}**: ${escape(entry.tone)}`);
    }
  }
  return lines.join('\n');
}

// ─── Sectie 4 — Kanaalstrategie ───────────────────────────────

function renderSection4Channels(vm: BriefViewModel): string {
  const lines = ['## 4. Channel strategy'];
  if (vm.channels.selected.length === 0) {
    lines.push(missingField('channelPlan.channels'));
    return lines.join('\n');
  }
  for (const ch of vm.channels.selected) {
    lines.push(
      '',
      `### ${escape(ch.name)} — ${escape(ch.role)}`,
      `**Objective**: ${escape(ch.objective)}`,
      `**Budget level**: ${escape(ch.budgetAllocation)} · **Priority**: ${ch.priority}`,
    );
    appendBulletList(lines, '**Content mix**', ch.contentMix);
  }
  if (vm.channels.timingStrategy) {
    lines.push('', '**Timing strategy**', vm.channels.timingStrategy);
  }
  return lines.join('\n');
}

// ─── Sectie 5 — Content-kalender (week-thema's) ──────────────

function renderSection5Calendar(
  vm: BriefViewModel,
  weekThemes: WeekTheme[] | undefined,
  weekThemeError: string | null | undefined,
): string {
  const lines = ['## 5. Content calendar'];

  if (weekThemeError) {
    lines.push(
      '',
      `> **Weekly themes unavailable** — ${escape(weekThemeError)}`,
      '>',
      '> Try again via the "Generate brief" button.',
    );
    return lines.join('\n');
  }

  if (!weekThemes || weekThemes.length === 0) {
    lines.push('', '> Weekly themes unavailable — week theme prompt did not run or returned 0 weeks.');
    return lines.join('\n');
  }

  if (vm.meta.durationWeeks) {
    const mismatch = weekThemes.length !== vm.meta.durationWeeks;
    if (mismatch) {
      lines.push(`*${vm.meta.durationWeeks} weeks total · only ${weekThemes.length} themes generated — partial calendar*`);
    } else {
      lines.push(`*${vm.meta.durationWeeks} weeks total · ${weekThemes.length} themes generated*`);
    }
  }

  for (const wk of weekThemes) {
    lines.push('', `### Week ${wk.weekNumber} — ${escape(wk.theme)}`, escape(wk.rationale));
  }
  return lines.join('\n');
}

// ─── Sectie 6 — Assets ─────────────────────────────────────────

function renderSection6Assets(vm: BriefViewModel): string {
  const lines = ['## 6. Required content assets'];

  appendAssetGroup(lines, 'Must-have', vm.assets.mustHave);
  appendAssetGroup(lines, 'Should-have', vm.assets.shouldHave);
  appendAssetGroup(lines, 'Nice-to-have', vm.assets.niceToHave);

  if (vm.assets.prepDeliverables.length > 0) {
    lines.push('', '### Preparation (Week 0)');
    for (const prep of vm.assets.prepDeliverables) {
      lines.push(`- **${escape(prep.title)}** — ${escape(prep.description)} *(${escape(prep.category)} · ${escape(prep.owner)} · ${escape(prep.estimatedEffort)} effort)*`);
    }
  }

  if (
    vm.assets.mustHave.length === 0 &&
    vm.assets.shouldHave.length === 0 &&
    vm.assets.niceToHave.length === 0
  ) {
    lines.push('', missingField('assetPlan.deliverables'));
  }
  return lines.join('\n');
}

function appendAssetGroup(lines: string[], label: string, group: BriefAssetEntry[]): void {
  if (group.length === 0) return;
  lines.push('', `### ${label} (${group.length})`);
  for (const a of group) {
    lines.push('', renderAssetEntry(a));
  }
}

function renderAssetEntry(a: BriefAssetEntry): string {
  const lines: string[] = [];
  lines.push(`#### ${escape(a.title)}`);
  lines.push(`*${escape(a.contentType)} · ${escape(a.channel)} · phase ${escape(a.phase)} · ${escape(a.estimatedEffort)} effort*`);

  const hasAnyBriefField =
    a.briefObjective ||
    a.briefKeyMessage ||
    a.briefToneDirection ||
    a.briefCallToAction ||
    a.briefContentOutline.length > 0;

  if (!hasAnyBriefField) {
    lines.push('', '*Brief not filled in wizard — add objective, key message, tone, and CTA in the elaborate phase for a complete asset brief.*');
    return lines.join('\n');
  }

  if (a.briefObjective) lines.push('', `**Objective**: ${escape(a.briefObjective)}`);
  if (a.briefKeyMessage) lines.push(`**Key message**: ${escape(a.briefKeyMessage)}`);
  if (a.briefToneDirection) lines.push(`**Tone**: ${escape(a.briefToneDirection)}`);
  if (a.briefCallToAction) lines.push(`**Call-to-action**: ${escape(a.briefCallToAction)}`);
  if (a.briefContentOutline.length > 0) {
    lines.push('', '**Content outline**');
    for (const item of a.briefContentOutline) {
      lines.push(`- ${escape(item)}`);
    }
  }
  return lines.join('\n');
}

// ─── Sectie 7-9 — Placeholders voor follow-up features ────────

function renderSection7MetricsPlaceholder(): string {
  return [
    '## 7. Success metrics',
    '',
    `> **Not available** — requires follow-up feature \`${BRIEF_FOLLOWUP_FEATURES.metrics}\`.`,
    '> Structured KPIs (primary, secondary, counter-metric, sub-segmentation, and tracking stack) will arrive post-launch via a separate data layer.',
  ].join('\n');
}

function renderSection8BudgetPlaceholder(): string {
  return [
    '## 8. Budget allocation',
    '',
    `> **Not available** — requires follow-up feature \`${BRIEF_FOLLOWUP_FEATURES.budget}\`.`,
    '> Detailed budget table with line items, percentage breakdown, and contingency will arrive post-launch.',
  ].join('\n');
}

function renderSection9RisksPlaceholder(): string {
  return [
    '## 9. Risks and mitigation',
    '',
    `> **Not available** — requires follow-up feature \`${BRIEF_FOLLOWUP_FEATURES.risks}\`.`,
    '> Risk assessment prompt with explicit mitigation steps will arrive post-launch.',
  ].join('\n');
}

// ─── Sectie 10 — Volgende stappen ─────────────────────────────

function renderSection10NextSteps(vm: BriefViewModel): string {
  const lines = ['## 10. Next steps'];
  if (vm.nextSteps.thisWeek.length === 0) {
    lines.push(missingField('prepDeliverables (Week 0 actions)'));
    return lines.join('\n');
  }
  lines.push('', '**Immediate actions**');
  for (const prep of vm.nextSteps.thisWeek) {
    lines.push(renderPrepLine(prep));
  }
  return lines.join('\n');
}

function renderPrepLine(prep: BriefPrepEntry): string {
  return `- **${escape(prep.title)}** — ${escape(prep.description)} *(${escape(prep.category)} · owner: ${escape(prep.owner)} · ${escape(prep.estimatedEffort)})*`;
}

// ─── Helpers ──────────────────────────────────────────────────

function appendBulletList(lines: string[], label: string, items: string[]): void {
  const filtered = items.filter((i) => i && i.length > 0);
  if (filtered.length === 0) return;
  lines.push('', label);
  for (const item of filtered) {
    lines.push(`- ${escape(item)}`);
  }
}

function missingField(name: string): string {
  return `> *Missing data: \`${name}\`*`;
}

/**
 * Markdown-safe escape voor user-content. Voorkomt onbedoelde inline-formatting
 * door de markdown-meaningful tekens te escapen. react-markdown negeert raw HTML
 * by default, dus extra HTML-sanitization is niet nodig — deze escape gaat
 * alleen over markdown-leesbaarheid.
 */
function escape(str: string): string {
  if (typeof str !== 'string') return '';
  // Escape ALL markdown-meaningful characters om te voorkomen dat
  // AI-touched of user-content per ongeluk headings, lijsten, blockquotes,
  // links of formatting injecteert in de gerenderde brief.
  let escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
  // Leading-position chars (#, >, -, +, !) injecteren block-elementen
  // (heading, blockquote, list, image) wanneer ze aan het begin van een
  // regel staan. De renderer combineert content-strings binnen regels
  // dus pre-escapen vermijdt onbedoelde formatting.
  escaped = escaped.replace(/^(#+|>|-|\+|!)/gm, '\\$1');
  return escaped;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
