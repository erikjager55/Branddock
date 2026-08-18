/**
 * Structurele bewerkingsoperaties op de sectie-tree (PageData) — het
 * gedeelde kernel voor élk edit-pad: de sectie-hover-toolbar (A4), de
 * Claw-chat-tools (B1: add/remove/reorder/set_section_props) en straks de
 * generatieve pattern-swap (C-spoor). Eén module = één waarheid voor de
 * guards (verbeterplan v3 §7: "geen tweede waarheid").
 *
 * Alle operaties zijn puur (structuredClone, geen mutatie van de input) en
 * werken op de losse tree-shape zodat zowel getypte PageData<T> als rauwe
 * DB-JSON erin kan. Verplichte-sectie-regels zijn afgeleid van de
 * W-spec-skeletten (docs/specs/website-page-types-implementatieplan.md):
 * een pagina mag zijn kern-anatomie niet kwijtraken via een edit — de
 * regels die per type zijn opgesteld gelden ook, juist, voor de editor.
 */
import { isComponentLocked } from './component-lock';
import { isKnownSectionType, type SectionTypeId } from './page-data';

/** Losse tree-shape — zie page-render.tsx voor de rationale. */
export interface EditableTree {
  root?: { props?: Record<string, unknown> };
  content: Array<{ type: string; props?: Record<string, unknown> }>;
  [key: string]: unknown;
}

export type SectionEditResult =
  | { ok: true; data: EditableTree }
  | { ok: false; reason: string };

/**
 * Verplichte sectie-types per content-type (v1, conservatief): het LAATSTE
 * exemplaar van zo'n type mag niet verwijderd worden. Afgeleid van de
 * verplichte skelet-onderdelen in de W-spec (§2-4) en de single-CTA-
 * discipline uit de type-schema's. Bewust minimaal — te strenge guards
 * frustreren; het type-schema + F-VAL vangen de rest bij generate/publish.
 */
export const REQUIRED_SECTIONS_BY_TYPE: Record<string, readonly SectionTypeId[]> = {
  'landing-page': ['BrandHero', 'BrandCTA'],
  'product-page': ['BrandHero', 'BrandCTA'],
  'faq-page': ['BrandHero', 'FAQ'],
  'comparison-page': ['BrandHero', 'ComparisonTable'],
  microsite: ['BrandHero'],
};

export function requiredSectionTypesFor(contentType: string | null | undefined): readonly SectionTypeId[] {
  if (!contentType) return [];
  return REQUIRED_SECTIONS_BY_TYPE[contentType] ?? [];
}

function cloneTree(data: EditableTree): EditableTree {
  return structuredClone(data);
}

/**
 * Content-index van een sectie-id — de énige id-resolutie in het edit-pad.
 *
 * Volgt PageRender's id-logica: primair `props.id`, met terugval op het
 * synthetische `<type>-<index>`-id dat PageRender genereert voor secties
 * zónder bruikbaar `props.id`. Zonder die terugval matchte de kernel zo'n
 * sectie niet en werden move/remove/duplicate/set-props stille no-ops met een
 * misleidende melding — de klik kwam immers wél ergens vandaan.
 *
 * De terugval is bewust streng: het id moet naar een sectie van hetzelfde type
 * op die index wijzen, én die sectie moet echt géén eigen id hebben. Anders is
 * `BrandHero-2` van een pagina waar sectie 2 wél een id heeft een toevallige
 * treffer op een andere sectie — een edit op de verkeerde plek is erger dan
 * een geweigerde edit.
 *
 * Stond eerder alleen in `preview-edit-matching.ts` (features-laag); die
 * importeert hem nu hiervandaan, zodat preview en kernel per constructie
 * dezelfde secties aanwijzen.
 */
