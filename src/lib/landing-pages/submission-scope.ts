// =============================================================
// Form-submission scope — welke submissions horen bij één deliverable
// (ADR 2026-08-17)
//
// Prisma-vrij en auth-vrij: de route doet sessie, deliverable-lookup en
// rolcheck, en geeft de uitkomst hier naar binnen. Zo is de scope-regel —
// de laag waar tenant-isolatie en het wis-bereik op rusten — zonder
// database én zonder ingelogde sessie te verifiëren.
// =============================================================

/** Eén OR-tak van de scope. */
export type SubmissionMatch =
  | { formId: { in: string[] }; landingPageId: null }
  | { formId: { in: string[] } }
  | { landingPageId: { in: string[] } };

/** Structureel compatibel met Prisma's `FormSubmissionWhereInput`. */
export interface SubmissionWhere {
  workspaceId: string;
  OR: SubmissionMatch[];
}

/**
 * Lees- en wis-scope voor de submissions van één deliverable.
 *
 * `null` betekent: dit deliverable heeft geen enkel formulier én geen enkele
 * pagina, dus per definitie 0 submissions.
 */
export interface SubmissionScope {
  where: SubmissionWhere | null;
  deleteWhere: SubmissionWhere | null;
}

/**
 * Bouwt de scope uit de al geresolveerde workspace, form-id's en pagina-id's.
 *
 * **Lezen** matcht tweeledig (OR), omdat submissions op twee assen binnenkomen:
 *  - `formId in (…)`: de LeadForm-sectie-id's uit de HUIDIGE draft-tree — vangt
 *    óók zip-/WP-export-submissions zonder herleidbare landingPage;
 *  - `landingPageId in (…)`: de pagina's van dit deliverable — vangt submissions
 *    van secties die inmiddels uit de draft verwijderd zijn.
 *
 * **Wissen** is strikter. Een gedupliceerd deliverable erft de LeadForm-sectie-
 * id's ongewijzigd (`duplicate/route.ts` kopieert `settings` verbatim), dus de
 * `formId`-tak matcht óók submissions van het origineel. Voor lezen is dat
 * hinderlijk-maar-onschuldig; voor wissen zou de kopie de leads van het
 * origineel kunnen verwijderen. Daarom geldt de `formId`-tak bij wissen
 * uitsluitend voor submissions zonder pagina — wat er pagina-gebonden is, gaat
 * alleen via de eigen pagina's.
 */
export function buildSubmissionScope(input: {
  workspaceId: string;
  formIds: readonly string[];
  pageIds: readonly string[];
}): SubmissionScope {
  const { workspaceId } = input;
  const formIds = [...input.formIds];
  const pageIds = [...input.pageIds];

  if (formIds.length === 0 && pageIds.length === 0) {
    return { where: null, deleteWhere: null };
  }

  const pageBranch: SubmissionMatch[] =
    pageIds.length > 0 ? [{ landingPageId: { in: pageIds } }] : [];

  return {
    where: {
      workspaceId,
      OR: [...(formIds.length > 0 ? [{ formId: { in: formIds } }] : []), ...pageBranch],
    },
    deleteWhere: {
      workspaceId,
      OR: [
        ...(formIds.length > 0
          ? [{ formId: { in: formIds }, landingPageId: null } as SubmissionMatch]
          : []),
        ...pageBranch,
      ],
    },
  };
}
