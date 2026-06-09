/**
 * P4 — pure race-guard voor per-variant fidelity-scores.
 *
 * Elke score-fetch capt de generation-token van zijn variantIndex op het moment
 * van afvuren (`bumpFidelityToken`). Bij terugkomst landt de write alleen wanneer
 * de token nog de actuele is voor die index. Een latere fetch (na variant-wissel,
 * regeneratie, applyProposal of reset) heeft de token opgehoogd → de oude write
 * mismatcht en wordt gedropt. Reset leegt de token-map → een stale write vindt
 * `undefined` en wordt eveneens gedropt (strikte gelijkheid).
 *
 * Een caller zonder token (`requestToken === undefined`, bv. de social/content-
 * orchestrator die deze race niet heeft) wordt nooit gegate → backward-compat.
 *
 * Geïsoleerd zodat de guard deterministisch getest kan worden zonder de store.
 */
export function shouldApplyFidelityWrite(
  currentToken: number | undefined,
  requestToken: number | undefined,
): boolean {
  if (requestToken === undefined) return true; // tokenloze caller → geen guard
  return currentToken === requestToken;
}
