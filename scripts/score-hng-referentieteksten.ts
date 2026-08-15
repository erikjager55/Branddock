/**
 * Hertest Het Nieuwe Golfen — scoort de drie referentieteksten uit het
 * Branddock_HNG_Invulboek (bijlage) tegen de HNG-workspace na het invullen
 * van merkfundament + voice guide + F-VAL-regels (scripts/fill-nieuwe-golfen.ts).
 *
 * Nulmeting (vóór invoer): A=89 · B=69 · C=79 (C ten onrechte geslaagd).
 * Verwacht ná invoer: A blijft rond 89, B blijft afgekeurd, C zakt ruim onder
 * de drempel van 75 met concrete findings op "laatste kans", "mis dit niet",
 * "gegarandeerd" en "gezelligheid".
 *
 * Herberekent eerst de voiceguide-centroid wanneer die ontbreekt (writingSamples
 * zijn net vervangen), draait daarna de volledige F-VAL composition (pijler 1+2+3).
 *
 * Run: npx tsx scripts/score-hng-referentieteksten.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Env loading (.env.local, zelfde patroon als scripts/fidelity/*) ───
const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(kon ${envPath} niet lezen: ${(err as Error).message})`);
}
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://erikjager:@localhost:5432/branddock';

const WORKSPACE_ID = process.env.HNG_WORKSPACE_ID ?? 'cmpp4dxgc001w4ums9sttpg62';
const DREMPEL = 75;

// ─── De drie referentieteksten (bijlage invulboek 14-08-2026) ───

const tekstA = `Stop met proberen, start met begrijpen.

De traditionele golfwereld houdt jou klein. Dertien clubs, dertien swings, tegenstrijdige adviezen en een plan dat er nooit kwam. Je slaat de ene ronde 82, de andere 96 — en je weet niet waarom.

Het Nieuwe Golfen draait dat om. Eén principe: impact eerst. Eén ontwikkelpad: basis, ontwikkel, prestatie. Je ontdekt waar je staat, je weet wat je volgende stap is, en je traint doelgericht in een community die je vooruit helpt.

Geen vage theorie. Geen losse lessen. Een systeem dat werkt.

Ontdek jouw niveau. Geen verplichtingen, geen verkoopgesprek.`;

const tekstB = `LAATSTE KANS! Nog maar 3 plekken vrij — de teller loopt af!

Wij bij Golf Academy Nederland geloven in de kracht van traditie. Al 25 jaar leren onze PGA-pro's je de klassieke swing, stap voor stap, met aandacht voor elk van je dertien clubs. Onze filosofie: geduld en herhaling.

Wij bieden een uitgebreid lespakket met wekelijkse privélessen, videoanalyse en een persoonlijk oefenschema. Onze missie is om iedere golfer, van jong tot oud, met plezier en gezelligheid de baan op te krijgen.

Mis dit niet! Schrijf je vandaag nog in en profiteer van 40% korting. Gegarandeerd succes of geld terug!`;

const tekstC = `LAATSTE KANS! Nog maar 3 plekken vrij voor Het Nieuwe Golfen — de teller loopt af!

Bij Het Nieuwe Golfen geloven wij in de kracht van de Impact First methodiek. Onze ontwikkelladder brengt je van basis naar prestatie, met een bewezen systeem dat werkt. Wij bieden een uitgebreid lespakket met videoanalyse en een persoonlijk oefenschema.

Onze missie is om iedere golfer, van jong tot oud, met plezier en gezelligheid de baan op te krijgen. Birdy time!

Mis dit niet! Schrijf je vandaag nog in en profiteer van 40% korting. Gegarandeerd succes of geld terug!`;

// ─── Main ───────────────────────────────────────────

const EMBED_MODEL = 'text-embedding-3-small';
const SAMPLE_CHAR_LIMIT = 8000;

async function ensureCentroid(): Promise<void> {
  const { prisma } = await import('../src/lib/prisma');
  const { Prisma } = await import('@prisma/client');

  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, writingSamples: true, centroidComputedAt: true },
  });
  if (!voiceguide) throw new Error('Geen BrandVoiceguide voor HNG — draai eerst fill-nieuwe-golfen.ts');
  if (voiceguide.centroidComputedAt) {
    console.log(`Centroid bestaat al (${voiceguide.centroidComputedAt.toISOString()}) — overslaan.`);
    return;
  }

  const raw = voiceguide.writingSamples as unknown;
  const samples = Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
    : [];
  if (samples.length === 0) throw new Error('Geen writingSamples — kan centroid niet berekenen');

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddings: number[][] = [];
  for (const sample of samples) {
    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: sample.slice(0, SAMPLE_CHAR_LIMIT),
    });
    const vector = response.data[0]?.embedding;
    if (vector) embeddings.push(vector);
  }
  const dim = embeddings[0].length;
  const centroid = new Array<number>(dim).fill(0);
  for (const vec of embeddings) {
    for (let i = 0; i < dim; i++) centroid[i] += vec[i];
  }
  for (let i = 0; i < dim; i++) centroid[i] /= embeddings.length;

  const vectorLiteral = `[${centroid.join(',')}]`;
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "BrandVoiceguide" SET "centroidEmbedding" = ${vectorLiteral}::vector, "centroidComputedAt" = NOW() WHERE "id" = ${voiceguide.id}`,
  );
  console.log(`Centroid berekend uit ${embeddings.length} writing-samples (${dim} dimensies).`);
}

async function main() {
  console.log('⛳ HNG-hertest — drie referentieteksten\n');
  await ensureCentroid();

  const { runFidelityForExternalContent } = await import('../src/lib/brand-fidelity/external-content-runner');

  const teksten = [
    { label: 'Tekst A — on-brand (nulmeting 89)', text: tekstA, verwacht: 'blijft rond 89, boven drempel' },
    { label: 'Tekst B — off-brand zonder merknaam (nulmeting 69)', text: tekstB, verwacht: 'blijft onder drempel' },
    { label: 'Tekst C — off-brand mét merktermen (nulmeting 79, ten onrechte geslaagd)', text: tekstC, verwacht: 'zakt ruim onder 75' },
  ];

  for (const { label, text, verwacht } of teksten) {
    console.log(`\n════ ${label} ════`);
    const { result, findingsCount } = await runFidelityForExternalContent({
      workspaceId: WORKSPACE_ID,
      contentText: text,
      sourceType: 'paste',
      language: 'nl',
      runJudge: true,
    });

    const oordeel = result.compositeScore >= DREMPEL ? 'GESLAAGD' : 'AFGEKEURD';
    console.log(`Composite: ${result.compositeScore} → ${oordeel} (drempel ${DREMPEL}; verwacht: ${verwacht})`);
    console.log(
      `Pijlers — stijl: ${result.pillar1EffectiveScore}` +
        ` · judge: ${result.pillars.judge ? result.pillars.judge.score : 'n.v.t.'}` +
        ` · regels/anti-tell: ${result.pillars.rules.score}`,
    );
    const rules = result.pillars.rules.result.rules;
    console.log(
      `Rule-engine: ${rules.rulesEvaluated} regels geëvalueerd, ${rules.violations.length} violations (ruleScore ${rules.ruleScore}), ${findingsCount} findings gepersisteerd`,
    );
    const uniekePatterns = Array.from(new Set(rules.violations.map((v) => `${v.severity}:${v.snippet || v.pattern}`)));
    for (const p of uniekePatterns.slice(0, 12)) console.log(`  • ${p}`);
    if (uniekePatterns.length > 12) console.log(`  … +${uniekePatterns.length - 12} meer`);
  }

  console.log('\nKlaar. Reviews zijn terug te zien in Brand Alignment (externe content).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
