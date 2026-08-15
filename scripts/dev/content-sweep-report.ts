/**
 * Bouwt het eindrapport van de Playwright content-sweep: voegt de UI-uitkomsten
 * (`content-sweep-outcomes.json`) samen met wat er daadwerkelijk in de database
 * landde. De UI-uitkomst alleen is niet genoeg — een leeg variantenpaneel kan
 * "pipeline gefaald" óf "niets geprobeerd" betekenen, en dat verschil zie je
 * pas in de job- en componenttabellen.
 *
 * Run:
 *   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock_test" \
 *     npx tsx scripts/dev/content-sweep-report.ts
 */
import fs from 'fs';
import path from 'path';
import { prisma } from '../../src/lib/prisma';

const CAMPAIGN_ID = 'e2e-campaign-napking-001';
const OUTCOMES = path.resolve(process.cwd(), 'content-sweep-outcomes.json');

interface Outcome {
  typeId: string;
  name: string;
  category: string;
  requiredFields: string[];
  filledFields: string[];
  created: boolean;
  generateClicked: boolean;
  result: string;
  detail: string;
  elapsedMs: number;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUTCOMES)) throw new Error(`Geen ${OUTCOMES} — draai eerst de sweep.`);
  const outcomes = JSON.parse(fs.readFileSync(OUTCOMES, 'utf8')) as Outcome[];

  const deliverables = await prisma.deliverable.findMany({
    where: { campaignId: CAMPAIGN_ID },
    select: {
      id: true,
      contentType: true,
      status: true,
      qualityScore: true,
      // Web-page-types schrijven hun content NIET naar componenten maar naar
      // settings.structuredVariantOptions (de tweede content-keten uit ADR
      // 2026-07-17). Alleen componenten tellen markeert die types ten onrechte
      // als mislukt — dat gebeurde hier met product-page.
      settings: true,
      components: { select: { generatedContent: true, imageUrl: true, videoUrl: true } },
    },
  });
  const byType = new Map(deliverables.map((d) => [d.contentType, d]));

  const seoJobs = await prisma.seoGenerationJob.findMany({
    where: { workspaceId: { not: undefined } },
    select: { contentType: true, status: true, currentStep: true, totalSteps: true, errors: true },
  });
  const seoByType = new Map(seoJobs.map((j) => [j.contentType, j]));

  // F-VAL hangt níet aan de Deliverable (`qualityScore` blijft NULL) maar aan
  // ContentFidelityScore → ContentVersion → deliverableId.
  const versions = await prisma.contentVersion.findMany({
    where: { deliverableId: { in: deliverables.map((d) => d.id) } },
    select: { id: true, deliverableId: true },
  });
  const versionToDeliverable = new Map(versions.map((v) => [v.id, v.deliverableId]));
  const scores = await prisma.contentFidelityScore.findMany({
    where: { contentVersionId: { in: versions.map((v) => v.id) } },
    select: { contentVersionId: true, compositeScore: true, thresholdMet: true },
  });
  const scoresByDeliverable = new Map<string, number[]>();
  for (const s of scores) {
    const dId = versionToDeliverable.get(s.contentVersionId);
    if (!dId || typeof s.compositeScore !== 'number') continue;
    scoresByDeliverable.set(dId, [...(scoresByDeliverable.get(dId) ?? []), s.compositeScore]);
  }

  // Advertentietypes lopen niet door de F-VAL-scorer maar door een eigen
  // ad-scorer — zonder deze fallback lijkt "geen score" ten onrechte een gat.
  const adScores = await prisma.adQualityScore.findMany({
    where: { deliverableId: { in: deliverables.map((d) => d.id) } },
    select: { deliverableId: true, overallScore: true },
  });
  const adByDeliverable = new Map<string, number[]>();
  for (const a of adScores) {
    if (typeof a.overallScore !== 'number') continue;
    adByDeliverable.set(a.deliverableId, [...(adByDeliverable.get(a.deliverableId) ?? []), a.overallScore]);
  }

  const rows = outcomes.map((o) => {
    const d = byType.get(o.typeId);
    const comps = d?.components ?? [];
    const seo = seoByType.get(o.typeId);
    const fvals = d ? (scoresByDeliverable.get(d.id) ?? []) : [];
    const ads = d ? (adByDeliverable.get(d.id) ?? []) : [];
    const pick = fvals.length > 0 ? fvals : ads;
    const fvalAvg =
      pick.length > 0 ? Math.round((pick.reduce((a, b) => a + b, 0) / pick.length) * 10) / 10 : null;
    const scorer = fvals.length > 0 ? 'F-VAL' : ads.length > 0 ? 'ad' : '-';

    // Tweede keten: structuredVariantOptions (web-page-types).
    const settings = (d?.settings ?? null) as { structuredVariantOptions?: unknown } | null;
    const variants = Array.isArray(settings?.structuredVariantOptions)
      ? (settings.structuredVariantOptions as unknown[])
      : [];
    const varCount = variants.length;
    const varTekens = varCount > 0 ? JSON.stringify(variants).length : 0;
    return {
      type: o.typeId,
      categorie: o.category,
      uitkomst: o.result,
      sec: Math.round(o.elapsedMs / 1000),
      comps: comps.length,
      tekens: comps.reduce((a, c) => a + (c.generatedContent ?? '').length, 0) + varTekens,
      tekst: comps.filter((c) => (c.generatedContent ?? '').trim().length > 0).length + varCount,
      beeld: comps.filter((c) => c.imageUrl).length,
      fval: fvalAvg,
      scorer,
      seo: seo ? `${seo.status} ${seo.currentStep}/${seo.totalSteps}` : '-',
      detail: o.detail,
      seoFout: seo?.errors ? truncate(JSON.stringify(seo.errors), 220) : '',
    };
  });

  // ── Tabel ────────────────────────────────────────────────
  const head = ['TYPE', 'UITKOMST', 'SEC', 'COMP', 'TEKST', 'TEKENS', 'BEELD', 'SCORE', 'VIA', 'SEO-JOB'];
  const widths = [22, 24, 5, 6, 6, 8, 6, 7, 7, 18];
  console.log('\n' + head.map((h, i) => h.padEnd(widths[i])).join(''));
  console.log('─'.repeat(widths.reduce((a, b) => a + b, 0)));
  for (const r of rows) {
    console.log(
      [
        r.type,
        r.uitkomst,
        String(r.sec),
        String(r.comps),
        String(r.tekst),
        String(r.tekens),
        String(r.beeld),
        r.fval === null ? '-' : String(r.fval),
        r.scorer,
        r.seo,
      ]
        .map((c, i) => String(c).padEnd(widths[i]))
        .join(''),
    );
  }

  // ── Samenvatting ─────────────────────────────────────────
  const tally = new Map<string, number>();
  for (const r of rows) tally.set(r.uitkomst, (tally.get(r.uitkomst) ?? 0) + 1);
  console.log(`\nTotaal gemeten: ${rows.length}`);
  for (const [k, v] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(26)} ${v}`);
  }
  const withText = rows.filter((r) => r.tekst > 0).length;
  console.log(`\nTypes met échte tekstoutput in de DB: ${withText}/${rows.length}`);

  // ── Fouten uitgeschreven ─────────────────────────────────
  const failed = rows.filter((r) => r.uitkomst !== 'VARIANTS_READY');
  if (failed.length > 0) {
    console.log('\n─── Faaldetails ───');
    for (const r of failed) {
      console.log(`\n${r.type} (${r.uitkomst}, ${r.sec}s, seo-job: ${r.seo})`);
      if (r.detail) console.log(`  ui : ${r.detail}`);
      if (r.seoFout) console.log(`  seo: ${r.seoFout}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
