/**
 * Smoke-test voor brand-language detection logic. Werkt direct met de
 * franc-min lib + helper-mapping; geen DB nodig — alleen pure-fn tests
 * tegen fixture-text.
 *
 * Run: npx tsx scripts/smoke-tests/brand-language-detect.ts
 */
import { franc } from 'franc-min';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

// ─── Fixtures ───────────────────────────────────────────

const NL_LINFI = `Bij LINFI maken we hoogwaardige elektrische vloerluiken voor woningen en buitensituaties. Wie een vloerluik op maat nodig heeft, is op zoek naar precisiewerk. Alle luiken worden namelijk tot op de millimeter nauwkeurig gemeten en gemaakt in onze werkplaats. Ons perfectionisme is wat ons onderscheidt en maakt dat wij vloerluiken op maat leveren van de hoogste kwaliteit. Volledig naar wens en met de hand gemaakt, gaan onze vloerluiken gegarandeerd een leven lang mee.`;

const NL_FLUFF = `In het hart van elke onderneming staat de fundamentele behoefte om zich te onderscheiden in een wereld vol concurrentie. Bij ons staat de klant altijd centraal en streven we ernaar om elke dag het beste van onszelf te geven. Onze kernwaarden zijn passie, kwaliteit en innovatie. Wij geloven dat door samenwerking en synergie de mooiste resultaten worden bereikt.`;

const EN_CORPORATE = `Our company is committed to delivering innovative solutions that drive business transformation. We leverage cutting-edge technology to empower our clients and create sustainable growth. Through strategic partnerships and customer-centric approaches, we redefine industry standards. Our team of dedicated professionals brings decades of expertise to every project, ensuring quality outcomes and lasting value.`;

const EN_TECH = `The software architecture follows a modular monolith pattern with clear domain boundaries. Each service exposes a well-defined API and communicates through async message queues. Database transactions use optimistic locking to prevent race conditions in high-concurrency scenarios. Continuous integration validates every commit against unit, integration, and end-to-end test suites.`;

const DE_TECH = `Unsere Plattform bietet umfassende Lösungen für die digitale Transformation moderner Unternehmen. Mit innovativen Technologien und maßgeschneiderten Dienstleistungen unterstützen wir Kunden weltweit dabei, ihre Geschäftsprozesse effizienter zu gestalten. Unser Team aus erfahrenen Experten arbeitet kontinuierlich daran, die Erwartungen unserer Kunden zu übertreffen.`;

const FR_CORPORATE = `Notre entreprise s'engage à fournir des solutions innovantes qui transforment les entreprises modernes. Grâce à notre expertise approfondie et notre approche centrée sur le client, nous accompagnons nos partenaires dans leur croissance durable. Notre équipe dévouée combine excellence technique et créativité pour offrir des résultats exceptionnels à chaque projet entrepris.`;

// ─── Tests ──────────────────────────────────────────────

console.log('\n=== 1. NL fixtures ===\n');
{
  const lang = franc(NL_LINFI, { minLength: 50 });
  assert('LINFI-style NL voice-description → nld', lang === 'nld', `got ${lang}`);
}
{
  const lang = franc(NL_FLUFF, { minLength: 50 });
  assert('NL fluff-text (passie/kwaliteit/innovatie) → nld', lang === 'nld', `got ${lang}`);
}

console.log('\n=== 2. EN fixtures ===\n');
{
  const lang = franc(EN_CORPORATE, { minLength: 50 });
  assert('EN corporate buzzword text → eng', lang === 'eng', `got ${lang}`);
}
{
  const lang = franc(EN_TECH, { minLength: 50 });
  assert('EN technical text → eng', lang === 'eng', `got ${lang}`);
}

console.log('\n=== 3. DE fixture ===\n');
{
  const lang = franc(DE_TECH, { minLength: 50 });
  assert('DE corporate text → deu', lang === 'deu', `got ${lang}`);
}

console.log('\n=== 4. FR fixture ===\n');
{
  const lang = franc(FR_CORPORATE, { minLength: 50 });
  assert('FR corporate text → fra', lang === 'fra', `got ${lang}`);
}

console.log('\n=== 5. Short / empty edge-cases ===\n');
{
  const lang = franc('', { minLength: 50 });
  assert('empty input → und (undetermined)', lang === 'und', `got ${lang}`);
}
{
  const lang = franc('hello', { minLength: 50 });
  assert('too-short input → und', lang === 'und', `got ${lang}`);
}

console.log('\n=== 6. Mixed-language samples ===\n');
{
  // Dominantly NL met enkele EN-leenwoorden — primary language moet NL blijven
  const mixed = NL_LINFI + ' We use a scalable approach with modern technology stack.';
  const lang = franc(mixed, { minLength: 50 });
  assert('NL+enkele EN leenwoorden → primary nld', lang === 'nld', `got ${lang}`);
}
{
  // 50/50 NL/EN — kan onvoorspelbaar zijn; we accepteren elke detection
  // zolang het niet `und` is (er IS signaal, alleen welk is ambig)
  const mixed = NL_LINFI + '\n\n' + EN_CORPORATE;
  const lang = franc(mixed, { minLength: 50 });
  assert('50/50 NL/EN mix → niet und (er is signaal)', lang !== 'und', `got ${lang}`);
}

console.log('\n=== 7. Code/non-language input ===\n');
{
  const codeBlob = `function foo() { const x = 42; return x * 2; } class Bar { constructor(y) { this.y = y; } }`;
  const lang = franc(codeBlob, { minLength: 50 });
  // Code-blocks worden vaak gedetecteerd als "und" of een random taal — beide acceptable
  assert(
    'code-blob → detection runs without crash',
    typeof lang === 'string',
    `got ${typeof lang}`,
  );
}

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
