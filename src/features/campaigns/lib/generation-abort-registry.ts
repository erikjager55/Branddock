// =============================================================
// Abort-registry voor lopende variantgeneraties
//
// Waarom module-scope en niet een ref in het generatieblok: de
// `HorizontalAccordion` rendert maar één stap tegelijk, dus een klik op een
// andere stap unmount het blok. Hing de AbortController dáár, dan brak een
// gewone tabwissel de generatie af — betaalde varianten weg, en bij terugkomst
// kocht de auto-trigger ze opnieuw. Netto duurder dan niet aborteren.
//
// De controller hoort dus bij het deliverable, niet bij de accordion-stap:
// leeft zolang de Canvas open is, en wordt pas afgebroken als je die verlaat.
// =============================================================

const controllers = new Map<string, AbortController>();

/**
 * Uitgestelde aborts. React StrictMode draait in dev elke effect-cleanup één
 * keer extra en zet 'm daarna meteen weer op. Zou de cleanup direct aborteren,
 * dan werd bij élke Canvas-opening in dev een generatie gestart en meteen
 * afgebroken — een betaalde call per keer. Daarom een korte uitstel-tik die de
 * her-mount kan intrekken; een échte unmount volgt geen setup meer op en laat
 * de abort dus gewoon doorgaan.
 */
const pendingAborts = new Map<string, ReturnType<typeof setTimeout>>();

/** Ruim genoeg voor StrictMode's synchrone cleanup→setup, kort genoeg om na
 *  echt weglopen niet nodeloos door te genereren. */
const ABORT_GRACE_MS = 250;

/**
 * Start een generatie voor dit deliverable en geef de bijbehorende controller.
 * Een nog lopende generatie voor hetzelfde deliverable wordt afgebroken —
 * anders draaien er twee en betaal je beide.
 */
export function beginGeneration(deliverableId: string): AbortController {
  controllers.get(deliverableId)?.abort();
  const controller = new AbortController();
  controllers.set(deliverableId, controller);
  return controller;
}

/**
 * Meld een generatie af. Alleen als `controller` nog de actieve is — een
 * nieuwere run heeft de plek anders al overgenomen en mag niet gewist worden.
 */
export function endGeneration(deliverableId: string, controller: AbortController): void {
  if (controllers.get(deliverableId) === controller) {
    controllers.delete(deliverableId);
  }
}

/** Breek de lopende generatie voor dit deliverable direct af. */
export function abortGeneration(deliverableId: string): void {
  const controller = controllers.get(deliverableId);
  if (!controller) return;
  controller.abort();
  controllers.delete(deliverableId);
}

/**
 * Plan een abort met een korte gracieperiode. Aanroepen vanuit de
 * effect-cleanup die het verlaten van de Canvas markeert.
 */
export function scheduleAbort(deliverableId: string): void {
  cancelScheduledAbort(deliverableId);
  pendingAborts.set(
    deliverableId,
    setTimeout(() => {
      pendingAborts.delete(deliverableId);
      abortGeneration(deliverableId);
    }, ABORT_GRACE_MS),
  );
}

/** Trek een geplande abort in (de component is er nog / weer). */
export function cancelScheduledAbort(deliverableId: string): void {
  const timer = pendingAborts.get(deliverableId);
  if (timer === undefined) return;
  clearTimeout(timer);
  pendingAborts.delete(deliverableId);
}
