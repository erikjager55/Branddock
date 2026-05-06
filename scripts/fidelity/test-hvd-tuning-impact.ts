/**
 * scripts/fidelity/test-hvd-tuning-impact.ts
 *
 * A/B test: oude HVD (long avoid-lijsten) vs nieuwe HVD (sharp + short).
 * Genereert dezelfde brief twee keer met Claude Sonnet — eerste met old HVD,
 * tweede met new HVD — en vergelijkt detector + composition scores.
 *
 * Verwachting: nieuwe HVD geeft betere pijler 3 (anti-tell) scores.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-hvd-tuning-impact.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

// ─── OLD HVD (zoals het was vóór commit 18f0cd4) ───
const OLD_HVD = `## HUMAN VOICE DIRECTIVE — schrijf zoals een ervaren mens

Een mens schrijft niet perfect-symmetrisch en niet uniform-positief. Echte tekst heeft ritme, blinde vlekken, en mening. Volg deze instructies voorrang boven generieke "duidelijk en behulpzaam"-impulsen.

### NEVER do these

**Woorden** (vermijd, óók in vertaling):
- NL: naadloos, baanbrekend, robuust, veelzijdig, multifunctioneel, intuïtief, doordacht, toonaangevend, vooraanstaand, impactvol, betekenisvol, boeiend, fascinerend, indrukwekkend, ongeëvenaard, verheugd
- Buzzword-werkwoorden: optimaliseren, transformeren, faciliteren, ontsluiten, verrijken, verdiepen, omarmen, benutten
- Lege adverbia: effectively, efficiently, successfully, strategically, consistently, seamlessly

**Zinsstructuren**:
- "Het is niet zomaar X, het is Y" — overgebruikt, voorspelbaar
- "Niet omdat..., maar omdat..." — vermijd deze constructie helemaal
- "Of je nu X bent of Y" — telegram-zin uit AI-handboek
- Drieslag wanneer asymmetrisch ("snel, efficiënt en schaalbaar") — kies twee, of vier; drie ruikt automatisch
- Aankondigings-zinnen: "Laten we eens kijken naar...", "In dit artikel verkennen we..." — schrap deze meta-laag, lever direct inhoud
- Slotformules "Kortom," / "Tot slot," gevolgd door herhaling — laat het slot zelf werk doen

**Interpunctie**:
- Em-dash (—) alleen als paar rond een tussenzin — niet trailing aan einde van een zin (Engels gebruik in Nederlandse tekst)
- Geen smart quotes (" " ' ') — gebruik rechte aanhalingstekens
- Geen Oxford-komma in Nederlands ("schrijven, lezen, en kijken")
- Vermijd "X: een korte punchline." — die dubbele-punt-pingpong is een AI-tic

**Toon**:
- Geen disclaimer-mantra's ("Het is goed te beseffen dat...", "Het is belangrijk om...") — schrijf het gewoon
- Geen overdreven beleefdheid ("Absoluut!", "Wat een goede vraag!") in zakelijke tekst
- Geen AI-overtuigingsmarkers ("zonder dat het ook maar een millimeter afweek") — mensen overdrijven niet zo absoluut

**Inhoud**:
- Geen vage referenties ("in talloze projecten", "diverse onderzoeken tonen aan") — concrete naam, jaar, situatie of niets
- Geen verzonnen statistieken met decimalen om geloofwaardig te lijken — ronde getallen of geen getal

**Opbouw**:
- Geen schoolse alinea's van uniforme lengte met identieke H-structuur
- Geen bullet-list waar prozavorm logischer was, vooral niet drie items per stuk
- Geen perfect symmetrische structuur (intro + 3 hoofdpunten + conclusie) voor een complex onderwerp

### DO these instead

- Begin met een vraag, observatie of concrete situatie — niet met "In een wereld die..."
- Variëer zinslengte — kort dan lang dan kort, niet uniform-medium
- Eén concrete persoon, plek, getal of citaat per ~300 woorden — anders is het lucht
- Schrijf in werkwoorden, niet in nominalisaties ("we besluiten" niet "het besluit wordt genomen")
- Laat een mening doorklinken — niet "evenwichtig", wel onderbouwd
- Houd één spanningsboog vast: vraag → spanning → antwoord. Niet vijf parallelle structuurtjes`;

const BB_BRIEF = {
  objective:
    'Differentiëren van purpose-washers via operationeel bewijs; brand managers overtuigen dat purpose alleen werkt met meetbare cases en data.',
  keyMessage:
    'Purpose zonder bewijs is greenwashing. Branddock helpt merken hun strategie operationeel te maken met merkbare resultaten.',
  toneDirection:
    'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch.',
  callToAction: 'Plan een gesprek over hoe Branddock jouw merkstrategie operationeel maakt.',
};

const BRAND_VOICE_BLOCK = `## BRAND VOICE — Better Brands

**Brand voice**: Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch. Anti-greenwashing — purpose moet operationeel bewijs hebben.

**Wordsworthy**: positieve verandering, duurzaam, impact, onderscheidend, betekenisgedreven, authentiek, transformatie, toekomstbestendig, maatschappelijke relevantie, merkvoorkeur

**Personality traits**: Visionary, Authentic, Strategic, Inspiring`;

function buildUserPrompt(): string {
  return [
    `Schrijf een blog-post (1500-2500 woorden) over de volgende briefing:`,
    ``,
    `**Doel**: ${BB_BRIEF.objective}`,
    `**Kernboodschap**: ${BB_BRIEF.keyMessage}`,
    `**Tone**: ${BB_BRIEF.toneDirection}`,
    `**CTA**: ${BB_BRIEF.callToAction}`,
    ``,
    `Structuur: introductie + 3-4 secties met ## koppen + conclusie + CTA.`,
    `Output: alleen de blog-post in markdown, geen preamble.`,
  ].join('\n');
}

async function generateWithHVD(hvd: string, label: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

  const systemPrompt = [BRAND_VOICE_BLOCK, '', hvd].join('\n');
  const userPrompt = buildUserPrompt();

  console.log(`  Generating with ${label} HVD…`);
  const t0 = Date.now();
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const finalMessage = await stream.finalMessage();
  const block = finalMessage.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text.trim() : '';
  console.log(`  ✓ Generated ${text.split(/\s+/).filter(Boolean).length} woorden in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return text;
}

async function main() {
  const { detectAiTells } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { computeFidelityScore } = await import('../../src/lib/brand-fidelity/composition-engine');
  const { buildHumanVoiceDirective } = await import('../../src/lib/studio/human-voice-directive');
  const { prisma } = await import('../../src/lib/prisma');

  const NEW_HVD = buildHumanVoiceDirective({ language: 'nl' });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('HVD A/B Test: old (verbose) vs new (sharp)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Old HVD: ${OLD_HVD.length} chars (~${Math.round(OLD_HVD.length / 4)} tokens)`);
  console.log(`  New HVD: ${NEW_HVD.length} chars (~${Math.round(NEW_HVD.length / 4)} tokens)`);

  // Fetch BrandPersonality voor symmetric scoring
  const bp = await prisma.brandAsset.findFirst({
    where: { workspaceId: 'cmnomsobx009q44msn0gpw7vb', frameworkType: 'BRAND_PERSONALITY' },
    select: { frameworkData: true },
  });
  const bpData = (bp?.frameworkData ?? null) as Record<string, unknown> | null;
  const personality = bpData
    ? {
        wordsWeUse: Array.isArray(bpData.wordsWeUse)
          ? (bpData.wordsWeUse as unknown[]).filter((w): w is string => typeof w === 'string')
          : [],
        personalityTraits: Array.isArray(bpData.personalityTraits)
          ? (bpData.personalityTraits as Array<Record<string, unknown>>).map((t) => ({
              name: typeof t.name === 'string' ? t.name : undefined,
              description: typeof t.description === 'string' ? t.description : undefined,
            }))
          : [],
      }
    : null;

  // ─── A: Generate met OLD HVD ──
  console.log('\n→ Run A: OLD HVD (verbose, ~500 tokens)');
  const oldOutput = await generateWithHVD(OLD_HVD, 'OLD');

  console.log('\n→ Run B: NEW HVD (sharp, ~250 tokens)');
  const newOutput = await generateWithHVD(NEW_HVD, 'NEW');

  // ─── Detector quick scan ──
  console.log('\n━━━ Detector A/B ━━━');
  const oldTell = detectAiTells(oldOutput);
  const newTell = detectAiTells(newOutput);
  console.log(`  OLD HVD: ${oldTell.verdict.padEnd(15)} pos ${oldTell.humanBaselinePosition}/100  score ${oldTell.scorePer1000Words.toFixed(0)}/1k  unique tells ${oldTell.uniqueTellCount}`);
  console.log(`  NEW HVD: ${newTell.verdict.padEnd(15)} pos ${newTell.humanBaselinePosition}/100  score ${newTell.scorePer1000Words.toFixed(0)}/1k  unique tells ${newTell.uniqueTellCount}`);
  const tellDelta = oldTell.scorePer1000Words - newTell.scorePer1000Words;
  console.log(`  Δ tell density: ${tellDelta > 0 ? '+' : ''}${tellDelta.toFixed(1)}/1k (${tellDelta > 0 ? 'NEW beter' : 'OLD beter'})`);

  // ─── Top tells per output ──
  console.log('\n  Top tells in OLD HVD output:');
  for (const t of oldTell.detected.slice(0, 5)) {
    console.log(`    ${String(t.count).padStart(3)}× ${t.definition.id}`);
  }
  console.log('  Top tells in NEW HVD output:');
  for (const t of newTell.detected.slice(0, 5)) {
    console.log(`    ${String(t.count).padStart(3)}× ${t.definition.id}`);
  }

  // ─── Composition score A/B ──
  console.log('\n━━━ Composition score A/B (kan ~40s duren — 2 G-Eval calls) ━━━');
  const sharedScoring = {
    workspaceId: 'cmnomsobx009q44msn0gpw7vb',
    brandName: 'Better Brands',
    brandVoiceSummary:
      'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch. Anti-greenwashing.',
    personality,
    generatorProvider: 'anthropic' as const,
    targetWordCount: 2000,
  };

  console.log('  Scoring OLD…');
  const oldScore = await computeFidelityScore({ ...sharedScoring, contentText: oldOutput });
  console.log('  Scoring NEW…');
  const newScore = await computeFidelityScore({ ...sharedScoring, contentText: newOutput });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Resultaat');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('              Composite  Verdict          Pos  P1  P2  P3');
  const fmt = (label: string, s: typeof oldScore) =>
    `${label.padEnd(13)} ${String(s.compositeScore).padStart(9)}  ${s.detectorVerdict.padEnd(15)}  ${String(s.humanBaselinePosition).padStart(3)}  ${String(s.pillars.style.weight > 0 ? s.pillars.style.score : '-').padStart(2)}  ${String(s.pillars.judge?.score ?? '-').padStart(2)}  ${String(s.pillars.rules.score).padStart(2)}`;
  console.log(fmt('OLD HVD', oldScore));
  console.log(fmt('NEW HVD', newScore));

  const compositeDelta = newScore.compositeScore - oldScore.compositeScore;
  const pillar3Delta = newScore.pillars.rules.score - oldScore.pillars.rules.score;
  console.log('');
  console.log(`Δ composite:    ${compositeDelta > 0 ? '+' : ''}${compositeDelta} punten ${compositeDelta > 0 ? '(NEW beter)' : compositeDelta < 0 ? '(OLD beter)' : '(gelijk)'}`);
  console.log(`Δ pijler 3:     ${pillar3Delta > 0 ? '+' : ''}${pillar3Delta} punten ${pillar3Delta > 0 ? '(NEW beter)' : pillar3Delta < 0 ? '(OLD beter)' : '(gelijk)'}`);
  console.log(`Position drop:  OLD ${oldScore.humanBaselinePosition} → NEW ${newScore.humanBaselinePosition} (${oldScore.humanBaselinePosition - newScore.humanBaselinePosition >= 0 ? 'menselijker' : 'meer AI'})`);

  if (pillar3Delta >= 3) {
    console.log('\n✓ HVD tuning werkt — pijler 3 verbeterd');
  } else if (pillar3Delta >= 0) {
    console.log('\n△ HVD tuning neutraal of marginale verbetering — verschil binnen ruis');
  } else {
    console.log('\n✗ HVD tuning maakte het slechter — overweeg revert');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
