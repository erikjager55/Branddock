/**
 * Per-component diff-merge helper for the Phase 6.1 page-level diff
 * preview UX. Used by PageDiffPreviewModal so users can accept or reject
 * AI proposals at the component level rather than all-or-nothing.
 *
 * Pure function — operates on Puck-like data trees by content[].props.id.
 * Returns a new tree (immutable). Unknown ids in `acceptedComponentIds`
 * are silently ignored (defensive against stale UI state).
 */

interface DiffMergeItem {
  type: string;
  props: Record<string, unknown> & { id?: string };
  readOnly?: unknown;
}

interface DiffMergeData {
  root?: { props?: Record<string, unknown> };
  content: DiffMergeItem[];
}

/**
 * Merge accepted components from `proposed` into `current` by id-match.
 *
 * Algorithm:
 *  - Build a map of proposed components keyed by id.
 *  - Walk current's content; for each item, swap with the proposed version
 *    only when the id appears in `acceptedComponentIds`.
 *  - Preserve current's ordering — proposals never reorder; the user can
 *    still drag-drop after accepting.
 *  - Components in proposed that aren't in current (rare; auto-iterate
 *    prompts forbid invention) are DROPPED — id-loze of verzonnen items
 *    kunnen de tree dus nooit corrumperen; structuur wijzigen loopt via
 *    de sectie-kernel, niet via dit merge-pad.
 *
 * When `acceptedComponentIds` is the literal string 'all', accept every
 * proposed component that exists in current.
 */
export function mergeAcceptedComponents(
  current: DiffMergeData,
  proposed: DiffMergeData,
  acceptedComponentIds: string[] | 'all',
): DiffMergeData {
  const proposedById = new Map<string, DiffMergeItem>();
  for (const item of proposed.content) {
    const id = item.props.id;
    if (typeof id === 'string' && id.length > 0) proposedById.set(id, item);
  }

  const acceptedSet = acceptedComponentIds === 'all'
    ? new Set(proposedById.keys())
    : new Set(acceptedComponentIds);

  const nextContent: DiffMergeItem[] = current.content.map((item) => {
    const id = item.props.id;
    if (typeof id === 'string' && acceptedSet.has(id) && proposedById.has(id)) {
      return proposedById.get(id) as DiffMergeItem;
    }
    return item;
  });

  return { ...current, content: nextContent };
}

/**
 * Lists component ids that have differing props between `current` and
 * `proposed` — useful for showing a "X of Y changed" summary in the modal
 * header and for selecting "all changed" with one click.
 */
export function diffComponentIds(
  current: DiffMergeData | null | undefined,
  proposed: DiffMergeData | null | undefined,
): string[] {
  // Defensive: API-responses kunnen content=undefined hebben wanneer de
  // server een tree returnt zonder content-array (bv. parse-edge case in
  // auto-iterate). Voorheen crashte de modal hierop met
  // "Cannot read properties of undefined (reading 'content')".
  const currentContent = Array.isArray(current?.content) ? current!.content : [];
  const proposedContent = Array.isArray(proposed?.content) ? proposed!.content : [];

  const proposedById = new Map<string, DiffMergeItem>();
  for (const item of proposedContent) {
    const id = item?.props?.id;
    if (typeof id === 'string') proposedById.set(id, item);
  }
  const differing: string[] = [];
  for (const item of currentContent) {
    const id = item?.props?.id;
    if (typeof id !== 'string') continue;
    const proposedItem = proposedById.get(id);
    if (!proposedItem) continue;
    if (JSON.stringify(item.props) !== JSON.stringify(proposedItem.props)) {
      differing.push(id);
    }
  }
  return differing;
}

// ─── Three-way merge (B4 lp-variant-merge) ───────────────────────────────

/**
 * Eén conflict uit `threeWayMergePuckData`: de sectie is bewerkt door de
 * gebruiker (current ≠ base) ÉN gewijzigd door de verse mapping
 * (incoming ≠ base). De merge kiest default keep-mine; de UI kan per
 * conflict "take-new" toepassen door `merged.content[mergedIndex]` te
 * vervangen door `theirs`.
 */