export function sectionContentIndex(tree: unknown, sectionId: string): number {
  // Bewust `unknown`: hier komt zowel getypte `PageData<T>` als rauwe DB-JSON
  // binnen, en die eerste mist de index-signature van `EditableTree`.
  const content = (tree as { content?: Array<{ type?: string; props?: Record<string, unknown> } | null> } | null | undefined)
    ?.content;
  if (!Array.isArray(content) || !sectionId) return -1;
  const byId = content.findIndex(
    (item) => item !== null && typeof item === 'object' && item.props?.id === sectionId,
  );
  if (byId >= 0) return byId;

  const synthetic = sectionId.match(/^(.+)-(\d+)$/);
  if (!synthetic) return -1;
  const idx = Number(synthetic[2]);
  const item = content[idx];
  if (!item || typeof item !== 'object' || item.type !== synthetic[1]) return -1;
  const ownId = item.props?.id;
  return typeof ownId === 'string' && ownId.length > 0 ? -1 : idx;
}

function indexOfSection(data: EditableTree, sectionId: string): number {
  return sectionContentIndex(data, sectionId);
}

function sectionLabel(item: { type: string } | undefined): string {
  return item?.type ?? 'sectie';
}

/** Nieuw uniek sectie-id in dezelfde vorm als template-helpers' `instance()`. */
export function newSectionId(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Mag deze sectie weg? Weigert bij: onbekend id, per-sectie lock, of het
 * laatste exemplaar van een verplicht type voor dit content-type.
 * De reason is user-toonbaar (i18n gebeurt in de UI-laag op reason-code).
 */
export function canRemoveSection(
  data: EditableTree,
  contentType: string | null | undefined,
  sectionId: string,
): { ok: boolean; reasonCode?: 'not-found' | 'locked' | 'required'; sectionType?: string } {
  const idx = indexOfSection(data, sectionId);
  if (idx < 0) return { ok: false, reasonCode: 'not-found' };
  const item = data.content[idx];
  if (isComponentLocked(data as never, sectionId)) {
    return { ok: false, reasonCode: 'locked', sectionType: sectionLabel(item) };
  }
  const required = requiredSectionTypesFor(contentType);
  if (required.includes(item.type as SectionTypeId)) {
    const remaining = data.content.filter((c) => c.type === item.type).length;
    if (remaining <= 1) {
      return { ok: false, reasonCode: 'required', sectionType: sectionLabel(item) };
    }
  }
  return { ok: true, sectionType: sectionLabel(item) };
}

export function removeSection(
  data: EditableTree,
  contentType: string | null | undefined,
  sectionId: string,
): SectionEditResult {
  const guard = canRemoveSection(data, contentType, sectionId);
  if (!guard.ok) {
    return { ok: false, reason: guard.reasonCode ?? 'not-found' };
  }
  const next = cloneTree(data);
  const idx = indexOfSection(next, sectionId);
  next.content.splice(idx, 1);
  return { ok: true, data: next };
}

/** Verplaats een sectie één positie ('up' | 'down'); bounds-safe. */
export function moveSection(
  data: EditableTree,
  sectionId: string,
  direction: 'up' | 'down',
): SectionEditResult {
  const idx = indexOfSection(data, sectionId);
  if (idx < 0) return { ok: false, reason: 'not-found' };
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= data.content.length) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  const next = cloneTree(data);
  const [item] = next.content.splice(idx, 1);
  next.content.splice(target, 0, item);
  return { ok: true, data: next };
}

/** Dupliceer een sectie direct onder het origineel (nieuw id). */
export function duplicateSection(data: EditableTree, sectionId: string): SectionEditResult {
  const idx = indexOfSection(data, sectionId);
  if (idx < 0) return { ok: false, reason: 'not-found' };
  const next = cloneTree(data);
  const copy = structuredClone(next.content[idx]);
  copy.props = { ...(copy.props ?? {}), id: newSectionId(copy.type) };
  next.content.splice(idx + 1, 0, copy);
  return { ok: true, data: next };
}

/**
 * Merge props op één sectie (shallow op prop-niveau). Weigert bij lock en
 * bij een poging `id`/`type` te wijzigen — die zijn identiteit, geen props.
 */
