/**
 * Claim-stempeling voor de brandstyle-PATCH-routes (W5).
 *
 * `preserve-user-rows.ts` is bewust puur zodat het zonder database te testen
 * is; dit is het dunne Prisma-laagje eromheen. Elke route die velden uit
 * `CLAIMABLE_STYLEGUIDE_FIELDS` schrijft moet dit aanroepen — anders is de
 * bescherming precies zo'n vlag-zonder-schrijver als de `*Override`-vlaggen
 * dat waren.
 */
import { prisma } from '@/lib/prisma';
import { applyFieldClaims } from './preserve-user-rows';

/**
 * Levert het `userEditedFields`-fragment voor een `brandStyleguide.update`.
 *
 * Spreid het resultaat in de `data` van de update:
 *
 *   data: { ...parsed.data, ...(await resolveFieldClaims(workspaceId, parsed.data)) }
 *
 * Geeft een leeg object terug wanneer de workspace nog geen styleguide heeft —
 * dan faalt de update er toch al op.
 */
export async function resolveFieldClaims(
  workspaceId: string,
  patched: Record<string, unknown>,
): Promise<{ userEditedFields?: string[] }> {
  const current = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: { userEditedFields: true },
  });
  if (!current) return {};
  return { userEditedFields: applyFieldClaims(current.userEditedFields, patched) };
}
