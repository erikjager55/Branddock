/**
 * Veld-niveau copy-diff tussen twee landing-page-varianten (P2a — before/after).
 *
 * Vergelijkt alleen tekstuele copy-velden (auto-iterate verandert nooit structuur)
 * en geeft per gewijzigd veld een leesbaar label + before/after terug, zodat de
 * gebruiker ZIET wat de auto-iterate veranderde vóór hij 'm toepast.
 *
 * Pure functie — geen React, geen DB. Defensief: alle secties zijn optioneel.
 */

export interface CopyFieldChange {
  label: string;
  before: string;
  after: string;
}

type Str = string | null | undefined;
interface VariantLike {
  hero?: { headline?: Str; subhead?: Str; eyebrow?: Str; primaryCta?: Str };
  trust?: { items?: Array<{ label?: Str }> };
  problem?: { heading?: Str; bridgingSentence?: Str; painBullets?: Str[] } | null;
  features?: { sectionHeading?: Str; items?: Array<{ heading?: Str; body?: Str }> };
  socialProof?: { testimonials?: Array<{ quote?: Str }> };
  faq?: { items?: Array<{ question?: Str; answer?: Str }> };
  finalCta?: { heading?: Str; primaryCta?: Str; riskReducer?: Str };
}

/** Voeg een change toe wanneer de getrimde waarden verschillen. */
function pushIfChanged(out: CopyFieldChange[], label: string, before: unknown, after: unknown): void {
  const b = typeof before === 'string' ? before.trim() : '';
  const a = typeof after === 'string' ? after.trim() : '';
  if (b !== a && (b.length > 0 || a.length > 0)) out.push({ label, before: b, after: a });
}

export function diffVariantCopy(before: VariantLike, after: VariantLike): CopyFieldChange[] {
  const out: CopyFieldChange[] = [];

  pushIfChanged(out, 'Hero — headline', before.hero?.headline, after.hero?.headline);
  pushIfChanged(out, 'Hero — subhead', before.hero?.subhead, after.hero?.subhead);
  pushIfChanged(out, 'Hero — eyebrow', before.hero?.eyebrow, after.hero?.eyebrow);
  pushIfChanged(out, 'Hero — CTA', before.hero?.primaryCta, after.hero?.primaryCta);

  const trustB = before.trust?.items ?? [];
  const trustA = after.trust?.items ?? [];
  for (let i = 0; i < Math.max(trustB.length, trustA.length); i++) {
    pushIfChanged(out, `Trust — item ${i + 1}`, trustB[i]?.label, trustA[i]?.label);
  }

  pushIfChanged(out, 'Probleem — heading', before.problem?.heading, after.problem?.heading);
  pushIfChanged(out, 'Probleem — brug-zin', before.problem?.bridgingSentence, after.problem?.bridgingSentence);
  const pbB = before.problem?.painBullets ?? [];
  const pbA = after.problem?.painBullets ?? [];
  for (let i = 0; i < Math.max(pbB.length, pbA.length); i++) {
    pushIfChanged(out, `Probleem — bullet ${i + 1}`, pbB[i], pbA[i]);
  }

  pushIfChanged(out, 'Features — sectie-kop', before.features?.sectionHeading, after.features?.sectionHeading);
  const fB = before.features?.items ?? [];
  const fA = after.features?.items ?? [];
  for (let i = 0; i < Math.max(fB.length, fA.length); i++) {
    pushIfChanged(out, `Feature ${i + 1} — kop`, fB[i]?.heading, fA[i]?.heading);
    pushIfChanged(out, `Feature ${i + 1} — tekst`, fB[i]?.body, fA[i]?.body);
  }

  const tB = before.socialProof?.testimonials ?? [];
  const tA = after.socialProof?.testimonials ?? [];
  for (let i = 0; i < Math.max(tB.length, tA.length); i++) {
    pushIfChanged(out, `Testimonial ${i + 1}`, tB[i]?.quote, tA[i]?.quote);
  }

  const qB = before.faq?.items ?? [];
  const qA = after.faq?.items ?? [];
  for (let i = 0; i < Math.max(qB.length, qA.length); i++) {
    pushIfChanged(out, `FAQ ${i + 1} — vraag`, qB[i]?.question, qA[i]?.question);
    pushIfChanged(out, `FAQ ${i + 1} — antwoord`, qB[i]?.answer, qA[i]?.answer);
  }

  pushIfChanged(out, 'Final CTA — heading', before.finalCta?.heading, after.finalCta?.heading);
  pushIfChanged(out, 'Final CTA — knop', before.finalCta?.primaryCta, after.finalCta?.primaryCta);
  pushIfChanged(out, 'Final CTA — risk-reducer', before.finalCta?.riskReducer, after.finalCta?.riskReducer);

  return out;
}
