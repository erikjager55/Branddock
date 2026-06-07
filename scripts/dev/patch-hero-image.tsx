import { prisma } from "../../src/lib/prisma";
const DELIV = process.env.DELIV!;
const URL = process.env.URL!;
async function main() {
  const d = await prisma.deliverable.findUnique({ where: { id: DELIV }, select: { settings: true } });
  if (!d) { console.log("no deliverable"); return; }
  const settings = (d.settings ?? {}) as Record<string, unknown>;
  const pd = settings.puckData as { content?: Array<Record<string, unknown>> } | undefined;
  if (!pd?.content) { console.log("no puckData"); return; }
  let patched = false;
  for (const c of pd.content) {
    if (c.type === "BrandHero") {
      (c.props as Record<string, unknown>).heroVisualUrl = URL;
      patched = true;
    }
  }
  // ook structuredVariant.hero.heroVisualUrl bijwerken zodat een rebuild 'm behoudt
  const sv = settings.structuredVariant as { hero?: Record<string, unknown> } | undefined;
  if (sv?.hero) sv.hero.heroVisualUrl = URL;
  if (!patched) { console.log("no BrandHero"); return; }
  await prisma.deliverable.update({ where: { id: DELIV }, data: { settings: settings as never } });
  console.log("PATCHED hero + structuredVariant →", URL);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
