/**
 * Eigen typering van de sectie-component-registry (E3, ADR
 * 2026-08-07-puck-exit-sectie-editor) — vervangt Pucks `Config`-type op de
 * resterende call-sites. Structureel exact het subset dat
 * `buildSpikePuckConfig` feitelijk gebruikt (geverifieerd per grep:
 * fields/type/label/options/arrayFields/defaultItemProps/getItemSummary/
 * min/max, defaultProps, render) — géén slots, dropzones of resolvers:
 * die Puck-features zijn bewust nooit gebruikt (footprint-audit).
 *
 * `never`-parameters op de functiesignaturen: elke registratie heeft z'n
 * eigen specifieke props-type en `never` is de enige parameter waar élke
 * functie contravariant aan toewijsbaar is zonder `any` — de registry
 * blijft de type-eigenaar, consumenten casten bij de aanroep (zelfde
 * patroon als PageRenderConfig in page-render.tsx).
 */
import type { ReactNode } from 'react';

export type SectionFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'number'
  | 'array'
  | 'custom';

export interface SectionFieldConfig {
  type: SectionFieldType;
  label?: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
  arrayFields?: Record<string, SectionFieldConfig>;
  defaultItemProps?: Record<string, unknown>;
  getItemSummary?: (item: never, index?: number) => string;
  min?: number;
  max?: number;
  /** Custom velden (imageField → PuckImageField) renderen zichzelf. */
  render?: (props: never) => ReactNode;
}

export interface SectionComponentConfig {
  label?: string;
  fields?: Record<string, SectionFieldConfig>;
  defaultProps?: Record<string, unknown>;
  render: (props: never) => ReactNode;
}

/**
 * De volledige registry-shape zoals `buildSpikePuckConfig` hem teruggeeft.
 * Generiek over de props-map (SpikePuckProps) voor consumenten die per
 * component-type willen narrowen; de meeste call-sites gebruiken de default.
 */
export interface SectionLibraryConfig<
  TComponents extends Record<string, object> = Record<string, Record<string, unknown>>,
> {
  components: { [K in keyof TComponents & string]: SectionComponentConfig };
  root?: Record<string, unknown>;
}
