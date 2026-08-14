/**
 * P3 lead-capture (verbeterplan §Fase P) — gedeelde helpers voor de
 * LeadForm-sectie (render in `puck-config.tsx`), het publieke endpoint
 * (`/api/f/[formId]`) en de submissions-API. Eén bron voor het
 * formId-formaat + de no-JS success-anchor zodat render en endpoint nooit
 * uit elkaar lopen.
 *
 * ## formId-formaat (gedocumenteerd contract)
 *
 *   formId = "<workspaceId>:<formKey>"
 *
 *  - `workspaceId`: de cuid van de workspace — bevat nooit een ':' zodat
 *    parsen op de EERSTE ':' deterministisch is. Het publieke endpoint
 *    resolvet hiermee de tenant zonder extra lookup-tabel.
 *  - `formKey`: de sectie-instance-id uit de sectie-tree (`props.id`,
 *    bv. "LeadForm-a1b2…"), gesaneerd tot `[A-Za-z0-9_-]` zodat hij veilig
 *    is in URL-paden, DOM-id's en CSS-selectors. Identificeert wélk
 *    formulier (meerdere LeadForms per workspace/pagina mogelijk) en groepeert
 *    submissions per formulier in `FormSubmission.formId`.
 *
 * Geen 'use client' — pure functies, bruikbaar in RSC, route-handlers en
 * de server-safe sectie-render.
 */

/** Interne (niet-op-te-slaan) veldnamen van de LeadForm-POST. */
export const LEAD_FORM_HONEYPOT_FIELD = '_hp';
export const LEAD_FORM_TIMESTAMP_FIELD = '_ts';
export const LEAD_FORM_SOURCE_FIELD = '_src';
export const LEAD_FORM_RESERVED_FIELDS: readonly string[] = [
  LEAD_FORM_HONEYPOT_FIELD,
  LEAD_FORM_TIMESTAMP_FIELD,
  LEAD_FORM_SOURCE_FIELD,
];

/** Payload-caps van het publieke endpoint (spec P3: max 30 velden, 10KB). */
export const LEAD_FORM_MAX_FIELDS = 30;
export const LEAD_FORM_MAX_PAYLOAD_BYTES = 10 * 1024;
export const LEAD_FORM_MAX_FIELD_NAME_LENGTH = 100;
export const LEAD_FORM_MAX_FIELD_VALUE_LENGTH = 5000;

const FORM_KEY_MAX_LENGTH = 128;
const WORKSPACE_ID_MAX_LENGTH = 64;

/**
 * Saneer een ruwe sectie-id tot een formKey die veilig is in URL-pad,
 * DOM-id en CSS-selector: alles buiten `[A-Za-z0-9_-]` wordt '-'.
 * Deterministisch — render én endpoint gebruiken dezelfde functie.
 */
export function sanitizeFormKey(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, FORM_KEY_MAX_LENGTH);
}

/** Bouw het samengestelde formId "<workspaceId>:<formKey>" (formKey wordt gesaneerd). */
export function buildLeadFormId(workspaceId: string, rawFormKey: string): string {
  return `${workspaceId}:${sanitizeFormKey(rawFormKey)}`;
}

export interface ParsedLeadFormId {
  workspaceId: string;
  formKey: string;
}

/**
 * Parse een formId terug naar { workspaceId, formKey }. Splitst op de EERSTE
 * ':' (workspace-cuids bevatten er geen). Returnt null bij een ongeldig
 * formaat — het endpoint antwoordt dan 404 zonder DB-lookup.
 */
export function parseLeadFormId(formId: string): ParsedLeadFormId | null {
  const sep = formId.indexOf(':');
  if (sep <= 0 || sep === formId.length - 1) return null;
  const workspaceId = formId.slice(0, sep);
  const formKey = formId.slice(sep + 1);
  if (workspaceId.length > WORKSPACE_ID_MAX_LENGTH || !/^[a-zA-Z0-9]+$/.test(workspaceId)) {
    return null;
  }
  if (formKey.length > FORM_KEY_MAX_LENGTH || !/^[A-Za-z0-9_-]+$/.test(formKey)) {
    return null;
  }
  return { workspaceId, formKey };
}

/**
 * DOM-id van het verborgen success-blok bij een formulier. De no-JS-flow
 * werkt via CSS `:target`: het endpoint 303-redirect naar
 * `<bronpagina>?submitted=1#<dit-id>` en de sectie rendert een
 * `#id{display:none} #id:target{display:block}`-styleblok — succes-state
 * zonder React én zonder JavaScript (ADR 2026-08-12 besluit 5, no-JS-first).
 * Het progressive-enhancement-script zet in plaats daarvan inline
 * `display:block` (inline wint van de id-selector).
 */
export function leadFormSuccessAnchorId(formKey: string): string {
  return `lp-form-ok-${sanitizeFormKey(formKey)}`;
}

/**
 * Afgeleide input-`name` voor een form-veld: label → lowercase slug
 * ("E-mailadres" → "e-mailadres"); leeg label → positioneel "field-<n>".
 * Gebruikt door de render (name-attributen) en dus impliciet het schema van
 * `FormSubmission.data`.
 */
export function leadFormFieldName(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LEAD_FORM_MAX_FIELD_NAME_LENGTH);
  return slug.length > 0 ? slug : `field-${index + 1}`;
}

/** Sectie-shape zoals hij in puckData staat — minimaal wat de scan nodig heeft. */
interface SectionLike {
  type?: unknown;
  props?: { id?: unknown; [key: string]: unknown } | null;
}

export interface FoundLeadFormSection {
  /** Gesaneerde formKey van de gevonden sectie. */
  formKey: string;
  /** De ruwe props van de sectie (webhookUrl/notifyEmail/successMessage …). */
  props: Record<string, unknown>;
}

/**
 * Zoek een LeadForm-sectie met de gegeven formKey in een puckData-tree.
 * Server-side gebruikt door `/api/f/[formId]` om webhookUrl/notifyEmail uit
 * de GEPUBLICEERDE snapshot te lezen (nooit uit de request — anders is het
 * endpoint een open spam-/SSRF-relay). Fail-soft: ongeldige tree → null.
 */
export function findLeadFormSection(
  puckData: unknown,
  formKey: string,
): FoundLeadFormSection | null {
  if (!puckData || typeof puckData !== 'object' || Array.isArray(puckData)) return null;
  const content = (puckData as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const item of content as SectionLike[]) {
    if (!item || typeof item !== 'object') continue;
    if (item.type !== 'LeadForm') continue;
    const props = item.props && typeof item.props === 'object' && !Array.isArray(item.props)
      ? (item.props as Record<string, unknown>)
      : {};
    const rawId = typeof props.id === 'string' ? props.id : '';
    if (rawId && sanitizeFormKey(rawId) === formKey) {
      return { formKey, props };
    }
  }
  return null;
}

/** Alle LeadForm-sectie-id's (ruw, ongesaneerd) uit een puckData-tree. */
export function listLeadFormSectionIds(puckData: unknown): string[] {
  if (!puckData || typeof puckData !== 'object' || Array.isArray(puckData)) return [];
  const content = (puckData as { content?: unknown }).content;
  if (!Array.isArray(content)) return [];
  const ids: string[] = [];
  for (const item of content as SectionLike[]) {
    if (!item || typeof item !== 'object' || item.type !== 'LeadForm') continue;
    const rawId = item.props && typeof item.props === 'object' && typeof item.props.id === 'string'
      ? item.props.id
      : '';
    if (rawId) ids.push(rawId);
  }
  return ids;
}
