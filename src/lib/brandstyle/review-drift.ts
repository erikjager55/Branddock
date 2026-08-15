// =============================================================
// Review-drift — welke goedkeuringen vervallen na een re-analyse?
//
// Een goedkeuring hoort bij een specifieke versie van de data (W5,
// "hash-anker"). Verandert een re-analyse de merkkleuren, dan is de
// APPROVED op `colors-brand` niet langer waar. Deze module bepaalt welke
// review-secties geraakt zijn en zet die terug op PENDING.
//
// De detectie hergebruikt de bestaande snapshot-machinerie: `computeSnapshotDiff`
// levert al een gestructureerde diff over het canonical model, inclusief een
// `cosmetic`-vlag voor anti-aliasing-ruis. De mapping van diff-categorie naar
// review-sectie is het enige dat ontbrak.
//
// Dit bestand is de pure helft (mapping). De reset zelf staat in
// review-drift-store.ts, zodat de smoke zonder database draait — zelfde knip
// als brand-library/project.ts en styleguide-rule-checks.ts.
// =============================================================

import type { SnapshotDiff } from "./snapshots/snapshot-diff";
import type { SemanticColorRole } from "./semantic-role-resolver";
import { COMPONENT_VARIANT_REVIEW_SECTION, type ReviewSectionKey } from "./review-sections";

/**
 * Welke kleurrollen horen bij welke review-sectie? De review-UI splitst het
 * palet in merk-, neutrale en semantische kleuren; het canonical model kent
 * alleen rollen.
 */
const COLOR_ROLE_SECTION: Record<SemanticColorRole, ReviewSectionKey> = {
  primary: "colors-brand",
  "on-primary": "colors-brand",
  "primary-container": "colors-brand",
  secondary: "colors-brand",
  "on-secondary": "colors-brand",
  tertiary: "colors-brand",
  "on-tertiary": "colors-brand",
  surface: "colors-neutrals",
  "on-surface": "colors-neutrals",
  "surface-variant": "colors-neutrals",
  outline: "colors-neutrals",
  error: "colors-semantic",
  "on-error": "colors-semantic",
  success: "colors-semantic",
  warning: "colors-semantic",
  info: "colors-semantic",
};

export interface ReviewDrift {
  /** Secties waarvan de goedkeuring niet langer geldt. */
  sections: ReviewSectionKey[];
  /** Korte reden per sectie — voedt het kalibratie-paneel. */
  reasons: Partial<Record<ReviewSectionKey, string>>;
}

const EMPTY_DRIFT: ReviewDrift = { sections: [], reasons: {} };

function pluralise(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/**
 * Bepaal welke review-secties hun goedkeuring verliezen door deze diff.
 *
 * **Dekking is bewust deelbaar en niet compleet.** Het canonical model waar de
 * snapshot-diff op draait bevat alleen button-varianten in `components`
 * (`buildComponentTokens` emit alleen `button-*`), en geen logo's, imagery of
 * design-language-proza. Detecteerbaar zijn daarom: de drie kleursecties,
 * fonts, de drie spacing-secties, `system-roles`, `components-buttons` en —
 * via de meegegeven vlag — `brand-assets-logos`. De overige zes
 * `components-*`-secties vragen een eigen fingerprint per componenttype; zie
 * de task-file voor die follow-up.
 *
 * @param diff - resultaat van `computeSnapshotDiff(vorige, nieuwe)`
 * @param options.logosChanged - vergelijking van `scrapedJson.logoUrls`
 */
export function reviewSectionsFromDiff(
  diff: SnapshotDiff | null,
  options: { logosChanged?: boolean } = {},
): ReviewDrift {
  if (!diff && !options.logosChanged) return EMPTY_DRIFT;

  const reasons: Partial<Record<ReviewSectionKey, string>> = {};
  const add = (section: ReviewSectionKey, reason: string): void => {
    // Eerste reden wint — voorkomt dat "3 kleuren gewijzigd" wordt overschreven
    // door een minder informatieve latere melding voor dezelfde sectie.
    if (!reasons[section]) reasons[section] = reason;
  };

  let tokensChanged = false;

  if (diff) {
    // Cosmetische kleurwijzigingen (RGB-afstand < 3) zijn anti-aliasing-ruis.
    // Daarop resetten leert de gebruiker de melding wegklikken.
    const realColorChanges = diff.colors.filter((c) => !c.cosmetic);
    const perSection = new Map<ReviewSectionKey, number>();
    for (const change of realColorChanges) {
      const section = COLOR_ROLE_SECTION[change.role];
      if (!section) continue;
      perSection.set(section, (perSection.get(section) ?? 0) + 1);
    }
    for (const [section, count] of perSection) {
      add(section, `${pluralise(count, "Eén kleur", "kleuren")} gewijzigd bij de laatste analyse`);
      tokensChanged = true;
    }

    if (diff.typography.length > 0) {
      add(
        "brand-assets-fonts",
        `${pluralise(diff.typography.length, "Eén typografie-rol", "typografie-rollen")} gewijzigd bij de laatste analyse`,
      );
      tokensChanged = true;
    }

    if (diff.rounded.length > 0) {
      add("spacing-radii", "Radius-schaal gewijzigd bij de laatste analyse");
      tokensChanged = true;
    }
    if (diff.spacing.length > 0) {
      add("spacing-scale", "Spacing-schaal gewijzigd bij de laatste analyse");
      tokensChanged = true;
    }
    if (diff.elevation.length > 0) {
      add("spacing-shadow", "Schaduw-schaal gewijzigd bij de laatste analyse");
      tokensChanged = true;
    }

    for (const change of diff.components) {
      const section = COMPONENT_VARIANT_REVIEW_SECTION[change.variant.split("-")[0]];
      if (!section) continue;
      add(section, "Componentstijl gewijzigd bij de laatste analyse");
      tokensChanged = true;
    }

    // `system-roles` ís de resolver-output over precies deze tokens: verandert
    // er één, dan is de rol-toewijzing opnieuw berekend.
    if (tokensChanged) {
      add("system-roles", "Design-tokens gewijzigd, dus de rol-toewijzing is opnieuw afgeleid");
    }
  }

  if (options.logosChanged) {
    add("brand-assets-logos", "Logo-set gewijzigd bij de laatste analyse");
  }

  return { sections: Object.keys(reasons) as ReviewSectionKey[], reasons };
}

/** Vergelijk twee logo-URL-lijsten uit `BrandstyleSnapshot.scrapedJson`. */
export function logoUrlsChanged(previous: unknown, next: unknown): boolean {
  const read = (value: unknown): string[] => {
    const urls = (value as { logoUrls?: unknown } | null)?.logoUrls;
    if (!Array.isArray(urls)) return [];
    return urls.filter((u): u is string => typeof u === "string").sort();
  };
  const a = read(previous);
  const b = read(next);
  // Geen enkele bekende "voor"-staat → geen signaal. Een eerste analyse mag
  // nooit een reset veroorzaken.
  if (a.length === 0 && b.length === 0) return false;
  return a.join("|") !== b.join("|");
}