export function setSectionProps(
  data: EditableTree,
  sectionId: string,
  partialProps: Record<string, unknown>,
): SectionEditResult {
  const idx = indexOfSection(data, sectionId);
  if (idx < 0) return { ok: false, reason: 'not-found' };
  if (isComponentLocked(data as never, sectionId)) return { ok: false, reason: 'locked' };
  if ('id' in partialProps || 'type' in partialProps) {
    return { ok: false, reason: 'identity-immutable' };
  }
  const next = cloneTree(data);
  next.content[idx].props = { ...(next.content[idx].props ?? {}), ...partialProps };
  return { ok: true, data: next };
}

/** Eén structurele operatie (B1-chat-tool + batch-toepassingen). */
export interface StructureOperation {
  op: 'add' | 'remove' | 'move' | 'duplicate';
  sectionId?: string;
  type?: string;
  afterSectionId?: string | null;
  direction?: 'up' | 'down';
}

export type ApplyStructureResult =
  | { ok: true; data: EditableTree; summaries: string[] }
  | { ok: false; reason: string; opIndex: number };

/**
 * Pas een batch structurele operaties sequentieel toe (alles-of-niets):
 * faalt één operatie op een guard, dan wordt níets toegepast en komt de
 * reden + operatie-index terug — de aanroeper (chat-tool/UI) kan gericht
 * uitleggen wat er niet mag. Summaries zijn NL en user-toonbaar.
 */
export function applyStructureOperations(
  data: EditableTree,
  contentType: string | null | undefined,
  operations: StructureOperation[],
): ApplyStructureResult {
  let current = data;
  const summaries: string[] = [];
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    let result: SectionEditResult;
    switch (op.op) {
      case 'add':
        result = addSection(current, {
          type: op.type ?? '',
          afterSectionId: op.afterSectionId ?? null,
        });
        if (result.ok) summaries.push(`Sectie toegevoegd: ${op.type}${op.afterSectionId ? ` (na ${op.afterSectionId})` : ''}`);
        break;
      case 'remove':
        result = removeSection(current, contentType, op.sectionId ?? '');
        if (result.ok) summaries.push(`Sectie verwijderd: ${op.sectionId}`);
        break;
      case 'move':
        result = moveSection(current, op.sectionId ?? '', op.direction ?? 'up');
        if (result.ok) summaries.push(`Sectie ${op.direction === 'down' ? 'omlaag' : 'omhoog'} verplaatst: ${op.sectionId}`);
        break;
      case 'duplicate':
        result = duplicateSection(current, op.sectionId ?? '');
        if (result.ok) summaries.push(`Sectie gedupliceerd: ${op.sectionId}`);
        break;
      default:
        // Compile-time onbereikbaar (op.op is een union), maar runtime-input
        // van ongevalideerde callers mag nooit een TypeError op result geven.
        result = { ok: false, reason: 'not-found' };
        break;
    }
    if (!result.ok) {
      return { ok: false, reason: result.reason, opIndex: i };
    }
    current = result.data;
  }
  return { ok: true, data: current, summaries };
}

/**
 * Voeg een sectie toe (na `afterSectionId`, of aan het einde). Weigert
 * onbekende sectie-types — het registry-contract is de vocabulaire.
 */
export function addSection(
  data: EditableTree,
  params: { type: string; props?: Record<string, unknown>; afterSectionId?: string | null },
): SectionEditResult {
  if (!isKnownSectionType(params.type)) {
    return { ok: false, reason: 'unknown-type' };
  }
  const next = cloneTree(data);
  const item = {
    type: params.type,
    props: { ...(params.props ?? {}), id: newSectionId(params.type) },
  };
  let insertAt = next.content.length;
  if (params.afterSectionId) {
    const idx = indexOfSection(next, params.afterSectionId);
    // Wél een anker meegegeven maar niet te vinden: dat is een vergissing, geen
    // "dan maar onderaan". Stil appenden zette de sectie op een andere plek dan
    // de gebruiker aanwees, en meldde succes — de melding klopte dan letterlijk
    // (er is een sectie toegevoegd) en inhoudelijk niet. Géén anker meegeven
    // blijft gewoon appenden; dat is een expliciete keuze van de caller.
    if (idx < 0) return { ok: false, reason: 'after-section-not-found' };
    insertAt = idx + 1;
  }
  next.content.splice(insertAt, 0, item);
  return { ok: true, data: next };
}
