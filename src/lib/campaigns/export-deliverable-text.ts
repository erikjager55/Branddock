import {
  resolveDeliverableContent,
  type DeliverableLike,
} from '@/lib/content/resolve-deliverable-content';

/**
 * Plat-tekst-projectie van één deliverable voor de canvas-export.
 *
 * Sinds 2026-08-16 (content-chain-accessor fase 2) is dit een dunne laag over
 * `resolveDeliverableContent()`. Deze module was de proto-accessor: hij kende de
 * keten-dispatch als eerste, maar had zijn eigen kopie van de precedentie-regels.
 * Twee implementaties van dezelfde beslissing lopen gegarandeerd uit elkaar — dat
 * is letterlijk de klasse bugs die deze task oplost. Wat hier overblijft is de
 * PRESENTATIE: welke tekst zie je als er niets te tonen valt.
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
  generatedText?: string | null;
  components: ExportableComponent[];
}

/** Het body-deel: de accessor beslist de keten, deze functie de bewoording. */
export function buildDeliverableBody(d: ExportableDeliverable): string {
  const content = resolveDeliverableContent(d as DeliverableLike);

  switch (content.kind) {
    case 'components':
      // Behoudt de kop-per-component-vorm van de oude export: een lezer wil in een
      // exportbestand zien uit welk blok een stuk tekst komt.
      if (Object.keys(content.byGroup).length > 0) {
        return `${Object.entries(content.byGroup)
          .map(([group, text]) => `## ${group}\n${text}\n`)
          .join('\n')}`;
      }
      return `${content.text}\n`;

    case 'structured':
      return `${content.text}\n`;

    case 'structured-unchosen':
      // Content bestaat wél, maar de gebruiker koos nog geen variant. Niet gokken welke
      // hij bedoelde, en al helemaal niet stil een leeg bestand leveren — zeg wat er moet
      // gebeuren.
      return `(${content.optionCount} generated variant(s) available, but none chosen yet — pick a variant in the Canvas before exporting.)\n`;

    case 'empty':
      return '(No generated content yet)\n';
  }
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
