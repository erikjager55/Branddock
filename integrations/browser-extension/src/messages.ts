// =============================================================
// Berichten tussen service-worker (background) en content-script (overlay).
// =============================================================

export type ContentMessage =
  | { type: 'branddock:ping' }
  | { type: 'branddock:capture' }
  | { type: 'branddock:loading'; label: string }
  | { type: 'branddock:result'; title: string; text: string; model: string; canReplace: boolean }
  | { type: 'branddock:error'; message: string };

export interface CaptureResponse {
  /** De geselecteerde tekst op het moment van aanroepen. */
  text: string;
  /** True als de selectie in een bewerkbaar element zat (textarea/input/contenteditable). */
  editable: boolean;
}
