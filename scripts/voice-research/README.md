# Voice Research — WS2 Generation Tooling

Research-tooling voor de Voice Fingerprinting WS2 drift-meting. Implementeert
A.1-A.4 propagation-fixes als parallel codepad — productie BVD-utility en
prompt-templates blijven onaangetast tijdens de meting.

**Pre-registratie**: dit pad is vastgelegd in
`docs/voice-fingerprinting-ws2-protocol.md` v0.2 (commit `446f92b`).
Wijzigingen aan A.1-A.4 gedrag vereisen een protocol-versiebump per §7.2.

---

## Architectuur

```
scripts/voice-research/
├── condition-b.ts          ← A.1-A.4 prompt-construction logic (pure functions)
├── generate-piece.ts       ← CLI runner — generates ONE piece for ONE (workspace, type, condition)
├── README.md               ← dit document
└── output/                 ← generation results, ge-organiseerd per workspace + conditie
    └── {workspace-slug}/
        ├── A/              ← conditie A (production BVD baseline)
        └── B/              ← conditie B (BVD + A.1-A.4 propagation-fixes)
```

`condition-b.ts` raakt geen production file aan — het importeert read-only
helpers (`getDeliverableTypeById`, `BrandContextBlock`-type) en construeert
parallel een conditie-B voice section + prompt wrapper.

---

## Wat A.1-A.4 doen

| Fix | Doel | Implementatie |
|---|---|---|
| **A.1 Channel-tone extraction** | Eén actief kanaal expliciet, andere kanalen markeren als irrelevant voor dit stuk | `extractChannelToneFromPersonality()` parseert het personality-blob en haalt de active-channel-tone op via category→channel mapping |
| **A.2 Voice-source deduplication** | Canonical Brand Personality wint van Brandstyle Analyzer tone-of-voice bij conflict | Voice-section labelt `(canonical, primary source)` vs `(supplementary)` met expliciete precedence-regel |
| **A.3 Mid-prompt voice anchor** | Per-sectie voice-reinforcement vóór STRUCTURE SKELETON | `## VOICE ANCHOR — APPLY TO EVERY SECTION` blok met top-3 wordsWeUse, top-3 wordsWeAvoid, top-4 generic LLM-tells, expliciete tweezijdige drift-instructie |
| **A.4 End-of-prompt voice check** | Voice-validation block dichtst bij output-tokens — counter position-decay | `## VOICE CHECK BEFORE OUTPUT` blok ná type-specifieke instructies, 6-punts validatie incl. tweezijdige hypothese (forced voice = drift) |

---

## Gebruik

### Dry-run (preview prompts, geen API call)

```bash
tsx scripts/voice-research/generate-piece.ts \
  --workspace=linfi \
  --content-type=blog-post \
  --condition=B \
  --topic="The hidden cost of vague brand strategy" \
  --dry-run
```

Print het volledige system+user prompt naar stdout. **Gebruik dit om A.1-A.4
wiring te verifiëren** voordat je met API-budget gaat draaien. Geen ANTHROPIC_API_KEY nodig.

### Live generatie

```bash
tsx scripts/voice-research/generate-piece.ts \
  --workspace=linfi \
  --content-type=blog-post \
  --condition=A \
  --topic="The hidden cost of vague brand strategy"
```

Vereist `ANTHROPIC_API_KEY` in env. Genereert 3.000-woord output (8.192 max-tokens
default), saved als markdown met frontmatter onder
`scripts/voice-research/output/{slug}/{A|B}/{content-type}_{timestamp}.md`.

### CLI flags

| Flag | Verplicht | Default | Beschrijving |
|---|---|---|---|
| `--workspace=SLUG` | ✓ | — | Workspace.slug (bv. `linfi`, `nobox`, `wra-juristen`) |
| `--content-type=ID` | ✓ | — | Long-form type ID (`blog-post`, `whitepaper`, `case-study`, `ebook`, `pillar-page`, `research-paper`, `resource-guide`) |
| `--condition=A\|B` | ✓ | — | A = production BVD baseline, B = BVD + A.1-A.4 |
| `--topic="..."` | ✓ | — | Topic-brief (zelfde topic per merk-type, beide condities) |
| `--dry-run` | — | false | Print prompts, géén API call |
| `--max-tokens=N` | — | 8192 | Override max output tokens (1024-16384) |
| `--output-dir=PATH` | — | `output/{slug}/{condition}/` | Override default output location |

---

