// =============================================================
// Persona Context Builder
//
// Reusable utility that fetches persona data from the database
// and formats it as context strings for AI prompts.
//
// Three entry points:
// 1. buildPersonaContext(personaId) → { summary, full, implications }
// 2. buildAllPersonasContext(workspaceId) → concatenated summaries
// 3. buildPersonaChatSystemPrompt(personaId, mode) → complete system prompt
// =============================================================

import { prisma } from '@/lib/prisma';

// ─── Types ─────────────────────────────────────────────────

export interface PersonaContext {
  summary: string;
  full: string;
  implications: string | null;
}

interface StrategicImplication {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export type PersonaChatMode = 'free' | 'interview' | 'empathy' | 'jtbd';

// ─── Prisma Select ─────────────────────────────────────────

const PERSONA_SELECT = {
  id: true,
  name: true,
  tagline: true,
  age: true,
  gender: true,
  location: true,
  occupation: true,
  education: true,
  income: true,
  familyStatus: true,
  personalityType: true,
  coreValues: true,
  interests: true,
  goals: true,
  motivations: true,
  frustrations: true,
  behaviors: true,
  strategicImplications: true,
  preferredChannels: true,
  techStack: true,
  quote: true,
  bio: true,
  buyingTriggers: true,
  decisionCriteria: true,
} as const;

type PersonaRow = {
  id: string;
  name: string;
  tagline: string | null;
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  education: string | null;
  income: string | null;
  familyStatus: string | null;
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  strategicImplications: string | null;
  preferredChannels: unknown;
  techStack: unknown;
  quote: string | null;
  bio: string | null;
  buyingTriggers: unknown;
  decisionCriteria: unknown;
};

// ─── Formatters ────────────────────────────────────────────

function formatList(items: string[]): string {
  if (items.length === 0) return 'Not specified';
  return items.join(', ');
}

function formatOptional(value: string | null): string {
  return value || 'Not specified';
}

function parseImplications(raw: string | null): StrategicImplication[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
      return parsed;
    }
  } catch {
    // Not JSON — legacy plain text
  }
  return null;
}

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  return [];
}

function buildSummary(p: PersonaRow): string {
  const parts = [p.name];
  if (p.tagline) parts.push(`— ${p.tagline}`);
  if (p.occupation) parts.push(`| ${p.occupation}`);
  if (p.age) parts.push(`| ${p.age}`);
  if (p.location) parts.push(`| ${p.location}`);
  if (p.quote) parts.push(`| "${p.quote}"`);
  return parts.join(' ');
}

