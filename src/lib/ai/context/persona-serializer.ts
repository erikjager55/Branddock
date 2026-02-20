// =============================================================
// Dynamic Persona Serializer
//
// Converts a persona record into readable text for the LLM.
// Discovers fields dynamically — NEVER hardcodes individual
// field names in serialization logic.
//
// Known fields are grouped for better prompt structure.
// Unknown/new fields are auto-picked up under "Additional
// Characteristics" without any code change.
// =============================================================

import { formatFieldLabel, extractSummary } from './serializer';

// Fields to always exclude (visual/meta, not relevant for LLM)
const PERSONA_EXCLUDE_FIELDS = new Set([
  'id', 'createdAt', 'updatedAt', 'workspaceId',
  'slug', 'avatarUrl', 'avatarSource',
  'isLocked', 'lockedById', 'lockedAt',
  'createdById',
]);

// Grouping for better prompt structure
const PERSONA_FIELD_GROUPS: Record<string, string[]> = {
  'Demographics': ['age', 'gender', 'occupation', 'location', 'education', 'income', 'familyStatus'],
  'Personality': ['personalityType', 'coreValues', 'interests'],
  'Drivers': ['goals', 'motivations'],
  'Barriers': ['frustrations'],
  'Behavior': ['behaviors'],
};

export function serializePersona(persona: Record<string, unknown>): string {
  const lines: string[] = [];

  // Name and tagline always first
  lines.push(`You are ${persona.name}.`);
  if (persona.tagline) lines.push(String(persona.tagline));
  lines.push('');

  // Track which fields we've handled
  const handledFields = new Set<string>(['name', 'tagline', ...PERSONA_EXCLUDE_FIELDS]);

  // Grouped fields
  for (const [groupName, fields] of Object.entries(PERSONA_FIELD_GROUPS)) {
    const groupLines: string[] = [];

    for (const field of fields) {
      handledFields.add(field);
      const value = persona[field];
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;

      const label = formatFieldLabel(field);
      const formatted = formatPersonaFieldValue(value);
      groupLines.push(`- ${label}: ${formatted}`);
    }

    if (groupLines.length > 0) {
      lines.push(`## ${groupName}`);
      lines.push(...groupLines);
      lines.push('');
    }
  }

  // CRUCIAL: Auto-pick up unknown/new fields
  const unknownFields: string[] = [];
  for (const [key, value] of Object.entries(persona)) {
    if (handledFields.has(key)) continue;
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    // Skip relation objects (handled separately)
    if (typeof value === 'object' && !Array.isArray(value)) continue;

    const label = formatFieldLabel(key);
    const formatted = formatPersonaFieldValue(value);
    unknownFields.push(`- ${label}: ${formatted}`);
  }

  if (unknownFields.length > 0) {
    lines.push('## Additional Characteristics');
    lines.push(...unknownFields);
    lines.push('');
  }

  // Relations (sub-objects) — dynamically include
  for (const [key, value] of Object.entries(persona)) {
    if (handledFields.has(key)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    const label = formatFieldLabel(key);
    lines.push(`## ${label}`);
    lines.push(extractSummary(value as Record<string, unknown>));
    lines.push('');
  }

  return lines.join('\n');
}

function formatPersonaFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    // Array of objects with 'text' field (goals, motivations, etc.)
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'text' in value[0]) {
      return value.map((v) => (v as Record<string, string>).text).join(', ');
    }
    // Array of strings
    if (value.every((v) => typeof v === 'string')) {
      return value.join(', ');
    }
    return value
      .map((v) =>
        typeof v === 'object' && v !== null ? extractSummary(v as Record<string, unknown>) : String(v),
      )
      .join(', ');
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.length > 500) return value.substring(0, 500) + '...';

  return String(value);
}