## WS2 generation workflow (12 stukken totaal)

3 merken × 2 content-types × 2 condities = 12 generaties.

```bash
# Voor elk merk (linfi, nobox, wra-juristen):
#   Voor case-study en thought-leadership-equivalent:
#     Voor A en B:
#       Run generate-piece met identieke topic per (merk, type)

# Voorbeeld voor LINFI / blog-post:
tsx scripts/voice-research/generate-piece.ts --workspace=linfi --content-type=blog-post \
  --condition=A --topic="<topic 1 voor LINFI blog-post>"
tsx scripts/voice-research/generate-piece.ts --workspace=linfi --content-type=blog-post \
  --condition=B --topic="<topic 1 voor LINFI blog-post>"

# Voor LINFI / case-study:
tsx scripts/voice-research/generate-piece.ts --workspace=linfi --content-type=case-study \
  --condition=A --topic="<topic 2 voor LINFI case-study>"
tsx scripts/voice-research/generate-piece.ts --workspace=linfi --content-type=case-study \
  --condition=B --topic="<topic 2 voor LINFI case-study>"

# Herhaal voor nobox + wra-juristen
```

**Belangrijk**: identieke topic per (merk, content-type) tussen condities A/B
— anders meet je topic-variantie i.p.v. voice-injectie effect.

Topics vooraf vastleggen in een `topics.csv` (per protocol §7.1 random-toewijzing
A/B labels in sealed CSV — die wordt apart gehouden van de output filenames).

---

## Output-bestand structuur

Elk gegenereerd stuk krijgt YAML frontmatter met volledige audit-trail:

```yaml
---
workspace_name: Linfi
workspace_slug: linfi
workspace_id: cm...
content_type: blog-post
condition: B
topic: "The hidden cost of vague brand strategy"
model: claude-opus-4-7
max_tokens: 8192
generated_at: 2026-05-05T14:32:18.234Z
elapsed_ms: 87432
word_count: 2987
target_words: 3000
system_prompt_chars: 12453
system_prompt_tokens_est: 3113
stop_reason: end_turn
voice_meta: {"condition":"B","voice_section_chars":2187,"primary_trait":"Quietly Confident","words_use_count":12,"words_avoid_count":8}
usage_input_tokens: 3247
usage_output_tokens: 4012
protocol_version: v0.2
protocol_commit: 446f92b
---

[generated content...]
```

Frontmatter wordt voor scoring gestript. Filename bevat alléén content-type +
timestamp (geen brand of conditie) zodat blind A/B-toewijzing via sealed CSV
kan plaatsvinden.

---

## Wat dit script NIET doet

- ❌ Modifies production code (BVD utility, prompt-templates, canvas-orchestrator)
- ❌ Generates more than one piece per invocation (loop in shell-script of CSV-runner extern toevoegen wanneer rater-bezetting binnen is)
- ❌ Scores or analyzes outputs (rater protocol uit §3 van protocol-document)
- ❌ Pre-registreert random A/B-toewijzing (sealed CSV apart vastleggen)

---

## Limitations & known issues

- **Channel-tone extraction werkt alleen als `formatBrandPersonality()` zijn standaard format gebruikt** (`Channel-specific tone: socialMedia: …; email: …;`). Wijzigingen aan production-utility kunnen de regex breken — zie `extractChannelToneFromPersonality()` in `condition-b.ts`. Bij failure: A.1 valt terug naar referentiële channel-instructie (= condition A behavior voor channel) — dit wordt NIET geflagd in voice_meta. TODO: instrument fallback-detectie in v0.3 als WS2 v2 nodig blijkt.
- **`primaryTrait` extractie** prefereert `personalityTraits[0].name`, valt terug op `primaryDimension`. Als beide leeg: A.3/A.4 reinforcement laat trait-regels weg. Niet kritisch maar maakt A.3/A.4 zwakker voor merken met onvolledige Brand Personality data.
- **Geen retry-logica op Anthropic API errors**. Als de call faalt, hele runner exit 1. Voor batch-generatie zelf retry'en in shell-loop.

---

## Referenties

- WS1 audit: `docs/voice-fingerprinting-ws1-audit.md`
- WS2 protocol (pre-registreerd v0.2): `docs/voice-fingerprinting-ws2-protocol.md`
- Production BVD: `src/lib/studio/brand-voice-directive.ts` (= condition A baseline)
- Production prompt-templates: `src/lib/studio/prompt-templates/` (= shared between A/B)