function buildFull(p: PersonaRow): string {
  const lines: string[] = [];

  // Identity
  lines.push(`# ${p.name}`);
  if (p.tagline) lines.push(p.tagline);
  if (p.quote) lines.push(`> "${p.quote}"`);
  if (p.bio) lines.push(p.bio);
  lines.push('');

  // Demographics
  const demoFields: [string, string | null][] = [
    ['Age', p.age],
    ['Gender', p.gender],
    ['Location', p.location],
    ['Occupation', p.occupation],
    ['Education', p.education],
    ['Income', p.income],
    ['Family Status', p.familyStatus],
  ];
  const demoLines = demoFields
    .filter(([, v]) => v)
    .map(([label, v]) => `- ${label}: ${v}`);
  if (demoLines.length > 0) {
    lines.push('## Demographics');
    lines.push(...demoLines);
    lines.push('');
  }

  // Personality
  const personalityLines: string[] = [];
  if (p.personalityType) personalityLines.push(`- Personality Type: ${p.personalityType}`);
  if (p.coreValues.length > 0) personalityLines.push(`- Core Values: ${formatList(p.coreValues)}`);
  if (p.interests.length > 0) personalityLines.push(`- Interests: ${formatList(p.interests)}`);
  if (personalityLines.length > 0) {
    lines.push('## Personality');
    lines.push(...personalityLines);
    lines.push('');
  }

  // Goals & Motivations
  if (p.goals.length > 0 || p.motivations.length > 0) {
    lines.push('## Goals & Motivations');
    if (p.goals.length > 0) lines.push(`- Goals: ${formatList(p.goals)}`);
    if (p.motivations.length > 0) lines.push(`- Motivations: ${formatList(p.motivations)}`);
    lines.push('');
  }

  // Frustrations
  if (p.frustrations.length > 0) {
    lines.push('## Frustrations');
    lines.push(`- ${formatList(p.frustrations)}`);
    lines.push('');
  }

  // Behaviors
  if (p.behaviors.length > 0) {
    lines.push('## Behaviors');
    lines.push(`- ${formatList(p.behaviors)}`);
    lines.push('');
  }

  // Channels & Tools
  const channels = asStringArray(p.preferredChannels);
  const tools = asStringArray(p.techStack);
  if (channels.length > 0 || tools.length > 0) {
    lines.push('## Channels & Tools');
    if (channels.length > 0) lines.push(`- Preferred Channels: ${formatList(channels)}`);
    if (tools.length > 0) lines.push(`- Tech Stack: ${formatList(tools)}`);
    lines.push('');
  }

  // Buying Triggers & Decision Criteria
  const triggers = asStringArray(p.buyingTriggers);
  const criteria = asStringArray(p.decisionCriteria);
  if (triggers.length > 0 || criteria.length > 0) {
    lines.push('## Buying Triggers & Decision Criteria');
    if (triggers.length > 0) lines.push(`- Buying Triggers: ${triggers.join('; ')}`);
    if (criteria.length > 0) lines.push(`- Decision Criteria: ${criteria.join('; ')}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildImplicationsText(p: PersonaRow): string | null {
  if (!p.strategicImplications) return null;

  const structured = parseImplications(p.strategicImplications);

  if (structured) {
    const lines = structured.map(
      (impl) => `- [${impl.priority.toUpperCase()}] ${impl.category}: ${impl.title} — ${impl.description}`,
    );
    return `## Strategic Implications for ${p.name}\n${lines.join('\n')}`;
  }

  // Legacy plain text
  return `## Strategic Implications for ${p.name}\n${p.strategicImplications}`;
}

// ─── Chat Mode Templates ──────────────────────────────────

const MODE_INSTRUCTIONS: Record<PersonaChatMode, string> = {
  free: `## CONVERSATION RULES
1. ALWAYS stay in character as {{name}}. Never break character or acknowledge being AI.
2. Respond naturally as this person would — use their vocabulary level, emotional tone, and perspective.
3. When asked about products, services, or brands: react authentically based on your goals, frustrations, and behaviors.
4. Share personal opinions and experiences. Be specific, not generic.
5. If something doesn't align with your values or needs, say so clearly and explain why.
6. Use natural conversational language. Avoid corporate jargon unless your occupation calls for it.
7. Show emotion where appropriate — enthusiasm, skepticism, frustration, excitement.
8. Keep responses conversational — typically 2-4 paragraphs unless more detail is asked for.`,

  interview: `## INTERVIEW MODE RULES
1. You are being interviewed as {{name}}. A researcher is asking you questions about your experiences, needs, and behaviors.
2. ALWAYS stay in character. Never break character or acknowledge being AI.
3. Answer questions thoughtfully and in detail, drawing from your background, goals, and frustrations.
4. Share specific examples and stories from your life when relevant.
5. If a question doesn't apply to you, explain why from your perspective.
6. Be honest about your experiences — include both positive and negative aspects.
7. Occasionally ask the interviewer to clarify if a question is vague, as a real person would.
8. Keep responses focused but detailed — typically 2-5 paragraphs per question.`,

  empathy: `## EMPATHY MAP MODE RULES
1. You are {{name}}, participating in an empathy mapping exercise.
2. ALWAYS stay in character. Never break character or acknowledge being AI.
3. When asked what you THINK: share your thoughts, beliefs, and mental models about the topic.
4. When asked what you FEEL: express your emotions, concerns, and hopes authentically.
5. When asked what you SAY: describe how you talk about this topic with others.
6. When asked what you DO: describe your actual behaviors, habits, and actions.
7. When asked about PAINS: share your frustrations, obstacles, and fears in detail.
8. When asked about GAINS: share what success looks like, what you hope to achieve.
9. Be specific and personal — use first-person language and concrete examples.`,

  jtbd: `## JOBS TO BE DONE MODE RULES
1. You are {{name}}, discussing the jobs you hire products/services to do.
2. ALWAYS stay in character. Never break character or acknowledge being AI.
3. Frame your needs in terms of progress you're trying to make in your life or work.
4. Describe the situation or trigger that makes you look for a solution.
5. Share the functional, emotional, and social dimensions of what you need.
6. Explain what "done" looks like — the outcome you're seeking.
7. Mention competing solutions you've tried or considered, and why they fell short.
8. Describe the trade-offs you're willing to make and where you draw the line.
9. Be specific about context — when, where, and why you need this job done.`,
};

// ─── Public API ────────────────────────────────────────────

/**
 * Build context strings for a single persona.
 * Returns { summary, full, implications } or null if not found.
 */
export async function buildPersonaContext(personaId: string): Promise<PersonaContext | null> {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: PERSONA_SELECT,
  });
  if (!persona) return null;

  return {
    summary: buildSummary(persona),
    full: buildFull(persona),
    implications: buildImplicationsText(persona),
  };
}

