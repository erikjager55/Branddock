# WS2 — Drift Measurement Generation

Research-tooling voor de Voice Fingerprinting WS2 drift-meting per protocol
v0.4 (commit `de882ce`). Genereert 12 long-form pieces voor blind rating door
2 onafhankelijke raters.

**Doel**: meet of conditie B (BVD + A.1-A.4 propagation-fixes) drift in
3K-woord output reduceert t.o.v. conditie A (production BVD baseline).

**Pre-registratie**: scope vastgelegd in
`docs/voice-fingerprinting-ws2-protocol.md` — wijzigingen aan rubriek of
branch-criteria vereisen versiebump per §7.2.

---

## Workflow (3 stappen)

### Stap 1 — Topics invullen

Kopieer template, vul 6 topics in (3 merken × 2 content_types):

```bash
cp scripts/voice-research/ws2/topics-template.csv \
   scripts/voice-research/ws2/topics.csv

# Edit topics.csv — replace REPLACE: placeholders with real topics.
# Each (merk, content_type) pair gets ONE topic; same topic used for
# both conditions (so we measure voice-injectie, not topic-variantie).
```

Topics moeten:
- Zelfgekozen onderwerpen binnen merk-domein
- Plausibel maar NIET eerder gepubliceerd (anders herhaalt het model bestaand corpus)
- Geschikt voor 3K-woord uitwerking
- Per (merk, content_type) één topic, gebruikt voor beide condities

`topics.csv` is **gitignored** — kan campagne-strategische context bevatten.

### Stap 2 — Sealed A/B-toewijzing genereren

```bash
DATABASE_URL="..." npx tsx scripts/voice-research/ws2/generate-ab-assignment.ts
```

Output: `output/sealed/ab-assignment.csv` met random V1/V2 → BASELINE/PROPAGATION
mapping per rij. Seed gelogd in CSV header voor audit trail.

**SEALED — Niet delen met raters**. Onthult de conditie-mapping. Bewaar
backup veilig (de seed kan re-rollen voorkomen als er iets misgaat).

Optioneel: `--seed=12345` voor deterministische reproductie.

### Stap 3 — Batch generatie

```bash
set -a && source .env.local && set +a
DATABASE_URL="..." npx tsx scripts/voice-research/ws2/run-batch.ts
```

Voor elke rij in sealed CSV:
- Genereert v1 output via generate-piece.ts (mapped to BASELINE of PROPAGATION cond)
- Genereert v2 output (de andere conditie)
- Schrijft SEALED versie (full frontmatter, audit trail)
- Schrijft BLIND versie (frontmatter zonder condition info, voor raters)

Optionele flags:
- `--dry-run` — print plan, run niet
- `--skip-existing` — sla rijen over waar sealed file al bestaat (re-runnable)

Cost: ~$0.60 totaal (12 × ~$0.05 per Opus 4.7 generation, 4K-8K output tokens).
Time: 12-36 min sequentieel afhankelijk van Opus throughput.

---

## Output-structuur

```
scripts/voice-research/ws2/output/
├── sealed/                                ← gitignored, full audit trail
│   ├── ab-assignment.csv                  ← sealed condition mapping
│   ├── linfi/
│   │   ├── case-study__BASELINE.md        ← full frontmatter incl. condition
│   │   ├── case-study__PROPAGATION.md
│   │   ├── blog-post__BASELINE.md
│   │   └── blog-post__PROPAGATION.md
│   ├── nobox/
│   │   └── ...
│   └── wra-juristen/
│       └── ...
└── blind/                                 ← gitignored, what raters see
    ├── linfi/
    │   ├── case-study__v1.md              ← stripped frontmatter, blind_label
    │   ├── case-study__v2.md
    │   ├── blog-post__v1.md
    │   └── blog-post__v2.md
    ├── nobox/
    │   └── ...
    └── wra-juristen/
        └── ...
```

**Sealed**: full frontmatter incl. `condition: A|B`, `voice_meta`, `usage_*` etc.
**Blind**: `condition` + alle `voice_meta`/usage fields gestript, `blind_label: v1|v2`
toegevoegd. Raters zien blind/.

---

## Naar raters sturen

Voor elke rater apart:

1. **Send**: `output/blind/{merk}/case-study__v1.md` + `output/blind/{merk}/case-study__v2.md`
   + `output/blind/{merk}/blog-post__v1.md` + `output/blind/{merk}/blog-post__v2.md`
   = 4 stukken per merk, 12 totaal.
2. **Send**: rubric per protocol §1 (kan extracted worden uit
   `docs/voice-fingerprinting-ws2-protocol.md`).
3. **Bevestiging**: rater rate elke stuk volgens rubric §1.1-1.5, geeft per-stuk
   1-5 scores op 4 dimensies + tekst-citaat onderbouwing.
4. **Receive**: ingevulde scoring sheets per rater per stuk.

**Belangrijk**: raters zien geen ab-assignment.csv, geen sealed/ output,
geen condition-info in de markdown frontmatter. Beide v1 en v2 zien er
identiek uit qua metadata.

---

## Na scoring

Scoring sheets per rater + per stuk → input voor `compute-ws2-results.ts`
(TODO, separate session). Die kruistabelleert blind labels met sealed CSV
om scores aan condities te attribueren, draait κ-checks, weegt 60/40 of
50/50 per merk per protocol §3.4, en evalueert tegen branch-criteria §5.

---

## Bestanden

```
scripts/voice-research/ws2/
├── README.md                       ← dit document
├── topics-template.csv             ← template (committed for reference)
├── topics.csv                      ← actual topics (gitignored)
├── generate-ab-assignment.ts       ← stap 2: sealed CSV generator
├── run-batch.ts                    ← stap 3: 12-generation orchestrator
└── output/                         ← gitignored
    ├── sealed/                     ← audit trail
    └── blind/                      ← rater inputs
```

---

## Open punten vóór live run

- [ ] User vult topics.csv met 6 echte topics (3 merken × 2 types)
- [ ] User bevestigt rater-bezetting per merk (eigenaar of agency-strateeg + 60/40 vs 50/50 weging) — zie protocol §8.2
- [ ] Run dry-run om plan te valideren voordat $0.60 + 30 min in echte generatie gaat
- [ ] Bewaar sealed CSV backup (off-repo) — re-rolling betekent nieuwe random toewijzing

---

## Naamgeving — disambiguatie

Twee verschillende A/B-axes in deze workstream:

| Axe | Labels | Bron | Zichtbaar voor |
|---|---|---|---|
| Protocol-conditie | BASELINE / PROPAGATION | Pre-registratie §4 | Audit + analyse, NIET raters |
| Blind label | v1 / v2 | Sealed CSV random | Raters tijdens scoring |
| Generate-piece CLI flag | --condition=A / --condition=B | Internal mapping (A=BASELINE, B=PROPAGATION) | Implementatie-detail |

Naming bewust gekozen om conflict tussen "condition A" (protocol) en "blind A"
(rater) te vermijden. V1/V2 zijn arbitraire symbolen; pas na scoring onthul
je via sealed CSV welke versie BASELINE was en welke PROPAGATION.