export interface PuckMergeConflict {
  /** Stabiele sectie-id (current-kant); null wanneer de sectie geen id draagt. */
  id: string | null;
  /** Component-type van de sectie (bv. "BrandHero"). */
  type: string;
  /** Index van de keep-mine-occupant in `merged.content` — swap-punt voor take-new. */
  mergedIndex: number;
  /** De door de gebruiker bewerkte sectie (default-winnaar). */
  mine: DiffMergeItem;
  /** De vers gemapte sectie (id al gealigneerd op de stabiele id). */
  theirs: DiffMergeItem;
  /** Top-level propnamen die tussen mine en theirs verschillen (excl. id). */
  conflictingProps: string[];
}

/** Resultaat van `threeWayMergePuckData`. */
export interface ThreeWayMergeResult {
  merged: DiffMergeData;
  conflicts: PuckMergeConflict[];
  /** Secties waar gebruikers-werk behouden bleef (bewerkt, toegevoegd of verwijderd-gelaten). */
  editedSectionCount: number;
  /** Secties die de verse structuur uit `incoming` overnamen (vervangen of nieuw). */
  refreshedSectionCount: number;
}

interface ThreeWayMergeInput {
  /** puckData zoals origineel geseed uit de variant (settings.puckDataBaseline). */
  base: DiffMergeData | null | undefined;
  /** puckData zoals nu opgeslagen — kan handmatige Puck-edits bevatten. */
  current: DiffMergeData | null | undefined;
  /** Vers gemapte puckData uit structuredVariant + huidige BrandTokens. */
  incoming: DiffMergeData | null | undefined;
}

/**
 * Conservatieve three-way merge van Puck-trees rond structure-refresh
 * (B4 verbeterplan §5 Fase B): `base` = de tree zoals geseed bij
 * variant-keuze, `current` = wat de gebruiker ervan maakte, `incoming` =
 * een verse mapping van dezelfde structuredVariant + actuele BrandTokens.
 *
 * Sectie-matching: eerst op `props.id` (stabiel tussen base en current —
 * Puck-edits behouden ids), daarna per type op occurrence-index in
 * documentvolgorde. Die fallback is essentieel richting `incoming`: de
 * mapper genereert per invocatie NIEUWE random ids, dus id-match slaagt
 * daar vrijwel nooit.
 *
 * Merge-regels per incoming-sectie (via base als pivot):
 *  - geen base-match → nieuwe sectie → overnemen (refreshed).
 *  - base-match maar door gebruiker verwijderd → verwijderd laten
 *    (deletion = user-edit; wordt nooit stil geresurrect).
 *  - gebruiker onbewerkt → incoming overnemen mét de stabiele id van de
 *    current-sectie (refreshed; id-continuïteit voor volgende merges).
 *  - gebruiker bewerkt, incoming ongewijzigd t.o.v. base → current behouden.
 *  - gebruiker bewerkt ÉN incoming gewijzigd → CONFLICT: keep-mine als
 *    default in de tree, conflict-entry met beide kanten voor de UI.
 * Daarna: current-only secties (user-added, of door incoming gedropt maar
 * bewerkt) blijven behouden op hun oorspronkelijke positie (geclampt).
 * Door incoming gedropte, onbewerkte secties volgen incoming (verdwijnen).
 *
 * Root-props volgen dezelfde regel zonder conflict-entry: door de
 * gebruiker bewerkt → current.root, anders incoming.root. Overige
 * top-level keys komen van current (conventie mergeAcceptedComponents).
 *
 * Prop-vergelijking gebruikt een stabiele serialisatie (recursief
 * gesorteerde object-keys, id uitgesloten): persisted trees round-trippen
 * door Postgres jsonb dat key-volgorde NIET bewaart — kale JSON.stringify
 * zou elke sectie als "bewerkt" zien.
 *
 * Pure functie: muteert geen input; alle output-nodes zijn diepe clones.
 */
