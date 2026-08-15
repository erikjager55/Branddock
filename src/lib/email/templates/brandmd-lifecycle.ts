// =============================================================
// brand.md lifecycle-mails 2.2 t/m 2.5 — Nederlands
//
// Herschreven 2026-08-15 na review. Wat er veranderde en waarom:
//
//  1. ÉÉN CTA per mail. De vorige versie had er twee tot drie naast
//     elkaar; 2.5 zette "download het bestand (voor altijd van jou)"
//     pal naast "claim een workspace" en ondermijnde daarmee zijn
//     eigen vraag. Secundaire links staan nu in de voettekst.
//  2. Elke mail opent met iets uit HUN scan. De oude reeks was
//     onderling uitwisselbaar — precies het tegendeel van de belofte
//     "een merkbestand dat je merk kent".
//  3. Oplopend commitment: gebruiken (2.2) → vergelijken (2.3) →
//     aanvullen (2.4) → beslissen (2.5). 2.2 en 2.3 vragen bewust
//     nog niet om een claim: wie het bestand nog nooit gebruikte,
//     heeft geen reden om te betalen.
//  4. Nederlands, want de generator-funnel is dat ook.
//
// Alle bodies zijn opgebouwd uit de primitives in `_layout.ts`, zodat
// het format identiek is aan de overige transactionele mail.
// =============================================================

import { renderLayout, renderCta, paragraph, note, link, bulletList, escape } from './_layout';

export type LifecycleStage = '2.2' | '2.3' | '2.4' | '2.5';

