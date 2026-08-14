/**
 * Smoke-test voor threeWayMergePuckData (B4 lp-variant-merge).
 *
 * Dekt de merge-invarianten rond structure-refresh:
 *  - bewerkte sectie blijft behouden (user-edit wint)
 *  - onbewerkte sectie wordt ververst uit incoming (mét stabiele id)
 *  - beide kanten gewijzigd → conflict geflagd, keep-mine default
 *  - id-matching (base↔current) + type/occurrence-index-fallback (incoming
 *    heeft per mapping nieuwe random ids)
 *  - jsonb-key-order-robuustheid (stabiele serialisatie)
 *  - user-added blijft, user-deleted blijft verwijderd
 *  - inputs worden niet gemuteerd
 */
import {
  threeWayMergePuckData,
  type DiffMergeData,
} from "../../src/lib/landing-pages/diff-merge";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

function section(type: string, id: string, props: Record<string, unknown>) {
  return { type, props: { id, ...props } };
}

/** Basis-fixture: hero + features + cta, zoals een seed-mapping. */
function seedTree(): DiffMergeData {
  return {
    root: { props: { title: "Pagina" } },
    content: [
      section("BrandHero", "BrandHero-aaa1111", { headline: "Origineel", sub: "Sub A" }),
      section("FeatureGrid", "FeatureGrid-bbb2222", { columns: "3", features: [{ title: "F1" }] }),
      section("BrandCTA", "BrandCTA-ccc3333", { heading: "Doe mee", ctaLabel: "Start" }),
    ],
  };
}

/** Verse mapping: zelfde structuur maar NIEUWE random ids (mapper-gedrag). */
function freshTree(overrides?: {
  heroProps?: Record<string, unknown>;
  ctaProps?: Record<string, unknown>;
  extraSection?: { type: string; props: Record<string, unknown> };
  dropCta?: boolean;
}): DiffMergeData {
  const content = [
    section("BrandHero", "BrandHero-zzz9999", {
      headline: "Origineel",
      sub: "Sub A",
      ...overrides?.heroProps,
    }),
    section("FeatureGrid", "FeatureGrid-yyy8888", { columns: "3", features: [{ title: "F1" }] }),
  ];
  if (!overrides?.dropCta) {
    content.push(
      section("BrandCTA", "BrandCTA-xxx7777", {
        heading: "Doe mee",
        ctaLabel: "Start",
        ...overrides?.ctaProps,
      }),
    );
  }
  if (overrides?.extraSection) {
    content.push(section(overrides.extraSection.type, "New-www6666", overrides.extraSection.props));
  }
  return { root: { props: { title: "Pagina" } }, content };
}

group("three-way merge — bewerkte sectie blijft behouden");
{
  const base = seedTree();
  const current = seedTree();
  current.content[0] = section("BrandHero", "BrandHero-aaa1111", {
    headline: "Door gebruiker herschreven",
    sub: "Sub A",
  });
  // incoming == base inhoudelijk, maar met nieuwe ids
  const incoming = freshTree();
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "user-edit op hero blijft staan",
    result.merged.content[0]?.props.headline === "Door gebruiker herschreven",
  );
  assert("geen conflicts (incoming ongewijzigd)", result.conflicts.length === 0);
  assert("editedSectionCount telt 1", result.editedSectionCount === 1);
  assert("overige secties refreshed", result.refreshedSectionCount === 2);
}

group("three-way merge — onbewerkte sectie wordt ververst");
{
  const base = seedTree();
  const current = seedTree();
  const incoming = freshTree({ heroProps: { headline: "Nieuwe brand-styling headline" } });
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "incoming-props overgenomen",
    result.merged.content[0]?.props.headline === "Nieuwe brand-styling headline",
  );
  assert(
    "stabiele id behouden (current-id, niet de nieuwe random id)",
    result.merged.content[0]?.props.id === "BrandHero-aaa1111",
  );
  assert("geen conflicts", result.conflicts.length === 0);
  assert("refreshedSectionCount telt 3", result.refreshedSectionCount === 3);
}

