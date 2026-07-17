// =============================================================
// Bundelvertaling voor credit-bundels (P4.1, pricing-verbeterplan
// 2026-07-18) — vertaalt een credit-aantal naar "wat je hiervoor
// maakt"-voorbeeldregels. Pure functies op CREDIT_COSTS zodat de
// pricing-pagina en de homepage-teaser exact dezelfde rekensom
// gebruiken en getallen nooit als kopie kunnen driften.
// =============================================================

import { CREDIT_COSTS } from '@/lib/billing/credits/credit-costs';

const nl = new Intl.NumberFormat('nl-NL');

/** Voorbeeld-aantallen die één credit-bundel oplevert, per actietype. */
export interface CreditExampleCounts {
  /** Korte content-items (social post, e-mail, ad). */
  shortPosts: number;
  /** Long-form artikelen via de volledige SEO/GEO-pipeline. */
  longFormArticles: number;
  /** Beelden. */
  images: number;
}

/**
 * Rekent een credit-bundel om naar voorbeeld-aantallen per actietype.
 * Afgerond naar beneden — we beloven nooit meer dan de bundel dekt.
 */
export function creditExampleCounts(credits: number): CreditExampleCounts {
  return {
    shortPosts: Math.floor(credits / CREDIT_COSTS.short),
    longFormArticles: Math.floor(credits / CREDIT_COSTS['long-form']),
    images: Math.floor(credits / CREDIT_COSTS.image),
  };
}

/**
 * Volledige "wat je hiervoor maakt"-regel voor tier-kaarten, bijv.
 * "±80 social posts, óf 5 long-form artikelen, óf 200 beelden — mix vrij".
 */
export function creditExampleLine(credits: number): string {
  const c = creditExampleCounts(credits);
  return `±${nl.format(c.shortPosts)} social posts, óf ${nl.format(c.longFormArticles)} long-form artikelen, óf ${nl.format(c.images)} beelden — mix vrij`;
}

/**
 * Compacte variant voor de homepage-teaser en top-up-packs, bijv.
 * "±80 posts, 5 artikelen óf 200 beelden".
 */
export function creditExampleLineCompact(credits: number): string {
  const c = creditExampleCounts(credits);
  return `±${nl.format(c.shortPosts)} posts, ${nl.format(c.longFormArticles)} artikelen óf ${nl.format(c.images)} beelden`;
}
