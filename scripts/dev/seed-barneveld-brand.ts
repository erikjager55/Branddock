// Seed: merk-DNA van gemeente Barneveld (klant-workspace) op basis van
// aangeleverde brondocumenten + kanaal-analyse (2026-07-20):
//   - Huisstijlhandboek v0.8 (Public Cinema, 2024): logo, kleuren, typografie,
//     vormentaal, iconen, tekst-regels
//   - FotografieWijzer v1.0: merkwaarden, maatschappelijke opgaven,
//     fotografische principes + genre-richtlijnen
//   - Schrijfwijzer & taaltips v0.1 (november 2024, verwerkt 2026-07-21):
//     B1-schrijfregels, ambtelijke-woordenlijst, huisstijl-schrijfafspraken,
//     standaard tekstblokken (aanhef/afsluiting/bezwaar)
//   - Kanaal-analyse: barneveld.nl (taakgericht, u-vorm, B1),
//     Instagram/LinkedIn (je-vorm, uitnodigend; LinkedIn "Blij met Barneveld")
// Bewust NIET gevuld: persona's, producten, concurrenten, strategie en de
// overige brand-assets — daar zeggen de documenten niets over; dat vult de
// gemeente zelf in Branddock. Logo-bestanden ontbreken (alleen PDF) — TODO.
// Prod-migratie daarna:
//   npx tsx scripts/migrate-brand-dna/export.ts "Gemeente Barneveld" <bundle.json>
//   npx tsx scripts/migrate-brand-dna/import.ts <bundle.json> --email ... --slug ... --confirm-host ...
// Idempotent: bestaande "gemeente-barneveld"-workspace wordt eerst verwijderd.
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/seed-barneveld-brand.ts

import { prisma } from "../../src/lib/prisma";
import type { AssetCategory } from "@prisma/client";
import { CANONICAL_BRAND_ASSETS } from "../../src/lib/constants/canonical-brand-assets";

const ORG_ID = "demo-org-branddock-001";
const USER_ID = "demo-user-erik-001";
const WS_SLUG = "gemeente-barneveld";
const WS_NAME = "Gemeente Barneveld";

// Slugs waarvoor de brondocumenten écht inhoud leveren; de rest blijft DRAFT.
const FILLED_SLUGS = new Set(["core-values", "brand-personality", "brand-story", "transformative-goals"]);