export interface LifecycleEmailVars {
  brandName: string;
  domain: string;
  score: number | null;
  downloadUrl: string;
  claimUrl?: string;
  generatorUrl: string;
  useHubUrl: string;
  unsubscribeUrl: string;
  generatedAt: Date;
  expiresAt: Date;
  /** Secties die de scan niet kon bevestigen — voedt mail 2.4. */
  unvalidatedSections?: string[];
  /** Of de scan een herkenbare tone-of-voice vond — voedt mail 2.2. */
  hasVoice?: boolean;
  /** Wat de scan over de positionering concludeerde — voedt mail 2.4.
   *  Verschilt écht per merk, in tegenstelling tot de sectie-telling. */
  inferredPositioning?: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SECTION_LABELS: Record<string, string> = {
  strategy: 'strategie',
  voice: 'tone-of-voice',
  visual: 'visuele identiteit',
  audience: 'doelgroep',
  products: 'producten',
};

const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/** Nederlandse datumnotatie — ISO in een klantmail leest machinaal. */
function dutchDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Somt secties op als lopende tekst: "strategie, doelgroep en producten". */
function listSections(keys: string[]): string {
  const labels = keys.map((k) => SECTION_LABELS[k] ?? k);
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}`;
}

export function renderLifecycleEmail(stage: LifecycleStage, vars: LifecycleEmailVars): RenderedEmail {
  switch (stage) {
    case '2.2':
      return renderUse(vars);
    case '2.3':
      return renderCompare(vars);
    case '2.4':
      return renderComplete(vars);
    case '2.5':
      return renderExpiry(vars);
  }
}

// ─── 2.2 — activatie: krijg het bestand in een tool ───
// Conversiedoel: gebruik, NIET de claim. Eén echte "aha" is meer waard
// dan een vroege verkooppoging aan iemand die het bestand nog niet opende.

function renderUse(vars: LifecycleEmailVars): RenderedEmail {
  const subject = `Je BRAND.md werkt pas als hij in je AI-tool zit`;
  const opener = vars.hasVoice
    ? `Je scande gisteren ${escape(vars.domain)}. Eén ding kwam daar scherp uit: <strong>je tone-of-voice</strong>. Die kun je vandaag al gebruiken.`
    : `Je scande gisteren ${escape(vars.domain)}. Het bestand staat klaar — maar het doet pas iets zodra een tool het leest.`;

  const body = [
    paragraph(opener),
    paragraph(
      `Plak het in de tool waar je het meeste schrijft. Vanaf dat moment schrijft die in jouw toon in plaats van in algemeen Nederlands. Het kost je dertig seconden.`,
    ),
    renderCta(vars.useHubUrl, 'Zo zet je het in Claude of ChatGPT', 'nl'),
    note(`Bestand kwijt? ${link(vars.downloadUrl, 'Download het opnieuw')}.`),
  ].join('\n');

  return finish(vars, subject, `Dertig seconden werk, en je AI-tool schrijft in jouw toon.`, body, [
    opener.replace(/<[^>]+>/g, ''),
    `Plak het in de tool waar je het meeste schrijft.`,
    `Zo zet je het in Claude of ChatGPT: ${vars.useHubUrl}`,
    `Bestand kwijt? ${vars.downloadUrl}`,
  ]);
}

// ─── 2.3 — vergelijking: geef de score betekenis ──────
// Conversiedoel: her-activatie via een tweede scan. Werkt pas sinds de
// scoring-fix van 2026-08-15 — daarvoor kreeg élk merk 70 en zou een
// tweede scan juist bewijzen dat het getal niets zei.

function renderCompare(vars: LifecycleEmailVars): RenderedEmail {
  const score = vars.score != null ? String(vars.score) : null;
  const subject = score ? `${score} punten. Maar ${score} ten opzichte van wat?` : `Waar staat ${vars.domain} eigenlijk?`;
  const opener = score
    ? `${escape(vars.domain)} scoorde <strong>${score} van de 100</strong>. Op zichzelf zegt dat weinig — een score krijgt pas betekenis naast een andere.`
    : `Je scan van ${escape(vars.domain)} staat er. Maar een merk beoordeel je zelden in isolatie.`;

  const body = [
    paragraph(opener),
    paragraph(
      `Scan het merk waar je zelf naar kijkt. Duurt een minuut, kost niets, en je ziet direct waar jullie verschillen: waar zij scherper zijn, en waar jij dat bent.`,
    ),
    renderCta(vars.generatorUrl, 'Scan een concurrent', 'nl'),
    note(`Je eigen bestand: ${link(vars.downloadUrl, 'opnieuw downloaden')}.`),
  ].join('\n');

  return finish(vars, subject, `Een score krijgt pas betekenis naast een andere.`, body, [
    opener.replace(/<[^>]+>/g, ''),
    `Scan het merk waar je zelf naar kijkt — duurt een minuut, kost niets.`,
    `Scan een concurrent: ${vars.generatorUrl}`,
    `Je eigen bestand: ${vars.downloadUrl}`,
  ]);
}

// ─── 2.4 — aanvullen: de claim-vraag ──────────────────
// Conversiedoel: claim/trial. Bewust NIET "er is vast van alles
// veranderd" — dat weet je niet. Wél: de gaten die de scan vond staan
// er nog steeds, en alleen een mens kan ze dichten.

function renderComplete(vars: LifecycleEmailVars): RenderedEmail {
  // Eerste opzet opende met "N secties staan op onbevestigd". Feitelijk waar,
  // maar `draftPayloadToModel` zet ALLE vijf secties hard op `unvalidated` —
  // dus die N was bij iedereen 5 en de personalisatie was schijn.
  // Wat wél per merk verschilt is de conclusie die de scan trók. Die citeren
  // en om bevestiging vragen is concreet, en werkt twee kanten op: wie het
  // herkent voelt de waarde, wie het niet herkent heeft meteen een reden om
  // te claimen.
  const quote = vars.inferredPositioning?.trim();
  const sections = vars.unvalidatedSections ?? [];

  const subject = quote
    ? `Klopt dit wat we over ${vars.domain} concludeerden?`
    : `Je BRAND.md is van ${dutchDate(vars.generatedAt)}`;

  const opener = quote
    ? `Uit je site las de scan dit op over je positionering:`
    : `Je bestand is van ${dutchDate(vars.generatedAt)} — een momentopname van wat je site toen liet zien.`;

  const body = [
    paragraph(opener),
    quote
      ? `<blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #07E5AB;background:#f8fafc;font-size:15px;line-height:1.6;color:#334155;">${escape(quote)}</blockquote>`
      : '',
    paragraph(
      quote
        ? `Klopt dat? Zo ja, dan weet elke AI-tool die je bestand leest nu waar je voor staat. Zo nee, dan schrijft hij vanaf nu iets wat jij niet bedoelt — en dat is precies het risico van een geraden merkbestand.`
        : `Alles erin is afgeleid uit wat je site liet zien. Een AI-tool die het leest, gokt daarop.`,
    ),
    paragraph(
      `De scan bevestigt niets uit zichzelf — ${sections.length ? `${listSections(sections)} staan` : 'alle secties staan'} op <code>unvalidated</code> tot een mens ze nakijkt. In een workspace doe je dat één keer, en blijft het bestand daarna vanzelf actueel.`,
    ),
    vars.claimUrl ? renderCta(vars.claimUrl, 'Bevestig je merk — 28 dagen gratis', 'nl') : '',
  ]
    .filter(Boolean)
    .join('\n');

  return finish(
    vars,
    subject,
    quote ? `Eén zin uit je scan — klopt hij?` : `Alles in je bestand is nog een aanname.`,
    body,
    [
      opener.replace(/<[^>]+>/g, ''),
      quote ? `"${quote}"` : '',
      quote ? `Klopt dat? Zo nee, dan schrijft elke AI-tool vanaf nu iets wat jij niet bedoelt.` : '',
      `De scan bevestigt niets uit zichzelf — dat kan alleen een mens.`,
      vars.claimUrl ? `Bevestig je merk (28 dagen gratis): ${vars.claimUrl}` : '',
    ],
  );
}

