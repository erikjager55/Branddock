/**
 * EAST Framework — Behavioral Validation Checklist
 *
 * The EAST framework (Behavioural Insights Team, 2014) provides a
 * practical checklist for evaluating whether a creative concept or
 * deliverable is designed for maximum behavioral effectiveness.
 *
 * Used in Phase 5 (Hook Validation) and Phase 6 (Hook Refinement)
 * as a quality gate for creative hooks and deliverables.
 *
 * @see "EAST: Four simple ways to apply behavioural insights" — BIT, 2014
 */

// ─── Types ────────────────────────────────────────────────

export interface EastDimension {
  id: 'easy' | 'attractive' | 'social' | 'timely';
  letter: string;
  name: string;
  description: string;
  scoringCriteria: EastCriterion[];
  validationQuestions: string[];
}

export interface EastCriterion {
  label: string;
  description: string;
  weight: number;
}

// ─── EAST Checklist ───────────────────────────────────────

export const EAST_CHECKLIST: Record<EastDimension['id'], EastDimension> = {
  easy: {
    id: 'easy',
    letter: 'E',
    name: 'Easy',
    description: 'Reduce friction. Make the desired behavior as simple as possible. Default to the right choice.',
    scoringCriteria: [
      {
        label: 'Low cognitive load',
        description: 'The message/action requires minimal mental effort to understand and act on.',
        weight: 0.3,
      },
      {
        label: 'Clear next step',
        description: 'There is an obvious, specific action the audience can take immediately.',
        weight: 0.3,
      },
      {
        label: 'Minimal friction',
        description: 'Barriers between intention and action have been removed or minimized.',
        weight: 0.2,
      },
      {
        label: 'Smart defaults',
        description: 'The desired behavior is set as the default or path of least resistance.',
        weight: 0.2,
      },
    ],
    validationQuestions: [
      'Can the audience understand what to do in under 5 seconds?',
      'Is there a single, clear call to action?',
      'Have unnecessary steps been eliminated?',
      'Is the desired behavior the easiest option available?',
    ],
  },
  attractive: {
    id: 'attractive',
    letter: 'A',
    name: 'Attractive',
    description: 'Grab attention and hold it. Use design, personalization, and incentives to make the behavior appealing.',
    scoringCriteria: [
      {
        label: 'Attention-grabbing',
        description: 'The creative concept stands out in the media environment and interrupts scrolling/browsing.',
        weight: 0.3,
      },
      {
        label: 'Personally relevant',
        description: 'The message feels tailored to the individual or their specific situation.',
        weight: 0.25,
      },
      {
        label: 'Reward-signaling',
        description: 'The benefit or reward of the behavior is clearly and immediately communicated.',
        weight: 0.25,
      },
      {
        label: 'Aesthetically compelling',
        description: 'The visual/verbal execution is polished, distinctive, and brand-consistent.',
        weight: 0.2,
      },
    ],
    validationQuestions: [
      'Would this stop someone mid-scroll?',
      'Does it feel personally relevant to the target persona?',
      'Is the reward/benefit immediately obvious?',
      'Is the execution visually distinctive and memorable?',
    ],
  },
  social: {
    id: 'social',
    letter: 'S',
    name: 'Social',
    description: 'Leverage social influence. Show that others are doing it. Make the behavior visible and shareable.',
    scoringCriteria: [
      {
        label: 'Social proof present',
        description: 'Others performing the behavior are visible (numbers, testimonials, community).',
        weight: 0.3,
      },
      {
        label: 'Shareability',
        description: 'The content/experience is designed to be shared, creating network effects.',
        weight: 0.25,
      },
      {
        label: 'Normative framing',
        description: 'The behavior is framed as normal, expected, or mainstream (not fringe).',
        weight: 0.25,
      },
      {
        label: 'Community element',
        description: 'There is a sense of belonging or collective participation baked into the concept.',
        weight: 0.2,
      },
    ],
    validationQuestions: [
      'Can the audience see that others like them are already doing this?',
      'Would someone naturally share or talk about this experience?',
      'Is the behavior framed as the "normal" thing to do?',
      'Does the concept create a sense of community or belonging?',
    ],
  },
  timely: {
    id: 'timely',
    letter: 'T',
    name: 'Timely',
    description: 'Reach people at the right moment. Align with life events, habits, and decision windows.',
    scoringCriteria: [
      {
        label: 'Moment-appropriate',
        description: 'The message reaches the audience during a natural decision window or moment of receptivity.',
        weight: 0.3,
      },
      {
        label: 'Urgency without manipulation',
        description: 'There is a genuine reason to act now (not false scarcity), creating healthy urgency.',
        weight: 0.25,
      },
      {
        label: 'Habit-connected',
        description: 'The behavior is linked to an existing routine or trigger moment.',
        weight: 0.25,
      },
      {
        label: 'Present-biased framing',
        description: 'Immediate benefits are emphasized over distant future rewards.',
        weight: 0.2,
      },
    ],
    validationQuestions: [
      'Is this reaching the audience at the right moment in their journey?',
      'Is there a genuine reason to act now?',
      'Is the behavior linked to an existing habit or trigger?',
      'Are immediate (not just long-term) benefits highlighted?',
    ],
  },
} as const satisfies Record<EastDimension['id'], EastDimension>;

// ─── Helpers ──────────────────────────────────────────────

export function getEastDimension(id: EastDimension['id']): EastDimension | undefined {
  return EAST_CHECKLIST[id];
}

export function getAllEastDimensions(): EastDimension[] {
  return Object.values(EAST_CHECKLIST);
}

/**
 * Format the EAST checklist as a markdown prompt section for AI consumption.
 */
export function formatEastForPrompt(): string {
  const lines = ['## EAST Validation Checklist (Easy, Attractive, Social, Timely)', ''];
  for (const dim of Object.values(EAST_CHECKLIST)) {
    lines.push(`### ${dim.letter} — ${dim.name}`);
    lines.push(dim.description);
    lines.push('Scoring criteria:');
    for (const c of dim.scoringCriteria) {
      lines.push(`- ${c.label} (${Math.round(c.weight * 100)}%): ${c.description}`);
    }
    lines.push('Validation questions:');
    for (const q of dim.validationQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
