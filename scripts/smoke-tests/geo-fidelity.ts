/**
 * Smoke-test — GEO/SEO Fase 3: F-VAL GEO-pijler. Verifieert (1) dat computeGeoScore
 * deterministisch is en goede vs slechte GEO-content onderscheidt, en (2) de
 * compute-gating in computeFidelityScore: zonder GEO-doel wordt de pijler NIET
 * berekend (pillars.geo === null) en is de composiet identiek; met GEO-doel doet
 * de pijler mee. De pijler is judge-vrij → geen LLM-calls (skipJudge houdt de
 * judge-pijler uit zodat de smoke offline draait).
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/geo-fidelity.ts
 */
import { computeGeoScore } from '../../src/lib/brand-fidelity/geo-fidelity-scorer';
import { computeFidelityScore, type FidelityCompositionInput } from '../../src/lib/brand-fidelity/composition-engine';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

const GOOD = [
  'GEO optimaliseert content zodat AI-engines passages zelfstandig citeren. Het vult SEO aan.',
  '',
  'Volgens Gartner groeit AI-zoekgebruik met 40% in 2026. Die verschuiving raakt B2B-content direct.',
  '',
  'TL;DR: GEO draait om citeerbaarheid. Antwoord-eerst schrijven wint.',
  '',
  'Wat is het verschil met SEO? GEO mikt op citaties in AI-antwoorden, SEO op ranking in zoekresultaten.',
  '',
  '- Antwoord-eerst per sectie',
  '- Cijfers met bron',
].join('\n');

const BAD = [
  'In dit artikel gaan we het uitgebreid hebben over een heleboel dingen die allemaal samenhangen ' +
    'en die we hier in een lange inleiding eerst even goed willen kaderen voordat we tot de kern komen ' +
    'want het is belangrijk om de context te schetsen en daarom nemen we hier ruim de tijd voor en blijven ' +
    'we doorschrijven zonder echt iets concreets te zeggen over het onderwerp zelf.',
  'Dit is belangrijk. Het hangt samen. Ze bepalen het. Het zorgt ervoor. Dit volgt daaruit.',
].join('\n\n');

console.log('── computeGeoScore (deterministisch) ──');
const good = computeGeoScore(GOOD);
const bad = computeGeoScore(BAD);
assert('goede content > slechte content', good.score > bad.score, `good=${good.score} bad=${bad.score}`);
assert('deterministisch (zelfde input → zelfde score)', computeGeoScore(GOOD).score === good.score);
assert('score 0-100', good.score >= 0 && good.score <= 100 && bad.score >= 0 && bad.score <= 100);
assert('5 signalen aanwezig', Object.keys(good.signals).length === 5);
assert('goede content: structuredCues hoog (TL;DR+vraag+lijst)', good.signals.structuredCues >= 66);
assert('slechte content: entityClarity laag (vage openers)', bad.signals.entityClarity < 60);
assert('slechte content levert findings', bad.findings.length > 0);
assert('lege content → score 0', computeGeoScore('').score === 0);

async function main(): Promise<void> {
  console.log('\n── review-fix: citedStats telt geen kale cijfers ──');
const bareStat = computeGeoScore('Onze omzet steeg met 30% dit kwartaal. De groei was 2x.');
const citedStat = computeGeoScore('Volgens Gartner steeg AI-zoekgebruik met 40% (Gartner 2026).');
assert('kaal percentage → niet als geciteerd geteld', bareStat.signals.citedStats < 60, `got ${bareStat.signals.citedStats}`);
assert('echte bron-attributie → wel geciteerd', citedStat.signals.citedStats >= 60, `got ${citedStat.signals.citedStats}`);

console.log('\n── review-fix: NL lidwoord vs voornaamwoord (entityClarity) ──');
const determiner = computeGeoScore('Het platform analyseert merkdata grondig. De pijplijn verwerkt elke bron zorgvuldig. Onze aanpak schaalt mee.');
const pronoun = computeGeoScore('Het is belangrijk. Dit zorgt ervoor. Dat betekent veel. Deze blijft staan.');
assert('NL lidwoord-zinnen ("Het platform...") niet gestraft', determiner.signals.entityClarity >= 90, `got ${determiner.signals.entityClarity}`);
assert('NL voornaamwoord-zinnen ("Het is...") wél gestraft', pronoun.signals.entityClarity < 60, `got ${pronoun.signals.entityClarity}`);

console.log('\n── compute-gating in computeFidelityScore (offline, skipJudge) ──');
  const baseInput: FidelityCompositionInput = {
    contentText: GOOD,
    workspaceId: 'smoke-nonexistent-workspace',
    brandName: 'Acme',
    brandVoiceSummary: '',
    personality: null,
    generatorProvider: 'anthropic',
    targetWordCount: 300,
    skipJudge: true,
  };

  const off = await computeFidelityScore(baseInput);
  const on = await computeFidelityScore({ ...baseInput, geoOptimizationActive: true });

  assert('GEO uit → pillars.geo === null', off.pillars.geo === null);
  assert('GEO uit → scorerVersion zonder geo-suffix', !off.scorerVersion.includes('geo-fidelity'));
  assert('GEO aan → pillars.geo !== null', on.pillars.geo !== null);
  assert('GEO aan → geo-score matcht computeGeoScore', on.pillars.geo?.score === good.score);
  assert('GEO aan → geo-pijler heeft weight > 0', (on.pillars.geo?.weight ?? 0) > 0);
  assert('GEO aan → scorerVersion bevat geo-suffix', on.scorerVersion.includes('geo-fidelity'));
  assert('GEO uit → 3-pijler weights sommeren ~1', Math.abs(off.pillars.style.weight + (off.pillars.judge?.weight ?? 0) + off.pillars.rules.weight - 1) < 0.001);
  assert('GEO aan → 4 weights sommeren ~1', Math.abs(on.pillars.style.weight + (on.pillars.judge?.weight ?? 0) + on.pillars.rules.weight + (on.pillars.geo?.weight ?? 0) - 1) < 0.001);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
