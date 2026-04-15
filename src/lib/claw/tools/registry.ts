import type { ClawToolDefinition } from '../claw.types';
import { readTools } from './read-tools';
import { writeTools } from './write-tools';
import { analyzeTools, navigateTools } from './analyze-tools';

const allTools: ClawToolDefinition[] = [
  ...readTools,
  ...writeTools,
  ...analyzeTools,
  ...navigateTools,
];

const toolMap = new Map<string, ClawToolDefinition>(
  allTools.map((t) => [t.name, t])
);

export function getToolByName(name: string): ClawToolDefinition | undefined {
  return toolMap.get(name);
}

export function getAllTools(): ClawToolDefinition[] {
  return allTools;
}

/**
 * Format tools for Claude's `tools` parameter.
 * Converts Zod schemas to JSON Schema via zodToJsonSchema.
 */
export function getToolsForClaude(): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.inputSchema),
  }));
}

/**
 * Minimal Zod → JSON Schema converter.
 * Supports Zod v4 (_def.type) and v3 (_def.typeName) internals.
 * Handles: object, string, number, boolean, array, record, optional, nullable, enum.
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = schema as any;
  // Zod v4 uses _def.type, Zod v3 uses _def.typeName
  const kind: string = s?._def?.type ?? s?._def?.typeName ?? '';

  if (kind === 'object' || kind === 'ZodObject') {
    const shape = typeof s._def.shape === 'function' ? s._def.shape() : s._def.shape ?? {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const innerKind = (value as any)?._def?.type ?? (value as any)?._def?.typeName ?? '';
      if (innerKind !== 'optional' && innerKind !== 'ZodOptional') {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (kind === 'string' || kind === 'ZodString') {
    const result: Record<string, unknown> = { type: 'string' };
    const desc = s._def.description ?? s.description;
    if (desc) result.description = desc;
    return result;
  }

  if (kind === 'number' || kind === 'ZodNumber') {
    return { type: 'number' };
  }

  if (kind === 'boolean' || kind === 'ZodBoolean') {
    return { type: 'boolean' };
  }

  if (kind === 'array' || kind === 'ZodArray') {
    const innerType = s._def.element ?? s._def.type ?? s._def.innerType;
    return {
      type: 'array',
      items: innerType ? zodToJsonSchema(innerType) : { type: 'string' },
    };
  }

  if (kind === 'record' || kind === 'ZodRecord') {
    // JSON Schema: object with additionalProperties
    return {
      type: 'object',
      additionalProperties: true,
    };
  }

  if (kind === 'optional' || kind === 'ZodOptional') {
    const inner = s._def.innerType ?? s.unwrap?.();
    return inner ? zodToJsonSchema(inner) : { type: 'string' };
  }

  if (kind === 'nullable' || kind === 'ZodNullable' || kind === 'nullish') {
    const inner = s._def.innerType ?? s.unwrap?.();
    return inner ? zodToJsonSchema(inner) : { type: 'string' };
  }

  if (kind === 'enum' || kind === 'ZodEnum') {
    return {
      type: 'string',
      enum: s._def.values ?? s.options,
    };
  }

  // Fallback — treat as string
  return { type: 'string' };
}
