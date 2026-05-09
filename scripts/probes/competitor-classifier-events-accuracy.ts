/**
 * A1 validatie-probe voor competitor-ai-event-classifier
 * (idea-doc `tasks/_drafts/idea-competitor-ai-event-classifier.md`).
 *
 * Doel: meten of Claude Haiku 4.5 op snapshot-pair input voldoende
 * accuracy haalt (≥ 75%) om CATEGORY_REPOSITIONING en
 * TARGET_AUDIENCE_CHANGED te detecteren bovenop de deterministische
 * diff-rules. Hard validatie-blokker vóór technical-planner promotion.
 *
 * Sample: 30 hand-geconstrueerde prev/next paren:
 *   - 10 CATEGORY_REPOSITIONING (fundamentele category/mechanism shift)
 *   - 10 TARGET_AUDIENCE_CHANGED (alleen audience shift, zelfde category)
 *   - 10 NONE (cosmetische wijzigingen — wording/synoniemen/order)
 *
 * Probe doet 1 AI-call per paar (30 totaal, ~$0,03 cost). Voor productie
 * MVP zou dit één batched call zijn — probe-mode is per-pair voor
 * granulaire accuracy-meting.
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx scripts/probes/competitor-classifier-events-accuracy.ts
 */
import Anthropic from '@anthropic-ai/sdk';

type ExpectedEvent =
  | 'CATEGORY_REPOSITIONING'
  | 'TARGET_AUDIENCE_CHANGED'
  | 'NONE';

interface SnapshotSlice {
  valueProposition: string;
  targetAudience: string;
  differentiators: string[];
  mainOfferings: string[];
}

interface TestPair {
  id: string;
  description: string;
  prev: SnapshotSlice;
  next: SnapshotSlice;
  expected: ExpectedEvent;
}

// ─── Test fixtures (30 paren) ──────────────────────────

