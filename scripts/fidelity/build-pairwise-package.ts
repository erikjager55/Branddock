/**
 * scripts/fidelity/build-pairwise-package.ts
 *
 * Bouwt klant-vriendelijke pairwise eval-pakketten — één map per merk.
 *
 * Voor de meeste merken: AI-A vs AI-B (drift-meting tussen condities A en B).
 * Voor merken met humanReplacement-config: AI-A vs ECHT menselijk artikel
 * (demo-belofte test: kan onze AI tippen aan menselijk werk?).
 *
 * Per paar wordt random gekozen welke "Versie A" of "Versie B" wordt — bias-mitigatie.
 *
 * Output structuur:
 *   research/fidelity-week1/pairwise-package/
 *   ├── wra-juristen/        (AI-A vs AI-B, drift-meting)
 *   ├── linfi/               (AI-A vs AI-B, drift-meting)
 *   ├── better-brands/       (AI-A vs HUMAN, demo-belofte test)
 *   └── key-mapping.json     (CONFIDENTIAL)
 *
 * Run:
 *   npx tsx scripts/fidelity/build-pairwise-package.ts
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
} catch {
  // ignore
}

// ─── Brand metadata + content-type config ────────────────

type ContentType = 'case-study' | 'thought-leadership';

interface PairConfig {
  /** Onze A en B — relative paths in research/fidelity-week1/ */
  ourA: string; // bv. outputs/wra-juristen-case-study-A.md
  ourB: string; // bv. outputs/wra-juristen-case-study-B.md OF external-corpus/bb-article-XXX.md
  ourBKind: 'AI' | 'HUMAN'; // type van de tweede zijde
  /** Beschrijving van onze A (voor klant-eval-form context) */
  descriptionA: string;
  /** Beschrijving van onze B (voor klant-eval-form context) */
  descriptionB: string;
}

interface BrandMeta {
  slug: string;
  displayName: string;
  /** Wat dit merk test: drift A→B (BVD-format) of AI→HUMAN (demo-belofte) */
  testMode: 'DRIFT' | 'AI_VS_HUMAN';
  pairs: Record<ContentType, PairConfig>;
}

