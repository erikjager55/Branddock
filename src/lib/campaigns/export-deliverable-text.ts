import { flattenPageVariantToText } from '@/lib/landing-pages/flatten-variant';
import type { PageVariantContent } from '@/lib/landing-pages/page-type-schemas';

/**
 * Plat-tekst-projectie van één deliverable voor de canvas-export.
 *
 * Branddock heeft TWEE content-ketens en ze bewaren hun copy op verschillende
 * plekken:
 *  - component-gebaseerde types → `DeliverableComponent.generatedContent`
 *  - structured/PUCK web-page-types (landing-page, faq-page, product-page,
 *    microsite + de long-form GEO-types) → `Deliverable.settings.structuredVariant`
 *
 * De export kende alleen de eerste keten en leverde voor de tweede stilzwijgend een
 * leeg bestand (melding 2026-07-16). Zelfde familie als de twee-publish-ketens-gotcha
 * (2026-06-24): een tweede keten schrijft naar andere state, de eerste weet er niet van.
 *
 * Pure functie zodat de keten-dispatch testbaar is zonder DB/auth — een route-file mag
 * in de App Router geen extra symbolen exporteren.
 */

export interface ExportableComponent {
  componentType: string;
  groupType: string | null;
  generatedContent: string | null;
}

export interface ExportableDeliverable {
  title: string;
  contentType: string;
  status: string;
  approvalStatus?: string | null;
  settings?: unknown;
  components: ExportableComponent[];
}

/** Leest settings defensief: Prisma-JSON kan alles zijn. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Het body-deel: component-keten → structured-keten → eerlijke melding. */
export function buildDeliverableBody(d: ExportableDeliverable): string {
  const componentText = d.components
    .filter((c) => c.generatedContent)
    .map((c) => `## ${c.componentType} (${c.groupType})\n${c.generatedContent}\n`);
  if (componentText.length > 0) return componentText.join('\n');

  const settings = asRecord(d.settings);
  const chosen = settings.structuredVariant as PageVariantContent | undefined;
  if (chosen) {
    // flattenPageVariantToText gaat uit van een schema-complete variant en itereert
    // rechtstreeks over arrays (bv. citeableStats). Een opgeslagen variant van vóór een
    // schema-uitbreiding, of een partial uit een afgebroken run, laat 'm dan gooien —
    // in een export-route is dat een 500 i.p.v. een bestand. Zelfde les als de
    // validateOrWarn-gotcha (2026-03-24): een opgeslagen AI-payload is nooit een
    // garantie op zijn schema. Fail-soft: liever een eerlijke regel dan een 500.
    try {
      const flat = flattenPageVariantToText(chosen);
      if (flat.trim().length > 0) return `${flat}\n`;
    } catch (err) {
      console.warn('[canvas-export] flatten van structuredVariant faalde', {
        contentType: d.contentType,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return '(A variant is chosen but could not be rendered as text — open it in the Canvas.)\n';
  }

  const options = settings.structuredVariantOptions;
  if (Array.isArray(options) && options.length > 0) {
    // Content bestaat wél, maar de gebruiker koos nog geen variant. Niet gokken welke
    // hij bedoelde, en al helemaal niet stil een leeg bestand leveren — zeg wat er moet
    // gebeuren.
    return `(${options.length} generated variant(s) available, but none chosen yet — pick a variant in the Canvas before exporting.)\n`;
  }

  return '(No generated content yet)\n';
}

/** Volledige export-tekst voor één deliverable (kop + body). */
export function buildDeliverableExportText(d: ExportableDeliverable): string {
  return [
    `# ${d.title}`,
    `Type: ${d.contentType}`,
    `Status: ${d.status}`,
    `Approval: ${d.approvalStatus ?? 'DRAFT'}`,
    '',
    buildDeliverableBody(d),
  ].join('\n');
}
