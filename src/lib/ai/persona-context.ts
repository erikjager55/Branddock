// =============================================================
// Persona Context Builder
//
// Builds a formatted text block with all workspace personas for
// injection into AI prompts (campaign strategy, content generation).
// =============================================================

import { prisma } from '@/lib/prisma';

interface PersonaSummary {
  name: string;
  tagline: string | null;
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  income: string | null;
  goals: string[];
  frustrations: string[];
  motivations: string[];
  strategicImplications: string | null;
}

/**
 * Fetch all personas for a workspace and return a formatted context block.
 * Returns an object with the text and the persona count.
 */
export async function buildAllPersonasContext(
  workspaceId: string,
): Promise<{ text: string; count: number }> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId },
    select: {
      name: true,
      tagline: true,
      age: true,
      gender: true,
      location: true,
      occupation: true,
      income: true,
      goals: true,
      frustrations: true,
      motivations: true,
      strategicImplications: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  if (personas.length === 0) {
    return {
      text: 'No personas defined yet. Consider creating personas for more targeted strategy.',
      count: 0,
    };
  }

  const blocks = personas.map((p: PersonaSummary) => formatPersona(p));

  return {
    text: blocks.join('\n\n'),
    count: personas.length,
  };
}

function formatPersona(p: PersonaSummary): string {
  const lines: string[] = [];

  lines.push(`### ${p.name}`);
  if (p.tagline) lines.push(`*${p.tagline}*`);

  // Demographics
  const demo: string[] = [];
  if (p.age) demo.push(`Age: ${p.age}`);
  if (p.gender) demo.push(`Gender: ${p.gender}`);
  if (p.location) demo.push(`Location: ${p.location}`);
  if (p.occupation) demo.push(`Occupation: ${p.occupation}`);
  if (p.income) demo.push(`Income: ${p.income}`);
  if (demo.length > 0) {
    lines.push(`Demographics: ${demo.join(' | ')}`);
  }

  // Goals
  if (p.goals.length > 0) {
    lines.push(`Goals: ${p.goals.join(', ')}`);
  }

  // Frustrations
  if (p.frustrations.length > 0) {
    lines.push(`Frustrations: ${p.frustrations.join(', ')}`);
  }

  // Motivations
  if (p.motivations.length > 0) {
    lines.push(`Motivations: ${p.motivations.join(', ')}`);
  }

  // Strategic implications
  if (p.strategicImplications) {
    lines.push(`Strategic implications: ${p.strategicImplications}`);
  }

  return lines.join('\n');
}
