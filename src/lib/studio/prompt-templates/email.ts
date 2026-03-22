// =============================================================
// Email & Automation Templates (5 types)
// Newsletter, Welcome Sequence, Promotional Email,
// Nurture Sequence, Re-engagement Email
// =============================================================

import type { PromptTemplate } from './helpers';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock, formatAdditionalSettings } from './helpers';

function buildEmailUserPrompt(
  userPrompt: string,
  context: import('./helpers').UserPromptParams['context'],
  settings: import('./helpers').UserPromptParams['settings'],
  emailGuidance: string,
): string {
  const { tone } = extractTextSettings(settings);
  const contextBlock = buildContextBlock(context);
  const additionalSpecs = formatAdditionalSettings(settings);

  return `${contextBlock}

## EMAIL GUIDANCE
${emailGuidance}

## CONTENT SPECIFICATIONS
Tone: ${tone}${additionalSpecs}

## USER PROMPT
${userPrompt}`;
}

export const EMAIL_TEMPLATES: Record<string, PromptTemplate> = {
  newsletter: {
    systemPrompt: buildBaseSystemPrompt(
      `You are an email newsletter writer. Create engaging email newsletters that subscribers look forward to:
- Subject line: Max 50 characters, curiosity-driven or benefit-focused
- Preheader text: Max 90 characters, complements the subject line
- Greeting: Personalized and warm
- Body: 3-5 content sections with clear H2 headings
- Each section: Brief intro + link/CTA to full content
- Sign-off: Brand-appropriate closing
- Focus on value delivery, not just promotion`,
    ),
    buildUserPrompt: (params) =>
      buildEmailUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Email newsletter with subject line, preheader, greeting, 3-5 content sections, and sign-off.',
      ),
  },

  'welcome-sequence': {
    systemPrompt: buildBaseSystemPrompt(
      `You are an email marketing strategist specializing in onboarding sequences. Create a multi-email welcome series:
- Email 1 (Day 0): Welcome + what to expect + quick win
- Email 2 (Day 2): Core value delivery + brand story
- Email 3 (Day 4): Social proof + case study highlight
- Email 4 (Day 7): Deeper engagement + exclusive resource
- Email 5 (Day 10): CTA + conversion offer
- Each email: Subject line, preheader, body (150-250 words), CTA button text
- Progressive relationship building across the sequence`,
    ),
    buildUserPrompt: (params) =>
      buildEmailUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: 5-email welcome sequence. Each email with subject line, preheader, body, and CTA. Clear progression from welcome to conversion.',
      ),
  },

  'promotional-email': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a promotional email copywriter. Create compelling campaign and offer emails that drive conversions:
- Subject line: Create urgency or curiosity (max 50 chars)
- Preheader: Complements subject (max 90 chars)
- Hero section: Bold value proposition
- Body: Key benefits, social proof, and offer details
- CTA: Clear, action-oriented button text
- Generate 2 subject line variations for A/B testing
- Include a sense of urgency without being pushy`,
    ),
    buildUserPrompt: (params) =>
      buildEmailUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: Promotional email with 2 subject line variations, preheader, hero section, body, and CTA.',
      ),
  },

  'nurture-sequence': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a lead nurturing email strategist. Create a drip email sequence that moves leads through the funnel:
- Email 1: Education (awareness stage content)
- Email 2: Problem identification (stir the pain)
- Email 3: Solution introduction (soft product mention)
- Email 4: Social proof (case studies, testimonials)
- Email 5: Comparison (why us vs. alternatives)
- Email 6: Objection handling (FAQ-style)
- Email 7: Conversion (offer + urgency)
- Each email: Subject, preheader, body (150-200 words), CTA
- Natural progression — never feel "salesy" until the final emails`,
    ),
    buildUserPrompt: (params) =>
      buildEmailUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: 7-email nurture sequence. Each email with subject, preheader, body, and CTA. Progressive funnel movement.',
      ),
  },

  're-engagement-email': {
    systemPrompt: buildBaseSystemPrompt(
      `You are a re-engagement email specialist. Create win-back emails for inactive subscribers:
- Subject line: Emotional, personal, curiosity-driven ("We miss you", "Is this goodbye?")
- Acknowledge the absence without being guilt-tripping
- Remind them of the value they're missing
- Offer an incentive or exclusive content
- Include an easy one-click re-engagement option
- Include an unsubscribe option (transparency builds trust)
- Generate 3 variations: emotional, value-based, and incentive-based`,
    ),
    buildUserPrompt: (params) =>
      buildEmailUserPrompt(
        params.userPrompt,
        params.context,
        params.settings,
        'Format: 3 re-engagement email variations. Each with subject line, body, incentive/value prop, and CTA.',
      ),
  },
};
