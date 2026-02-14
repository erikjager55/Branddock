/**
 * Persona Schema
 * 
 * Zod validation schema for personas.
 * Provides runtime validation and type safety.
 * 
 * IMPORTANT: Run `npm install zod` before using this schema!
 */

import { z } from 'zod';

// Persona Schema
export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Persona name is required'),
  description: z.string().optional(),
  avatar: z.string().optional(),
  age: z.number().min(0).max(120).optional(),
  ageRange: z.string().optional(),
  occupation: z.string().optional(),
  location: z.string().optional(),
  goals: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  behaviors: z.array(z.string()).optional(),
  motivations: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  quote: z.string().optional(),
  bio: z.string().optional(),
  researchStatus: z.enum(['not-started', 'in-progress', 'completed']).default('not-started'),
  researchMethods: z.array(z.object({
    type: z.string(),
    status: z.enum(['not-started', 'in-progress', 'completed']),
    completedAt: z.string().optional(),
  })).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Array of Personas Schema
export const PersonasArraySchema = z.array(PersonaSchema);

// Type inference
export type PersonaSchemaType = z.infer<typeof PersonaSchema>;

/**
 * Validate persona data
 */
export function validatePersona(data: unknown) {
  return PersonaSchema.safeParse(data);
}

/**
 * Validate array of personas
 */
export function validatePersonas(data: unknown) {
  return PersonasArraySchema.safeParse(data);
}

/**
 * Parse persona data (throws on error)
 */
export function parsePersona(data: unknown) {
  return PersonaSchema.parse(data);
}

/**
 * Parse array of personas (throws on error)
 */
export function parsePersonas(data: unknown) {
  return PersonasArraySchema.parse(data);
}
