/**
 * Golden-set dry-run LP feature-images (Fase 5, audit 2026-06-10-lp-feature-
 * image-diversity) — maakt prompt-kwaliteit meetbaar i.p.v. gevoelsmatig.
 *
 * Per workspace: pakt de meest recente landing-page deliverable met een
 * structuredVariant en rapporteert per feature-slot de SERVER-SIDE gebouwde
 * prompt (brief-pad of fallback) + de gesaneerde stijl-laag. Asserteert:
 * geen scrape-compositie/subjects-staart in feature-prompts, sibling-
 * differentiatie aanwezig, per-slot unieke seeds.
 *
 * Geen generatie-kosten: dit is een prompt-dry-run (--generate is bewust
 * NIET geïmplementeerd; de echte acceptatie-run doet de route zelf).
 *
 * Run: npx tsx scripts/dev/lp-feature-image-dryrun.ts [workspaceNaamBevat ...]
 *      (default: Napking Zwarthout "Better brands")
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`    PASS ${label}`); }
  else { fail++; console.error(`    FAIL ${label}`); }
}

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const { assembleCanvasContext } = await import("../../src/lib/ai/canvas-context");
  const { buildFeatureVisualPrompts } = await import("../../src/lib/landing-pages/feature-visual-prompts");

  const filters = process.argv.slice(2);
  const names = filters.length > 0 ? filters : ["Napking", "Zwarthout", "Better brands"];

  for (const name of names) {
    const workspace = await prisma.workspace.findFirst({
      where: { name: { contains: name, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!workspace) { console.log(`\n── ${name}: workspace niet gevonden, overgeslagen`); continue; }

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        campaign: { workspaceId: workspace.id },
        contentType: { contains: "landing" },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, settings: true },
    });
    const settings = (deliverable?.settings ?? null) as {
      structuredVariant?: {
        hero?: { headline?: string };
        features?: { items?: Array<{ heading?: string; body?: string; imageBrief?: unknown }> };
      };
    } | null;
    const items = settings?.structuredVariant?.features?.items;
    console.log(`\n── ${workspace.name} — deliverable: ${deliverable?.title ?? "GEEN"} (${deliverable?.id ?? "-"})`);
    if (!deliverable || !Array.isArray(items) || items.length === 0) {
      console.log("    geen structuredVariant met features — cold-start-pad (alleen verse generatie), overgeslagen");
      continue;
    }

    const stack = await assembleCanvasContext(deliverable.id, workspace.id);
    const slots = items.map((it, i) => ({
      index: i,
      heading: it.heading ?? "feature",
      body: it.body ?? "",
      imageBrief: (it.imageBrief ?? null) as never,
    }));
    const built = buildFeatureVisualPrompts(
      slots,
      settings?.structuredVariant?.hero?.headline ?? "",
      { brand: stack.brand, brandTokens: stack.brandTokens },
    );

    built.forEach((b) => {
      const briefed = Boolean(slots[built.indexOf(b)]?.imageBrief);
      console.log(`  slot ${b.index} (${briefed ? "brief" : "fallback"}; seed ${b.seed}):`);
      console.log(`    ${b.prompt.slice(0, 220)}…`);
    });

    assert("geen scrape-compositie in enige feature-prompt", built.every((b) => !/arms crossed|gekruiste armen/i.test(b.prompt)));
    assert("geen gedeelde Subjects-staart", built.every((b) => !b.prompt.includes("Subjects:")));
    assert("sibling-differentiatie aanwezig (bij >1 slot)", built.length < 2 || built.every((b) => b.prompt.includes("in one page set")));
    assert("unieke seeds", new Set(built.map((b) => b.seed)).size === built.length);
    const firstWords = built.map((b) => b.prompt.slice(0, 60));
    assert("prompts onderling verschillend (eerste 60 chars)", new Set(firstWords).size === built.length);
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  const { prisma: p } = await import("../../src/lib/prisma");
  await p.$disconnect();
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Dry-run faalde:", err instanceof Error ? err.message : err);
  process.exit(1);
});
