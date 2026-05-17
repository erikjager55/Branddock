// =============================================================
// Brandclaw tools index — auto-register v1 tool-set op import.
//
// Caller (agent-loop bootstrap) doet `await import('@/lib/brandclaw/tools')`
// vóór de eerste runAgentLoop-call zodat alle v1 tools in de registry zitten.
//
// V1 (strategy_analyst): 4 query-tools die de DataSource accessors wrappen.
// Toekomstige nodes voegen eigen modules toe (campaign-builder-tools/,
// measurement-eval-tools/) — namespace per node via registry blijft schoon.
// =============================================================

import "./query-alignment-history";
import "./query-content-fidelity";
import "./query-review-history";
import "./query-brand-voice-drift";

export { queryAlignmentHistoryTool } from "./query-alignment-history";
export { queryContentFidelityTool } from "./query-content-fidelity";
export { queryReviewHistoryTool } from "./query-review-history";
export { queryBrandVoiceDriftTool } from "./query-brand-voice-drift";