export function threeWayMergePuckData(input: ThreeWayMergeInput): ThreeWayMergeResult {
  const base = toSafeData(input.base);
  const current = toSafeData(input.current);
  const incoming = toSafeData(input.incoming);

  const baseToCurrent = matchSections(base.content, current.content);
  const baseToIncoming = matchSections(base.content, incoming.content);
  const incomingToBase = invertMatch(baseToIncoming);
  const currentToBase = invertMatch(baseToCurrent);

  let editedSectionCount = 0;
  let refreshedSectionCount = 0;

  /** Merged tree als tussenvorm zodat insertions later de conflict-indices niet breken. */
  interface MergedEntry {
    item: DiffMergeItem;
    conflict?: Omit<PuckMergeConflict, 'mergedIndex'>;
  }
  const entries: MergedEntry[] = [];
  const consumedCurrent = new Set<number>();

  for (let ii = 0; ii < incoming.content.length; ii++) {
    const incomingItem = incoming.content[ii];
    const bi = incomingToBase.get(ii);
    if (bi === undefined) {
      // Nieuw in de verse structuur → overnemen.
      entries.push({ item: cloneItem(incomingItem) });
      refreshedSectionCount++;
      continue;
    }
    const ci = baseToCurrent.get(bi);
    if (ci === undefined) {
      // Door de gebruiker verwijderd — deletion is een edit en wint.
      editedSectionCount++;
      continue;
    }
    consumedCurrent.add(ci);
    const baseItem = base.content[bi];
    const currentItem = current.content[ci];
    const stableId = readSectionId(currentItem);
    const userEdited = !sectionPropsEqual(currentItem, baseItem);
    const incomingChanged = !sectionPropsEqual(incomingItem, baseItem);

    if (!userEdited) {
      entries.push({ item: withStableId(incomingItem, stableId) });
      refreshedSectionCount++;
      continue;
    }
    editedSectionCount++;
    if (!incomingChanged) {
      entries.push({ item: cloneItem(currentItem) });
      continue;
    }
    // Conflict: beide kanten wijzigden — keep-mine default, beide kanten mee.
    const mine = cloneItem(currentItem);
    const theirs = withStableId(incomingItem, stableId);
    entries.push({
      item: mine,
      conflict: {
        id: stableId,
        type: currentItem.type,
        mine,
        theirs,
        conflictingProps: diffPropNames(mine, theirs),
      },
    });
  }

  // Current-only secties: user-added (geen base-match) blijven; door
  // incoming gedropte secties blijven alleen wanneer de gebruiker ze
  // bewerkte. Invoegen op de oorspronkelijke current-positie (geclampt),
  // in oplopende volgorde zodat de onderlinge volgorde stabiel blijft.
  for (let cj = 0; cj < current.content.length; cj++) {
    if (consumedCurrent.has(cj)) continue;
    const currentItem = current.content[cj];
    const bj = currentToBase.get(cj);
    if (bj !== undefined) {
      const droppedByIncoming = baseToIncoming.get(bj) === undefined;
      if (!droppedByIncoming) continue; // al via de incoming-walk afgehandeld
      const userEdited = !sectionPropsEqual(currentItem, base.content[bj]);
      if (!userEdited) continue; // onbewerkt + door incoming gedropt → volg incoming
    }
    editedSectionCount++;
    const at = Math.min(cj, entries.length);
    entries.splice(at, 0, { item: cloneItem(currentItem) });
  }

  const conflicts: PuckMergeConflict[] = [];
  const content: DiffMergeItem[] = entries.map((entry, index) => {
    if (entry.conflict) conflicts.push({ ...entry.conflict, mergedIndex: index });
    return entry.item;
  });

  const rootEdited =
    stableStringify(current.root?.props ?? {}) !== stableStringify(base.root?.props ?? {});
  const root = deepClone((rootEdited ? current.root : incoming.root) ?? { props: {} });

  // Conventie mergeAcceptedComponents: onbekende top-level keys van current
  // (bv. zones) blijven behouden — de gebruikerskant is de conservatieve keuze.
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.current ?? {})) {
    if (key === 'root' || key === 'content') continue;
    extras[key] = deepClone(value);
  }

  return {
    merged: { ...extras, root, content },
    conflicts,
    editedSectionCount,
    refreshedSectionCount,
  };
}

