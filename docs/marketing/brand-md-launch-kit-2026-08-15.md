# BRAND.md Launch-kit — alles verzendklaar, niets verstuurd

> **Status**: klaar voor gebruik, 2026-08-15. **Besluit Erik**: outreach en publiciteit wachten tot het echt nodig is ("geen slapende honden wakker maken") — tot die tijd staat hier alles klaar zodat de daadwerkelijke verzending minuten kost, geen dagen.
> **Bronnen**: launch-plan v2 (`brand-md-launch-plan-2026-08-02.md`, §5 golfplan), upstream-PR-pakket v2 (`../specs/brandmd-upstream-proposals.md`), touchpoints v2.

---

## 0. Stand van de voorbereiding

| Onderdeel | Status |
|---|---|
| Generator live (scan → score → gate → BRAND.md-download) | ✅ live-getest 2026-08-15 |
| Rapport-mail (touchpoint 2.1, Emailit) | ✅ live |
| Claim-flow + claim-time deepening (intake-scan) | ✅ live-getest |
| Leads-dashboard (funnel per lead) | ✅ live |
| Spec v0.3.0-conformance (emitter, validator, BRAND.md-naam) | ✅ + kruisvalidatie in smoke |
| Site-integratie (/brandmd in marketing-site, footer-nav) | ✅ |
| MCP-tool `get_brand_md` | ✅ live bewezen |
| Validator npm-publish (`brandmd-validate` v0.2.0) | ⬜ Erik — zie §1 |
| Strategy-sectie eigen workspace (demo-bestand) | ⬜ Erik — staat nu op "Not yet defined" |
| Outreach + PR's (golf 0) | ⏸ bewust geparkeerd — verzendklaar in §2 |
| Show HN + Product Hunt (golf 1) | ⏸ bewust geparkeerd — verzendklaar in §3-4 |

---

## 1. Stille voorbereidingen (kunnen nú, wekken niemand)

1. **npm publish** — `cd integrations/brandmd-validator && npm publish`. Publiek maar onopvallend; niemand monitort nieuwe npm-namen. De afweging is andersom: zolang wij níet publiceren kan iemand anders de naam `brandmd-validate` claimen. Aanbeveling: doen.
2. **Demo-workspace op orde** — vul de Strategy-assets van better brands (purpose, positioning, personality, promise). Het eigen BRAND.md-bestand is hét demo-artefact in elke outreach en op launch-dag; "Not yet defined" in je eigen showcase ondergraaft het verhaal.
3. **Rate-limit-besluit voor launch-dag** — het globale plafond staat op **500 runs/dag** (kosten-backstop). Een geslaagde Show HN doet meer; wie na het plafond komt ziet "at capacity". Opties: (a) plafond tijdelijk naar 2.000-5.000 op launch-dag (AI-kosten ~€0,01-0,02/run → €20-100 extra, gecapt), of (b) bewust op 500 laten en schaarste accepteren. Besluit hoort bij het launch-datum-besluit; de wijziging zelf is één constante (`GENERATOR_MAX_RUNS_GLOBAL_PER_DAY`).
4. **Monitoring-routine op launch-dag**: leads-dashboard open + Vercel-logs; de funnel-targets staan in touchpoints v2 (run→download ≥60%, run→e-mail ≥25%).

---

## 2. Golf 0 — Outreach-mail naar Caio Pizzol (verzendklaar)

**Kanaal**: e-mail of GitHub-issue op caiopizzol/brand.md (issue heeft de voorkeur: openbaar constructief, geen koude inbox). **Afzender**: Erik persoonlijk. **Timing**: pas wanneer golf 1 gepland is — de mail kondigt werkende tooling aan en die aankondiging is eenmalig.

**Onderwerp**: `We built a generator + validator for BRAND.md — want to contribute upstream`

> Hi Caio,
>
> I run Branddock, a brand-management platform from the Netherlands. A few weeks ago we went looking for an open format to make brand identity portable across AI tools — and found you'd already built exactly the right thing. Rather than invent a competing format, we implemented yours.
>
> What's live today, all on spec v0.3.0:
>
> - **A free generator** — paste any URL, get a valid BRAND.md scanned from the site, honestly marked `unvalidated` where a scan can't confirm things: https://branddock.app/brandmd
> - **A dependency-free validator** (`npx brandmd-validate`) that implements your specVersion resolution table, the 0.2 aliases, and the required-section rules for both versions
> - **A living implementation** — workspaces serve their maintained BRAND.md over REST and MCP, so agents always read the current version instead of a stale file
>
> Loved the 0.3 release — Audience and Guardrails as required Strategy sections matches exactly what we saw users need. We're also building toward the BRAND.md + DESIGN.md pair; our design-token layer maps naturally onto the DESIGN.md side of your boundary.
>
> Three small proposals we'd like to PR, each additive and each already implemented in our tooling so you can see them working before judging the idea:
>
> 1. Optional `provenance` + `validation` frontmatter — generated files travel, and readers currently can't tell how old a file is, where the living version lives, or which sections a human actually confirmed
> 2. Optional structured persona sub-entries inside `Strategy > Audience`
> 3. Optional machine-checkable `#### Do` / `#### Don't` lists inside `Strategy > Guardrails`
>
> Happy to adjust naming and shape to whatever you prefer — spec coherence beats our conventions. And if PRs aren't the right vehicle, we're fine simply being a well-behaved implementation.
>
> Erik Jager
> founder, Branddock — branddock.app