const FIXTURES: TestPair[] = [
  // ─── CATEGORY_REPOSITIONING (10) ─────────────────
  {
    id: 'cat-01',
    description: 'CRM → AI sales platform',
    prev: {
      valueProposition: 'Manage your customer relationships in one place',
      targetAudience: 'SMB sales teams',
      differentiators: ['simple UI', 'affordable', 'fast setup'],
      mainOfferings: ['Contact management', 'Pipeline tracking', 'Email integration'],
    },
    next: {
      valueProposition: 'AI-driven sales intelligence that closes deals 3x faster',
      targetAudience: 'Modern sales teams',
      differentiators: ['predictive scoring', 'auto-prioritization', 'conversational AI'],
      mainOfferings: ['AI deal scoring', 'Meeting intelligence', 'Revenue forecasting'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-02',
    description: 'Project tool → Work OS',
    prev: {
      valueProposition: 'Track tasks and projects with your team',
      targetAudience: 'Project managers',
      differentiators: ['Kanban boards', 'Gantt charts', 'time tracking'],
      mainOfferings: ['Task tracking', 'Project planning', 'Team collaboration'],
    },
    next: {
      valueProposition: 'The Work OS that powers entire organizations',
      targetAudience: 'Companies of all sizes',
      differentiators: ['fully customizable', 'no-code workflows', 'unified data layer'],
      mainOfferings: ['Work OS platform', 'CRM', 'HR', 'Marketing', 'Operations'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-03',
    description: 'Email tool → Customer engagement platform',
    prev: {
      valueProposition: 'Send marketing emails that convert',
      targetAudience: 'Email marketers',
      differentiators: ['drag-drop builder', 'A/B testing', 'segmentation'],
      mainOfferings: ['Email campaigns', 'Newsletters', 'Automation'],
    },
    next: {
      valueProposition: 'Engage customers across every channel with personalized journeys',
      targetAudience: 'Growth teams',
      differentiators: ['omnichannel orchestration', 'real-time personalization', 'AI-driven journeys'],
      mainOfferings: ['Customer journeys', 'SMS', 'Push notifications', 'Web personalization', 'Email'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-04',
    description: 'Forms → Workflow automation',
    prev: {
      valueProposition: 'Beautiful forms that people enjoy filling out',
      targetAudience: 'Marketers and researchers',
      differentiators: ['conversational UX', 'logic jumps', 'beautiful design'],
      mainOfferings: ['Forms', 'Surveys', 'Quizzes'],
    },
    next: {
      valueProposition: 'Automate any business workflow without code',
      targetAudience: 'Operations teams',
      differentiators: ['200+ integrations', 'visual workflow builder', 'enterprise governance'],
      mainOfferings: ['Workflow automation', 'Form builder', 'Integration hub', 'Approvals'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-05',
    description: 'Notes → Productivity OS',
    prev: {
      valueProposition: 'Take beautiful notes that organize themselves',
      targetAudience: 'Knowledge workers',
      differentiators: ['blocks-based editor', 'rich media', 'search'],
      mainOfferings: ['Note-taking', 'Personal wiki', 'Documents'],
    },
    next: {
      valueProposition: 'The all-in-one workspace for teams to think and ship',
      targetAudience: 'Modern teams',
      differentiators: ['blocks-based platform', 'databases', 'AI assistant', 'team workspaces'],
      mainOfferings: ['Docs', 'Wikis', 'Databases', 'Projects', 'AI', 'Team collaboration'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-06',
    description: 'Helpdesk → CX platform',
    prev: {
      valueProposition: 'Customer support ticketing made simple',
      targetAudience: 'Support teams',
      differentiators: ['easy onboarding', 'omnichannel inbox', 'SLA tracking'],
      mainOfferings: ['Ticketing', 'Help center', 'Live chat'],
    },
    next: {
      valueProposition: 'Build customer experiences that drive lifetime value',
      targetAudience: 'CX leaders',
      differentiators: ['unified customer profile', 'CX analytics', 'AI agents', 'workflow automation'],
      mainOfferings: ['CX platform', 'AI agents', 'Customer data', 'Journey orchestration'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-07',
    description: 'Video conferencing → Communications platform',
    prev: {
      valueProposition: 'Reliable video calls for any device',
      targetAudience: 'Remote teams',
      differentiators: ['HD video', 'low latency', 'cross-platform'],
      mainOfferings: ['Video meetings', 'Screen share', 'Recording'],
    },
    next: {
      valueProposition: 'The unified communications platform built for the AI era',
      targetAudience: 'Modern enterprises',
      differentiators: ['AI companion', 'unified workflow', 'global voice/video/chat'],
      mainOfferings: ['Meetings', 'Chat', 'Phone', 'AI workspace', 'Events', 'Whiteboard'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-08',
    description: 'SEO tool → Content marketing platform',
    prev: {
      valueProposition: 'Track your keyword rankings and backlinks',
      targetAudience: 'SEO specialists',
      differentiators: ['rank tracking', 'backlink analysis', 'site audits'],
      mainOfferings: ['Rank tracker', 'Backlink checker', 'Site audit'],
    },
    next: {
      valueProposition: 'The end-to-end content marketing platform that drives organic growth',
      targetAudience: 'Content marketing teams',
      differentiators: ['AI content generation', 'topic research', 'editorial workflow', 'performance analytics'],
      mainOfferings: ['Topic research', 'AI writer', 'Content calendar', 'Optimization', 'Performance analytics'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-09',
    description: 'Recruitment ATS → Talent platform',
    prev: {
      valueProposition: 'Track candidates through your hiring pipeline',
      targetAudience: 'Recruiters',
      differentiators: ['kanban pipeline', 'team collaboration', 'integrations with job boards'],
      mainOfferings: ['Applicant tracking', 'Job posting', 'Candidate database'],
    },
    next: {
      valueProposition: 'The talent platform that transforms how you attract, hire, and grow people',
      targetAudience: 'Talent leaders',
      differentiators: ['AI sourcing', 'skills intelligence', 'internal mobility', 'learning paths'],
      mainOfferings: ['Sourcing', 'ATS', 'Onboarding', 'Performance', 'Learning', 'Internal mobility'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },
  {
    id: 'cat-10',
    description: 'Analytics tool → Customer data platform',
    prev: {
      valueProposition: 'See how users behave on your website and app',
      targetAudience: 'Product analysts',
      differentiators: ['event tracking', 'funnels', 'session replay'],
      mainOfferings: ['Product analytics', 'Session replay', 'Funnels'],
    },
    next: {
      valueProposition: 'The customer data platform that unifies every signal from every channel',
      targetAudience: 'Data and revenue teams',
      differentiators: ['unified customer ID', 'real-time event streaming', 'reverse ETL', 'consent management'],
      mainOfferings: ['CDP', 'Event collection', 'Identity resolution', 'Audience segmentation', 'Activation'],
    },
    expected: 'CATEGORY_REPOSITIONING',
  },

  // ─── TARGET_AUDIENCE_CHANGED (10) ─────────────────
  {
    id: 'aud-01',
    description: 'SMB → Enterprise (zelfde tool)',
    prev: {
      valueProposition: 'Project management for growing teams',
      targetAudience: 'Small and medium businesses with 10-50 people',
      differentiators: ['affordable', 'easy setup', 'simple UX'],
      mainOfferings: ['Task management', 'Time tracking', 'Reporting'],
    },
    next: {
      valueProposition: 'Project management at enterprise scale',
      targetAudience: 'Fortune 500 enterprises with thousands of seats',
      differentiators: ['SOC 2 compliant', 'SSO/SAML', 'enterprise governance', 'dedicated support'],
      mainOfferings: ['Task management', 'Time tracking', 'Reporting', 'Enterprise security'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-02',
    description: 'Designers → Marketers',
    prev: {
      valueProposition: 'Design tools that creative teams love',
      targetAudience: 'Professional designers',
      differentiators: ['vector editing', 'design systems', 'prototyping'],
      mainOfferings: ['Design editor', 'Prototyping', 'Design systems'],
    },
    next: {
      valueProposition: 'Beautiful brand designs without a designer',
      targetAudience: 'Marketing teams without design resources',
      differentiators: ['templates', 'brand kits', 'AI design assist'],
      mainOfferings: ['Design editor', 'Templates', 'Brand kits'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-03',
    description: 'Developers → Non-technical (low-code)',
    prev: {
      valueProposition: 'API-first database for developers',
      targetAudience: 'Backend developers',
      differentiators: ['REST + GraphQL APIs', 'PostgreSQL under the hood', 'TypeScript SDK'],
      mainOfferings: ['Database hosting', 'Auto-generated APIs', 'TypeScript types'],
    },
    next: {
      valueProposition: 'Build internal tools without code',
      targetAudience: 'Operations teams and analysts',
      differentiators: ['drag-drop interface', 'visual workflows', 'no SQL needed'],
      mainOfferings: ['Visual database', 'Drag-drop UI builder', 'Workflows'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-04',
    description: 'Agencies → In-house teams',
    prev: {
      valueProposition: 'Manage all your client work in one place',
      targetAudience: 'Marketing agencies',
      differentiators: ['multi-client workspaces', 'white-label reports', 'client portals'],
      mainOfferings: ['Project management', 'Client billing', 'Reporting'],
    },
    next: {
      valueProposition: 'Marketing operations for in-house teams',
      targetAudience: 'In-house marketing teams at brands',
      differentiators: ['campaign planning', 'cross-channel orchestration', 'budget tracking'],
      mainOfferings: ['Campaign planning', 'Budget management', 'Cross-channel orchestration'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-05',
    description: 'Solo founders → Larger teams',
    prev: {
      valueProposition: 'Everything a solo founder needs to launch',
      targetAudience: 'Solo entrepreneurs and indie makers',
      differentiators: ['affordable', 'all-in-one', 'no learning curve'],
      mainOfferings: ['Landing pages', 'Email', 'Payments', 'Analytics'],
    },
    next: {
      valueProposition: 'Scale your business as your team grows',
      targetAudience: 'Growing teams of 5-50 people',
      differentiators: ['team collaboration', 'role-based access', 'team analytics'],
      mainOfferings: ['Landing pages', 'Email', 'Payments', 'Analytics', 'Team management'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-06',
    description: 'Freelancers → SMB owners',
    prev: {
      valueProposition: 'Invoicing and time tracking for freelancers',
      targetAudience: 'Independent freelancers and consultants',
      differentiators: ['simple invoicing', 'time tracking', 'tax-ready reports'],
      mainOfferings: ['Invoicing', 'Time tracking', 'Expense tracking'],
    },
    next: {
      valueProposition: 'Run your small business with confidence',
      targetAudience: 'Small business owners with employees',
      differentiators: ['payroll', 'multi-employee management', 'business banking integration'],
      mainOfferings: ['Invoicing', 'Time tracking', 'Payroll', 'Banking', 'Tax filing'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-07',
    description: 'B2C → B2B',
    prev: {
      valueProposition: 'Personal finance app that grows your savings',
      targetAudience: 'Consumers',
      differentiators: ['automatic round-ups', 'goal tracking', 'savings boosters'],
      mainOfferings: ['Savings goals', 'Budgeting', 'Spending insights'],
    },
    next: {
      valueProposition: 'Financial wellness benefits for your employees',
      targetAudience: 'HR leaders at mid-market companies',
      differentiators: ['employee financial wellness', 'employer dashboard', 'compliance reporting'],
      mainOfferings: ['Employee onboarding', 'Wellness benefits', 'Employer analytics'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-08',
    description: 'Educators → Corporate L&D',
    prev: {
      valueProposition: 'Course platform for teachers and trainers',
      targetAudience: 'Independent educators and online course creators',
      differentiators: ['easy course building', 'student community', 'monetization tools'],
      mainOfferings: ['Course builder', 'Student community', 'Payments'],
    },
    next: {
      valueProposition: 'Learning management for corporate teams',
      targetAudience: 'Corporate L&D leaders',
      differentiators: ['SCORM compatibility', 'compliance reporting', 'integrations with HRIS'],
      mainOfferings: ['Learning paths', 'Compliance training', 'HRIS integrations', 'Reporting'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-09',
    description: 'Tech industry → Healthcare',
    prev: {
      valueProposition: 'Identity verification for fast-growing tech companies',
      targetAudience: 'Tech startups and scale-ups',
      differentiators: ['developer-friendly API', 'fast onboarding', 'modern UX'],
      mainOfferings: ['Identity verification', 'Document scanning', 'Liveness detection'],
    },
    next: {
      valueProposition: 'Patient identity verification for healthcare providers',
      targetAudience: 'Healthcare organizations and digital health platforms',
      differentiators: ['HIPAA compliant', 'EHR integrations', 'patient portal-ready'],
      mainOfferings: ['Patient identity verification', 'EHR integration', 'HIPAA-compliant audit'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },
  {
    id: 'aud-10',
    description: 'NA-focus → EU-focus',
    prev: {
      valueProposition: 'Payroll for US-based small businesses',
      targetAudience: 'US small businesses',
      differentiators: ['IRS-compliant', 'state tax filing', '50-state coverage'],
      mainOfferings: ['Payroll', 'Tax filing', 'Benefits administration'],
    },
    next: {
      valueProposition: 'Payroll for European small businesses',
      targetAudience: 'European small businesses across 15 countries',
      differentiators: ['multi-country compliance', 'local tax filing', 'GDPR-native'],
      mainOfferings: ['Payroll', 'Local tax filing', 'GDPR compliance'],
    },
    expected: 'TARGET_AUDIENCE_CHANGED',
  },

  // ─── NONE (10 controles — cosmetisch / wording) ───
  {
    id: 'none-01',
    description: 'Wording-tweak (artikel toevoegen)',
    prev: {
      valueProposition: 'Build trust with customers',
      targetAudience: 'B2B marketing teams',
      differentiators: ['easy', 'fast', 'reliable'],
      mainOfferings: ['Tool A', 'Tool B', 'Tool C'],
    },
    next: {
      valueProposition: 'Build trust with your customers',
      targetAudience: 'B2B marketing teams',
      differentiators: ['easy', 'fast', 'reliable'],
      mainOfferings: ['Tool A', 'Tool B', 'Tool C'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-02',
    description: 'Synoniem in audience',
    prev: {
      valueProposition: 'Manage projects across teams',
      targetAudience: 'Marketing teams',
      differentiators: ['simple', 'collaborative'],
      mainOfferings: ['Projects', 'Tasks'],
    },
    next: {
      valueProposition: 'Manage projects across teams',
      targetAudience: 'Marketing professionals',
      differentiators: ['simple', 'collaborative'],
      mainOfferings: ['Projects', 'Tasks'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-03',
    description: 'Synoniem in differentiator',
    prev: {
      valueProposition: 'CRM for sales teams',
      targetAudience: 'Sales teams',
      differentiators: ['easy to use', 'affordable', 'fast setup'],
      mainOfferings: ['Pipeline', 'Contacts', 'Reports'],
    },
    next: {
      valueProposition: 'CRM for sales teams',
      targetAudience: 'Sales teams',
      differentiators: ['simple', 'affordable', 'quick to deploy'],
      mainOfferings: ['Pipeline', 'Contacts', 'Reports'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-04',
    description: 'Order van differentiators wisselt',
    prev: {
      valueProposition: 'Email marketing platform',
      targetAudience: 'Email marketers',
      differentiators: ['drag-drop', 'A/B testing', 'segmentation', 'automation'],
      mainOfferings: ['Email', 'Automation', 'Analytics'],
    },
    next: {
      valueProposition: 'Email marketing platform',
      targetAudience: 'Email marketers',
      differentiators: ['automation', 'segmentation', 'A/B testing', 'drag-drop'],
      mainOfferings: ['Email', 'Automation', 'Analytics'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-05',
    description: 'Lengte-uitbreiding zonder nieuwe info',
    prev: {
      valueProposition: 'Customer support software',
      targetAudience: 'Support teams',
      differentiators: ['ticketing', 'live chat', 'knowledge base'],
      mainOfferings: ['Tickets', 'Chat', 'KB'],
    },
    next: {
      valueProposition: 'Customer support software that helps your team deliver excellent service',
      targetAudience: 'Customer support teams of all sizes',
      differentiators: ['advanced ticketing', 'real-time live chat', 'searchable knowledge base'],
      mainOfferings: ['Tickets', 'Chat', 'KB'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-06',
    description: 'Easy → Simple (synoniem)',
    prev: {
      valueProposition: 'Easy invoicing for freelancers',
      targetAudience: 'Freelancers',
      differentiators: ['easy templates', 'fast send', 'easy tracking'],
      mainOfferings: ['Invoices', 'Estimates'],
    },
    next: {
      valueProposition: 'Simple invoicing for freelancers',
      targetAudience: 'Freelancers',
      differentiators: ['simple templates', 'quick send', 'simple tracking'],
      mainOfferings: ['Invoices', 'Estimates'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-07',
    description: 'Punctuatie + casing tweaks',
    prev: {
      valueProposition: 'Marketing automation. for everyone.',
      targetAudience: 'Marketing teams',
      differentiators: ['Email automation', 'SMS', 'Workflows'],
      mainOfferings: ['Email', 'SMS', 'Automation'],
    },
    next: {
      valueProposition: 'Marketing automation for everyone',
      targetAudience: 'Marketing teams',
      differentiators: ['email automation', 'SMS', 'workflows'],
      mainOfferings: ['Email', 'SMS', 'Automation'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-08',
    description: 'Pricing-mention toegevoegd in valueProp',
    prev: {
      valueProposition: 'Hosting platform for static sites',
      targetAudience: 'Web developers',
      differentiators: ['fast CDN', 'auto-scaling', 'serverless'],
      mainOfferings: ['Hosting', 'CDN', 'Functions'],
    },
    next: {
      valueProposition: 'Hosting platform for static sites — free tier available',
      targetAudience: 'Web developers',
      differentiators: ['fast CDN', 'auto-scaling', 'serverless'],
      mainOfferings: ['Hosting', 'CDN', 'Functions'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-09',
    description: 'Differentiator detail toegevoegd (zelfde idee)',
    prev: {
      valueProposition: 'Form builder for everyone',
      targetAudience: 'Marketers and product teams',
      differentiators: ['drag-drop', 'logic jumps', 'integrations'],
      mainOfferings: ['Forms', 'Surveys'],
    },
    next: {
      valueProposition: 'Form builder for everyone',
      targetAudience: 'Marketers and product teams',
      differentiators: ['drag-drop builder', 'conditional logic jumps', '500+ integrations'],
      mainOfferings: ['Forms', 'Surveys'],
    },
    expected: 'NONE',
  },
  {
    id: 'none-10',
    description: 'Tagline-style cosmetic shift in valueProp',
    prev: {
      valueProposition: 'Project management software for teams',
      targetAudience: 'Teams of 5-50 people',
      differentiators: ['Kanban', 'Gantt', 'time tracking'],
      mainOfferings: ['Tasks', 'Projects', 'Reports'],
    },
    next: {
      valueProposition: 'Where teams get work done',
      targetAudience: 'Teams of 5-50 people',
      differentiators: ['Kanban', 'Gantt', 'time tracking'],
      mainOfferings: ['Tasks', 'Projects', 'Reports'],
    },
    expected: 'NONE',
  },
];

// ─── Classifier ────────────────────────────────────────

const SYSTEM_PROMPT = `You analyze pattern-level strategy shifts between two snapshots of a competitor's positioning.

Detect ONLY these two pattern-events:

1. **CATEGORY_REPOSITIONING** — fundamental shift in WHAT the company does. The category, mechanism, or market itself changes. Examples:
   - "CRM" → "AI sales platform"
   - "design tool" → "creative OS"
   - "email tool" → "customer engagement platform"
   - "analytics tool" → "customer data platform"
   Signals: mainOfferings expanded substantially with new categories, valueProposition uses fundamentally different vocabulary, multiple differentiators reflect new capabilities.

2. **TARGET_AUDIENCE_CHANGED** — shift in WHO the company serves while staying in the same category. Examples:
   - SMB → Enterprise (same tool, different segment)
   - freelancers → small business owners
   - designers → marketers
   - tech industry → healthcare
   - North America → Europe
   Signals: targetAudience text describes a meaningfully different group, mainOfferings stays roughly the same category.

DO NOT flag:
- Cosmetic wording changes ("easy" → "simple", artikel toevoegingen, synoniemen)
- Order changes in arrays
- Punctuation/casing tweaks
- Tagline-style reformulations of the same value prop
- Detail additions that don't change the underlying meaning

CRITICAL: Respond with ONLY valid JSON, no preamble, no markdown, no explanation outside the JSON. Schema:
{
  "events": [
    {"type": "CATEGORY_REPOSITIONING" | "TARGET_AUDIENCE_CHANGED", "confidence": 0.0-1.0, "rationale": "brief reason"}
  ]
}

If no pattern-event applies, you MUST return EXACTLY: {"events": []}
Never return free-form text. Always JSON. At most one event per type per call.`;

function buildUserPrompt(pair: TestPair): string {
  return `Analyze this prev/next snapshot pair:

PREV:
- valueProposition: ${pair.prev.valueProposition}
- targetAudience: ${pair.prev.targetAudience}
- differentiators: ${JSON.stringify(pair.prev.differentiators)}
- mainOfferings: ${JSON.stringify(pair.prev.mainOfferings)}

NEXT:
- valueProposition: ${pair.next.valueProposition}
- targetAudience: ${pair.next.targetAudience}
- differentiators: ${JSON.stringify(pair.next.differentiators)}
- mainOfferings: ${JSON.stringify(pair.next.mainOfferings)}

What pattern-events do you detect?`;
}

interface ClassifierEvent {
  type: 'CATEGORY_REPOSITIONING' | 'TARGET_AUDIENCE_CHANGED';
  confidence: number;
  rationale: string;
}

interface ClassifierOutput {
  events: ClassifierEvent[];
}

interface PairResult extends TestPair {
  predicted: ExpectedEvent;
  predictedConfidence: number | null;
  rawEvents: ClassifierEvent[];
  correct: boolean;
  parseError: boolean;
}

function extractJson(text: string): ClassifierOutput | null {
  // Strip markdown code fences indien aanwezig
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'events' in parsed &&
      Array.isArray((parsed as { events: unknown }).events)
    ) {
      return parsed as ClassifierOutput;
    }
  } catch {
    // value
  }
  return null;
}

async function classifyPair(client: Anthropic, pair: TestPair): Promise<PairResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(pair) }],
  });

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    // Classifier produced unparsable output. Conservatieve fallback:
    // probeer in raw text te detecteren of er een event was gemeld.
    const upper = text.toUpperCase();
    const mentionsCategory = upper.includes('CATEGORY_REPOSITIONING');
    const mentionsAudience = upper.includes('TARGET_AUDIENCE_CHANGED');
    const fallbackPredicted: ExpectedEvent = mentionsCategory
      ? 'CATEGORY_REPOSITIONING'
      : mentionsAudience
        ? 'TARGET_AUDIENCE_CHANGED'
        : 'NONE';
    return {
      ...pair,
      predicted: fallbackPredicted,
      predictedConfidence: null,
      rawEvents: [],
      correct: fallbackPredicted === pair.expected,
      parseError: true,
    };
  }

  // Top-level: as soon as classifier emits ANY event, that's its prediction.
  // Pak het event met hoogste confidence als er meer zijn.
  if (parsed.events.length === 0) {
    return {
      ...pair,
      predicted: 'NONE',
      predictedConfidence: null,
      rawEvents: [],
      correct: pair.expected === 'NONE',
      parseError: false,
    };
  }

  const top = [...parsed.events].sort((a, b) => b.confidence - a.confidence)[0];
  if (!top) {
    return {
      ...pair,
      predicted: 'NONE',
      predictedConfidence: null,
      rawEvents: parsed.events,
      correct: pair.expected === 'NONE',
      parseError: false,
    };
  }

  return {
    ...pair,
    predicted: top.type,
    predictedConfidence: top.confidence,
    rawEvents: parsed.events,
    correct: top.type === pair.expected,
    parseError: false,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log('='.repeat(80));
  console.log(`A1 classifier-events accuracy probe — ${FIXTURES.length} hand-constructed pairs`);
  console.log('  Model: claude-haiku-4-5-20251001');
  console.log('  Distribution: 10 CATEGORY_REPOSITIONING, 10 TARGET_AUDIENCE_CHANGED, 10 NONE');
  console.log('='.repeat(80));
  console.log();

  const results: PairResult[] = [];
  for (const pair of FIXTURES) {
    try {
      const result = await classifyPair(client, pair);
      results.push(result);
      const mark = result.correct ? '✓' : '✗';
      const conf = result.predictedConfidence !== null
        ? ` conf=${result.predictedConfidence.toFixed(2)}`
        : '';
      const parseTag = result.parseError ? ' [PARSE_ERROR]' : '';
      console.log(
        `  ${mark} [${pair.id}] ${pair.description.padEnd(40)} truth=${pair.expected.padEnd(24)} pred=${result.predicted}${conf}${parseTag}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [${pair.id}] ${pair.description} — error: ${message}`);
      results.push({
        ...pair,
        predicted: 'NONE',
        predictedConfidence: null,
        rawEvents: [],
        correct: false,
        parseError: true,
      });
    }
  }

  console.log();
  console.log('='.repeat(80));

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const parseErrors = results.filter((r) => r.parseError).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  console.log(`Overall accuracy:   ${correct}/${total} (${accuracy.toFixed(1)}%)`);
  console.log(`Parse errors:       ${parseErrors}/${total}`);
  console.log();

  const classes: ExpectedEvent[] = ['CATEGORY_REPOSITIONING', 'TARGET_AUDIENCE_CHANGED', 'NONE'];

  console.log('Per-class recall (truth-perspective):');
  for (const cls of classes) {
    const sub = results.filter((r) => r.expected === cls);
    const subCorrect = sub.filter((r) => r.correct).length;
    const subPct = sub.length > 0 ? ((subCorrect / sub.length) * 100).toFixed(1) : '-';
    console.log(`  ${cls.padEnd(24)} ${subCorrect}/${sub.length} (${subPct}%)`);
  }
  console.log();

  console.log('Confusion matrix (rows=truth, cols=predicted):');
  const header = '              | ' + classes.map((c) => c.slice(0, 8).padEnd(10)).join('| ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const truthCls of classes) {
    const row = classes.map((predCls) => {
      const count = results.filter((r) => r.expected === truthCls && r.predicted === predCls).length;
      return String(count).padEnd(10);
    });
    console.log(`  ${truthCls.slice(0, 12).padEnd(12)}| ` + row.join('| '));
  }
  console.log();

  // Confidence-distributie per correct/incorrect
  const correctConfs = results.filter((r) => r.correct && r.predictedConfidence !== null).map((r) => r.predictedConfidence!);
  const incorrectConfs = results.filter((r) => !r.correct && !r.parseError && r.predictedConfidence !== null).map((r) => r.predictedConfidence!);
  const avg = (xs: number[]) => xs.length > 0 ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : 'n/a';
  console.log(`Avg confidence on correct hits:    ${avg(correctConfs)} (n=${correctConfs.length})`);
  console.log(`Avg confidence on incorrect hits:  ${avg(incorrectConfs)} (n=${incorrectConfs.length})`);
  console.log();

  // Misses
  const misses = results.filter((r) => !r.correct);
  if (misses.length > 0) {
    console.log('Misclassified pairs:');
    for (const m of misses) {
      const conf = m.predictedConfidence !== null ? ` conf=${m.predictedConfidence.toFixed(2)}` : '';
      console.log(`  [${m.id}] ${m.description}`);
      console.log(`    truth=${m.expected}  pred=${m.predicted}${conf}`);
      if (m.rawEvents.length > 0) {
        console.log(`    rationale: ${m.rawEvents[0]?.rationale ?? ''}`);
      }
    }
    console.log();
  }

  console.log('Verdict per idea-doc threshold:');
  if (accuracy >= 75) {
    console.log('  ✓ Classifier MVP-PAD (≥ 75% accuracy)');
  } else if (accuracy >= 60) {
    console.log('  ⚠ Acceptabel maar tunen — prompt-revisie of scope-cut naar enkel TARGET_AUDIENCE_CHANGED');
  } else {
    console.log('  ✗ Te lage accuracy — defer pattern-detection naar post-launch met richere data');
  }
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
