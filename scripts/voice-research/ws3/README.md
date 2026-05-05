# WS3 — Disagreement-meting (mStyleDistance vs quality-scorer Voice-dim)

Research-tooling voor de Voice Fingerprinting WS3 disagreement-meting tussen
twee voice-scoring mechanismen: de productie quality-scorer Voice-dimensie
(25% weight in `quality-scorer.ts`) en mStyleDistance embedding-afstand
(open-source style-only embeddings).

**Pre-registratie**: scope vastgelegd in
`docs/voice-fingerprinting-ws2-protocol.md` v0.3 (commit `9db58cc`,
amendment van v0.2 commit `446f92b`).

**v0.3 amendment** (2026-05-05): WS3 stap 2 toonde score-distributie met
slechts 3 unieke waarden (72/78/88) over 16 pieces. Bij thin distribution
+ n=16 is Pearson r overgevoelig voor ties. Kwalitatieve disagreement-case
inspectie wordt **primair signaal**, Pearson + Spearman ρ secundair als
directional indicators (niet threshold-based). Zie protocol §6.4.

---

## Doel

Meten of mStyleDistance additieve informatie geeft t.o.v. de bestaande
quality-scorer Voice-dimensie. Concreet: bereken Pearson r tussen beide
scoring-mechanismen op een pool van ~40 long-form klantcontent stukken.

**Per v0.3** (2026-05-05): primair signaal = kwalitatieve disagreement-case
inspectie door 2 raters. Correlation-statistieken zijn secundair en
directional, niet threshold-based.

| Spearman ρ | Directional richting (kwalitatieve inspectie blijft leidend) |
|---|---|
| **> 0.7** | Sterk gecorreleerd → kwalitatief waarschijnlijk redundantie |
| **0.4 – 0.7** | Matig — kwalitatieve inspectie volledig leidend |
| **< 0.4** | Zwakke correlatie → kwalitatief waarschijnlijk additief signaal |

---

## Pipeline architectuur

```
┌────────────────────────┐
│ extract-corpus.ts      │  ← Pull ~40 long-form stukken uit DB (TypeScript)
│ (scenario B pool)      │     LINFI 27 + 13 uit andere Branddock-workspaces
└──────────┬─────────────┘     Output: corpus.jsonl
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────────┐ ┌───────────────────────┐
│ score-voice │ │ compute-embeddings.py │  ← mStyleDistance via HuggingFace
│ -quality.ts │ │ (Python, niet in repo)│     Splits LINFI 14 corpus / 13 test
│             │ │                       │     Andere workspaces: pure stylistic distance
│ Output:     │ │ Output:               │
│ voice-scores│ │ embeddings.json +     │
│ .json       │ │ centroid.json         │
└──────┬──────┘ └───────────┬───────────┘
       │                    │
       └────────┬───────────┘
                ▼
       ┌─────────────────────────┐
       │ compute-disagreement.ts │  ← Pearson r + per-stuk delta
       │                         │     Output: disagreement-result.json
       └─────────────────────────┘
```

**Status** (2026-05-05):
- ✅ `extract-corpus.ts` — DONE (commit `1fefc44`, n=16 pieces)
- ✅ `score-voice-quality.ts` — DONE (commit `fce7bb6`, voice scores 72/78/88)
- ✅ `compute-embeddings.py` — implemented, ready to run
- ✅ `compute-disagreement.ts` — implemented, runs after step 3 produces embeddings.json

---

## Stap 1: Corpus extractie (DONE)

```bash
tsx scripts/voice-research/ws3/extract-corpus.ts
# Optional flags:
#   --min-words=500       Filter pieces with fewer than N words
#   --workspaces=a,b,c    Override workspace pool
#   --output=PATH         Override output location
```

**Output**: `scripts/voice-research/ws3/output/corpus.jsonl` (one JSON object per line):

```json
{
  "id": "cmojr89ns00572vc9ezi9w8zv",
  "workspaceSlug": "linfi",
  "isBrandAnchor": true,
  "contentType": "blog-post",
  "title": "Blog Post",
  "content": "...",
  "wordCount": 1247,
  "approvalStatus": "DRAFT",
  ...
}
```

**Inclusion criteria** (per protocol §6.3):
- contentType in long-form set (whitepaper, case-study, blog-post, ebook, pillar-page, research-paper, resource-guide, feature-article, thought-leadership)
- Concatenated `isSelected = true` DeliverableComponents have ≥ `min-words` (default 500)
- approvalStatus IGNORED (relaxed per protocol §6.3 — DRAFT/IN_PROGRESS/APPROVED/PUBLISHED all included)

**LINFI brand-anchor flag**: `isBrandAnchor = true` only for LINFI workspace pieces.
Used in step 3 to split LINFI items into centroid-training (~14) + test-set (~13).

---

## Stap 2: Quality-scorer Voice-dim scoring (DONE)

```bash
set -a && source .env.local && set +a
DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
  npx tsx scripts/voice-research/ws3/score-voice-quality.ts
```

Optionele flag: `--limit=N` voor smoke test op N items.

Resultaat (16/16 scored, 0 failed, ~4:39 elapsed, ~$0.30):
- Voice scores 72/78/88 (3 unieke waarden — getriggerde v0.3 amendment)
- LINFI mean 79.8 (n=12), Napking mean 88.0 (n=4)
- Output: `output/voice-scores.json`

**Design decision** vastgelegd in script header: `deliverableTypeId=undefined`
om default 4-dim scorer te forceren. Type-specifieke scorers gebruiken
verschillende dimension names per content-type — dat zou cross-piece
comparison breken. Default scorer garandeert consistente "Brand Voice
Adherence" dimensie over alle 16 pieces.

