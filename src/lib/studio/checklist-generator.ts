// =============================================================
// Dynamic Checklist Generator
//
// Generates context-aware checklist items based on content type
// category and validation results. Replaces hardcoded defaults.
// =============================================================

import type { ChecklistItem } from '@/types/studio';
import type { ValidationResult } from './content-validator';
import { DELIVERABLE_TYPES } from '@/features/campaigns/lib/deliverable-types';

// ─── Category Detection ──────────────────────────────────

type ContentCategory = 'social-media' | 'email' | 'advertising' | 'long-form' | 'generic';

function resolveCategory(contentType: string): ContentCategory {
  const def = DELIVERABLE_TYPES.find((d) => d.id === contentType);
  if (!def) return 'generic';

  const cat = def.category.toLowerCase();
  if (cat.includes('social')) return 'social-media';
  if (cat.includes('email') || cat.includes('automation')) return 'email';
  if (cat.includes('advertising') || cat.includes('paid')) return 'advertising';
  if (cat.includes('long-form') || cat.includes('website')) return 'long-form';
  return 'generic';
}

// ─── Base Checklists per Category ─────────────────────────

const BASE_CHECKLISTS: Record<ContentCategory, ChecklistItem[]> = {
  'social-media': [
    { label: 'Within platform character limits', checked: false },
    { label: 'Hashtags included (if relevant)', checked: false },
    { label: 'Visual hook in first line', checked: false },
    { label: 'CTA is clear and actionable', checked: false },
    { label: 'Brand voice consistency', checked: false },
  ],
  email: [
    { label: 'Subject line under 60 characters', checked: false },
    { label: 'Preview text is compelling', checked: false },
    { label: 'Personalization tokens used', checked: false },
    { label: 'Unsubscribe link mentioned', checked: false },
    { label: 'CTA above the fold', checked: false },
    { label: 'Brand voice consistency', checked: false },
  ],
  advertising: [
    { label: 'Headline is impactful and concise', checked: false },
    { label: 'USP is clearly communicated', checked: false },
    { label: 'Legal compliance checked', checked: false },
    { label: 'CTA is specific and measurable', checked: false },
    { label: 'Brand voice consistency', checked: false },
  ],
  'long-form': [
    { label: 'Structure has clear H2/H3 hierarchy', checked: false },
    { label: 'Introduction hooks the reader', checked: false },
    { label: 'Conclusion includes CTA', checked: false },
    { label: 'Readability checked (short paragraphs)', checked: false },
    { label: 'Sources and claims are verifiable', checked: false },
    { label: 'Brand voice consistency', checked: false },
  ],
  generic: [
    { label: 'Brand voice consistency', checked: false },
    { label: 'Call-to-action clarity', checked: false },
    { label: 'Target audience alignment', checked: false },
    { label: 'Proofread & finalized', checked: false },
    { label: 'Factual accuracy verified', checked: false },
  ],
};

// ─── Validation-Driven Items ──────────────────────────────

const CHECK_TO_ITEM: Record<string, string> = {
  placeholders: 'Replace placeholder values (€XX, TBD) with actual data',
  'internal-jargon': 'Remove internal jargon — use consumer-friendly language',
  'competitor-bashing': 'Review competitor references — keep tone positive',
  'vague-claims': 'Back up claims with specific numbers or evidence',
  'persona-leak': 'Remove persona/segment names from consumer-facing copy',
  'cta-presence': 'Add a clear, specific call-to-action',
  'content-length': 'Review content length for the target format',
  'vague-urgency': 'Add concrete deadlines to urgency claims',
};

// ─── Public API ───────────────────────────────────────────

export function generateChecklist(
  contentType: string,
  validationResult: ValidationResult,
): ChecklistItem[] {
  const category = resolveCategory(contentType);
  const baseItems = BASE_CHECKLISTS[category].map((item) => ({ ...item }));

  // Add validation-driven items
  const failedChecks = new Set(validationResult.warnings.map((w) => w.check));
  const validationItems: ChecklistItem[] = [];

  for (const [check, label] of Object.entries(CHECK_TO_ITEM)) {
    if (failedChecks.has(check)) {
      // Failed check → unchecked item
      validationItems.push({ label, checked: false });
    }
    // Passed checks are not added — they don't need attention
  }

  // Validation items go first (they need action), then base items
  return [...validationItems, ...baseItems];
}
