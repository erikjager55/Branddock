# Content Golden-Sets — Layer 2 type-specific evaluation

> Sub-sprint #5.B foundation per plan §2 Layer 2 + §4 #5.B.
> Plan-doc: `docs/specs/content-test-improvement-plan.md`

## Structuur

```
tests/content-golden-sets/
├── _rubric-templates/        # Herbruikbare G-Eval rubrics
│   └── universal-rubric.md   # 4 universal dimensies (Coh/Cons/Flu/Rel)
├── long-form/
│   ├── blog-post.yaml        # Representant long-form (10 goldens)
│   ├── whitepaper.yaml       # TODO: sub-sprint #5.B uitbreiding
│   ├── case-study.yaml       # TODO
│   ├── ebook.yaml            # TODO
│   ├── article.yaml          # TODO
│   ├── thought-leadership.yaml  # TODO
│   └── pillar-page.yaml      # TODO
├── social/                   # TODO 13 types
├── advertising/              # TODO 6 types
├── email/                    # TODO 5 types
├── website/                  # TODO 5 types
├── video-audio/              # TODO 5 types
├── sales/                    # TODO 4 types
└── pr-hr/                    # TODO 8 types
```

Per type: 3 human-authored seed + 5 LLM-evolved synthetic + 2 adversarial = **10 goldens**.

## Run

```bash
# Single content-type
npx promptfoo eval -c tests/content-golden-sets/long-form/blog-post.yaml

# Alle types in een categorie
npx promptfoo eval -c tests/content-golden-sets/long-form/*.yaml

# Volledige suite (alle 8 representanten in #5.B, alle 53 in #7.B)
npx promptfoo eval -c tests/content-golden-sets/**/*.yaml
```

## CI integration

`.github/workflows/golden-sets.yml` (komt in #5.B fill-in) triggers:
- Op PR die `src/lib/studio/prompt-templates/**` raakt
- Nightly om regressie te detecteren tegen latest production prompts

## Sprint-fasering

| Sprint | Scope | Status |
|---|---|---|
| #5.B | 8 representanten met 10 goldens elk (~80 goldens) | started — blog-post baseline |
| #6.A | Wiring checkpoint-gates gebruikt golden-set patterns | open |
| #6.B | Chain-of-prompts upgrades — A/B test tegen golden baseline | open |
| #7.B | Uitbreiding naar alle 53 content-types | open |

## Tool-keuze: Promptfoo

Per plan §7 beslissing 2026-05-12: Promptfoo eerst (free, YAML, CI-ready),
LangSmith/Langfuse pas in #7.B wanneer trace-naar-dataset pipeline echt
nodig is. G-Eval logprob-weighted variant: eigen TypeScript implementatie
later (plan §5).

## Anti-bias measures (per plan §3.1.4)

- **Position-swap**: judge wordt 2× aangeroepen met geswapte order
- **Multiple-evidence**: judge moet ≥2 specifieke citaties uit content geven
- **Human spot-check**: 5% van judge-output via handmatige queue (post-pilot)

Pre-launch v1: integer G-Eval scores 1-5. Position-swap implementatie volgt
in #5.B fill-in via custom Promptfoo wrapper-script.
