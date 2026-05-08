---
id: 2026-05-08-markdown-rendering-library
title: react-markdown als markdown-rendering library voor campaign-brief-output
status: accepted
date: 2026-05-08
supersedes: -
superseded-by: -
---

# Context

Fase A van `campaign-brief-cowork-parity` (idea-draft → executable task `campaign-brief-output-mapper.md`) levert een 10-secties campagne-brief in markdown-format. De server returnt een markdown-string; de client moet deze renderen als gestylede HTML in `BriefRenderView.tsx`.

Bevindingen uit recon 2026-05-08:
- Geen `react-markdown`, `marked`, `markdown-it`, of `remark` in `package.json`
- `dangerouslySetInnerHTML` wordt alleen gebruikt in `src/components/help/HelpArticlePage.tsx:107` (één plek, voor pre-rendered HTML uit een andere bron)
- 0 hits op `prose-` classes in `src/index.css` — Tailwind 4 typography-plugin niet ingeschakeld
- `dangerouslySetInnerHTML` zonder sanitization is een XSS-risico zodra inhoud (deels) door een AI-call wordt geproduceerd

Drie reële opties verkend:

1. **react-markdown** — server returnt markdown, client rendert via `<ReactMarkdown components={...}>` met custom h1/h2/p/ul/li-overrides voor design-tokens-styling
2. **marked + DOMPurify** — server doet markdown→HTML conversion en sanitization, client toont via `dangerouslySetInnerHTML`
3. **Custom JSX-renderer** — server returnt gestructureerde JSON (`BriefViewModel`), client rendert per-sectie React-componenten zonder markdown-laag

# Decision

**Optie 1: `react-markdown`** als single dependency, geen plugins, met `components` prop voor styling-mapping.

```typescript
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  components={{
    h1: ({ children }) => <h1 className="text-3xl font-bold mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="list-disc ml-6 mb-3">{children}</ul>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
  }}
>
  {markdown}
</ReactMarkdown>
```

# Y-statement

In de context van **campaign-brief-output-mapper Fase A — server-rendered markdown die client-side getoond moet worden**, facing **XSS-risico bij dangerouslySetInnerHTML en geen prose-class compilation in src/index.css**, I decided **react-markdown als enkele dependency met components-prop voor design-token-styling**, to achieve **type-veilige rendering + ingebouwde XSS-sanitization + portable markdown-output voor copy-paste-naar-Notion**, accepting tradeoff **één extra runtime-dep (~50KB gzipped) + ~200KB bundle-size voor lazy-loaded BriefRenderView**.

# Consequences

## Positief
- **XSS-veilig out of the box** — react-markdown filtert script-tags en inline event-handlers automatisch; geen aparte DOMPurify-config te onderhouden
- **Type-veilig in React** — markdown-content rendert via React virtual DOM, geen `dangerouslySetInnerHTML` raw-string injectie
- **Portable markdown-output** — de server-string is bruikbaar voor toekomstige copy-paste-flow (Notion, e-mail, Word) zonder dat client-side rendering eraan vastzit
- **Geen `prose-` class afhankelijkheid** — custom `components` prop levert exacte design-token-conformiteit zonder Tailwind typography-plugin in te schakelen (zie gotchas.md 2026-04-19 over Tailwind 4 purge)
- **Industry-standard** — meest gebruikte markdown-renderer in React ecosysteem; minimale leercurve voor toekomstige sessies

## Negatief
- **+1 runtime dependency** — react-markdown trekt 5 transitive deps (`mdast`, `unified`, `remark-parse`, `remark-rehype`, `rehype-react`) maar geen optionele plugins
- **+50KB gzipped, ~200KB bundle uncompressed** — landt in de BriefRenderView code-split chunk; eerste-load van campagne-brief-pagina krijgt extra payload
- **Renderless tot client hydration** — geen SSR van de brief-markdown; "Genereer brief" toont tijdelijk loading-state vóór ReactMarkdown component mount. Acceptabel voor dev-tool feature, niet voor SEO-pagina

## Neutraal
- **Custom components prop verplicht** — zonder kunnen we niet design-token-conform stylen. Dat is werk we sowieso moeten doen, niet extra-kost
- **Geen GFM-extensie nodig** — Cowork-stijl brief gebruikt alleen basic markdown (headers, lijsten, paragrafen). Geen tabellen of strikethrough. `react-markdown` zonder `remark-gfm` is voldoende
- **Sanitization is impliciet** — als we ooit user-typed markdown gaan ondersteunen (bv. comment-veld), moeten we expliciet `rehype-sanitize` toevoegen; voor AI-gegenereerde content nu niet nodig

## Niet-keuzes (alternatieven afgewezen)

**Optie 2 (`marked` + `DOMPurify`)** afgewezen omdat:
- Twee deps i.p.v. één
- DOMPurify-config moet ge-audit en onderhouden — actief sanitization-werk
- Server doet werk dat client efficiënter doet (HTML-string serializeren over de wire is groter dan markdown-string)
- `dangerouslySetInnerHTML` patroon is bewust beperkt tot `HelpArticlePage.tsx`; uitbreiding ondermijnt die conventie

**Optie 3 (Custom JSX-renderer, geen lib)** afgewezen omdat:
- Verliest markdown-portability (copy-paste-naar-Notion vereist alsnog markdown-string ergens)
- Iter 1 brief-renderer.ts schrijft sowieso markdown-templates (10 secties) — dubbel werk om óók JSX-templates te onderhouden
- Geen schaalvoordeel als we ooit gebruikers eigen markdown willen laten typen

# Verificatie / observability

- **Bundle-size impact**: na install `npm run build` draaien en bundle-analyzer (indien aanwezig) of `du -sh .next/static/chunks/` vergelijken vóór/na install — verwacht +200KB op de campaign-detail chunk
- **Type-check**: `npx tsc --noEmit` 0 errors na install (react-markdown brengt eigen `@types`)
- **Runtime-veiligheid**: Iter 4 smoke-test stap 4 (missing-data-edge-case) verifieert dat geen onverwachte HTML lekt door bv. `<` in een `Persona.frustrations[]` string