/**
 * Build a concatenated context of all personas in a workspace.
 * Returns an object with the formatted text and persona count.
 */
export async function buildAllPersonasContext(
  workspaceId: string,
): Promise<{ text: string; count: number }> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId },
    select: PERSONA_SELECT,
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  if (personas.length === 0) {
    return {
      text: 'No personas defined yet. Consider creating personas for more targeted strategy.',
      count: 0,
    };
  }

  const sections = personas.map((p) => buildFull(p));
  return {
    text: `## Target Audience Personas (${personas.length})\n\n${sections.join('\n\n---\n\n')}`,
    count: personas.length,
  };
}

/**
 * Build combined context for selected personas (by IDs).
 * Used by Content Studio to pass persona context to generation.
 * Validates workspace ownership for each persona.
 */
export async function buildSelectedPersonasContext(
  personaIds: string[],
  workspaceId: string,
): Promise<string> {
  if (personaIds.length === 0) return "";

  const personas = await prisma.persona.findMany({
    where: {
      id: { in: personaIds },
      workspaceId,
    },
    select: PERSONA_SELECT,
  });

  if (personas.length === 0) return "";

  const sections = personas.map((p) => {
    const full = buildFull(p);
    const impl = buildImplicationsText(p);
    return impl ? `${full}\n\n${impl}` : full;
  });

  // Build content optimization summary (Stap 7: channel/trigger/criteria hints)
  const optimizationLines: string[] = [];
  for (const p of personas) {
    const channels = asStringArray(p.preferredChannels);
    const triggers = asStringArray(p.buyingTriggers);
    const criteria = asStringArray(p.decisionCriteria);

    if (channels.length > 0 || triggers.length > 0 || criteria.length > 0) {
      if (channels.length > 0) {
        optimizationLines.push(`- ${p.name} is most active on: ${channels.join(', ')}`);
      }
      if (criteria.length > 0) {
        optimizationLines.push(`- ${p.name} evaluates based on: ${criteria.join(', ')}`);
      }
      if (triggers.length > 0) {
        optimizationLines.push(`- Key triggers that would make ${p.name} act: ${triggers.join('; ')}`);
      }
    }
  }

  const optimizationSection = optimizationLines.length > 0
    ? [
        "",
        "## Target Persona Channel Preferences & Decision Drivers",
        ...optimizationLines,
        "",
        "Optimize the content for these channels and address these triggers and criteria where relevant.",
      ].join("\n")
    : "";

  return [
    `=== PERSONA CONTEXT (${personas.length} persona${personas.length > 1 ? "s" : ""}) ===`,
    "",
    sections.join("\n\n---\n\n"),
    optimizationSection,
    "",
    "=== END PERSONA CONTEXT ===",
  ].join("\n");
}