---

## Stap 3: mStyleDistance embeddings (READY TO RUN)

### Modelkeuze (verified)

`StyleDistance/mstyledistance` op HuggingFace bevestigd beschikbaar
(2026-05-05): sentence-transformers, base model `FacebookAI/xlm-roberta-base`,
multilingual incl. Nederlands. License MIT.

**Language caveat**: Dutch was niet in de 9 expliciete training-talen van
mStyleDistance (paper: huggingface.co/papers/2502.15168). xlm-roberta-base
ondersteunt Nederlands wel via pretrain. Style-feature transfer naar
Nederlands is **niet expliciet gevalideerd** door de paper-auteurs.
Implicatie: behandel absolute similarity-waarden voorzichtig; relatieve
ordering (wat Pearson/Spearman gebruiken) is betrouwbaarder.

### Setup (eenmalig per machine)

```bash
cd scripts/voice-research/ws3
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Eerste activatie van het script downloadt ~1.1GB modelgewichten naar
HuggingFace cache (`~/.cache/huggingface/`).

### Run

```bash
cd scripts/voice-research/ws3
source .venv/bin/activate
python compute-embeddings.py
```

Optionele flags:
- `--corpus=PATH` override corpus path (default: `output/corpus.jsonl`)
- `--output=PATH` override output path (default: `output/embeddings.json`)

### Methodology — leave-one-out (afwijking van protocol §6.2)

Protocol §6.2 specificeerde train/test split 14/13 voor LINFI 27. Realiteit
is LINFI=12 pieces. Bij n=12 is leave-one-out methodologisch standaard:

- **LINFI items**: per item, centroid = mean(11 andere LINFI items). Geeft
  ongebiased similarity, alle 12 pieces blijven in correlation calc.
- **Non-LINFI items**: pooled centroid uit alle 12 LINFI items. Cross-brand
  reference points, bias is fine.

Verschil met protocol-original is een implementatie-refinement bij kleinere
n; geen versiebump nodig per §7.3.

### Output

`output/embeddings.json` met per-item:
- `embedding` (768-dim vector voor re-analyse)
- `similarity_to_linfi_centroid` (cosine, 0-1)
- `similarity_method` (leave-one-out vs pooled-centroid)

Plus aggregate stats per groep (LINFI loo / non-LINFI / overall).

---

## Stap 4: Pearson + Spearman + qualitative cases (READY)

```bash
DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
  npx tsx scripts/voice-research/ws3/compute-disagreement.ts
```

Optionele flag: `--threshold-z=N` (default 1.0) — markeert pairs met
`|z(delta)| > N` als disagreement-cases voor kwalitatieve review.

**Geen DB / geen API calls** — pure consumption van de drie upstream
JSON outputs. Pearson + Spearman in plain TypeScript geïmplementeerd
(geen scipy nodig). Ranks gebruiken average-rank voor ties.

**Output**: `output/disagreement-result.json` met:
- `correlation.pearson_r` + `correlation.spearman_rho` (Spearman leading per v0.3)
- `correlation.directional_label_spearman` — interpretatie-string
- `score_distribution` — voice / similarity / delta stats
- `disagreement_cases[]` — gesorteerd op |z| descending, met:
  - voice score + explanation
  - similarity + method
  - delta + z-score
  - direction (`scorer-higher` / `embedding-higher`)
  - content_snippet (eerste 500 woorden voor blind review)
- `all_pairs[]` — alle aligned pairs met scores + delta voor inspectie

**Per protocol v0.3 §6.4**: kwalitatieve disagreement-case inspectie
door 2 raters is het PRIMAIRE signaal. Correlation-statistieken zijn
secundair en directional, niet threshold-based. Het script genereert
alle data die de kwalitatieve review nodig heeft (incl. snippets) zodat
raters niet hoeven cross-refereren naar de corpus.

---

## Bestanden

```
scripts/voice-research/ws3/
├── README.md                  ← dit document
├── requirements.txt           ← Python deps voor stap 3
├── extract-corpus.ts          ← stap 1, DONE (commit 1fefc44)
├── score-voice-quality.ts     ← stap 2, DONE (commit fce7bb6)
├── compute-embeddings.py      ← stap 3, READY (this commit)
├── compute-disagreement.ts    ← stap 4, READY (this commit)
├── .venv/                     ← Python virtualenv (gitignored)
└── output/                    ← gitignored, regenerable
    ├── corpus.jsonl           ← extract-corpus output (16 items)
    ├── voice-scores.json      ← score-voice-quality output (16 scores)
    ├── embeddings.json        ← compute-embeddings output (768-dim + similarities)
    └── disagreement-result.json ← compute-disagreement output
```

---

## Open punten

- [x] ~~Verifieer mStyleDistance HuggingFace availability~~ — DONE 2026-05-05, model bevestigd
- [x] ~~Bevestig Voice-dim key consistent over types~~ — DONE: forced default scorer, name="Brand Voice Adherence"
- [x] ~~Bepaal LINFI train/test split seed~~ — N/A: gewijzigd naar leave-one-out bij n=12
- [ ] Setup Python virtualenv eerste keer (zie Stap 3 — Setup hierboven)
- [x] ~~Stap 4 implementeren~~ — DONE this commit
- [ ] RUN: stap 3 (Python embedding) + stap 4 (correlation calc) — sequentiële uitvoering
- [ ] 2 raters reviewen disagreement-cases kwalitatief per protocol v0.3 §6.4