async function main() {
  console.log("# Seed: Gemeente Barneveld merk-DNA\n");

  // ── 0. Verse workspace ────────────────────────────────────────────────
  const existing = await prisma.workspace.findFirst({ where: { slug: WS_SLUG } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: existing.id } });
    console.log("bestaande gemeente-barneveld-workspace verwijderd");
  }
  const workspace = await prisma.workspace.create({
    data: { name: WS_NAME, slug: WS_SLUG, organizationId: ORG_ID, contentLanguage: "nl" },
  });
  const brand = await prisma.brand.upsert({
    where: { workspaceId: workspace.id },
    create: { workspaceId: workspace.id },
    update: {},
  });
  await prisma.brandLocaleProfile.upsert({
    where: { workspaceId_locale: { workspaceId: workspace.id, locale: "nl-NL" } },
    create: { brandId: brand.id, workspaceId: workspace.id, locale: "nl-NL", isDefault: true },
    update: { isDefault: true },
  });
  console.log(`workspace ${workspace.id} (${WS_NAME}, nl)`);

  // ── 1. De 11 canonieke brand-assets (4 gevuld, 7 DRAFT) ───────────────
  for (const asset of CANONICAL_BRAND_ASSETS) {
    const filled = FILLED_SLUGS.has(asset.slug);
    await prisma.brandAsset.create({
      data: {
        name: asset.name,
        slug: asset.slug,
        category: asset.category as AssetCategory,
        description: asset.description,
        frameworkType: asset.frameworkType,
        status: filled ? "IN_PROGRESS" : "DRAFT",
        coveragePercentage: filled ? 60 : 0,
        validatedCount: 0,
        aiValidated: false,
        workspaceId: workspace.id,
      },
    });
  }

  const fd = (slug: string, frameworkData: Record<string, unknown>, content?: string) =>
    prisma.brandAsset.updateMany({
      where: { slug, workspaceId: workspace.id },
      data: { frameworkData: frameworkData as object, ...(content ? { content } : {}) },
    });

  // Merkwaarden — definities letterlijk uit de FotografieWijzer v1.0 (p2);
  // het huisstijlhandboek noemt daarnaast "betrouwbaar" (zonder uitwerking).
  await fd(
    "core-values",
    {
      anchorValue1: {
        name: "Gastvrij",
        description:
          "Nieuwsgierig, luisteren met aandacht en weten wat er speelt. Iedereen mag er zijn en voelt zich welkom!",
      },
      anchorValue2: {
        name: "Verbindend",
        description: "In contact met elkaar en met de samenleving. Elkaar kennen en samenwerken. Doen.",
      },
      aspirationValue1: {
        name: "Ondernemend",
        description:
          "Initiatiefrijk en ontdekkend wat er beter kan. Creatief en met lef. Kansen en mogelijkheden benutten. Talenten inzetten. Oplossingsgericht!",
      },
      aspirationValue2: {
        name: "Wendbaar",
        description:
          "We zetten onze talenten in om kansen en mogelijkheden te benutten, we kunnen snel handelen en passen ons slim aan als de omgeving daarom vraagt. Elke verandering is voor ons een uitdaging die we aangaan.",
      },
      ownValue: {
        name: "Betrouwbaar",
        description:
          "In het huisstijlhandboek als merkwaarde genoemd; de FotografieWijzer werkt deze niet verder uit — invulling nog te bekrachtigen door de gemeente.",
      },
      valueTension:
        "Wendbaar en ondernemend versus betrouwbaar: een groeigemeente wil snel inspelen op kansen, terwijl inwoners en ondernemers op de gemeente moeten kunnen bouwen.",
    },
    "Vier uitgewerkte merkwaarden uit de FotografieWijzer v1.0: gastvrij, ondernemend, verbindend en wendbaar. Het huisstijlhandboek noemt daarnaast betrouwbaar. Deze waarden sturen ook de beeldtaal: connectie, beweging en creatief lef.",
  );

  await fd(
    "brand-personality",
    {},
    "Merkpersoonlijkheid gemeente Barneveld (bron: huisstijlhandboek v0.8 + FotografieWijzer v1.0):\n\n1. **Gastvrij** — nieuwsgierig, luistert met aandacht, iedereen voelt zich welkom.\n2. **Ondernemend** — initiatiefrijk, creatief en met lef; oplossingsgericht.\n3. **Verbindend** — in contact met elkaar en met de samenleving; samenwerken en doen.\n4. **Wendbaar** — snel handelen en slim aanpassen als de omgeving daarom vraagt.\n5. **Betrouwbaar** — genoemd in het huisstijlhandboek (niet verder uitgewerkt).\n\nHouding in communicatie: laagdrempelig, praktisch, eenvoudig en logisch. En altijd: communiceer mét inwoners, ondernemers en bezoekers — niet óver hen. Barneveld presenteert zich als dynamische groeigemeente: middelgroot en slagvaardig, flexibel, met dynamiek en ruimte voor innovatie ('eenvoudig en goed').",
  );

  await fd(
    "brand-story",
    {},
    "Barneveld is een dynamische groeigemeente: van ruim 60.000 inwoners nu naar zo'n 85.000 in 2040. Die groei is het verhaal — er wordt gebouwd, ondernomen en samengeleefd in een gemeente die groot genoeg is om slagvaardig te zijn en klein genoeg om elkaar te kennen.\n\nDe belofte daarbij is de pay-off: **Samen impact maken**. De gemeente wil kernwaarden gastvrij, ondernemend, verbindend en wendbaar terug laten komen in alles — van dienstverlening tot beeldtaal. Niet óver inwoners, ondernemers en bezoekers communiceren, maar mét hen.\n\nDe huisstijl (Public Cinema, 2024) vertaalt dat naar een herkenbaar gezicht: het teal-groene beeldmerk met de kippenpoot en veer — een knipoog naar de agrarische identiteit — met warm oranje, golvende vormen en frisse, energieke fotografie vol échte mensen, connectie en beweging.",
  );

  // "Maatschappelijke opgaven" uit de FotografieWijzer v1.0 (p2).
  await fd(
    "transformative-goals",
    {},
    "Maatschappelijke opgaven (bron: FotografieWijzer v1.0):\n\n1. **Een passende ontwikkeling van Barneveld** — waar het prettig en veilig wonen, werken, vervoeren en samenleven is.\n2. **Een duurzaam Barneveld** — met een gezonde en fijne omgeving om in te leven, nu en in de toekomst.\n3. **Een waardevol landelijk gebied** — met perspectief voor de landbouw en werken aan transitie van het landelijk gebied en natuur- en landschapsherstel.\n4. **Een open en bereikbare gemeente** — die er voor Barneveld is, goed luistert naar inwoners, samenwerkt, uitgaat van de eigen kracht van inwoners en hen ondersteunt daar waar het nodig is.\n5. **Iedereen doet mee** — waar iedereen ertoe doet en gelijke kansen krijgt.",
  );

  console.log("4 brand-assets gevuld (core-values, personality, story, opgaven); 7 als DRAFT klaargezet");

  // ── 2. Brand voice + kanaaltonen ──────────────────────────────────────
  await prisma.brandVoiceguide.create({
    data: {
      workspaceId: workspace.id,
      source: "manual",
      contentLocale: "nl-NL",
      createdById: USER_ID,
      voiceDescription:
        "Gemeente Barneveld communiceert laagdrempelig, praktisch, eenvoudig en logisch — Begrijpelijke Taal (B1) is de norm. De grondhouding: communiceer mét inwoners, ondernemers en bezoekers, niet óver hen. In formele en service-communicatie is de aanspreekvorm u; in werving en op social media je/jij. De toon is gastvrij en verbindend: uitnodigend, zonder ambtelijk jargon, met de pay-off 'Samen impact maken' als belofte. De Schrijfwijzer & taaltips (v0.1, november 2024) maakt dit concreet: zinnen van maximaal 12-15 woorden, actieve vorm, geen afkortingen en geen ambtelijk of ouderwets taalgebruik.",
      // 1-7-schaal, 4 = neutraal: iets formeler en serieuzer dan neutraal,
      // duidelijk respectvol, feitelijk met ruimte voor enthousiasme op social.
      toneDimensions: {
        formalCasual: 3,
        seriousFunny: 3,
        respectfulIrreverent: 2,
        matterOfFactEnthusiastic: 4,
      },
      contentGuidelines: [
        "Communiceer mét inwoners, ondernemers en bezoekers — niet óver hen",
        "Schrijf volgens Begrijpelijke Taal (bewaakt door Team Communicatie); taalniveau B1",
        "Aanspreekvorm: u in formele en service-communicatie, je/jij als we direct jongeren aanspreken en op social media",
        "Begin met de belangrijkste boodschap; werk met een kop en korte tussenkoppen (max 3 woorden), gebruik opsommingen; alinea's van 2-10 zinnen, max 5 alinea's per tussenkop (Schrijfwijzer)",
        "Maximaal 12-15 woorden per zin; één mededeling per zin, één onderwerp per alinea",
        "Wees concreet: 'De beoordeling duurt 5 werkdagen', niet 'enige tijd'; vermijd vage taal (aspecten, bepaalde factoren, tot op zekere hoogte, na verloop van tijd)",
        "Leg vaktermen uit — wat voor de gemeente logisch is (burgerparticipatie, verordening, inspraakavond) is dat voor een inwoner niet",
        "Maak het persoonlijk met een herkenbare vraag ('Heeft u hulp nodig bij het aanvragen van studietoeslag?') en herhaal belangrijke informatie",
        "OBSERVED: barneveld.nl is taakgericht (toptaken-model): korte imperatieve koppen ('Verhuizing doorgeven'), u-vorm, weinig omhaal",
        "OBSERVED: social media gebruikt de je-vorm en een uitnodigende, activerende toon ('Heb jij ideeën over de toekomst van gemeente Barneveld?')",
        "OBSERVED: LinkedIn combineert vacatures met projectnieuws in een trots-op-inwoners-frame ('Dankzij jou bloeit Barneveld', 'Blij met Barneveld')",
        "RECOMMENDED: gebruik de pay-off 'Samen impact maken' als afsluiter waar dat past",
      ],
      writingGuidelines: [
        "Geen woorden in KAPITALEN — nadruk via zinsbouw, niet via hoofdletters",
        "Cursief of onderstreept alleen als accent of voor URL's en e-mailadressen",
        "Geen woordafbrekingen; tekst linkslijnend met vrije regelval",
        "Actieve zinnen: 'De wethouder neemt morgen het besluit', niet 'Het besluit wordt morgen genomen door de wethouder'",
        "Leg verbanden met signaalwoorden: omdat, daarom, daarna, hoewel, ten eerste, voordat, bovendien",
        "Gebruik het werkwoord in plaats van het zelfstandig naamwoord; houd samengestelde woorden bij elkaar ('wilt aanmelden', niet 'aan wilt melden'); vermijd samentrekkingen ('eerst de interne, daarna de externe onderdelen', niet 'de in- en externe')",
        "Vermijd uitdrukkingen die letterlijk opgevat kunnen worden: op de hoogte, gepaard gaan met, tekortschieten, aan het licht komen, vindt plaats",
        "Geen afkortingen: d.w.z. en o.a. voluit schrijven; wetten de eerste keer voluit met de afkorting tussen haakjes, daarna de afkorting (bron: wetten.nl)",
        "Huisstijl-schrijfafspraken: enkele aanhalingstekens; bedragen als € 100,- / € 12.345,67; data voluit ('1 augustus', huidig jaartal weglaten); getallen in cijfers met duizendtallen-punt (1.500); tijden als 8.00 uur / 18.30 uur; telefoonnummers als 012 345 67 89 of 06-12 34 56 78",
      ],
      vocabularyDo: ["Samen impact maken", "samen", "welkom", "meedoen", "denk mee", "inwoners", "ondernemers", "bezoekers"],
      // Ambtelijke-woordenlijst uit de Schrijfwijzer (p15): niet gebruiken → wél.
      vocabularyDont: [
        "ten behoeve van",
        "in het kader van",
        "ter inzage leggen (zonder uitleg)",
        "circa (zeg: ongeveer)",
        "conform / op grond van (zeg: volgens)",
        "constateren (zeg: vaststellen)",
        "door middel van (zeg: door, via, met)",
        "echter (zeg: maar)",
        "gang van zaken (zeg: ontwikkeling, proces)",
        "geenszins (zeg: niet)",
        "gehoor geven aan (zeg: doen)",
        "indien (zeg: als)",
        "in aanmerking komen voor (zeg: krijgen)",
        "jegens (zeg: tegenover)",
        "locatie (zeg: plaats, plek, gebouw)",
        "met betrekking tot / ten aanzien van (zeg: over)",
        "op het punt staan om (zeg: beginnen met)",
        "realiseren (zeg: maken, bouwen)",
        "spoedig (zeg: snel)",
        "tevens (zeg: ook)",
        "thans (zeg: nu)",
        "van mening zijn (zeg: vinden)",
      ],
      wordsWeUse: ["gastvrij", "ondernemend", "verbindend", "wendbaar", "groeigemeente"],
      wordsWeAvoid: ["derhalve", "middels", "geschiedt", "reeds", "c.q."],
      voiceSample:
        "Barneveld groeit: van ruim 60.000 inwoners nu naar zo'n 85.000 in 2040. Dat vraagt om keuzes — over wonen, werken en bereikbaarheid. Die keuzes maken we niet óver u, maar mét u. Denk mee tijdens de inloopavond in het gemeentehuis, of geef uw idee door via barneveld.nl. Samen impact maken: zo werkt dat in Barneveld.",
      // Per-kanaal toon-overrides op de globale baseline. ads = wervingscommunicatie
      // ("Werken bij") — het handboek staat daar expliciet de je-vorm toe.
      channelTones: {
        website: {
          description:
            "Taakgericht en zakelijk-toegankelijk: u-vorm, korte imperatieve koppen ('Verhuizing doorgeven', 'Afval aanbieden'), B1-niveau, dienstverlening voorop. Formeler dan de baseline.",
          axisShift: { axis: "formalCasual", direction: "decrease" },
        },
        socialMedia: {
          description:
            "Persoonlijk en uitnodigend in de je-vorm: activerend ('Heb jij ideeën? Denk mee!') en trots op inwoners en ondernemers ('Dankzij jou bloeit Barneveld'). Instagram/Facebook: nieuws, evenementen en campagnes met beeld voorop. LinkedIn: werving en projecten — iets zakelijker, maar nog steeds je-vorm.",
          axisShift: { axis: "formalCasual", direction: "increase" },
        },
        email: {
          description:
            "Servicegericht en begrijpelijk: u-vorm, één onderwerp per bericht, altijd een duidelijke vervolgstap. Volgt Begrijpelijke Taal. Brieven volgens de Schrijfwijzer-tekstblokken: aanhef 'Geachte heer/mevrouw <achternaam>,', afsluiting 'Met vriendelijke groet, Namens burgemeester en wethouders' + naam en functie; vast vragen-blok ('Heeft u vragen? Bel naar 14 0342 of mail.') en bezwaar-blok (eerst contact opnemen, daarna bezwaar binnen 6 weken via barneveld.nl/bezwaar).",
          axisShift: null,
        },
        ads: {
          description:
            "Wervingscommunicatie ('Werken bij') mag in de je-vorm: energiek en uitnodigend, met 'Samen impact maken' als afzender-belofte. Merkwaarden gastvrij en ondernemend zichtbaar maken.",
          axisShift: { axis: "matterOfFactEnthusiastic", direction: "increase" },
        },
      },
      examplePhrases: [
        { text: "Heb jij ideeën over de toekomst van gemeente Barneveld? Denk mee!", type: "do" },
        { text: "Dankzij jou bloeit Barneveld.", type: "do" },
        { text: "Verhuizing doorgeven? Dat regelt u eenvoudig online via barneveld.nl.", type: "do" },
        { text: "U bent nieuw in onze gemeente. Het is belangrijk dat u deelneemt aan het inburgeringsprogramma.", type: "do" },
        { text: "Bent u het niet eens met dit besluit? Neem dan eerst contact op. Bel naar 14 0342.", type: "do" },
        { text: "LET OP: aanvragen geschiedt UITSLUITEND middels het digitale loket.", type: "dont" },
        { text: "In het kader van het participatietraject worden burgers geacht kennis te nemen van de ter inzage gelegde stukken.", type: "dont" },
        { text: "Gezien het feit dat u zich recentelijk in onze gemeente hebt gevestigd, willen wij u erop attenderen dat het van belang is om deel te nemen aan het inburgeringsprogramma.", type: "dont" },
      ],
      antiPatterns: [
        "Woorden in KAPITALEN voor nadruk",
        "Ambtelijk jargon (derhalve, middels, geschiedt)",
        "Óver inwoners praten in plaats van mét hen",
        "Lange zinnen met meerdere bijzinnen (max 12-15 woorden per zin)",
        "Lijdende vorm ('er wordt', 'wordt door') waar een actieve zin kan",
        "Vage taal: aspecten, bepaalde factoren, herhaaldelijk, tot op zekere hoogte, na verloop van tijd",
        "Afkortingen (d.w.z., o.a.) en wetsafkortingen zonder eerste voluit-vermelding",
      ],
      voiceDnaSavedForAi: true,
      vocabularySavedForAi: true,
      channelTonesSavedForAi: true,
      antiPatternsSavedForAi: true,
      guidelinesSavedForAi: true,
      examplePhrasesSavedForAi: true,
    },
  });
  console.log("brand voice + kanaaltonen gevuld (website/social/email/werving)");

  // ── 3. Brandstyle (huisstijlhandboek v0.8 + FotografieWijzer v1.0) ────
  const styleguide = await prisma.brandStyleguide.create({
    data: {
      status: "COMPLETE",
      sourceType: "PDF",
      sourceFileName: "Barneveld_huisstijlhandboek_0.8.pdf + Barneveld_richtlijnenfotografie_1.0.pdf",
      sourceUrl: "https://www.barneveld.nl",
      analysisStatus: "COMPLETE",
      // Publish-gate: zonder published voedt de styleguide getBrandContext niet.
      published: true,
      designPhilosophy:
        "Laagdrempelig, eenvoudig en logisch: een vast palet rond teal-groen en warm oranje, golvende curves als vormentaal (meerkleurig zonder foto, monochrome gradiënt op foto) en frisse full-colour fotografie vol échte mensen, connectie en beweging. Verlopen alleen bij speciale gelegenheden; geen kleuren buiten het palet.",
      logoGuidelines: [
        "Full-colour logo (teal beeldmerk kippenpoot+veer, oranje woordmerk 'gemeente Barneveld') alleen op een witte achtergrond",
        "Diapositief (wit) op donkere achtergronden en foto's; zwart alleen als kleur technisch niet kan",
        "Beeldmerk-only is digitaal toegestaan (avatars, favicons, kleine formaten)",
        "Altijd links boven of links onder plaatsen — nooit centreren; vaste verhouding beeldmerk/woordmerk",
        "Beschermde ruimte rondom respecteren; maat-trap: 100% basis, 80% A4, 60% A5, 30% visitekaartje",
      ],
      logoDonts: [
        "Niet centreren",
        "Niet uitrekken, roteren of de verhouding beeldmerk/woordmerk wijzigen",
        "Geen full-colour logo op gekleurde vlakken of foto's",
      ],
      logoSavedForAi: true,
      colorDonts: [
        "Geen kleuren buiten het vaste palet",
        "Kleurverlopen alleen bij speciale gelegenheden",
        "Tekst-contrast minimaal 4,5:1 (3:1 bij tekst vanaf 18pt of 14pt vet)",
        "Groen draagt de hoofdrol (zwart belangrijk in tekst); secundaire kleuren alleen ondersteunend",
      ],
      colorsSavedForAi: true,
      primaryFontName: "Bree Serif (regular — titels, korte teksten en quotes)",
      primaryFontUrl: "https://fonts.google.com/specimen/Bree+Serif",
      additionalFonts: [
        "Fira Sans regular — bodytekst en kleine koppen",
        "Fira Sans medium/bold — subtitels",
      ],
      typographySavedForAi: true,
      photographyStyle: {
        style:
          "Full colour, fris en contrastrijk: échte mensen in échte situaties, natuurlijk perspectief en niet zichtbaar geposeerd",
        mood: "Gastvrij, energiek en optimistisch — de merkwaarden zingen mee op de achtergrond",
        composition:
          "Drie basisprincipes: connectie (zichtlijnen, interactie), beweging (sporen, opspattend water, suggestie van beweging) en ondernemend/creatief lef (spannend perspectief, veraf/dichtbij, spel met zon en licht, doorkijkjes). Scherp onderwerp met ruimte eromheen.",
      },
      photographyGuidelines: [
        "Elk beeld draagt de drie principes: connectie, beweging en ondernemend/creatief lef",
        "Portretten: dynamische maar vervaagde achtergrond (wegen, trappen, raampartijen), actieve open houding — geen armen over elkaar; brandpuntsafstand liefst >100mm; bewolkte dag werkt vaak beter dan felle zon",
        "Contextuele portretten: de omgeving maakt de context herkenbaar, maar blijft ondersteunend",
        "Pers-, reportage- en evenementenfotografie: dynamiek via activiteit en betrokkenheid, in verbinding en niet geposeerd",
        "AVG: herkenbare personen in close-up alleen met toestemming; deelnemers kunnen aangeven niet op de foto te willen; meld bij evenementregistratie dat er foto- en video-opnamen gemaakt kunnen worden",
        "Werklocatie: werkactie zichtbaar, vage voorgrond-elementen voor diepte, mensen dagelijkse handelingen laten verrichten voor natuurlijke houdingen",
        "Landschap (ruraal en urbaan): golden hours benutten, bestaande lijnen en structuren, menselijke elementen voor gevoel van verhouding, beweging in beeld (treinen, fietsers, stromend water); typisch Barneveldse elementen gebruiken",
        "Drone: recht van boven is vaak interessanter dan schuin; diepte, structuur en reflecties toevoegen",
        "Stockfotografie: Nederlandse, realistische uitstraling; zo close-up mogelijk zodat een Amerikaanse context wegvalt; kleurrijk en fris met hoog contrast",
        "Gevoelige doelgroepen discreet in beeld brengen",
        "Nabewerking: HDR of extra contrast (texture/unsharp mask); aanleveren in .tiff en/of Photoshop-lagenbestand",
      ],
      illustrationGuidelines: [
        "Foto waar mogelijk; illustratie alleen functioneel — bij complexe uitleg of AVG-gevoelige situaties; herkenbaar, menselijk, helder en geloofwaardig",
        "Iconen: OpenGemeenten-set (open source), teal lijniconen, positief of diapositief, uitsluitend informatief gebruiken",
        "Vormentaal: golvende curves — meerkleurig (vaste verhouding groen/lichtgroen-tint/geel/oranje) zonder foto, monochrome gradiënt op foto; spiegelen toegestaan; kleurvarianten per secundaire kleur",
      ],
      imageryDonts: [
        "Zichtbaar geposeerde of overgestylede mensen (armen over elkaar, stijf naast elkaar in de rij)",
        "Selfie- of smartphonekwaliteit voor portretten",
        "Vlakke rechttoe-rechtaan landschappen of gebouwen zonder licht, lijnen of menselijke schaal",
        "Stockbeeld met zichtbaar Amerikaanse context",
      ],
      imagerySavedForAi: true,
      workspaceId: workspace.id,
      createdById: USER_ID,
    },
  });

  const colors = [
    { name: "Barneveld-groen", hex: "#00747A", rgb: "rgb(0, 116, 122)", hsl: "hsl(183, 100%, 24%)", category: "PRIMARY", tags: ["hoofdkleur", "PMS 322C", "beeldmerk"], contrastWhite: "AA", contrastBlack: "Fail", sortOrder: 0 },
    { name: "Groen 66%", hex: "#319196", rgb: "rgb(49, 145, 150)", hsl: "hsl(183, 51%, 39%)", category: "PRIMARY", tags: ["tint", "ook: #7fb9bc (33%), #cce4e5 (10%)"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 1 },
    { name: "Barneveld-oranje", hex: "#E37222", rgb: "rgb(227, 114, 34)", hsl: "hsl(25, 78%, 51%)", category: "PRIMARY", tags: ["hoofdkleur", "PMS 158C", "woordmerk"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 2 },
    { name: "Oranje 66%", hex: "#EA8E4C", rgb: "rgb(234, 142, 76)", hsl: "hsl(25, 79%, 61%)", category: "PRIMARY", tags: ["tint", "ook: #f2b88f (33%), #fae3d3 (10%)"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 3 },
    { name: "Geel", hex: "#FFCD03", rgb: "rgb(255, 205, 3)", hsl: "hsl(48, 100%, 51%)", category: "SECONDARY", tags: ["secundair", "20%-tint: #fdf6cd"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 4 },
    { name: "Lichtgroen", hex: "#9EC043", rgb: "rgb(158, 192, 67)", hsl: "hsl(76, 50%, 51%)", category: "SECONDARY", tags: ["secundair", "20%-tint: #ecf3da"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 5 },
    { name: "Lichtblauw", hex: "#43A7DE", rgb: "rgb(67, 167, 222)", hsl: "hsl(201, 70%, 57%)", category: "SECONDARY", tags: ["secundair", "20%-tint: #daeef8"], contrastWhite: "Fail", contrastBlack: "AA", sortOrder: 6 },
    { name: "Donkerblauw", hex: "#002776", rgb: "rgb(0, 39, 118)", hsl: "hsl(220, 100%, 23%)", category: "SECONDARY", tags: ["secundair", "10%-tint: #e7ebf3"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 7 },
    { name: "Grijs", hex: "#EDEFED", rgb: "rgb(237, 239, 237)", hsl: "hsl(120, 6%, 93%)", category: "NEUTRAL", tags: ["tertiair", "kaders", "online"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 8 },
    { name: "Zwart", hex: "#000000", rgb: "rgb(0, 0, 0)", hsl: "hsl(0, 0%, 0%)", category: "NEUTRAL", tags: ["tekst"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 9 },
  ] as const;
  for (const color of colors) {
    await prisma.styleguideColor.create({
      data: { ...color, tags: [...color.tags], styleguideId: styleguide.id },
    });
  }
  console.log("brandstyle gevuld (10 kleuren, Bree Serif + Fira Sans, fotografie-principes, published)");

  console.log(`\n✅ Klaar. Workspace-id: ${workspace.id}`);
  console.log("Let op: logo-bestanden ontbreken (alleen als PDF beschikbaar) — SVG's later uploaden in Brandstyle.");
  console.log(`Volgende stap: npx tsx scripts/migrate-brand-dna/export.ts "${WS_NAME}" <bundle.json>`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
