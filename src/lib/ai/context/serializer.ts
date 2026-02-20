// =============================================================
// Generic Context Serializer
//
// Converts ANY database record into readable text for the LLM.
// Knows NO specific fields — discovers them dynamically.
//
// Rules:
// - excludeFields is a denylist, not an allowlist
// - Everything is INCLUDED by default unless explicitly excluded
// - New fields are automatically picked up
// =============================================================

import type { ContextSourceConfig } from './registry';

interface SerializeOptions {
  config: ContextSourceConfig;
  record: Record<string, unknown>;
  maxLength?: number;
}

export function serializeToText(options: SerializeOptions): string {
  const { config, record, maxLength = 2000 } = options;
  const lines: string[] = [];

  // Title
  const title = record[config.titleField];
  lines.push(`### ${config.label}: ${title}`);

  // Description (if configured and present)
  if (config.descriptionField && record[config.descriptionField]) {
    lines.push(String(record[config.descriptionField]));
    lines.push('');
  }

  // All other fields dynamically
  for (const [key, value] of Object.entries(record)) {
    if (config.excludeFields.includes(key)) continue;
    if (key === config.titleField || key === config.descriptionField) continue;
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    // Skip relation objects (handled separately below)
    if (typeof value === 'object' && !Array.isArray(value)) continue;

    const label = formatFieldLabel(key);
    const formatted = formatFieldValue(key, value, config.formatHints);
    lines.push(`- **${label}:** ${formatted}`);
  }

  // Relations
  if (config.includeRelations) {
    for (const relation of config.includeRelations) {
      const relData = record[relation];
      if (!relData || (Array.isArray(relData) && relData.length === 0)) continue;

      lines.push('');
      lines.push(`**${formatFieldLabel(relation)}:**`);

      if (Array.isArray(relData)) {
        for (const item of relData) {
          if (typeof item === 'object' && item !== null) {
            const summary = extractSummary(item as Record<string, unknown>);
            lines.push(`  - ${summary}`);
          } else {
            lines.push(`  - ${item}`);
          }
        }
      } else if (typeof relData === 'object' && relData !== null) {
        const summary = extractSummary(relData as Record<string, unknown>);
        lines.push(`  ${summary}`);
      }
    }
  }

  const result = lines.join('\n');
  return result.length > maxLength ? result.substring(0, maxLength) + '\n  [...]' : result;
}

// ── Helper functions ──

export function formatFieldLabel(key: string): string {
  // camelCase → Title Case: "targetAudience" → "Target Audience"
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatFieldValue(
  key: string,
  value: unknown,
  hints?: Record<string, string>,
): string {
  const hint = hints?.[key];

  // Arrays → comma-separated or bullet list
  if (Array.isArray(value)) {
    if (value.length <= 5 && value.every((v) => typeof v === 'string')) {
      return value.join(', ');
    }
    return (
      '\n' +
      value
        .map((v) =>
          `    - ${typeof v === 'object' && v !== null ? extractSummary(v as Record<string, unknown>) : v}`,
        )
        .join('\n')
    );
  }

  // Format hints
  if (hint === 'currency' && typeof value === 'number') {
    return `\u20AC${value.toLocaleString('nl-NL')}`;
  }
  if (hint === 'percentage' && typeof value === 'number') {
    return `${value}%`;
  }
  if (hint === 'date' && value) {
    return new Date(value as string).toLocaleDateString('nl-NL');
  }

  // Booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Long strings truncated
  if (typeof value === 'string' && value.length > 500) {
    return value.substring(0, 500) + '...';
  }

  return String(value);
}

export function extractSummary(obj: Record<string, unknown>): string {
  // Find the most informative field in priority order
  const priorityFields = ['name', 'title', 'content', 'text', 'value', 'label', 'description', 'summary'];

  for (const field of priorityFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      const val = obj[field] as string;
      return val.length > 200 ? val.substring(0, 200) + '...' : val;
    }
  }

  // Fallback: grab all string fields
  const strings = Object.entries(obj)
    .filter(([k, v]) => typeof v === 'string' && !['id', 'createdAt', 'updatedAt'].includes(k))
    .map(([k, v]) => `${formatFieldLabel(k)}: ${v}`)
    .slice(0, 3);

  return strings.join(' | ') || JSON.stringify(obj).substring(0, 100);
}
