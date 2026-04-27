import { useClawStore } from '@/stores/useClawStore';

/**
 * Sprint B · Step 3 — surface helper.
 *
 * Opens the Brand Assistant overlay with `prompt` pre-loaded into the input
 * field. Used by the empty-state CTA on the Content Library, the tip banner
 * in AddDeliverableTypeModal, the onboarding tooltip, and any future
 * "example prompt" chip in the app.
 *
 * The store's `inputText` is bound directly to the InputBar textarea, so
 * setting it before calling `openClaw` causes the text to appear the moment
 * the overlay renders — no state-passing prop drilling needed.
 */
export function openClawWithPrompt(prompt: string): void {
  const s = useClawStore.getState();
  s.setInputText(prompt);
  s.openClaw();
}