**Daarna**: PR #1 → #2 → #3 uit `../specs/brandmd-upstream-proposals.md`, elk pas na (of tegelijk met) reactie op de mail; los van elkaar mergebaar.

**Verzend-stappen** (op de dag zelf, ~30 min):
1. Issue openen op github.com/caiopizzol/brand.md met bovenstaande tekst
2. Fork + branch per PR; de spec-tekstwijzigingen volgen de voorbeelden uit het PR-pakket
3. In elke PR-body linken naar generator, npm-package en de twee voorbeeldbestanden

---

## 3. Golf 1 — Show HN (verzendklaar)

**Titel** (uit launch-plan, ongewijzigd):
`Show HN: Turn any website into a BRAND.md – free generator for the open brand-identity standard`

**URL**: `https://branddock.app/brandmd`

**Eerste comment** (founder, direct na posten — dit ís de pitch op HN):

> Hi HN — I built a free generator for BRAND.md, an open standard (MIT, not mine) for brand identity that lives in your repo root next to README.md and AGENTS.md: https://github.com/caiopizzol/brand.md
>
> The problem: every AI tool you use starts from zero on your brand. You re-explain your tone of voice to ChatGPT, your colors to an image model, your audience to a copywriting agent. BRAND.md fixes the format side — one markdown file any LLM can read. But writing one from scratch is a blank-page problem.
>
> So: paste your URL, we scan your site (a few pages, one model call), and you get a spec-valid BRAND.md — strategy, voice with verbatim example phrases from your own copy, colors, typefaces, audience.
>
> The part I care most about: honesty. A scan can't verify anything, so every section a website alone can't confirm is explicitly marked `unvalidated` in the frontmatter, and required sections we have no data for say "Not yet defined" instead of hallucinated filler. You get an honest file, not an impressive one. There's also a Brand Score, and it's deterministic — three explainable checks, no LLM-judge theater.
>
> Also shipped: a dependency-free validator (`npx brandmd-validate`) implementing the spec's version-resolution rules, and for those who want a maintained version, workspaces serve their live BRAND.md over MCP so agents read the current file instead of a stale copy.
>
> Email is required for the download (that's the business model, stated plainly — the generator is free, the maintained version is the product). Happy to answer anything about the scanning, the scoring, or the spec.

**Timing**: dinsdag-donderdag, 15:00-17:00 NL-tijd (ochtend VS-oostkust). Founder de hele dag in de comments (launch-plan-vereiste).

**Voorspelbare kritiek + antwoordlijnen**:
- *"Email-gate op een 'gratis' tool"* → staat al in de post; herhaal rustig: gratis bestand, e-mail is de prijs, geen nieuwsbrief, één rapport-mail. Niet verdedigen, benoemen.
- *"Waarom niet gewoon een LLM dit laten doen?"* → kan prima; de generator is deterministische glue + één extractie-call, met spec-validatie en eerlijke unvalidated-markering — precies wat een losse prompt niet afdwingt.
- *"Jullie kapen andermans standaard"* → we lanceren tooling vóór de standaard, upstream-PR's staan open onder eigen naam, validator accepteert de hele spec incl. delen die wij niet emitten.
- *"Scan van andermans site/merk"* → publieke website-informatie; drafts zijn niet publiek vindbaar, claim-link bestaat alleen in bestand + mail van de aanvrager; TTL 90 dagen.

---

## 4. Golf 1 — Product Hunt (verzendklaar, zelfde week als HN)

- **Naam**: BRAND.md Generator by Branddock
- **Tagline**: `Give every AI agent your brand memory`
- **Beschrijving** (kort): *Paste your URL → get a BRAND.md, the open file that keeps ChatGPT, Claude, Cursor and every AI tool on-brand. Scanned from your site, honestly marked where unverified, valid against the open spec (v0.3). Free, no account.*
- **Eerste comment**: verkorte versie van de HN-comment (probleem → eerlijkheid → gratis/product-scheiding), zonder HN-verdedigingslinies.
- **Gallery**: (1) generator-invoer, (2) resultaatpagina met Brand Score + bevindingen, (3) het BRAND.md-bestand in een editor, (4) claim-pagina "Your brand is already here", (5) gebruik in Claude-project.
- **Hunter**: zelf posten als maker is prima; een bekende hunter is optioneel, geen blokkade.

---

## 5. Volgorde op de dag zelf (checklist)

1. Rate-limit-besluit doorvoeren (§1.3) en deployen
2. Demo-workspace-check: eigen BRAND.md compleet (§1.2)
3. Golf 0: issue + PR's naar Caio (§2) — bij voorkeur enkele dagen vóór HN, zodat "upstream contact loopt" waar is bij HN-vraag ernaar
4. Show HN posten + eerste comment (§3); dag vrijhouden voor comments
5. Product Hunt dezelfde week (§4)
6. Monitoring: leads-dashboard + Vercel-logs; funnel-targets touchpoints v2
7. Naweek: rapport-mail-opvolging bekijken (open rate), lifecycle-mails 2.2-2.5 activeren als volume het rechtvaardigt
