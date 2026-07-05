import type { TFunction } from 'i18next';
import type { ClawQuickAction } from './claw.types';

/** Namespace-prefixed key helper for the claw-content-registry catalog. */
const qa = (key: string) => `claw-content-registry:quickActions.${key}` as const;

interface QuickActionContext {
  activeSection?: string;
  /** Active entity type + name when on a detail page (from useClawStore). */
  activeEntityType?: 'brand_asset' | 'persona' | 'product' | 'competitor' | 'deliverable' | 'campaign';
  activeEntityName?: string;
  /** Whether the user is currently in a wizard with unfilled fields. */
  hasWizardSnapshot?: boolean;
  wizardEmptyFieldCount?: number;
  wizardName?: string;
  // Workspace counts (fallback when no page context)
  brandAssetCount?: number;
  personaCount?: number;
  campaignCount?: number;
  hasAlignmentIssues?: boolean;
  hasTrends?: boolean;
}

/**
 * Generate contextual quick actions based on workspace state and active page.
 * Prioritises the most context-rich signal: wizard > detail entity > section > workspace fallback.
 */
export function getQuickActions(context: QuickActionContext, t: TFunction): ClawQuickAction[] {
  const actions: ClawQuickAction[] = [];

  // ── Wizard mode (highest priority — tight active workflow) ───
  if (context.hasWizardSnapshot) {
    const empty = context.wizardEmptyFieldCount ?? 0;
    if (empty > 0) {
      actions.push({
        label: t(qa('fillEmptyFields'), { count: empty, defaultValue: `Fill ${empty} empty field${empty === 1 ? '' : 's'}` }),
        prompt: 'Fill in the empty fields in this wizard using the brand context. Propose concrete values for each.',
        icon: 'Edit',
      });
    }
    actions.push(
      { label: t(qa('suggestCampaignGoal'), { defaultValue: 'Suggest a campaign goal' }), prompt: 'Based on my brand foundation and current context, which campaign goal fits best here? Suggest one and fill it in.', icon: 'Target' },
      { label: t(qa('writeBriefing'), { defaultValue: 'Write the briefing' }), prompt: 'Draft a complete campaign briefing (occasion, audience & objective, core message, tone, constraints) grounded in my brand assets and personas. Fill all five briefing fields.', icon: 'FileText' },
      { label: t(qa('reviewWhatIHave'), { defaultValue: 'Review what I have' }), prompt: 'Review the fields I\'ve already filled in this wizard. Are they strong? Flag anything weak or inconsistent.', icon: 'CheckCircle' },
    );
    return actions.slice(0, 4);
  }

  // ── Detail-entity priority (specific to the viewed item) ─────
  if (context.activeEntityType && context.activeEntityName) {
    const name = context.activeEntityName;
    const shortName = truncate(name);
    switch (context.activeEntityType) {
      case 'brand_asset':
        actions.push(
          { label: t(qa('fillGapsQuoted'), { name: shortName, defaultValue: `Fill gaps in "${shortName}"` }), prompt: `Inspect "${name}" and propose concrete values for every empty field. Ground each suggestion in my brand context.`, icon: 'Edit' },
          { label: t(qa('strengthen'), { defaultValue: "Strengthen what's there" }), prompt: `Critique the existing fields of "${name}". Where is it weak or generic? Suggest improvements.`, icon: 'Sparkles' },
          { label: t(qa('checkConsistency'), { defaultValue: 'Check consistency' }), prompt: `Is "${name}" consistent with my other brand assets (promise, personality, archetype)?`, icon: 'CheckCircle' },
        );
        return actions.slice(0, 4);

      case 'persona':
        actions.push(
          { label: t(qa('fillGaps'), { name: shortName, defaultValue: `Fill gaps in ${shortName}` }), prompt: `Inspect ${name} and suggest values for every empty field — demographics, psychographics, buying triggers, everything.`, icon: 'Edit' },
          { label: t(qa('writeQuote'), { defaultValue: 'Write a strong quote' }), prompt: `Write a believable, specific first-person quote for ${name} based on their profile.`, icon: 'Quote' },
          { label: t(qa('suggestDecisionCriteria'), { defaultValue: 'Suggest decision criteria' }), prompt: `Based on ${name}'s goals and frustrations, suggest realistic buying triggers and decision criteria.`, icon: 'Target' },
        );
        return actions.slice(0, 4);

      case 'product':
        actions.push(
          { label: t(qa('fillGaps'), { name: shortName, defaultValue: `Fill gaps in ${shortName}` }), prompt: `Inspect ${name} and propose values for empty fields (features, benefits, use cases, pricing model).`, icon: 'Edit' },
          { label: t(qa('writeBenefitCopy'), { defaultValue: 'Write benefit copy' }), prompt: `Rewrite the benefits of ${name} to be more outcome-focused and persuasive.`, icon: 'Sparkles' },
          { label: t(qa('linkToPersonas'), { defaultValue: 'Link to personas' }), prompt: `Which of my personas is ${name} most relevant for, and why?`, icon: 'Users' },
        );
        return actions.slice(0, 4);

      case 'competitor':
        actions.push(
          { label: t(qa('fillGaps'), { name: shortName, defaultValue: `Fill gaps in ${shortName}` }), prompt: `Inspect ${name} and suggest values for empty fields (positioning, strengths, weaknesses, offerings).`, icon: 'Edit' },
          { label: t(qa('compareToUs'), { defaultValue: 'Compare to us' }), prompt: `Where do I stand vs ${name}? Give me 3 concrete differentiators.`, icon: 'Swords' },
          { label: t(qa('spotWeakness'), { defaultValue: 'Spot their weakness' }), prompt: `Based on ${name}'s profile, what's their biggest weakness I could exploit?`, icon: 'Target' },
        );
        return actions.slice(0, 4);
    }
  }

  // ── Page-level fallback actions ──────────────────────────
  switch (context.activeSection) {
    case 'brand':
    case 'brand-asset-detail':
      actions.push(
        { label: t(qa('assessBrandFoundation'), { defaultValue: 'Assess brand foundation' }), prompt: 'Analyze my brand foundation — which assets are well-filled and which need work?', icon: 'Shield' },
        { label: t(qa('fillEmptyFieldsAll'), { defaultValue: 'Fill empty fields' }), prompt: 'Identify empty fields across my brand assets and suggest content for them.', icon: 'Edit' },
        { label: t(qa('checkConsistency'), { defaultValue: 'Check consistency' }), prompt: 'Are my brand assets consistent with each other? Check brand promise vs personality vs archetype.', icon: 'CheckCircle' },
      );
      break;

    case 'personas':
    case 'persona-detail':
      actions.push(
        { label: t(qa('analyzePersonaGaps'), { defaultValue: 'Analyze persona gaps' }), prompt: 'Which persona fields are missing or weak? Give me a completeness overview.', icon: 'Users' },
        { label: t(qa('comparePersonas'), { defaultValue: 'Compare personas' }), prompt: 'Compare my personas — are they differentiated enough? Do they overlap?', icon: 'GitCompare' },
        { label: t(qa('suggestBuyingTriggers'), { defaultValue: 'Suggest buying triggers' }), prompt: 'Based on my personas\' demographics and psychographics, suggest buying triggers and decision criteria.', icon: 'Target' },
      );
      break;

    case 'active-campaigns':
    case 'campaign-detail':
      actions.push(
        { label: t(qa('campaignStatusOverview'), { defaultValue: 'Campaign status overview' }), prompt: 'Give me a status overview of all my campaigns — progress, deliverables, and what needs attention.', icon: 'BarChart' },
        { label: t(qa('suggestNextCampaign'), { defaultValue: 'Suggest next campaign' }), prompt: 'Based on my brand strategy and current campaigns, what type of campaign should I create next?', icon: 'Lightbulb' },
      );
      break;

    case 'competitors':
    case 'competitor-detail':
      actions.push(
        { label: t(qa('competitivePosition'), { defaultValue: 'Competitive position' }), prompt: 'Analyze my competitive position — where do I stand vs my competitors?', icon: 'Swords' },
        { label: t(qa('findDifferentiators'), { defaultValue: 'Find differentiators' }), prompt: 'Based on my brand assets and competitor weaknesses, suggest key differentiators.', icon: 'Sparkles' },
      );
      break;

    case 'trends':
    case 'trend-detail':
      actions.push(
        { label: t(qa('trendRelevanceCheck'), { defaultValue: 'Trend relevance check' }), prompt: 'Which of my active trends are most relevant to my brand strategy? Should I activate or dismiss any?', icon: 'TrendingUp' },
      );
      break;

    case 'business-strategy':
    case 'strategy-detail':
      actions.push(
        { label: t(qa('strategyHealthCheck'), { defaultValue: 'Strategy health check' }), prompt: 'Review my business strategy — are the objectives realistic? Is progress on track?', icon: 'Target' },
      );
      break;

    case 'dashboard':
      actions.push(
        { label: t(qa('whatNeedsAttention'), { defaultValue: 'What needs attention?' }), prompt: 'What needs the most urgent attention in my workspace right now?', icon: 'AlertCircle' },
        { label: t(qa('weeklySummary'), { defaultValue: 'Weekly summary' }), prompt: 'Give me a weekly summary of my brand\'s health, campaign progress, and recommended next steps.', icon: 'Calendar' },
      );
      break;
  }

  // ── Workspace-state actions (fallback) ───────────────────
  if (actions.length === 0) {
    actions.push(
      { label: t(qa('assessBrandFoundation'), { defaultValue: 'Assess brand foundation' }), prompt: 'Analyze my brand foundation — which assets are well-filled and which need work?', icon: 'Shield' },
      { label: t(qa('whatNeedsAttention'), { defaultValue: 'What needs attention?' }), prompt: 'What needs the most urgent attention in my workspace right now?', icon: 'AlertCircle' },
    );

    if ((context.personaCount ?? 0) > 0) {
      actions.push({ label: t(qa('reviewPersonas'), { defaultValue: 'Review personas' }), prompt: 'Review my personas for completeness and consistency with my brand.', icon: 'Users' });
    }

    if ((context.campaignCount ?? 0) > 0) {
      actions.push({ label: t(qa('campaignOverview'), { defaultValue: 'Campaign overview' }), prompt: 'Give me a quick overview of my active campaigns and their progress.', icon: 'Megaphone' });
    }
  }

  return actions.slice(0, 4);
}

function truncate(text: string, max = 24): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
