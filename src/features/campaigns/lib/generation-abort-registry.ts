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

/**
 * Nul, bewust. StrictMode's cleanup en setup draaien in dezelfde
 * passive-effect-flush, dus één macrotask uitstel is genoeg om de her-mount de
 * abort te laten intrekken. Een langere grace koopt daar niets extra's mee en
 * creëert juist een venster waarin een échte terugkeer (die duurt altijd langer
 * dan een paar honderd ms) een betaalde run alsnog doodt.
 */
const ABORT_GRACE_MS = 0;

/**
 * Start een generatie voor dit deliverable en geef de bijbehorende controller.
 * Een nog lopende generatie voor hetzelfde deliverable wordt afgebroken —
 * anders draaien er twee en betaal je beide.
 */
export function beginGeneration(deliverableId: string): AbortController {
  // Een geplande abort van een vórige mount mag deze verse run niet killen.
  // Samen met de identiteitscheck in de timer is dit bewust dubbel: elk van
  // beide dekt het geval alleen af, en ze maskeren elkaars afwezigheid — een
  // mutatietest op één van de twee blijft daardoor groen.
  cancelScheduledAbort(deliverableId);
  controllers.get(deliverableId)?.abort();
  const controller = new AbortController();
  controllers.set(deliverableId, controller);
  notify();
  return controller;
}

/**
 * Meld een generatie af. Alleen als `controller` nog de actieve is — een
 * nieuwere run heeft de plek anders al overgenomen en mag niet gewist worden.
 */
export function endGeneration(deliverableId: string, controller: AbortController): void {
  if (controllers.get(deliverableId) === controller) {
    controllers.delete(deliverableId);
    notify();
  }
}

/**
 * Loopt er een generatie voor dit deliverable?
 *
 * Deze vraag hoort hier en niet in component-state. `HorizontalAccordion`
 * rendert maar één stap, dus een stapwissel-en-terug mount het generatieblok
 * opnieuw met verse `isGenerating`/`autoTriggeredRef`. Keek de auto-trigger
 * alleen daarnaar, dan vuurde die een nieuwe generatie, brak `beginGeneration`
 * de lopende betaalde run af, en betaalde je twee keer voor één resultaat.
 */
export function hasActiveGeneration(deliverableId: string): boolean {
  // Alleen aanwezigheid: elk pad dat aborteert verwijdert de entry ook
  // (`abortGeneration` wist 'm, `beginGeneration` vervangt 'm), dus een
  // afgebroken-maar-nog-aanwezige controller bestaat niet.
  return controllers.has(deliverableId);
}

/** Breek de lopende generatie voor dit deliverable direct af. */
export function abortGeneration(deliverableId: string): void {
  const controller = controllers.get(deliverableId);
  if (!controller) return;
  controller.abort();
  controllers.delete(deliverableId);
  notify();
}

/**
 * Plan een abort met een korte gracieperiode. Aanroepen vanuit de
 * effect-cleanup die het verlaten van de Canvas markeert.
 */
export function scheduleAbort(deliverableId: string): void {
  cancelScheduledAbort(deliverableId);
  const scheduledFor = controllers.get(deliverableId);
  pendingAborts.set(
    deliverableId,
    setTimeout(() => {
      pendingAborts.delete(deliverableId);
      // Identiteitscheck: is er inmiddels een níeuwe generatie gestart, dan
      // hoort deze tik daar niet meer bij en laat hij 'm met rust.
      if (controllers.get(deliverableId) !== scheduledFor) return;
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

// ─── Abonnement (voor useSyncExternalStore) ──────────────────────────────

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

/**
 * Abonneer op wijzigingen in "loopt er een generatie".
 *
 * Nodig omdat het generatieblok bij elke accordion-stapwissel opnieuw mount:
 * las het de registry alleen bij mount, dan bleef een instance die tijdens een
 * run mountte voor altijd in "genererend" hangen als die run op een fout
 * eindigde — de `setIsGenerating(false)` van de run landt namelijk op de oude,
 * al ge-unmounte instance. Spinner zonder uitweg, en elke volgende stapwissel
 * kocht een nieuwe generatie.
 */
export function subscribeToGenerations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