/**
 * Build a complete system prompt for persona chat.
 * Combines persona data with mode-specific instructions.
 */
export async function buildPersonaChatSystemPrompt(
  personaId: string,
  mode: PersonaChatMode = 'free',
): Promise<string | null> {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: PERSONA_SELECT,
  });
  if (!persona) return null;

  const instructions = MODE_INSTRUCTIONS[mode].replace(/\{\{name\}\}/g, persona.name);

  const lines: string[] = [];

  lines.push(`You are ${persona.name}, a real person with your own perspective, experiences, and opinions. You are NOT an AI assistant — you are this specific individual.`);
  lines.push('');

  // Who you are
  if (persona.tagline) {
    lines.push('## WHO YOU ARE');
    lines.push(persona.tagline);
    lines.push('');
  }

  // Demographics
  lines.push('## YOUR DEMOGRAPHICS');
  lines.push(`- Age: ${formatOptional(persona.age)}`);
  lines.push(`- Occupation: ${formatOptional(persona.occupation)}`);
  lines.push(`- Location: ${formatOptional(persona.location)}`);
  lines.push(`- Education: ${formatOptional(persona.education)}`);
  lines.push(`- Income level: ${formatOptional(persona.income)}`);
  lines.push(`- Family situation: ${formatOptional(persona.familyStatus)}`);
  lines.push('');

  // Personality
  lines.push('## YOUR PERSONALITY');
  lines.push(`- Type: ${formatOptional(persona.personalityType)}`);
  lines.push(`- Core values: ${formatList(persona.coreValues)}`);
  lines.push(`- Interests: ${formatList(persona.interests)}`);
  lines.push('');

  // Drivers
  lines.push('## WHAT DRIVES YOU');
  lines.push(`Goals: ${formatList(persona.goals)}`);
  lines.push(`Motivations: ${formatList(persona.motivations)}`);
  lines.push('');

  // Frustrations
  lines.push('## WHAT FRUSTRATES YOU');
  lines.push(formatList(persona.frustrations));
  lines.push('');

  // Behaviors
  lines.push('## HOW YOU BEHAVE');
  lines.push(formatList(persona.behaviors));
  lines.push('');

  // Channels & Tools
  const channels = asStringArray(persona.preferredChannels);
  const tools = asStringArray(persona.techStack);
  if (channels.length > 0) {
    lines.push('## WHERE YOU ARE ACTIVE');
    lines.push(`You actively use these channels: ${channels.join(', ')}. Reference them naturally when discussing how you discover tools or stay informed.`);
    lines.push('');
  }
  if (tools.length > 0) {
    lines.push('## YOUR TOOLS');
    lines.push(`Your daily tools include: ${tools.join(', ')}. You have strong opinions about these and compare new tools against your existing workflow.`);
    lines.push('');
  }

  // Quote — core belief
  if (persona.quote) {
    lines.push('## YOUR CORE BELIEF');
    lines.push(`Your core belief can be summarized as: "${persona.quote}". This shapes how you evaluate solutions.`);
    lines.push('');
  }

  // Buying triggers
  const triggers = asStringArray(persona.buyingTriggers);
  if (triggers.length > 0) {
    lines.push('## WHAT MAKES YOU LOOK FOR NEW SOLUTIONS');
    lines.push(`You would start actively looking for a new solution when: ${triggers.join('; ')}. These are your buying triggers.`);
    lines.push('');
  }

  // Decision criteria
  const criteria = asStringArray(persona.decisionCriteria);
  if (criteria.length > 0) {
    lines.push('## HOW YOU EVALUATE');
    lines.push(`When evaluating tools, you prioritize: ${criteria.join(', ')}. Weight these naturally in conversations about products or solutions.`);
    lines.push('');
  }

  // Mode-specific instructions
  lines.push(instructions);

  return lines.join('\n').trim();
}