// ─── 2.5 — verval: eerlijk, zonder nep-urgentie ───────
// Conversiedoel: laatste claim. Het bestand is van hen en blijft dat —
// dat wegmoffelen om urgentie te maken zou de mail ongeloofwaardig
// maken. Wat wél verdwijnt is de scan-context.

function renderExpiry(vars: LifecycleEmailVars): RenderedEmail {
  const expires = dutchDate(vars.expiresAt);
  const subject = `Je scan van ${vars.domain} verdwijnt op ${expires}`;

  const body = [
    paragraph(`Het bestand dat je downloadde blijft van jou — daar verandert niets aan.`),
    paragraph(`Wat op <strong>${expires}</strong> verdwijnt, is de scan eromheen:`),
    bulletList([
      'de bevindingen per sectie',
      'de secties die nog op onbevestigd staan',
      'de route om dit om te zetten in een werkende workspace zonder opnieuw te beginnen',
    ]),
    vars.claimUrl ? renderCta(vars.claimUrl, 'Zet je scan om in een workspace', 'nl') : '',
    note(`Liever alleen het bestand? ${link(vars.downloadUrl, 'Download het nog een keer')}.`),
  ]
    .filter(Boolean)
    .join('\n');

  return finish(
    vars,
    subject,
    `Je bestand blijft van jou; de scan eromheen verdwijnt.`,
    body,
    [
      `Het bestand dat je downloadde blijft van jou.`,
      `Wat op ${expires} verdwijnt is de scan eromheen: de bevindingen, de onbevestigde secties, en de route naar een workspace.`,
      vars.claimUrl ? `Zet je scan om in een workspace: ${vars.claimUrl}` : '',
      `Liever alleen het bestand? ${vars.downloadUrl}`,
    ],
    `Dit is de laatste mail over deze scan.`,
  );
}

// ─── Gedeelde afronding ───────────────────────────────

function finish(
  vars: LifecycleEmailVars,
  subject: string,
  preheader: string,
  body: string,
  textLines: string[],
  footerOverride?: string,
): RenderedEmail {
  const html = renderLayout({
    title: subject,
    preheader,
    locale: 'nl',
    body,
    footerNote:
      footerOverride ??
      `Je krijgt deze mail omdat je bij het scannen van ${vars.domain} aangaf tips te willen ontvangen.`,
    footerLink: { href: vars.unsubscribeUrl, label: 'Uitschrijven' },
  });
  const text = [subject, '', ...textLines.filter(Boolean), '', `Uitschrijven: ${vars.unsubscribeUrl}`].join('\n');
  return { subject, html, text };
}
