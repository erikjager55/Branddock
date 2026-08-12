/**
 * Eigen typering van de sectie-component-registry (E3, ADR
 * 2026-08-07-puck-exit-sectie-editor) — vervangt Pucks `Config`-type op de
 * resterende call-sites.
 *
 * Bewust MINIMAAL-structureel: alleen de leden die consumenten van dit type
 * daadwerkelijk lezen (de render-loop leest `components[type].render`; de
 * modals geven de config alleen dóór; het props-paneel heeft zijn eigen
 * rijkere veld-metadata in section-editor-model.ts). Extra leden in de
 * registratie-literals (options/arrayFields/getItemSummary/…) zijn gewoon
 * toegestaan door width-subtyping — hier níet declareren voorkomt de
 * assignability-mismatch met Pucks interne veldtypes tijdens de
 * overgangsfase én koppelt consumenten niet aan veld-details die alleen de
 * registry aangaan.
 *
 * `never`-parameters op render: elke registratie heeft z'n eigen specifieke
 * props-type en `never` is de enige parameter waar élke functie
 * contravariant aan toewijsbaar is zonder `any` (zelfde patroon als
 * PageRenderConfig in page-render.tsx).
 */
import type { ReactNode } from 'react';

export interface SectionFieldConfig {
  /** Veldtype-discriminator ('text' | 'textarea' | 'select' | 'array' | 'custom' | …). */
  type: string;
  label?: string;
}

export interface SectionComponentConfig {
  label?: string;
  fields?: Record<string, SectionFieldConfig>;
  defaultProps?: Record<string, unknown>;
  render: (props: never) => ReactNode;
}

/**
 * De registry-shape zoals `buildSpikePuckConfig` hem teruggeeft. Generiek
 * over de props-map (SpikePuckProps) voor consumenten die per component-
 * type willen narrowen; de meeste call-sites gebruiken de default.
 */
export interface SectionLibraryConfig<
  TComponents extends Record<string, object> = Record<string, Record<string, unknown>>,
> {
  components: { [K in keyof TComponents & string]: SectionComponentConfig };
  root?: unknown;
}
