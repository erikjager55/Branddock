# WS3 — Disagreement-meting (mStyleDistance vs quality-scorer Voice-dim)

Research-tooling voor de Voice Fingerprinting WS3 disagreement-meting tussen
twee voice-scoring mechanismen: de productie quality-scorer Voice-dimensie
(25% weight in `quality-scorer.ts`) en mStyleDistance embedding-afstand
(open-source style-only embeddings).

**Pre-registratie**: scope vastgelegd in
`docs/voice-fingerprinting-ws2-protocol.md` v0.2 §6 (commit `446f92b`).
Wijzigingen aan WS3-criteria vereisen protocol-versiebump per §7.2.

---

## Doel

Meten of mStyleDistance additieve informatie geeft t.o.v. de bestaande
quality-scorer Voice-dimensie. Concreet: bereken Pearson r tussen beide
scoring-mechanismen op een pool van ~40 long-form klantcontent stukken.

| Pearson r | Conclusie | F-VAL implicatie |
|---|---|---|
| **> 0.7** | Signalen meten hetzelfde — mStyleDistance is **redundant** | Pijler 1 niet bouwen |
| **< 0.4** | Signalen meten verschillende dingen — mStyleDistance is **additief** | Pijler 1 bouwen heeft waarde |
| **0.4 – 0.7** | Grijs gebied | Inspect disagreement-cases handmatig, beslis op kwalitatieve grond |

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

**Status v0.1** (2026-05-05):
- ✅ `extract-corpus.ts` — implemented + smoke-tested
- ⏳ `score-voice-quality.ts` — pending (next session)
- ⏳ `compute-embeddings.py` — pending model-keuze + Python setup
- ⏳ `compute-disagreement.ts` — pending upstream outputs

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

## Stap 2: Quality-scorer Voice-dim scoring (TODO)

Per stuk in `corpus.jsonl`: roep production `scoreContentQuality()` aan
(vanuit `src/lib/studio/quality-scorer.ts`), extract de Voice-dimensie score
(25% weight, dimension name `Brand Voice Adherence`), schrijf naar
`voice-scores.json`.

```json
{
  "cmojr89ns00572vc9ezi9w8zv": {
    "score": 78,
    "explanation": "...",
    "dimension_name": "Brand Voice Adherence"
  },
  ...
}
```

Quality-scorer gebruikt Claude Sonnet — kosten per scoring-call ~$0.005-0.01.
Voor 40 stukken: ~$0.20-0.40 totaal. Geen budget-blocker.

**LET OP**: production quality-scorer accepteert `deliverableTypeId` voor type-specifieke
scoring. Voor disagreement-meting moeten we de Voice-dim consistent extracten
ongeacht type-specifieke variaties. Verifieer bij implementatie dat de Voice-dim
key-naam stabiel is over de 9 long-form types.

---

## Stap 3: mStyleDistance embeddings (TODO)

### Modelkeuze

LINFI is Nederlandstalig. **mStyleDistance (multilingual)** vereist, niet
StyleDistance (English-only). Beide zijn HuggingFace-modellen op basis van
contrastive style learning — getraind om stijl te encoderen onafhankelijk
van content.

Mogelijke modellen (verifieer bij implementatie):
- `StyleDistance/mstyledistance` — multilingual, primary candidate
- `StyleDistance/styledistance` — English-only, fallback

### Setup (Python)

Python 3.10+ recommended. Install dependencies:

```bash
pip install sentence-transformers torch  # transformers + PyTorch backend
```

### Pipeline (compute-embeddings.py — pending)

```python
# 1. Load model
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('StyleDistance/mstyledistance')

# 2. Read corpus.jsonl
with open('corpus.jsonl') as f:
    corpus = [json.loads(line) for line in f]

# 3. Embed all texts
embeddings = model.encode([item['content'] for item in corpus])

# 4. Compute LINFI centroid from training-half
linfi_train = [e for e, item in zip(embeddings, corpus)
               if item['isBrandAnchor'] and is_in_train_half(item)]
centroid = mean(linfi_train, axis=0)

# 5. For each piece: cosine similarity to LINFI centroid
similarities = [cosine(e, centroid) for e in embeddings]

# 6. Output JSON
{ "embeddings": [...], "centroid": [...], "similarities": {...} }
```

### Train/test split for LINFI

Per protocol §6.2: LINFI 27 stukken → 14 centroid-training, 13 test-set.
Split deterministisch (seeded random) zodat de meting reproduceerbaar is.
Andere workspaces (Napking, Branddock Demo, etc.) krijgen pure stylistic
distance zonder brand-centroid — alle pieces gaan in de test-set.

---

## Stap 4: Pearson r disagreement-meting (TODO)

Voor elk stuk in de pool: paar `(voice_score, mstyledistance_similarity)`.
Bereken Pearson r over alle pairs.

Drempelinterpretatie per protocol §6.4 — zie tabel bovenaan dit document.

**Disagreement-cases inspectie**: per stuk waar de twee scoring mechanismen
substantieel verschillen (delta > 1 std-deviation), schrijf de stuk-id +
beide scores + content-snippet weg voor handmatige review. Dit voedt de
kwalitatieve beslissing in het grijze gebied (0.4 ≤ r ≤ 0.7).

---

## Bestanden

```
scripts/voice-research/ws3/
├── README.md                  ← dit document
├── extract-corpus.ts          ← stap 1, DONE
├── score-voice-quality.ts     ← stap 2, TODO
├── compute-embeddings.py      ← stap 3, TODO (separate Python process)
├── compute-disagreement.ts    ← stap 4, TODO
└── output/
    ├── corpus.jsonl           ← extract-corpus output
    ├── voice-scores.json      ← score-voice-quality output
    ├── embeddings.json        ← compute-embeddings output
    ├── centroid.json          ← LINFI centroid (Python output)
    └── disagreement-result.json ← compute-disagreement output
```

---

## Open punten vóór live runs

- [ ] Verifieer dat `StyleDistance/mstyledistance` op HuggingFace beschikbaar is en performant Nederlands embedt
- [ ] Bevestig dat production quality-scorer Voice-dim key consistent is over alle 9 long-form types
- [ ] Bepaal seed voor LINFI train/test-split (vastleggen in protocol als WS3-amendment, niet wijzigbaar daarna)
- [ ] Setup Python virtualenv buiten de Node-codebase — `scripts/voice-research/ws3/.venv/`