const BRANDS: BrandMeta[] = [
  {
    slug: 'wra-juristen',
    displayName: 'WRA Juristen',
    testMode: 'DRIFT',
    pairs: {
      'case-study': {
        ourA: 'outputs/wra-juristen-case-study-A.md',
        ourB: 'outputs/wra-juristen-case-study-B.md',
        ourBKind: 'AI',
        descriptionA:
          'Een case study over een MKB-ondernemer die maandenlang uitstelde voordat hij een jurist belde over een arbeidsrechtelijk conflict met een productieleider.',
        descriptionB:
          'Een case study over een MKB-ondernemer die maandenlang uitstelde voordat hij een jurist belde over een arbeidsrechtelijk conflict met een productieleider.',
      },
      'thought-leadership': {
        ourA: 'outputs/wra-juristen-thought-leadership-A.md',
        ourB: 'outputs/wra-juristen-thought-leadership-B.md',
        ourBKind: 'AI',
        descriptionA:
          'Een opinieartikel over een aanstaande wetswijziging en wat MKB-ondernemers daarmee moeten doen — geschreven voor LinkedIn of een branche-nieuwsbrief.',
        descriptionB:
          'Een opinieartikel over een aanstaande wetswijziging en wat MKB-ondernemers daarmee moeten doen — geschreven voor LinkedIn of een branche-nieuwsbrief.',
      },
    },
  },
  {
    slug: 'linfi',
    displayName: 'Linfi',
    testMode: 'DRIFT',
    pairs: {
      'case-study': {
        ourA: 'outputs/linfi-case-study-A.md',
        ourB: 'outputs/linfi-case-study-B.md',
        ourBKind: 'AI',
        descriptionA:
          'Een case study over een luxe villa-project waar Linfi een onzichtbaar maatwerk-vloerluik leverde voor een doorlopende eikenhouten visgraatvloer.',
        descriptionB:
          'Een case study over een luxe villa-project waar Linfi een onzichtbaar maatwerk-vloerluik leverde voor een doorlopende eikenhouten visgraatvloer.',
      },
      'thought-leadership': {
        ourA: 'outputs/linfi-thought-leadership-A.md',
        ourB: 'outputs/linfi-thought-leadership-B.md',
        ourBKind: 'AI',
        descriptionA:
          'Een opinieartikel over toegankelijkheid in luxe wonen — waarom standaard floor access niet meer past in hoogwaardige interieurontwerpen.',
        descriptionB:
          'Een opinieartikel over toegankelijkheid in luxe wonen — waarom standaard floor access niet meer past in hoogwaardige interieurontwerpen.',
      },
    },
  },
  {
    slug: 'better-brands',
    displayName: 'Better Brands',
    testMode: 'AI_VS_HUMAN',
    pairs: {
      'case-study': {
        ourA: 'outputs/better-brands-case-study-A.md',
        ourB: 'external-corpus/bb-article-2021-5-powermerken.md',
        ourBKind: 'HUMAN',
        descriptionA:
          'Een case study over een purpose-driven onderneming (B-Corp in herbruikbare verpakkingen) die opviel door generieke positionering — en hoe een herpositioneringtraject conversie en marges veranderde.',
        descriptionB:
          'Een artikel over vijf voorbeeldmerken (Patagonia, Ocean Cleanup, Unilever, Hutten, Kipster) die laten zien wat een purpose statement kan betekenen voor een organisatie.',
      },
      'thought-leadership': {
        ourA: 'outputs/better-brands-thought-leadership-A.md',
        ourB: 'external-corpus/bb-article-2020-sales-naar-purpose.md',
        ourBKind: 'HUMAN',
        descriptionA:
          'Een opinieartikel over purpose-driven branding in 2026 — voorbij de hype, met drie observaties uit de praktijk en een korte zelftest voor lezers.',
        descriptionB:
          'Een opinieartikel over de transitie van een sales-georiënteerd naar een purpose-gedreven merk — met theorie van Gromark/Stengel en het Nuon→Vattenfall voorbeeld.',
      },
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────

function randomBool(): boolean {
  return Math.random() < 0.5;
}

// ─── Eval form template ────────────────────────────────

function evalFormTemplate(brand: BrandMeta): string {
  const isMixedTopics = brand.testMode === 'AI_VS_HUMAN';
  const note = isMixedTopics
    ? `\n> ⚠️ **Belangrijk**: de twee versies in elke vergelijking gaan over verschillende onderwerpen. Focus alstublieft op **stem, toon en stijl** — niet op het onderwerp zelf.\n`
    : '';

  return `# Korte evaluatie — ${brand.displayName}

Hi! Bedankt voor je tijd.

Hieronder staan **twee korte vergelijkingen**. Voor elke vergelijking:
- Lees Versie A en Versie B
- Kies welke meer voelt als ${brand.displayName}
- Schrijf één zin over wat het verschil maakt

Geen cijfers, geen rangschikking. Gewoon je gevoel als kenner van het merk.
${note}
**Tijd**: ~20 minuten in totaal.

---

## Vergelijking 1 — Case study

**Versie A** (📄 \`01-case-study-A.md\`): ${brand.pairs['case-study'].descriptionA}

**Versie B** (📄 \`01-case-study-B.md\`): ${brand.pairs['case-study'].descriptionB}

**Welke versie voelt meer als ${brand.displayName}?**

- [ ] Versie A
- [ ] Versie B
- [ ] Geen voorkeur — beide passen ongeveer even goed

**Wat maakt het verschil? (één zin)**

> _Schrijf hier..._

---

## Vergelijking 2 — Thought leadership

**Versie A** (📄 \`02-thought-leadership-A.md\`): ${brand.pairs['thought-leadership'].descriptionA}

**Versie B** (📄 \`02-thought-leadership-B.md\`): ${brand.pairs['thought-leadership'].descriptionB}

**Welke versie voelt meer als ${brand.displayName}?**

- [ ] Versie A
- [ ] Versie B
- [ ] Geen voorkeur — beide passen ongeveer even goed

**Wat maakt het verschil? (één zin)**

> _Schrijf hier..._

---

## Optionele open vraag

Als je iets wil meegeven dat niet in de twee vergelijkingen paste — bijvoorbeeld een passage die je opviel, of een algemene reactie — schrijf het hier:

> _..._

---

Stuur dit ingevulde document terug naar **erik@betterbrands.nl** als markdown of als geplakte tekst in een e-mail.

Dank je wel!
`;
}

// ─── README ───────────────────────────────────────────

function readmeTemplate(brand: BrandMeta): string {
  return `# ${brand.displayName} — Brand-fidelity check

Bedankt voor je hulp bij dit korte onderzoek.

## Wat zit er in dit pakket

- 4 markdown-bestanden met content (\`01-…-A.md\`, \`01-…-B.md\`, \`02-…-A.md\`, \`02-…-B.md\`)
- \`eval-form.md\` — invul-template (open in een markdown-editor of plak de inhoud in Word/Notion/Google Docs)

## Wat je gaat doen

1. Open \`eval-form.md\`
2. Lees per vergelijking de twee versies
3. Vink je voorkeur aan en schrijf één zin
4. Stuur het ingevulde document terug

## Wat je niet hoeft te doen

- Geen cijfers geven
- Geen rangschikking maken
- Geen achtergrond-onderzoek doen

## Tijd

~20 minuten in totaal.

## Vragen

Mail of bel Erik (erik@betterbrands.nl).

Dank!
`;
}

// ─── Main ───────────────────────────────────────────

async function main() {
  const { PATHS } = await import('./config');

  const pkgRoot = join(PATHS.outputRoot, 'pairwise-package');
  mkdirSync(pkgRoot, { recursive: true });

  const mapping: Array<{
    brandSlug: string;
    contentType: ContentType;
    testMode: 'DRIFT' | 'AI_VS_HUMAN';
    presented: { versieA: { source: string; kind: 'A_OURS' | 'B_OURS' | 'HUMAN' }; versieB: { source: string; kind: 'A_OURS' | 'B_OURS' | 'HUMAN' } };
    pairLabel: string;
  }> = [];

  for (const brand of BRANDS) {
    const brandDir = join(pkgRoot, brand.slug);
    mkdirSync(brandDir, { recursive: true });

    const types: Array<{ type: ContentType; pairLabel: string }> = [
      { type: 'case-study', pairLabel: '01-case-study' },
      { type: 'thought-leadership', pairLabel: '02-thought-leadership' },
    ];

    for (const { type, pairLabel } of types) {
      const cfg = brand.pairs[type];
      const sourceA = join(PATHS.outputRoot, cfg.ourA);
      const sourceB = join(PATHS.outputRoot, cfg.ourB);
      if (!existsSync(sourceA) || !existsSync(sourceB)) {
        console.warn(`  ⚠ Missing source for ${brand.slug}-${type}, skipping`);
        console.warn(`    sourceA exists: ${existsSync(sourceA)} (${sourceA})`);
        console.warn(`    sourceB exists: ${existsSync(sourceB)} (${sourceB})`);
        continue;
      }

      // Random shuffle: 50% kans dat onze A → "Versie A" of "Versie B"
      const swap = randomBool();

      const destA = join(brandDir, `${pairLabel}-A.md`);
      const destB = join(brandDir, `${pairLabel}-B.md`);
      copyFileSync(swap ? sourceB : sourceA, destA);
      copyFileSync(swap ? sourceA : sourceB, destB);

      const aKind: 'A_OURS' | 'B_OURS' | 'HUMAN' = swap
        ? cfg.ourBKind === 'HUMAN' ? 'HUMAN' : 'B_OURS'
        : 'A_OURS';
      const bKind: 'A_OURS' | 'B_OURS' | 'HUMAN' = swap
        ? 'A_OURS'
        : cfg.ourBKind === 'HUMAN' ? 'HUMAN' : 'B_OURS';

      mapping.push({
        brandSlug: brand.slug,
        contentType: type,
        testMode: brand.testMode,
        presented: {
          versieA: { source: swap ? cfg.ourB : cfg.ourA, kind: aKind },
          versieB: { source: swap ? cfg.ourA : cfg.ourB, kind: bKind },
        },
        pairLabel,
      });

      console.log(
        `  ${brand.slug}/${pairLabel}: A=${aKind}, B=${bKind}${swap ? ' (SWAPPED)' : ''}`,
      );
    }

    writeFileSync(join(brandDir, 'eval-form.md'), evalFormTemplate(brand), 'utf8');
    writeFileSync(join(brandDir, 'README.md'), readmeTemplate(brand), 'utf8');
    console.log(`  ✓ ${brand.slug}/ klaar (testMode=${brand.testMode})`);
  }

  // Confidential mapping
  writeFileSync(
    join(pkgRoot, 'key-mapping.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mapping,
        explanation:
          'For each brand × content-type pair: presented.versieA.kind and versieB.kind tell whether the displayed version is our condition A (A_OURS), our condition B (B_OURS), or a human-written reference article (HUMAN). testMode indicates whether this pair tests drift A→B (DRIFT) or AI→Human comparison (AI_VS_HUMAN).',
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log(`✓ Pairwise package klaar: ${pkgRoot}`);
  console.log('');
  for (const brand of BRANDS) {
    console.log(`  ${brand.slug}/  →  ${brand.displayName} (${brand.testMode})`);
  }
  console.log('');
  console.log(`⚠ key-mapping.json is at ROOT — do NOT include in distributions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
