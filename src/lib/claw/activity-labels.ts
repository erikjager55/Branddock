/**
 * Human-readable labels shown to the user while the Brand Assistant is
 * running a tool. Shown in the chat's activity indicator so the user can
 * follow along with what the AI is doing.
 *
 * Dutch because the app's primary UI locale is NL — see CLAUDE.md.
 */

const TOOL_LABELS: Record<string, string> = {
  // Read tools
  inspect_current_entity: 'Inspecting current fields',
  read_brand_assets: 'Reading brand assets',
  read_brand_asset: 'Opening brand asset',
  read_personas: 'Reading personas',
  read_persona: 'Opening persona',
  read_products: 'Reading products',
  read_competitors: 'Reading competitors',
  read_campaigns: 'Reading campaigns',
  read_trends: 'Reading trends',
  read_strategies: 'Reading strategies',
  read_alignment_issues: 'Checking brand alignment',
  read_brandstyle: 'Reading brandstyle',
  read_dashboard: 'Viewing dashboard',
  read_knowledge: 'Scanning knowledge library',
  read_deliverables: 'Reading deliverables',

  // Write tools (proposal stage — actual mutation happens after confirm)
  update_asset_content: 'Preparing brand asset change',
  update_asset_framework: 'Preparing framework change',
  update_persona: 'Preparing persona change',
  update_product: 'Preparing product change',
  update_competitor: 'Preparing competitor change',
  update_strategy_context: 'Preparing strategy change',
  update_interview: 'Preparing interview change',
  create_persona: 'Preparing new persona',
  create_product: 'Preparing new product',
  create_competitor: 'Preparing new competitor',
  link_persona_to_product: 'Preparing persona-product link',
  create_trend: 'Preparing new trend',
  start_alignment_scan: 'Starting alignment scan',
  start_trend_scan: 'Starting trend scan',
  lock_entity: 'Preparing lock',
};

export function toolActivityLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Running tool \`${toolName}\``;
}

/** Status before any tool is called / before first text chunk arrives. */
export const THINKING_LABEL = 'Thinking';

/** Status between a tool result and the next Claude response. */
export const PROCESSING_RESULTS_LABEL = 'Processing results';
