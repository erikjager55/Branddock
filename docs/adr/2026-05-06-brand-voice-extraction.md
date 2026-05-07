---
id: 2026-05-06-brand-voice-extraction
title: BrandVoiceguide model parallel aan Brandstyle (mirror-architectuur)
status: accepted
date: 2026-05-06
supersedes: -
superseded-by: -
---

# Context

Brand voice-velden (writingSample, brandVoiceDescription, wordsWeUse/Avoid, channelTones, toneDimensions) zaten oorspronkelijk in `BrandPersonality.frameworkData`. Problemen:
- Naam-collision: `BrandVoice` model bestaat al voor ElevenLabs TTS voice-records
- Voice-data gemengd met psychografische personality-data — geen dedicated module
- F-VAL Pijler 1 had alleen string-match, kon niet semantisch matchen op tone
- BrandPersonality heeft geen pgvector centroid voor embedding-based similarity
- Brandstyle is dedicated module voor *visuele* identity — voice mist mirror-architectuur voor *verbale* identity

WS3 finding (mei 2026): embeddings tegen eigen-gedrifte corpus geven misleidende similarity scores. Curated reference-set met centroid is betrouwbaarder.

# Decision

Bouw nieuw **`BrandVoiceguide`** Prisma model parallel aan `BrandStyleguide`. Mirror-architectuur:

| Brandstyle (visueel) | BrandVoiceguide (verbaal) |
|---|---|
| BrandStyleguide model | BrandVoiceguide model |
| Brandstyle Analyzer (URL/PDF → kleuren+fonts+layout) | Voice Analyzer (URL/paste → samples+tone+vocab) |
| Tabs: Logo / Colors / Typography / Tone / Imagery / Visual System | Tabs: Voice DNA / Vocabulary / Channel Tones / References |
| Save-for-AI per sectie | Save-for-AI per sectie |

**Schema**:
- `workspaceId` unique (workspace-singleton)
- `voiceDescription`, `toneDimensions Json` (NN/g 4-axis), `writingSamples Json[]`
- `wordsWeUse`, `wordsWeAvoid`, `antiPatterns` String[]
- `channelTones Json` (5 channels: website/socialMedia/email/ads/video)
- `centroidEmbedding Unsupported("vector(1536)")` — pgvector voor F-VAL Pijler 1
- 5× `*SavedForAi Boolean` flags
- `source` enum (MIGRATION / ANALYZED_URL / ANALYZED_PASTE / MANUAL), `publishedAt`

**BV-WIRE**: 7-wave cutover plan voor alle consumers (F-VAL, BVD, alignment scanner, exploration config, consistent-models resolvers etc.) — afgerond mei 2026.

**BV-5 deprecation**: voice-velden in `BrandPersonalityFrameworkData` gemarkeerd `@deprecated`, UI vervangen door "moved to Brand Voice" banner.

# Y-statement

In de context van **brand voice als first-class data-pijler voor F-VAL en content generation**, facing **naam-collision met ElevenLabs BrandVoice + dunne 1-sample writing-data + geen embedding centroid**, I decided **dedicated `BrandVoiceguide` model parallel aan Brandstyle met curated samples + pgvector centroid**, to achieve **mirror-architectuur (visueel ↔ verbaal) + semantische voice-fidelity scoring**, accepting tradeoff **migratie-werk over alle consumers + tijdelijke dual-source (legacy fallback voor unmigrated workspaces)**.

# Consequences

## Positief
- F-VAL Pijler 1 krijgt semantische dimensie via cosine similarity tegen voiceguide centroid
- Voice analyzer (URL/paste → 5-step pipeline) productiseert wat vroeger ad-hoc Claude-prompts waren
- BrandPersonality wordt schoner (alleen psychografisch + visueel)
- Cross-link UI tussen Brandstyle en Brand Voice voor herkenbare mirror
- Pattern hergebruikbaar voor toekomstige extractie (bv Brand Story → eigen module?)

## Negatief / tradeoffs
- ~3-4 weken werk voor BV-0 t/m BV-5 + BV-WIRE
- Tijdelijke dual-source: legacy fallback voor workspaces zonder voiceguide → context-resolver complexity
- pgvector centroid recompute kost OpenAI embedding-call per save (text-embedding-3-small ~$0.0001 per recompute)
- Naming gevoelig voor verwarring: BrandVoice (TTS) vs BrandVoiceguide (verbal identity)

## Neutraal
- Sidebar volgorde: Brand Foundation → Brandstyle → Brand Voice → Business Strategy → Personas → Products → Competitors
- Auto-rule-sync uit voiceguide.wordsWeAvoid + antiPatterns naar `BrandRule` table

# Alternatives considered

- **Voice-velden uitbreiden binnen BrandPersonality**: vermijdt nieuw model, maar mengt verbaal+psychografisch en maakt naming worse
- **Hernoemen ElevenLabs BrandVoice → TTSVoice**: oplossen van naam-collision, maar raakt veel routes/types — meer werk dan nieuw model
- **Per-channel apart model**: te granular, channel-tones zijn 90% gedeelde stijl met channel-specifieke shifts

# Notes

Implementatie geleverd in BV-0 t/m BV-5 + BV-WIRE waves (entries #214-218 in `docs/archive/old-lists/CLAUDE-original-2026-05-07.md`):
- BV-0: schema + migratie-script
- BV-1: backend (brand-context.ts, rule-sync, API)
- BV-2: UI (4 tabs + analyzer entry)
- BV-3: voice analyzer (5-step pipeline + paste-mode)
- BV-5: BrandPersonality voice deprecation
- BV-WIRE W-1 t/m W-6: alle consumers gemigreerd (F-VAL Pijler 1 data-source swap, BVD, alignment, exploration config, consistent-models, framework PATCH hook, tone-of-voice gating)

W-1-full centroid algorithm switch (cosine similarity i.p.v. string-match) gepland voor week 1 dag 6-7. Regression-harness staat klaar in `scripts/fidelity/test-pillar1-w1-full-regression.ts`.