/** Defensieve normalisatie — API/DB-shapes kunnen root/content missen. */
function toSafeData(data: DiffMergeData | null | undefined): {
  root: { props?: Record<string, unknown> } | undefined;
  content: DiffMergeItem[];
} {
  if (!data || typeof data !== 'object') return { root: undefined, content: [] };
  return {
    root: data.root && typeof data.root === 'object' ? data.root : undefined,
    content: Array.isArray(data.content)
      ? data.content.filter((item): item is DiffMergeItem => Boolean(item) && typeof item === 'object')
      : [],
  };
}

function readSectionId(item: DiffMergeItem): string | null {
  const id = item?.props?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Match secties van a → b: pass 1 op gedeelde non-empty `props.id`, pass 2
 * per type op occurrence-index (n-de ongematchte sectie van type T in a ↔
 * n-de ongematchte van type T in b, in documentvolgorde).
 */
function matchSections(a: DiffMergeItem[], b: DiffMergeItem[]): Map<number, number> {
  const result = new Map<number, number>();
  const usedB = new Set<number>();

  // Pass 1 — id-match.
  const bById = new Map<string, number>();
  b.forEach((item, i) => {
    const id = readSectionId(item);
    if (id && !bById.has(id)) bById.set(id, i);
  });
  a.forEach((item, i) => {
    const id = readSectionId(item);
    if (!id) return;
    const bi = bById.get(id);
    if (bi !== undefined && !usedB.has(bi)) {
      result.set(i, bi);
      usedB.add(bi);
    }
  });

  // Pass 2 — type + occurrence-index fallback voor de rest.
  const unmatchedBByType = new Map<string, number[]>();
  b.forEach((item, i) => {
    if (usedB.has(i)) return;
    const list = unmatchedBByType.get(item.type) ?? [];
    list.push(i);
    unmatchedBByType.set(item.type, list);
  });
  a.forEach((item, i) => {
    if (result.has(i)) return;
    const pool = unmatchedBByType.get(item.type);
    if (!pool || pool.length === 0) return;
    const bi = pool.shift() as number;
    result.set(i, bi);
    usedB.add(bi);
  });

  return result;
}

function invertMatch(match: Map<number, number>): Map<number, number> {
  const inverted = new Map<number, number>();
  for (const [k, v] of match) inverted.set(v, k);
  return inverted;
}

/** Props-gelijkheid excl. `id`, met stabiele serialisatie (jsonb-key-order-proof). */
function sectionPropsEqual(a: DiffMergeItem, b: DiffMergeItem): boolean {
  if (a.type !== b.type) return false;
  return stableStringify(propsWithoutId(a)) === stableStringify(propsWithoutId(b));
}

function propsWithoutId(item: DiffMergeItem): Record<string, unknown> {
  const props = item?.props && typeof item.props === 'object' ? item.props : {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'id') continue;
    rest[key] = value;
  }
  return rest;
}

/** Top-level propnamen (excl. id) die tussen twee secties verschillen. */
function diffPropNames(a: DiffMergeItem, b: DiffMergeItem): string[] {
  const aProps = propsWithoutId(a);
  const bProps = propsWithoutId(b);
  const keys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
  const differing: string[] = [];
  for (const key of keys) {
    if (stableStringify(aProps[key]) !== stableStringify(bProps[key])) differing.push(key);
  }
  return differing;
}

function cloneItem(item: DiffMergeItem): DiffMergeItem {
  return deepClone(item);
}

/** Clone van een incoming-sectie met de stabiele (current-)id, voor id-continuïteit. */
function withStableId(item: DiffMergeItem, stableId: string | null): DiffMergeItem {
  const clone = cloneItem(item);
  if (stableId) clone.props = { ...clone.props, id: stableId };
  return clone;
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = deepClone(v);
  }
  return out as T;
}

/**
 * Deterministische JSON-serialisatie met recursief gesorteerde object-keys.
 * Nodig omdat Postgres jsonb key-volgorde normaliseert: base komt uit de DB,
 * incoming is vers gebouwd — dezelfde props in andere volgorde mogen nooit
 * als "gewijzigd" tellen.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(',');
  return `{${body}}`;
}

export type { DiffMergeData, DiffMergeItem };