group("three-way merge — conflict geflagd (keep-mine default)");
{
  const base = seedTree();
  const current = seedTree();
  current.content[2] = section("BrandCTA", "BrandCTA-ccc3333", {
    heading: "Door gebruiker aangepast",
    ctaLabel: "Start",
  });
  const incoming = freshTree({ ctaProps: { heading: "Vers uit de mapper" } });
  const result = threeWayMergePuckData({ base, current, incoming });
  assert("1 conflict", result.conflicts.length === 1);
  const conflict = result.conflicts[0];
  assert("conflict.type = BrandCTA", conflict?.type === "BrandCTA");
  assert("conflict.id = stabiele id", conflict?.id === "BrandCTA-ccc3333");
  assert(
    "keep-mine default in merged tree",
    result.merged.content[conflict?.mergedIndex ?? -1]?.props.heading === "Door gebruiker aangepast",
  );
  assert(
    "conflictingProps bevat heading",
    Array.isArray(conflict?.conflictingProps) && conflict.conflictingProps.includes("heading"),
  );
  assert(
    "theirs draagt de incoming-props met stabiele id",
    conflict?.theirs.props.heading === "Vers uit de mapper" && conflict?.theirs.props.id === "BrandCTA-ccc3333",
  );
  // take-new toepassen = swap op mergedIndex (het UI-contract)
  const applied = {
    ...result.merged,
    content: result.merged.content.map((item, i) => (i === conflict!.mergedIndex ? conflict!.theirs : item)),
  };
  assert(
    "take-new swap levert incoming-heading",
    applied.content[conflict!.mergedIndex]?.props.heading === "Vers uit de mapper",
  );
}

group("three-way merge — id-matching + type/index-fallback");
{
  // base↔current matchen op id ondanks reorder door de gebruiker.
  const base = seedTree();
  const current: DiffMergeData = {
    root: { props: { title: "Pagina" } },
    content: [
      // Gebruiker sleepte de CTA naar boven en bewerkte 'm.
      section("BrandCTA", "BrandCTA-ccc3333", { heading: "Boven gezet + bewerkt", ctaLabel: "Start" }),
      section("BrandHero", "BrandHero-aaa1111", { headline: "Origineel", sub: "Sub A" }),
      section("FeatureGrid", "FeatureGrid-bbb2222", { columns: "3", features: [{ title: "F1" }] }),
    ],
  };
  const incoming = freshTree();
  const result = threeWayMergePuckData({ base, current, incoming });
  const cta = result.merged.content.find((c) => c.type === "BrandCTA");
  assert("reorder + edit: CTA-edit overleeft via id-match", cta?.props.heading === "Boven gezet + bewerkt");
  assert("geen conflicts (incoming CTA ongewijzigd)", result.conflicts.length === 0);
}
{
  // Zonder ids valt base↔current terug op type+occurrence-index.
  const strip = (d: DiffMergeData): DiffMergeData => ({
    ...d,
    content: d.content.map((c) => {
      const props = { ...c.props };
      delete (props as Record<string, unknown>).id;
      return { ...c, props };
    }),
  });
  const base = strip(seedTree());
  const current = strip(seedTree());
  current.content[1] = { type: "FeatureGrid", props: { columns: "3", features: [{ title: "Bewerkt" }] } };
  const incoming = strip(freshTree());
  const result = threeWayMergePuckData({ base, current, incoming });
  const grid = result.merged.content.find((c) => c.type === "FeatureGrid");
  const features = grid?.props.features as Array<{ title: string }> | undefined;
  assert("type+index-fallback: edit zonder ids overleeft", features?.[0]?.title === "Bewerkt");
}

group("three-way merge — structuurwijzigingen");
{
  // Nieuwe sectie in incoming wordt toegevoegd.
  const base = seedTree();
  const current = seedTree();
  const incoming = freshTree({ extraSection: { type: "Testimonial", props: { quote: "Nieuw" } } });
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "nieuwe incoming-sectie toegevoegd",
    result.merged.content.some((c) => c.type === "Testimonial" && c.props.quote === "Nieuw"),
  );
}
{
  // Door gebruiker verwijderde sectie blijft verwijderd.
  const base = seedTree();
  const current = seedTree();
  current.content = current.content.filter((c) => c.type !== "BrandCTA");
  const incoming = freshTree();
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "user-deleted sectie wordt niet geresurrect",
    !result.merged.content.some((c) => c.type === "BrandCTA"),
  );
}
{
  // Door gebruiker toegevoegde sectie blijft behouden.
  const base = seedTree();
  const current = seedTree();
  current.content.splice(1, 0, section("RichText", "RichText-user111", { text: "Zelf toegevoegd" }));
  const incoming = freshTree();
  const result = threeWayMergePuckData({ base, current, incoming });
  const kept = result.merged.content.find((c) => c.type === "RichText");
  assert("user-added sectie blijft behouden", kept?.props.text === "Zelf toegevoegd");
  assert(
    "user-added sectie op oorspronkelijke positie",
    result.merged.content.findIndex((c) => c.type === "RichText") === 1,
  );
}
{
  // Door incoming gedropte + door gebruiker bewerkte sectie blijft (edits winnen).
  const base = seedTree();
  const current = seedTree();
  current.content[2] = section("BrandCTA", "BrandCTA-ccc3333", { heading: "Bewerkt", ctaLabel: "Start" });
  const incoming = freshTree({ dropCta: true });
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "gedropte-maar-bewerkte sectie blijft",
    result.merged.content.some((c) => c.type === "BrandCTA" && c.props.heading === "Bewerkt"),
  );
}
{
  // Door incoming gedropte, onbewerkte sectie volgt incoming (verdwijnt).
  const base = seedTree();
  const current = seedTree();
  const incoming = freshTree({ dropCta: true });
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "gedropte onbewerkte sectie verdwijnt",
    !result.merged.content.some((c) => c.type === "BrandCTA"),
  );
}

