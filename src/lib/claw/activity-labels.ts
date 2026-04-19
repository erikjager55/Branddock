/**
 * Human-readable labels shown to the user while the Brand Assistant is
 * running a tool. Shown in the chat's activity indicator so the user can
 * follow along with what the AI is doing.
 *
 * Dutch because the app's primary UI locale is NL — see CLAUDE.md.
 */

const TOOL_LABELS: Record<string, string> = {
  // Read tools
  inspect_current_entity: 'Huidige velden aan het inspecteren',
  read_brand_assets: 'Merkassets aan het lezen',
  read_brand_asset: 'Brand asset aan het openen',
  read_personas: "Persona's aan het lezen",
  read_persona: 'Persona aan het openen',
  read_products: 'Producten aan het lezen',
  read_competitors: 'Concurrenten aan het lezen',
  read_campaigns: 'Campagnes aan het lezen',
  read_trends: 'Trends aan het lezen',
  read_strategies: 'Strategieën aan het lezen',
  read_alignment_issues: 'Brand alignment aan het controleren',
  read_brandstyle: 'Brandstyle aan het lezen',
  read_dashboard: 'Dashboard aan het bekijken',
  read_knowledge: 'Knowledge library aan het scannen',
  read_deliverables: 'Deliverables aan het lezen',

  // Write tools (proposal stage — actual mutation happens after confirm)
  update_asset_content: 'Wijziging aan brand asset aan het voorbereiden',
  update_asset_framework: 'Framework wijziging aan het voorbereiden',
  update_persona: 'Persona wijziging aan het voorbereiden',
  update_product: 'Product wijziging aan het voorbereiden',
  update_competitor: 'Concurrent wijziging aan het voorbereiden',
  update_strategy_context: 'Strategie wijziging aan het voorbereiden',
  update_interview: 'Interview wijziging aan het voorbereiden',
  create_persona: 'Nieuwe persona aan het voorbereiden',
  create_product: 'Nieuw product aan het voorbereiden',
  create_competitor: 'Nieuwe concurrent aan het voorbereiden',
  link_persona_to_product: 'Persona-product koppeling aan het voorbereiden',
  create_trend: 'Nieuwe trend aan het voorbereiden',
  start_alignment_scan: 'Alignment scan aan het starten',
  start_trend_scan: 'Trend scan aan het starten',
  lock_entity: 'Slot aan het voorbereiden',
};

export function toolActivityLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Tool \`${toolName}\` aan het uitvoeren`;
}

/** Status before any tool is called / before first text chunk arrives. */
export const THINKING_LABEL = 'Aan het nadenken';

/** Status between a tool result and the next Claude response. */
export const PROCESSING_RESULTS_LABEL = 'Resultaten aan het verwerken';
