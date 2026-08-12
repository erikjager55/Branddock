/**
 * Eigen render-loop voor de webpage-sectie-tree (E1, ADR
 * 2026-08-07-puck-exit-sectie-editor) — vervangt Pucks `<Render>` op alle
 * call-sites (Step 3-preview, Step 2-variant-previews, diff-modals,
 * publieke route, screenshot-worker).
 *
 * DOM-pariteit met Pucks Render is een acceptatiecriterium: Puck emitte
 * één kale `<div>`-wrapper met de sectie-renders als directe children
 * (onze config heeft geen root.render, geen slots, geen richtext-fields —
 * geverifieerd in dist/chunk-YXFTA2VL.mjs). Deze loop doet hetzelfde, met
 * één additief verschil: elke sectie krijgt een `display:contents`-wrapper
 * met `data-section-id`/`data-section-type` — layout-neutraal, en de basis
 * voor click-to-select + prompt-scoping ("herschrijf déze sectie",
 * Storyblok `_editable`-patroon). Geen hooks — bruikbaar in RSC én client.
 */
import type { ReactNode } from 'react';

/**
 * Minimale structurele config-shape die de loop nodig heeft. De
 * `(props: never)`-parameter is bewust: render-functies in de registry
 * hebben elk hun eigen specifieke props-type, en `never` is de enige
 * parameter waar élke functie contravariant aan toewijsbaar is zonder
 * `any`. De loop cast bij de aanroep — de registry is de type-eigenaar.
 */
export interface PageRenderConfig {
  components: Record<string, { render: (props: never) => ReactNode }>;
}

/**
 * Bewust maximaal losse input-shape: élke `PageData<T>`-instantiatie (de
 * generieke variant is invariant in T) én rauwe JSON uit de database moet
 * hier zonder cast in kunnen. De loop valideert runtime per item.
 */
export interface RenderablePageData {
  root?: { props?: Record<string, unknown> };
  content: ReadonlyArray<{ type: string; props?: object }>;
}

interface PageRenderProps {
  config: PageRenderConfig;
  data: RenderablePageData;
  /**
   * Provenance-wrappers uitzetten kan voor kanalen waar de extra div's
   * ongewenst zijn (bv. e-mail-achtige exports). Default aan.
   */
  withSectionMarkers?: boolean;
}

/**
 * Stub voor de `puck`-prop die Pucks Render aan elke sectie meegaf. Geen
 * enkele Branddock-sectie gebruikt hem (geverifieerd: 0 hits op `puck.`/
 * `editMode` in puck-config.tsx), maar meegeven houdt het aanroep-contract
 * identiek voor de pariteits-overgang; verdwijnt definitief bij E3-opruiming.
 */
const PUCK_COMPAT_STUB = {
  isEditing: false,
  dragRef: null,
  metadata: {},
} as const;

export function PageRender({ config, data, withSectionMarkers = true }: PageRenderProps) {
  const content = Array.isArray(data?.content) ? data.content : [];
  return (
    <div>
      {content.map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const definition = config.components[item.type];
        if (!definition) {
          // Forward-compat: onbekend sectie-type (nieuwere registry-versie of
          // corrupt item) wordt overgeslagen i.p.v. de hele pagina te breken.
          console.warn('[PageRender] onbekend sectie-type overgeslagen:', item.type);
          return null;
        }
        const props = (item.props ?? {}) as Record<string, unknown>;
        const sectionId = typeof props.id === 'string' && props.id.length > 0 ? props.id : `${item.type}-${index}`;
        const rendered = definition.render({
          ...props,
          id: sectionId,
          puck: PUCK_COMPAT_STUB,
        } as never);
        if (!withSectionMarkers) {
          return <FragmentWithKey key={sectionId}>{rendered}</FragmentWithKey>;
        }
        return (
          <div
            key={sectionId}
            data-section-id={sectionId}
            data-section-type={item.type}
            style={{ display: 'contents' }}
          >
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

/** Key-baar fragment zonder extra DOM-node (voor withSectionMarkers=false). */
function FragmentWithKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
