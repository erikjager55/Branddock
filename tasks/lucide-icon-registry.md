---
id: lucide-icon-registry
title: De complete iconenbibliotheek staat in de productiebundel — 5740 iconen voor 230 die we gebruiken
fase: post-launch
priority: next
effort: 0,5-1 dag (mechanisch; de kunst zit in de dynamische namen)
owner: unassigned
status: open
created: 2026-08-18
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Zeven bestanden doen `import * as LucideIcons from 'lucide-react'` en zoeken het icoon
daarna op met een **runtime string-lookup**:

```ts
const icons = LucideIcons as unknown as Record<string, React.ComponentType<…>>;
return icons[iconName] || LucideIcons.Bot;
```

Een bundler kan bij zo'n lookup niet weten wélke sleutel gebruikt wordt, dus moet hij
**elk** export behouden. Tree-shaking is daarmee principieel uitgeschakeld — dit is geen
configuratieprobleem dat je met `optimizePackageImports` oplost.

## Gemeten op productie (2026-08-18)

Niet geschat maar nagemeten: alle 137 JS-chunks van `branddock-7y9n.vercel.app`
opgehaald en doorzocht op iconen die de codebase aantoonbaar nergens noemt
(`Volleyball`, `Wallpaper`, `Biohazard`, `Drumstick`, `Popsicle`, `Torus`, `Cannabis`,
`Vegan` — 0 treffers in `src/`).

| | |
|---|---|
| Alle acht ongebruikte proef-iconen | **aanwezig in de bundel** |
| Dragende chunk | `1wkzvo64qcv65.js`, **548 kB** |
| `lucide-react`-exports daarin | **5740 van 5740 (100%)** |
| Totale JS die de app laadt | 137 chunks, ~3.024 kB |
| Iconen die de app écht gebruikt | **230 uniek** (214 statisch geïmporteerd + 78 via naam in constanten, ontdubbeld) |
| Aandeel | **4,0%** |

Naar rato zou die chunk ~22 kB moeten zijn in plaats van 548. Dat is **ruim 17% van alle
JavaScript** die een gebruiker binnenhaalt, voor iconen die niemand ziet.

⚠️ **Let op bij het herhalen van deze meting.** Mijn eerste poging keek naar de 12 chunks
die de inlogpagina laadt en vond de proef-iconen *niet* — daar zit de app-UI niet in. Pas
na het volgen van de webpack-chunkverwijzingen (137 bestanden) kwam het echte beeld boven.
Een negatieve uitkomst op de verkeerde chunks leest als "geen probleem".

## De zeven bestanden

- `src/features/agents/components/AgentIcon.tsx`
- `src/components/EnhancedSidebarSimple.tsx`
- `src/components/GlobalSearchModal.tsx`
- `src/components/BreadcrumbNavigation.tsx`
- `src/components/brand-assets/BrandAssetCard.tsx`
- `src/components/layout/Breadcrumb.tsx`
- `src/components/shared/StatsCard.tsx`

Gevonden als bijvangst van de Claude Design-sync (sessie `branddock-app-f8`): hun
stand-alone design-system-bundel ging door één zo'n component van **155 kB naar 1727 kB**.
Dat getal geldt voor die bundel, niet voor de app — de app-cijfers hierboven zijn apart
gemeten.

# Voorstel

**Eén expliciet icoon-register** dat de gebruikte iconen bij naam importeert, en waar de
zeven bestanden hun lookup naartoe verplaatsen:

```ts
// src/lib/constants/icon-registry.ts
import { Bot, BarChart3, Users, /* … de ~230 die we gebruiken */ } from 'lucide-react';
export const ICONS = { Bot, BarChart3, Users, /* … */ } as const;
export type IconName = keyof typeof ICONS;
export const resolveIcon = (n: string): LucideIcon => ICONS[n as IconName] ?? Bot;
```

Statische named imports zijn wél tree-shakebaar, dus alleen wat in het register staat komt
in de bundel.

