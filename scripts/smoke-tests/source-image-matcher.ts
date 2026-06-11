// Smoke — lp-library-first-matching: slot-matcher beslislogica (pure, met
// geïnjecteerde search/fileExists).
//
// Run: npx tsx scripts/smoke-tests/source-image-matcher.ts
// Dynamic import ná env-load: de matcher trekt transitief prisma binnen,
// die DATABASE_URL al bij module-load eist (import-hoisting).
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });
import type { SimilarMediaAsset, FindSimilarOptions } from "../../src/lib/media/embedding-search";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}
function group(title: string) { console.log(`\n── ${title}`); }

const asset = (id: string, similarity: number, tags: string[] = [], fileUrl = `/uploads/${id}.png`): SimilarMediaAsset => ({
  id, name: id, fileUrl, thumbnailUrl: null, aiDescription: null,
  similarity, mediaType: "IMAGE", category: "LIFESTYLE", aiTags: tags,
});

async function main() {
  const { matchLibraryImagesToSlots, EXCLUDED_MATCH_CATEGORIES, LIBRARY_MATCH_THRESHOLD } = await import(
    "../../src/lib/landing-pages/source-image-matcher"
  );
  group("Greedy unieke toewijzing — sterkste paar wint, asset max 1 slot");
  {
    const search = async (_ws: string, query: string) => {
      if (query.includes("wasserij")) return [asset("a", 0.80), asset("b", 0.60)];
      if (query.includes("bezorgbus")) return [asset("a", 0.70), asset("c", 0.65)];
      return [];
    };
    const res = await matchLibraryImagesToSlots("ws", [
      { index: 0, query: "industriële wasserij met linnen" },
      { index: 1, query: "elektrische bezorgbus in straat" },
    ], { search, fileExists: () => true });
    assert("slot 0 → asset a (0.80 wint)", res.assignments.get(0)?.assetId === "a");
    assert("slot 1 → asset c (a is al gebruikt)", res.assignments.get(1)?.assetId === "c");
    assert("geen uncovered", res.uncovered.length === 0);
  }

  group("PHOTO_REAL-boost wint bij vrijwel gelijke similarity");
  {
    const search = async () => [asset("ai-img", 0.62), asset("real-img", 0.60, ["auth:PHOTO_REAL"])];
    const res = await matchLibraryImagesToSlots("ws", [{ index: 0, query: "stapel servetten op tafel" }], { search, fileExists: () => true });
    assert("echte foto wint door boost", res.assignments.get(0)?.assetId === "real-img");
    assert("similarity blijft ongeboost in het resultaat", res.assignments.get(0)?.similarity === 0.60);
  }

  group("Orphaned files worden overgeslagen");
  {
    const search = async () => [asset("orphan", 0.85), asset("ok", 0.70)];
    const res = await matchLibraryImagesToSlots("ws", [{ index: 0, query: "stapel servetten op tafel" }], {
      search,
      fileExists: (url) => !url.includes("orphan"),
    });
    assert("orphan geskipt → ok wint", res.assignments.get(0)?.assetId === "ok");
    assert("diagnostiek meldt orphan", res.diagnostics.some((d) => d.includes("orphaned")));
  }

  group("Cold-start / fouten degraderen zonder throw");
  {
    const res = await matchLibraryImagesToSlots("ws", [
      { index: 0, query: "stapel servetten op tafel" },
      { index: 1, query: "kort" },
    ], { search: async () => { throw new Error("geen embeddings"); }, fileExists: () => true });
    assert("alles uncovered", res.uncovered.length === 2 && res.assignments.size === 0);
    assert("diagnostiek voor fout én korte query", res.diagnostics.length === 2);
  }

  group("Categorie-exclusie + drempel reizen mee naar de search");
  {
    let seen: FindSimilarOptions | undefined;
    const search = async (_w: string, _q: string, o?: FindSimilarOptions) => { seen = o; return []; };
    await matchLibraryImagesToSlots("ws", [{ index: 0, query: "stapel servetten op tafel" }], { search, fileExists: () => true });
    assert("excludeCategories doorgegeven", JSON.stringify(seen?.excludeCategories) === JSON.stringify(EXCLUDED_MATCH_CATEGORIES));
    assert("default-drempel doorgegeven", seen?.threshold === LIBRARY_MATCH_THRESHOLD);
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