group("three-way merge — jsonb-key-order-robuustheid");
{
  // base komt uit Postgres jsonb (andere key-volgorde), current is inhoudelijk gelijk.
  const base: DiffMergeData = {
    root: { props: { title: "Pagina" } },
    content: [
      { type: "BrandHero", props: { sub: "Sub A", id: "BrandHero-aaa1111", headline: "Origineel" } },
    ],
  };
  const current: DiffMergeData = {
    root: { props: { title: "Pagina" } },
    content: [
      { type: "BrandHero", props: { id: "BrandHero-aaa1111", headline: "Origineel", sub: "Sub A" } },
    ],
  };
  const incoming: DiffMergeData = {
    root: { props: { title: "Pagina" } },
    content: [
      { type: "BrandHero", props: { id: "BrandHero-new1", headline: "Ververst", sub: "Sub A" } },
    ],
  };
  const result = threeWayMergePuckData({ base, current, incoming });
  assert(
    "key-volgorde-verschil telt niet als user-edit",
    result.merged.content[0]?.props.headline === "Ververst",
  );
  assert("geen conflicts door key-volgorde", result.conflicts.length === 0);
}

group("three-way merge — root-props");
{
  const base = seedTree();
  const current = seedTree();
  current.root = { props: { title: "Door gebruiker hernoemd" } };
  const incoming = freshTree();
  incoming.root = { props: { title: "Vers uit de mapper" } };
  const result = threeWayMergePuckData({ base, current, incoming });
  assert("bewerkte root blijft behouden", result.merged.root?.props?.title === "Door gebruiker hernoemd");
}
{
  const base = seedTree();
  const current = seedTree();
  const incoming = freshTree();
  incoming.root = { props: { title: "Vers uit de mapper" } };
  const result = threeWayMergePuckData({ base, current, incoming });
  assert("onbewerkte root wordt ververst", result.merged.root?.props?.title === "Vers uit de mapper");
}

group("three-way merge — geen input-mutatie");
{
  const base = seedTree();
  const current = seedTree();
  current.content[0] = section("BrandHero", "BrandHero-aaa1111", { headline: "Bewerkt", sub: "Sub A" });
  const incoming = freshTree({ heroProps: { headline: "Anders" }, extraSection: { type: "Testimonial", props: { quote: "X" } } });
  const baseSnap = JSON.stringify(base);
  const currentSnap = JSON.stringify(current);
  const incomingSnap = JSON.stringify(incoming);
  const result = threeWayMergePuckData({ base, current, incoming });
  // Muteer de output agressief — inputs mogen onaangetast blijven (deep clones).
  result.merged.content.forEach((c) => { (c.props as Record<string, unknown>).headline = "GEMUTEERD"; });
  result.conflicts.forEach((c) => { (c.theirs.props as Record<string, unknown>).headline = "GEMUTEERD"; });
  if (result.merged.root?.props) (result.merged.root.props as Record<string, unknown>).title = "GEMUTEERD";
  assert("base niet gemuteerd", JSON.stringify(base) === baseSnap);
  assert("current niet gemuteerd", JSON.stringify(current) === currentSnap);
  assert("incoming niet gemuteerd", JSON.stringify(incoming) === incomingSnap);
}

group("three-way merge — defensive guards");
{
  const incoming = freshTree();
  const r1 = threeWayMergePuckData({ base: null, current: null, incoming });
  assert("null base + current → merged = incoming-shape", r1.merged.content.length === incoming.content.length);
  assert("null base + current → geen conflicts", r1.conflicts.length === 0);
  const r2 = threeWayMergePuckData({ base: undefined, current: undefined, incoming: undefined });
  assert("alles null/undefined → lege merged zonder crash", r2.merged.content.length === 0);
  const r3 = threeWayMergePuckData({
    base: { content: undefined as never, root: {} } as never,
    current: seedTree(),
    incoming,
  });
  assert("base met undefined content → no crash", Array.isArray(r3.merged.content));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