**De kunst zit in de dynamische namen.** `AgentIcon` en `EnhancedSidebarSimple` krijgen hun
naam uit data (agent-persona's uit de registry, module-config). Het register moet die set
dus dekken. Twee dingen zijn daarvoor nodig:

1. De ~78 namen die nu als `icon: 'X'` in constanten staan opnemen in het register.
2. Een guard die faalt als een constante een naam noemt die niet in het register staat —
   anders valt een agent stil terug op `Bot` zonder dat iemand het merkt.

Dat tweede punt is belangrijker dan de kilobytes: de huidige code faalt namelijk óók stil
(`icons[iconName] || Bot`), alleen valt dat nu niet op omdat élk icoon bestaat.

# Acceptatiecriteria

- [ ] `src/lib/constants/icon-registry.ts` bestaat met de gebruikte iconen als named imports
- [ ] De zeven bestanden gebruiken `resolveIcon()`; **nul** `import * as … from 'lucide-react'`
      resteert in `src/`
- [ ] Elke `icon: '<naam>'` in de constanten bestaat in het register — geverifieerd door een
      smoke, niet met het oog
- [ ] **De smoke is aantoonbaar in staat te falen**: verwijder één icoon uit het register en
      hij wordt rood mét de naam en de vindplaats (les 2026-08-18)
- [ ] ESLint-regel (`no-restricted-imports`) verbiedt de namespace-import van `lucide-react`,
      zodat dit niet terugkomt
- [ ] **Gemeten voor/na op een echte build**: de proef-iconen (`Volleyball` c.s.) zijn
      afwezig, en de dragende chunk is gekrompen. Noteer beide getallen.
- [ ] Visueel: sidebar, breadcrumbs, agent-tegels, stats-kaarten en brand-asset-kaarten tonen
      dezelfde iconen als voorheen — dit is de plek waar een ontbrekend register-item als
      stille `Bot`-terugval zichtbaar wordt
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/lib/constants/icon-registry.ts` — nieuw
- De zeven bestanden hierboven
- `scripts/smoke-tests/icon-registry.ts` — nieuw
- `eslint.config.*` — één `no-restricted-imports`-regel
- `package.json` + `.github/workflows/ci.yml` — smoke inhaken

# Bestanden die ik NIET aanraak

- De ~214 bestanden met gewone named imports (`import { Users } from 'lucide-react'`) — die
  zijn al tree-shakebaar en hoeven niet door het register.
- `src/components/ui/` — 36 van de 40 bestanden daar hebben nul importeurs (bevinding van
  dezelfde design-sync). Dode code opruimen is een aparte afweging.

# Smoke test plan

1. `npm run smoke:icon-registry` → elke `icon: '<naam>'` in de constanten zit in het register.
2. **Kalibratie**: haal één icoon uit het register → smoke rood met naam + vindplaats; zet terug.
3. `npx next build`, dan in `.next/static/chunks/*.js` zoeken naar `Volleyball`, `Wallpaper`,
   `Biohazard` → **0 treffers** (nu: alle drie aanwezig).
4. Grootte van de dragende chunk vóór en ná noteren (nu 548 kB).
5. `npm run dev`: sidebar, breadcrumbs, een agent-detailpagina, een dashboard met stats-kaarten
   en een brand-asset-kaart — alle iconen ongewijzigd, nergens een onbedoelde `Bot`.

# Risico's

- **Stille terugval naar `Bot`** als het register een naam mist. Dit bestaat vandaag al, maar
  wordt zichtbaarder zodra het register de enige bron is. Mitigatie: de smoke uit criterium 3,
  en in `development` een `console.warn` bij een misser.
- **Namen uit de database.** Als een agent-persona of module-icoon uit de DB komt en niet uit
  code-constanten, dekt een grep over `src/` de set niet volledig af. **Eerst controleren**
  waar `iconName` vandaan komt vóór het register wordt vastgezet; zo nodig de set aanvullen
  met een query over de bestaande rijen.
- **De winst kan lager uitvallen dan 526 kB.** De schatting is naar rato van het aantal
  exports; iconen verschillen in grootte. Daarom is criterium "gemeten voor/na" en niet
  "verwacht resultaat".

# Out of scope

- Dode code in `src/components/ui/` (36 van 40 bestanden zonder importeurs).
- Andere bundelgroottes: dit gaat alleen over `lucide-react`.
- Iconen vervangen of het icoonontwerp wijzigen — puur een import-kwestie.

# Notes

- Meetmethode, herbruikbaar: haal de HTML van de app op, verzamel de chunk-namen die de
  JS-bestanden onderling noemen (`grep -ohE '[a-z0-9_-]{8,}\.js'`), download die allemaal uit
  `/_next/static/chunks/`, en zoek dan op iconen waarvan je hebt vastgesteld dat `src/` ze
  nergens noemt. Alleen de chunks van de inlogpagina volstaat níét.
- `lucide-react` staat op 0.564.0 met 5740 exports.
