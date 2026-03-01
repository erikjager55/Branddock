/**
 * Seed ExplorationConfig records for all brand asset types.
 * Creates or updates (upsert) configs in the database so they
 * are visible and editable in Settings → Administrator → AI Exploration Configuration.
 *
 * Usage:
 *   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/seed-exploration-configs.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Prompts (match config-resolver.ts system defaults) ──────

const SYSTEM_PROMPT = `You are a senior brand strategist conducting a structured exploration session.
Guide the user through strategic dimensions with thoughtful questions.
Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}`;

const FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}
Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

const REPORT_PROMPT = `Generate an analysis report based on the exploration session.
Item: {{itemName}} ({{itemType}})
{{itemDescription}}

Answers per dimension:
{{allAnswers}}

Brand Context:
{{brandContext}}

{{customKnowledge}}

Generate JSON:
{
  "executiveSummary": "2-3 paragraph strategic summary",
  "findings": [{ "title": "...", "description": "..." }],
  "recommendations": ["..."],
  "fieldSuggestions": [{ "field": "...", "label": "...", "suggestedValue": "...", "reason": "..." }]
}
Respond with valid JSON only.`;

// ─── Dimension definitions per subtype ───────────────────────

interface Dimension {
  key: string;
  title: string;
  icon: string;
  question: string;
}

interface AssetTypeConfig {
  subType: string;
  label: string;
  dimensions: Dimension[];
}

const ASSET_TYPE_CONFIGS: AssetTypeConfig[] = [
  {
    subType: 'golden-circle',
    label: 'Golden Circle — WHY \u2192 HOW \u2192 WHAT',
    dimensions: [
      { key: 'why', title: 'WHY \u2014 Core Belief', icon: 'Heart', question: 'Why does your organization exist? What is the fundamental belief that drives everything you do?' },
      { key: 'how', title: 'HOW \u2014 Unique Approach', icon: 'Settings', question: 'How do you bring your WHY to life? What processes, values, or methods make your approach unique?' },
      { key: 'what', title: 'WHAT \u2014 Offering', icon: 'Package', question: 'What exactly do you offer? How do your products or services prove your WHY and HOW?' },
      { key: 'coherence', title: 'Inside-Out Coherence', icon: 'Target', question: 'How consistently does your organization communicate from WHY \u2192 HOW \u2192 WHAT? Where are the gaps?' },
    ],
  },
  {
    subType: 'social-relevancy',
    label: 'Social Relevancy \u2014 Purpose & Impact',
    dimensions: [
      { key: 'purpose_clarity', title: 'Purpose Clarity', icon: 'Compass', question: 'Why does your organization exist beyond making profit?' },
      { key: 'mens', title: 'Impact op Mens', icon: 'Heart', question: 'How do your products or services contribute to personal growth and well-being?' },
      { key: 'milieu', title: 'Impact op Milieu', icon: 'Leaf', question: 'What steps has your organization taken toward sustainability?' },
      { key: 'maatschappij', title: 'Impact op Maatschappij', icon: 'Globe', question: 'How does your brand help improve society?' },
    ],
  },
  {
    subType: 'purpose-statement',
    label: 'Purpose Statement \u2014 Bestaansrecht',
    dimensions: [
      { key: 'why', title: 'Waarom \u2014 Bestaansrecht', icon: 'Compass', question: 'Why was your organization founded? What fundamental belief is at the core?' },
      { key: 'how', title: 'Hoe \u2014 Unieke Aanpak', icon: 'Lightbulb', question: "How do you fulfill your purpose in a way that's distinctly yours?" },
      { key: 'impact', title: 'Impact \u2014 Gewenst Effect', icon: 'Rocket', question: 'When your purpose is fully realized, what does the world look like?' },
      { key: 'alignment', title: 'Alignment \u2014 Organisatie & Uitvoering', icon: 'Target', question: 'How well does your current organization reflect your purpose?' },
    ],
  },
  {
    subType: 'brand-essence',
    label: 'Brand Essence \u2014 Core Identity',
    dimensions: [
      { key: 'core_identity', title: 'Core Identity', icon: 'Fingerprint', question: 'If your brand were a person, how would you describe their essential character in one sentence?' },
      { key: 'emotional_connection', title: 'Emotional Connection', icon: 'Heart', question: 'What emotion should people feel every time they interact with your brand?' },
      { key: 'differentiation', title: 'Unique DNA', icon: 'Sparkles', question: 'What makes your brand fundamentally different from everything else in your category?' },
      { key: 'consistency', title: 'Essence in Action', icon: 'Layers', question: 'Where does your brand essence show up most clearly \u2014 and where does it get lost?' },
    ],
  },
  {
    subType: 'brand-promise',
    label: 'Brand Promise \u2014 Core Commitment',
    dimensions: [
      { key: 'commitment', title: 'Core Commitment', icon: 'Shield', question: 'What is the one promise your brand makes to every customer, every time?' },
      { key: 'proof', title: 'Proof & Delivery', icon: 'CheckCircle', question: 'How do you consistently deliver on this promise? What evidence can customers point to?' },
      { key: 'gap_analysis', title: 'Promise Gap', icon: 'AlertTriangle', question: 'Where is the biggest gap between what you promise and what customers actually experience?' },
      { key: 'evolution', title: 'Future Promise', icon: 'TrendingUp', question: 'How should your brand promise evolve as your market and customers change?' },
    ],
  },
  {
    subType: 'mission-statement',
    label: 'Mission Statement \u2014 Purpose & Direction',
    dimensions: [
      { key: 'purpose', title: 'Purpose & Direction', icon: 'Compass', question: 'What is your organization trying to achieve right now? What is the primary mission?' },
      { key: 'audience', title: 'Who You Serve', icon: 'Users', question: 'Who are the primary beneficiaries of your mission? How does it improve their lives?' },
      { key: 'approach', title: 'How You Deliver', icon: 'Rocket', question: 'What is your unique approach to fulfilling this mission? What sets your method apart?' },
      { key: 'measurement', title: 'Impact & Measurement', icon: 'BarChart2', question: 'How do you know if your mission is succeeding? What does progress look like?' },
    ],
  },
  {
    subType: 'vision-statement',
    label: 'Vision Statement \u2014 Future State',
    dimensions: [
      { key: 'future_state', title: 'Future State', icon: 'Eye', question: 'What does the world look like when your organization has fully succeeded? Paint the picture.' },
      { key: 'ambition', title: 'Scale of Ambition', icon: 'Mountain', question: 'How ambitious is your vision? Does it inspire people to go beyond what seems possible today?' },
      { key: 'relevance', title: 'Stakeholder Relevance', icon: 'Users', question: 'How does this vision connect to what your employees, customers, and partners care about?' },
      { key: 'pathway', title: 'Vision to Action', icon: 'Map', question: 'What are the key milestones between today and your vision? What needs to happen first?' },
    ],
  },
  {
    subType: 'brand-archetype',
    label: 'Brand Archetype \u2014 Narrative Identity',
    dimensions: [
      { key: 'archetype_fit', title: 'Archetype Identity', icon: 'Crown', question: 'Which archetype best represents your brand \u2014 and why? What traits does your brand naturally embody?' },
      { key: 'behavior', title: 'Archetypal Behavior', icon: 'Activity', question: 'How does this archetype show up in your brand\u2019s communication, products, and customer interactions?' },
      { key: 'shadow', title: 'Shadow Side', icon: 'Moon', question: 'What is the shadow side of your archetype? How do you avoid falling into those negative patterns?' },
      { key: 'storytelling', title: 'Narrative Power', icon: 'BookOpen', question: 'How does your archetype shape the stories you tell? What recurring narrative themes define your brand?' },
    ],
  },
  {
    subType: 'transformative-goals',
    label: 'Transformative Goals \u2014 Change & Impact',
    dimensions: [
      { key: 'transformation', title: 'Desired Transformation', icon: 'Sparkles', question: 'What fundamental change does your brand want to create in people\u2019s lives or in the world?' },
      { key: 'barriers', title: 'Barriers to Change', icon: 'Shield', question: 'What stands in the way of this transformation? What obstacles do your customers face?' },
      { key: 'enablers', title: 'How You Enable', icon: 'Zap', question: 'How does your brand specifically help people overcome these barriers and achieve transformation?' },
      { key: 'evidence', title: 'Transformation Evidence', icon: 'Award', question: 'What evidence exists that your brand has already created this transformation? Share concrete examples.' },
    ],
  },
  {
    subType: 'brand-personality',
    label: 'Brand Personality \u2014 Character & Voice',
    dimensions: [
      { key: 'traits', title: 'Core Traits', icon: 'User', question: 'If your brand were a person at a dinner party, how would other guests describe them? Name 3-5 key personality traits.' },
      { key: 'voice', title: 'Voice & Tone', icon: 'MessageCircle', question: 'How does your brand speak? What words would it use \u2014 and never use? What\u2019s the tone in different situations?' },
      { key: 'relationships', title: 'Relationship Style', icon: 'Heart', question: 'What kind of relationship does your brand build with people? A trusted advisor? A fun friend? A wise mentor?' },
      { key: 'boundaries', title: 'Personality Boundaries', icon: 'AlertCircle', question: 'What is your brand personality NOT? What traits would feel inauthentic or off-brand?' },
    ],
  },
  {
    subType: 'brand-story',
    label: 'Brand Story \u2014 Origin & Narrative',
    dimensions: [
      { key: 'origin', title: 'Origin Story', icon: 'BookOpen', question: 'How did your brand begin? What problem or moment sparked its creation?' },
      { key: 'struggle', title: 'Challenge & Struggle', icon: 'Mountain', question: 'What challenges has your brand overcome? What makes the journey compelling?' },
      { key: 'turning_point', title: 'Turning Point', icon: 'Star', question: 'What was the defining moment that shaped who your brand is today?' },
      { key: 'future_chapter', title: 'The Next Chapter', icon: 'ArrowRight', question: 'What is the next chapter of your brand story? Where is the narrative heading?' },
    ],
  },
  {
    subType: 'brandhouse-values',
    label: 'Brandhouse Values \u2014 Core Values & Culture',
    dimensions: [
      { key: 'core_values', title: 'Core Values', icon: 'Heart', question: 'What are the 3-5 non-negotiable values that guide every decision in your organization?' },
      { key: 'lived_values', title: 'Values in Practice', icon: 'CheckCircle', question: 'How do these values show up in daily operations, hiring, and customer interactions?' },
      { key: 'tension', title: 'Value Tensions', icon: 'Scale', question: 'When have your values been tested? How do you handle conflicts between competing values?' },
      { key: 'cultural_fit', title: 'Cultural Expression', icon: 'Building', question: 'How do your values shape your internal culture? Would employees recognize these values in their daily work?' },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────

async function main() {
  // 1. Get the first workspace
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!workspace) {
    console.error('No workspace found in the database. Run the main seed first.');
    process.exit(1);
  }

  console.log(`Using workspace: "${workspace.name}" (${workspace.id})`);
  console.log(`Seeding ${ASSET_TYPE_CONFIGS.length} brand asset exploration configs...\n`);

  let created = 0;
  let updated = 0;

  for (const cfg of ASSET_TYPE_CONFIGS) {
    // Check if config already exists
    const existing = await prisma.explorationConfig.findUnique({
      where: {
        workspaceId_itemType_itemSubType: {
          workspaceId: workspace.id,
          itemType: 'brand_asset',
          itemSubType: cfg.subType,
        },
      },
    });

    const data = {
      itemType: 'brand_asset',
      itemSubType: cfg.subType,
      label: cfg.label,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.4,
      maxTokens: 2048,
      isActive: true,
      systemPrompt: SYSTEM_PROMPT,
      feedbackPrompt: FEEDBACK_PROMPT,
      reportPrompt: REPORT_PROMPT,
      dimensions: cfg.dimensions,
      fieldSuggestionsConfig: undefined,
      contextSources: ['brand_asset', 'product'],
    };

    if (existing) {
      await prisma.explorationConfig.update({
        where: { id: existing.id },
        data,
      });
      console.log(`  Updated: ${cfg.label} (${cfg.subType})`);
      updated++;
    } else {
      await prisma.explorationConfig.create({
        data: {
          ...data,
          workspaceId: workspace.id,
        },
      });
      console.log(`  Created: ${cfg.label} (${cfg.subType})`);
      created++;
    }
  }

  // Also seed a base persona config if it doesn't exist
  const personaExists = await prisma.explorationConfig.findFirst({
    where: { workspaceId: workspace.id, itemType: 'persona', itemSubType: null },
  });

  if (!personaExists) {
    await prisma.explorationConfig.create({
      data: {
        workspaceId: workspace.id,
        itemType: 'persona',
        itemSubType: null,
        label: 'Persona \u2014 Base Exploration',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.4,
        maxTokens: 2048,
        isActive: true,
        systemPrompt: SYSTEM_PROMPT,
        feedbackPrompt: FEEDBACK_PROMPT,
        reportPrompt: REPORT_PROMPT,
        dimensions: [
          { key: 'demographics', title: 'Demographics Profile', icon: 'Users', question: "Can you tell me more about this persona's background \u2014 age range, location, education, professional context?" },
          { key: 'goals_motivations', title: 'Goals & Motivations', icon: 'TrendingUp', question: "What are this persona's primary objectives \u2014 both professional and personal?" },
          { key: 'challenges_frustrations', title: 'Challenges & Pain Points', icon: 'Heart', question: 'What are the main obstacles this persona faces? What pain points do they experience?' },
          { key: 'value_proposition', title: 'Value Alignment', icon: 'Zap', question: "How does your brand's offering connect with this persona's needs?" },
        ],
        contextSources: ['brand_asset', 'product'],
      },
    });
    console.log(`  Created: Persona \u2014 Base Exploration (persona/null)`);
    created++;
  } else {
    console.log(`  Skipped: Persona base config already exists`);
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
  console.log('Configs are now visible in Settings \u2192 Administrator \u2192 AI Exploration Configuration.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
