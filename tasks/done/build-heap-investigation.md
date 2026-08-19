---
id: build-heap-investigation
title: De TS-fase van next build past niet in 4GB — en we weten nu niet waaróm
fase: post-launch
priority: next
effort: 4-8 uur (meten eerst; de fix hangt af van wat de meting zegt)
owner: claude-code
status: done
created: 2026-08-18
completed: 2026-08-19
related-adr: -
related-spec: -
worktree: branddock-static-rendering-regressie
---

# Probleem

De TypeScript-fase van `next build` valt om op Node's default ~4GB-heap. CI draait
daarom sinds 2026-08-13 met `--max-old-space-size=8192` op de build-stap (en sinds
15-08 ook op de losse `tsc`-stap, met een andere aanleiding).

De verklaring die daarbij hoorde — inference over de 22-component-registry na de
Puck-exit, "type-versmalling is de echte oplossing" — is op **2026-08-18 gemeten
weerlegd**. `buildSpikePuckConfig` kreeg een benoemd retourtype (PR #295), de
bump ging er in PR #302 af, en de build viel alsnog om in exact dezelfde fase:

```
Running TypeScript ...
Mark-Compact 4028.2 (4130.1) -> 4013.4 (4130.9) MB
FATAL ERROR: Ineffective mark-compacts near heap limit
Next.js build worker exited with code: null and signal: SIGABRT
```

([run 32121296857](https://github.com/erikjager55/Branddock/actions/runs/32121296857).)

We staan dus met een werkende workaround en géén diagnose. Dat is te leven, maar het
groeit: elke nieuwe generieke laag duwt de piek verder omhoog, en de vólgende keer
dat 8GB niet meer volstaat is er nog steeds geen aanknopingspunt.

⚠️ **Dit is óók een waarschuwing over hoe je meet.** De vorige verklaring werd
aangenomen zonder meting en stond twee maanden als feit in `ci.yml`.

# Meting 2026-08-19 — waar gaat de heap heen?

Alles koud gemeten (élke `*.tsbuildinfo` verwijderd vóór de run) en met **piek-RSS**
via `/usr/bin/time -l`, niet met `Memory used` uit `--extendedDiagnostics`.

## ⚠️ Twee meetfouten die ik onderweg maakte, want ze zijn leerzamer dan de uitkomst

1. **Warm gemeten.** `incremental: true` staat aan; een tweede `tsc --noEmit` doet
   bijna niets. Mijn eerste meting gaf **14.974 instantiaties en 0,15s check-tijd**
   tegen koud **9.275.956 en 26,4s**. Elke `tsc`-gate die vandaag in deze repo
   gedraaid is, was warm — dat vangt nog steeds fouten in gewijzigde bestanden,
   maar het zegt niets over geheugen.
2. **De verkeerde maat.** `Memory used` is een momentopname ná GC. Toen ik 521
   bestanden uitsloot, ging dat getal **omhoog** (4,38 → 4,95 GB) terwijl de
   instantiaties met 6,6% daalden. Piek-RSS is de maat die telt bij een OOM.
   En zelfs mijn piek-RSS-script mat eerst warm, omdat het alleen
   `tsconfig.tsbuildinfo` wiste en niet de buildinfo van een experiment-config —
   dat gaf 2,05 GB waar koud 4,12 GB stond.

## Wat het wél is

| Configuratie | Piek-RSS (koud) |
|---|---:|
| Volledige tsconfig (huidig) | **4,95 GB** |
| Alleen de app (scripts + e2e uitgesloten) | 4,12 GB |
| Alleen scripts + prisma-scripts + e2e | 3,39 GB |

Node's default is ~4 GB, dus de app zit er **op zichzelf al overheen**. De 8GB-bump
is daarmee terecht en blijft nodig.

**Geen dominant bestand.** De trace wijst `prisma/scripts/migrate-personality-to-voiceguide.ts`
aan als duurste (9,8s, waarvan 3,27s in één `structuredTypeRelatedTo` op de aanroep
`computeCentroid(prisma, …)` — de volledige `PrismaClient` als parameter). Dat is
versmald tot `Pick<PrismaClient, "$executeRaw">`, want die functie gebruikt precies
één lid. Effect, koud gemeten: **−192.576 instantiaties (−2,1%)**. Instantiaties zijn
deterministisch (twee runs exact gelijk), dus dat is echt — maar het is 2%.

**Wat de massa wél verklaart**: 8236 bestanden, 4,65M symbolen, 2,08M types.
`node_modules/.prisma/client/index.d.ts` is in zijn eentje **451.394 regels** — 37%
van alle 1.231.201 definitieregels — en ~210.000 van de 2,08M types (≈10%) hebben
een Prisma-herkomst. Het is een brede optelsom met één grote dependency erin, geen
enkel app-bestand dat eruit springt.

## Conclusie

**De heap-bump is het eindantwoord, niet een TODO.** Type-versmalling per aanroep
levert ~2% per geval; je hebt er tientallen nodig voor één GB. De vorige verklaring
("inference over de 22-component-registry") is op 18-08 al weerlegd; deze meting
vervangt hem door een cijfer in plaats van een nieuw vermoeden.

## Optie die op tafel blijft (niet doorgevoerd)

De app-tsconfig checkt 402 script-bestanden plus de e2e-suite mee (`include: **/*.ts`,
alleen `node_modules` en `integrations` uitgesloten). Ze splitsen scheelt **0,83 GB
op de app-piek** (4,95 → 4,12 GB) en geeft twee processen die elk beter passen.

Niet doorgevoerd, om drie redenen: het haalt de bump er níét af (4,12 GB blijft boven
4 GB), CI draait op 8 GB dus het praktische effect is vandaag nul, en het kost een
tweede config plus mogelijk editor-dekking voor die 402 bestanden. Het is winst in
hoofdruimte, geen oplossing — en daarmee een keuze voor Erik, niet voor mij.

# Voorstel

**Eerst meten, dan pas iets versmallen.** Concreet, in deze volgorde:

1. `tsc --generateTrace <dir>` op de build-tsconfig, en de trace lezen met
   `analyze-trace` — die noemt de dure `checkExpression`/`checkVariableDeclaration`
   hotspots per bestand met hun kosten.
2. Kruis dat met `--extendedDiagnostics` (koud gemeten: ~9,06M instantiaties,
   ~4,0GB) om te zien of één bestand domineert of dat het een brede optelsom is.
   Die twee gevallen vragen tegengestelde acties.
3. Pas dán bepalen wat er versmalt — of concluderen dat de heap-bump het
   eindantwoord is en dat als bewuste keuze vastleggen in plaats van als TODO.

# Acceptatiecriteria

- [ ] Trace gedraaid en de top-5 duurste bestanden/expressies benoemd met hun kosten
- [ ] Vastgesteld: één dominante bron of een brede optelsom
- [ ] Per bevinding een verdict: versmalbaar / inherent aan de stack / niet de moeite
- [ ] Als er iets versmalt: **opnieuw meten op de runner** met de bump eraf (dat is
      de enige geldige toets — zie hieronder)
- [ ] Als er niets versmalt: de bump in `ci.yml` herschrijven van workaround naar
      bewuste keuze, mét de meting erbij
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# ⚠️ Lokaal meten misleidt

macOS schaalt de V8-heap mee met het beschikbare RAM; de runner niet. Op deze
machine slaagt een build met `--max-old-space-size=4096` **ook zonder enige fix**,
en gaf een A/B met en zonder de #295-annotatie 9.059.620 vs 9.059.610 instantiaties
— tien verschil. Een lokale groene build bewijst hier dus niets. De enige geldige
toets is een CI-run met de bump eraf.

Praktisch punt uit #302: een PR waarvan de branch conflicteert met main krijgt
géén Actions-run (GitHub kan dan geen merge-ref berekenen). Rebase eerst, anders
wacht je op een run die nooit komt.

# Bestanden die ik NIET aanraak

- De 8GB-bump op de losse `tsc`-stap: andere aanleiding (brandstyle-stack
  #255-#259) en verdient een eigen meting. Twee dingen tegelijk meten is geen meting.

# Smoke test plan

Niet van toepassing — dit is een meet-taak. Het bewijs is de trace-output plus,
bij een voorgestelde fix, één CI-run met de bump eraf.

# Risico's

- **Trace-analyse levert een brede optelsom op** en dus geen aangrijpingspunt. Dan is
  het antwoord "de bump blijft, bewust" — ook een uitkomst, mits opgeschreven.
- **Verleiding om op gevoel te versmallen.** Dat is precies wat deze taak wil
  voorkomen; zonder meting geen wijziging.

# Notes

Voorgeschiedenis staat in `tasks/done/lp-review-followups.md` (robuustheid-sectie): daar
begon dit als "registry-type versmallen" en daar staat ook wat de annotatie wél
opleverde — een benoemd registry-contract in plaats van een geïnfereerd type dat
elke consument opnieuw instantieert. Die winst blijft, los van de heap.
