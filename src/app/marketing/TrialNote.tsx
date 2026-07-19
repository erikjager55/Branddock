// UX-07: frictie-verlagende microcopy op het klikmoment — identieke regel
// onder elke primaire trial-CTA, gevoed uit de plan-constanten zodat de
// belofte nooit kan driften van de echte trial-configuratie.
import { TRIAL_DAYS, TRIAL_CREDITS } from '@/lib/constants/plan-limits';

const nl = new Intl.NumberFormat('nl-NL');

export const TRIAL_NOTE_TEXT = `${TRIAL_DAYS} dagen gratis · ${nl.format(TRIAL_CREDITS)} credits · geen creditcard`;

/** Caption-regel onder een CTA-rij; als w-full-kind wrapt hij in flex-rijen naar een eigen regel. */
export default function TrialNote({ className }: { className?: string }) {
  return (
    <p className={`w-full text-sm text-gray-500 mt-1 ${className ?? ''}`}>{TRIAL_NOTE_TEXT}</p>
  );
}
