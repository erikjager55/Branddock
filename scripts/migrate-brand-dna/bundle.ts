/**
 * Bundle-formaat + IO voor de merk-DNA-migratie. De bundle is een
 * inspecteerbaar JSON-bestand dat tussen `export` (lokaal) en `import` (prod)
 * zit, zodat de data auditbaar is vóór hij productie raakt.
 */
import * as fs from 'fs';

export interface BrandDnaBundle {
  meta: {
    version: number;
    sourceWorkspaceId: string;
    sourceWorkspaceName: string;
    sourceSlug: string;
    note: string;
  };
  /** accessor → rijen (alleen scalar velden; relaties/vectors niet inbegrepen). */
  records: Record<string, Record<string, unknown>[]>;
  /** accessor → kolom → (rowId → pgvector ::text-literal, bv. "[0.1,...]"). */
  vectors: Record<string, Record<string, Record<string, string>>>;
  /** Distinct lokale /uploads/-URL-paden die ergens in de records voorkomen. */
  localImageRefs: string[];
}

// Optionele origin-groep vóór het pad: zo herkennen we of een /uploads/-pad
// deel is van een absolute URL. Een pad binnen een EXTERNE URL (bv. beelden uit
// een website-scan: https://klant.nl/wp-content/uploads/…) is géén lokale ref —
// die resolveert op prod prima. Zonder dit onderscheid meldde de export een vals
// "draai upload-images"-alarm (gevonden bij de Adullam-migratie 2026-07-22).
const UPLOADS_RE = /(https?:\/\/[^\s"')\\]*?)?(\/uploads\/[^\s"')\\]+)/g;
const LOCAL_HOST_RE = /localhost|127\.0\.0\.1/;

/** JSON.stringify-replacer die BigInt overleeft (→ string). */
export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

/** Schrijf de bundle als geformatteerde JSON. */
export function saveBundle(filePath: string, bundle: BrandDnaBundle): void {
  fs.writeFileSync(filePath, JSON.stringify(bundle, jsonReplacer, 2), 'utf8');
}

/** Lees een bundle van schijf. */
export function loadBundle(filePath: string): BrandDnaBundle {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as BrandDnaBundle;
}

/**
 * Verzamel recursief alle lokale `/uploads/…`-URL-paden uit een waarde
 * (ook binnen HTML/tekst-blobs), via regex-extractie i.p.v. hele strings.
 */
export function collectLocalImageRefs(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    for (const m of value.matchAll(UPLOADS_RE)) {
      const [, origin, path] = m;
      if (origin && !LOCAL_HOST_RE.test(origin)) continue;
      out.add(path);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectLocalImageRefs(v, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectLocalImageRefs(v, out);
  }
}
