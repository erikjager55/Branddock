# Universal G-Eval rubric — 4 dimensies voor alle content-types

> Hergebruikt per type-specific golden-set in `tests/content-golden-sets/<category>/<type>.yaml`.
> Conform plan §3.0 (G-Eval framework, Liu et al. 2023).

## Coherence (logische flow binnen content, 1-5)

**5 — Excellent**: ideeën bouwen logisch op elkaar voort; transities tussen secties zijn natuurlijk; geen abrupte sprongen of herhalingen; intro/middel/conclusie volgen elkaar betekenisvol op.

**4 — Good**: globale flow goed; één of twee transities voelen geforceerd of redundant.

**3 — Acceptable**: structuur herkenbaar maar gefragmenteerd; sommige secties staan op zichzelf zonder duidelijk verband.

**2 — Poor**: ideeën springen heen en weer; redundante herhalingen; lezer verliest draad.

**1 — Unacceptable**: geen herkenbare structuur; lijst van losse fragmenten.

## Consistency (interne + brand-context consistency, 1-5)

**5 — Excellent**: terminologie consistent door hele tekst; merknaam exact gespeld; tone-of-voice matched brand-voice baseline; geen interne contradicties.

**4 — Good**: minor inconsistenties (1 keer afwijking in terminologie of capitalization).

**3 — Acceptable**: enkele consistency-issues; merk-spelling correct maar tone afwijkend van baseline.

**2 — Poor**: terminologie wisselt door tekst; tone-of-voice mismatch met brand; merkbare interne contradicties.

**1 — Unacceptable**: zware inconsistencies; merknaam verkeerd gespeld; tone radicaal off-brand.

## Fluency (grammatica + idiomatic NL/EN, 1-5)

**5 — Excellent**: foutloos Nederlands/Engels; idiomatic phrasing; geen letterlijke vertalingen; natuurlijke zin-structuur.

**4 — Good**: vrijwel foutloos; enkele lichte stijl-issues maar grammaticaal correct.

**3 — Acceptable**: grammaticaal grotendeels OK; enkele stijve formuleringen of vertaal-fouten.

**2 — Poor**: meerdere grammatica-fouten of onnatuurlijke zinnen; vertaal-pijn zichtbaar.

**1 — Unacceptable**: regelmatige grammatica-issues; onleesbare passages.

## Relevance (matched brief + key message, 1-5)

**5 — Excellent**: alle brief-onderdelen (objective + keyMessage + toneDirection + callToAction) adresseerd; rode draad zichtbaar; niets off-topic.

**4 — Good**: brief-elements grotendeels aanwezig; 1 onderdeel minder prominent.

**3 — Acceptable**: kernboodschap aanwezig maar enkele brief-onderdelen verzwakt of gemist.

**2 — Poor**: brief-elementen onduidelijk gerepresenteerd; tekst dwaalt naar non-brief onderwerpen.

**1 — Unacceptable**: brief nauwelijks adresseerd; off-topic content.

---

## Hoe te gebruiken in Promptfoo `llm-rubric` config

```yaml
assert:
  - type: llm-rubric
    value: |
      Evalueer deze content op deze 4 dimensies (1-5 elk):
      <inhoud rubric hierboven verwijzen of inlinen>
      Output JSON: { coherence: N, consistency: N, fluency: N, relevance: N, totalScore: gemiddelde }
      Pass-threshold: totalScore >= 4.0
```

## G-Eval logprob-weighting

Pre-launch: integer scores 1-5 acceptable. G-Eval logprob-weighted variant
(eigen TypeScript implementatie per plan §5) komt na pilot wanneer integer-
scores onbetrouwbaar blijken.

## Position-swap calibration

Voor alle judge-calls op pilot-grade content: roep judge 2× aan met
geswapte order (variant A↔B). Accepteer alleen consistent vote. Mitigates
agreeableness bias (TNR < 25% probleem uit research).
