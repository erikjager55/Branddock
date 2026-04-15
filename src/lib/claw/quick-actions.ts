import type { ClawQuickAction } from './claw.types';

/**
 * Generate contextual quick actions based on workspace state and active page.
 */
export function getQuickActions(context: {
  activeSection?: string;
  brandAssetCount?: number;
  personaCount?: number;
  campaignCount?: number;
  hasAlignmentIssues?: boolean;
  hasTrends?: boolean;
}): ClawQuickAction[] {
  const actions: ClawQuickAction[] = [];

  // ── Page-specific actions ────────────────────────────────
  switch (context.activeSection) {
    case 'brand':
    case 'brand-asset-detail':
      actions.push(
        { label: 'Assess brand foundation', prompt: 'Analyze my brand foundation — which assets are well-filled and which need work?', icon: 'Shield' },
        { label: 'Fill empty fields', prompt: 'Identify empty fields across my brand assets and suggest content for them.', icon: 'Edit' },
        { label: 'Check consistency', prompt: 'Are my brand assets consistent with each other? Check brand promise vs personality vs archetype.', icon: 'CheckCircle' },
      );
      break;

    case 'personas':
    case 'persona-detail':
      actions.push(
        { label: 'Analyze persona gaps', prompt: 'Which persona fields are missing or weak? Give me a completeness overview.', icon: 'Users' },
        { label: 'Compare personas', prompt: 'Compare my personas — are they differentiated enough? Do they overlap?', icon: 'GitCompare' },
        { label: 'Suggest buying triggers', prompt: 'Based on my personas\' demographics and psychographics, suggest buying triggers and decision criteria.', icon: 'Target' },
      );
      break;

    case 'active-campaigns':
    case 'campaign-detail':
      actions.push(
        { label: 'Campaign status overview', prompt: 'Give me a status overview of all my campaigns — progress, deliverables, and what needs attention.', icon: 'BarChart' },
        { label: 'Suggest next campaign', prompt: 'Based on my brand strategy and current campaigns, what type of campaign should I create next?', icon: 'Lightbulb' },
      );
      break;

    case 'competitors':
    case 'competitor-detail':
      actions.push(
        { label: 'Competitive position', prompt: 'Analyze my competitive position — where do I stand vs my competitors?', icon: 'Swords' },
        { label: 'Find differentiators', prompt: 'Based on my brand assets and competitor weaknesses, suggest key differentiators.', icon: 'Sparkles' },
      );
      break;

    case 'trends':
    case 'trend-detail':
      actions.push(
        { label: 'Trend relevance check', prompt: 'Which of my active trends are most relevant to my brand strategy? Should I activate or dismiss any?', icon: 'TrendingUp' },
      );
      break;

    case 'business-strategy':
    case 'strategy-detail':
      actions.push(
        { label: 'Strategy health check', prompt: 'Review my business strategy — are the objectives realistic? Is progress on track?', icon: 'Target' },
      );
      break;

    case 'dashboard':
      actions.push(
        { label: 'What needs attention?', prompt: 'What needs the most urgent attention in my workspace right now?', icon: 'AlertCircle' },
        { label: 'Weekly summary', prompt: 'Give me a weekly summary of my brand\'s health, campaign progress, and recommended next steps.', icon: 'Calendar' },
      );
      break;
  }

  // ── Workspace-state actions (fallback) ───────────────────
  if (actions.length === 0) {
    actions.push(
      { label: 'Assess brand foundation', prompt: 'Analyze my brand foundation — which assets are well-filled and which need work?', icon: 'Shield' },
      { label: 'What needs attention?', prompt: 'What needs the most urgent attention in my workspace right now?', icon: 'AlertCircle' },
    );

    if ((context.personaCount ?? 0) > 0) {
      actions.push({ label: 'Review personas', prompt: 'Review my personas for completeness and consistency with my brand.', icon: 'Users' });
    }

    if ((context.campaignCount ?? 0) > 0) {
      actions.push({ label: 'Campaign overview', prompt: 'Give me a quick overview of my active campaigns and their progress.', icon: 'Megaphone' });
    }
  }

  return actions.slice(0, 4);
}
