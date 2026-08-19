// =============================================================
// Studio Context Builder — alleen nog het contracttype
//
// ⚠️ Dit bestand bouwde ooit de generatie-context voor de oude Content Studio
// (brand + persona + campagnestrategie + deliverable-brief). Die studio is in
// twee stappen verdwenen: de UI op 2026-04-09, de dode store/lib/routes in de
// studio-cleanup van 2026-06-24. De builders hier zijn toen blijven staan.
//
// Op 2026-08-19 gemeten: van de zeven exports had er nog één een gebruiker.
// `GenerationContext` wordt door drie bestanden geïmporteerd (`quality-scorer`,
// `prompt-templates/helpers`, `scripts/voice-research/ws3/score-voice-quality`)
// — allemaal als *type*, nooit als waarde. De andere zes hadden nul externe
// verwijzingen: `buildGenerationContext`, `buildCascadingComponentContext`,
// `compileComponentFeedback`, `CampaignStrategyData`, `DeliverableBriefData`
// en `CascadingContextOptions`, plus drie private helpers.
//
// De levende generatieketen loopt via `canvas-orchestrator` +
// `studio/prompt-templates` (die map is wél in gebruik). Wie hier iets terugzet,
// controleert eerst of hij niet in de verkeerde keten bouwt.
//
// Bewijs bij de opruiming: geen dynamische import van dit pad, geen
// string-referentie naar een symbool, geen barrel-re-export. De detector is
// gekalibreerd op `GenerationContext` zelf — die gaf 10 treffers, dus hij
// vindt gebruik wél. Zie tasks/content-chain-followups.md punt 1.
// =============================================================

/**
 * Vorm van de context die aan een generatie-prompt wordt meegegeven.
 *
 * Puur een contract: er is in deze codebase geen producent meer van dit type.
 * De consumenten gebruiken hem om hun eigen parameters te typeren.
 */
export interface GenerationContext {
  brandContext: string;
  personaContext: string;
  campaignContext: string;
  deliverableBrief: string;
}
