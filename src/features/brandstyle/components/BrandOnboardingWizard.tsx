"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Palette,
  Type,
  Boxes,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared";
import type { BrandStyleguide, StyleguideTab } from "../types/brandstyle.types";

interface BrandOnboardingWizardProps {
  styleguide: BrandStyleguide;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Switch the brandstyle-page naar een tab; wordt aangeroepen vanuit de
   * "Bewerk in {sectie}" CTAs zodat user na sluiten van wizard direct in
   * de juiste tab landt voor handmatige overrides.
   */
  onJumpToTab: (tab: StyleguideTab) => void;
}

const STEP_LABELS = ["Welkom", "Kleuren", "Typografie", "Klaar"] as const;
const TOTAL_STEPS = STEP_LABELS.length;

/**
 * Brand Onboarding Wizard — 4-stappen flow die user door scrape-resultaten
 * loopt. Toont per stap een samenvatting van wat de analyzer detecteerde
 * + actie om naar de bijbehorende tab te springen voor overrides (Fase E
 * user-override surface uit LP-fidelity werkstroom). Geen nieuwe backend
 * endpoints — hergebruikt bestaande sections + PATCH-routes per veld.
 *
 * Steps:
 *   1. Welkom — source URL + scrape-overzicht counts
 *   2. Kleuren — top-tier colors + usage-tags (Fase A) + override-CTA
 *   3. Typografie — DISPLAY/BODY fonts + hero-typography fingerprint (Fase B)
 *   4. Klaar — confirmation + lock-suggestion
 */
export function BrandOnboardingWizard({
  styleguide,
  isOpen,
  onClose,
  onJumpToTab,
}: BrandOnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const counts = useMemo(
    () => ({
      colors: styleguide.colors?.length ?? 0,
      fonts: styleguide.fonts?.length ?? 0,
      components: styleguide.components?.length ?? 0,
    }),
    [styleguide.colors, styleguide.fonts, styleguide.components],
  );

  const isEmpty = counts.colors === 0 && counts.fonts === 0 && counts.components === 0;

  const topColors = useMemo(
    () =>
      (styleguide.colors ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 6),
    [styleguide.colors],
  );

  const displayFont = useMemo(
    () => (styleguide.fonts ?? []).find((f) => f.role === "DISPLAY") ?? null,
    [styleguide.fonts],
  );
  const bodyFont = useMemo(
    () => (styleguide.fonts ?? []).find((f) => f.role === "BODY") ?? null,
    [styleguide.fonts],
  );

  const handleClose = useCallback(() => {
    setStepIndex(0);
    onClose();
  }, [onClose]);

  const handleJump = useCallback(
    (tab: StyleguideTab) => {
      onJumpToTab(tab);
      handleClose();
    },
    [onJumpToTab, handleClose],
  );

  const next = useCallback(
    () => setStepIndex((s) => Math.min(s + 1, TOTAL_STEPS - 1)),
    [],
  );
  const prev = useCallback(() => setStepIndex((s) => Math.max(s - 1, 0)), []);

  // ── Escape closes wizard ──
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  // ── Body scroll-lock terwijl open ──
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // ── Initial focus + restore-on-close (basic focus management) ──
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Skip disabled buttons + tabindex=-1 — anders pakt initial focus de
    // disabled "Vorige" knop op stap 0.
    const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  // ── Reset stepIndex bij nieuwe open-event (defends against parent
  // die isOpen toggelt zonder via onClose te gaan). ──
  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onMouseUp={(e) => {
        if (
          mouseDownTargetRef.current === overlayRef.current &&
          e.target === overlayRef.current
        ) {
          handleClose();
        }
        mouseDownTargetRef.current = null;
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-wizard-title"
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
      >
        <WizardHeader onClose={handleClose} stepIndex={stepIndex} isEmpty={isEmpty} />

        <div className="px-6 py-6 min-h-[320px]">
          {isEmpty ? (
            <EmptyStyleguideState onClose={handleClose} />
          ) : (
            <>
              {stepIndex === 0 && (
                <WelcomeStep styleguide={styleguide} counts={counts} />
              )}
              {stepIndex === 1 && (
                <ColorsStep
                  topColors={topColors}
                  total={counts.colors}
                  onJumpToColors={() => handleJump("colors")}
                />
              )}
              {stepIndex === 2 && (
                <TypographyStep
                  displayFont={displayFont}
                  bodyFont={bodyFont}
                  total={counts.fonts}
                  onJumpToTypography={() => handleJump("typography")}
                />
              )}
              {stepIndex === 3 && (
                <DoneStep
                  counts={counts}
                  onClose={handleClose}
                  onJumpToComponents={() => handleJump("components")}
                />
              )}
            </>
          )}
        </div>

        {!isEmpty && (
          <WizardFooter
            stepIndex={stepIndex}
            onPrev={prev}
            onNext={next}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── Jump-to-tab CTA banner — hergebruikt in Step 2 + Step 3 ─

function JumpToTabBanner({
  message,
  ctaLabel,
  onJump,
}: {
  message: string;
  ctaLabel: string;
  onJump: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50 px-4 py-3">
      <p className="text-xs text-purple-900">{message}</p>
      <button
        type="button"
        onClick={onJump}
        className="text-xs font-medium text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 ml-3 flex-shrink-0"
      >
        {ctaLabel}
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Empty styleguide (geen scrape uitgevoerd) ──────────────

function EmptyStyleguideState({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-5 text-center py-6">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-amber-600" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Nog geen merk-DNA gevonden
        </h3>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          Deze styleguide bevat geen kleuren, fonts of componenten. Run eerst
          een nieuwe analyse op je merk-URL — dan loopt deze wizard je door
          de resultaten.
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onClose}>
        Sluit wizard
      </Button>
    </div>
  );
}

// ─── Header met progress dots + close ───────────────────────

interface WizardHeaderProps {
  onClose: () => void;
  stepIndex: number;
  isEmpty: boolean;
}

function WizardHeader({ onClose, stepIndex, isEmpty }: WizardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm"
          aria-hidden="true"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 id="onboarding-wizard-title" className="text-base font-semibold text-gray-900">
            Brand Onboarding
          </h2>
          {!isEmpty && (
            <p className="text-xs text-gray-500">
              Stap {stepIndex + 1} van {TOTAL_STEPS}: {STEP_LABELS[stepIndex]}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isEmpty && (
          // Decoratief — header-tekst draagt de toegankelijke voortgangsstatus.
          <ol className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
            {STEP_LABELS.map((label, i) => (
              <li
                key={label}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? "w-8 bg-purple-600"
                    : i < stepIndex
                      ? "w-4 bg-purple-300"
                      : "w-4 bg-gray-200"
                }`}
              />
            ))}
          </ol>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          aria-label="Sluit wizard"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Footer met Vorige / Volgende ──────────────────────────

interface WizardFooterProps {
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function WizardFooter({ stepIndex, onPrev, onNext, onClose }: WizardFooterProps) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOTAL_STEPS - 1;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
      <Button
        variant="ghost"
        size="sm"
        icon={ChevronLeft}
        onClick={onPrev}
        disabled={isFirst}
      >
        Vorige
      </Button>
      {isLast ? (
        <Button variant="primary" size="sm" onClick={onClose}>
          Sluit wizard
        </Button>
      ) : (
        <Button variant="primary" size="sm" icon={ChevronRight} iconPosition="right" onClick={onNext}>
          Volgende
        </Button>
      )}
    </div>
  );
}

// ─── Step 1: Welkom ────────────────────────────────────────

interface WelcomeStepProps {
  styleguide: BrandStyleguide;
  counts: { colors: number; fonts: number; components: number };
}

function WelcomeStep({ styleguide, counts }: WelcomeStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Welkom bij Brand Onboarding
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          We hebben jouw merk geanalyseerd. In de volgende stappen loop je door
          de gevonden kleuren, typografie en componenten — daar kun je elke
          auto-detectie bevestigen of overrulen voordat de brand-style live
          gaat in landing-pages.
        </p>
      </div>

      {styleguide.sourceUrl && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Bron
          </p>
          <a
            href={styleguide.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            {styleguide.sourceUrl.replace(/^https?:\/\/(www\.)?/, "")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <SummaryTile icon={Palette} label="Kleuren" count={counts.colors} />
        <SummaryTile icon={Type} label="Fonts" count={counts.fonts} />
        <SummaryTile icon={Boxes} label="Componenten" count={counts.components} />
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col items-center text-center">
      <Icon className="h-5 w-5 text-purple-600" aria-hidden="true" />
      <p className="text-2xl font-semibold text-gray-900 mt-2">{count}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Step 2: Kleuren ───────────────────────────────────────

interface ColorsStepProps {
  topColors: BrandStyleguide["colors"];
  total: number;
  onJumpToColors: () => void;
}

function ColorsStep({ topColors, total, onJumpToColors }: ColorsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="h-5 w-5 text-purple-600" />
          Kleuren ({total})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          De analyzer detecteerde {total} kleur{total === 1 ? "" : "en"} met
          per-kleur usage-tags (PRIMARY / SECONDARY / ACCENT / NEUTRAL /
          SEMANTIC). Klik op &lsquo;Bewerk in Kleuren-tab&rsquo; om tags te
          overrulen wanneer de auto-detectie iets fout heeft.
        </p>
      </div>

      {topColors.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Geen kleuren gevonden.</p>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {topColors.map((c) => (
            <li key={c.id} className="flex flex-col items-center">
              <span
                className="block w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
                style={{ backgroundColor: c.hex }}
                aria-label={`${c.name} ${c.hex}`}
              />
              <p className="text-[10px] text-gray-700 mt-1.5 font-medium truncate w-full text-center">
                {c.name}
              </p>
              <p className="text-[10px] text-gray-500 font-mono">{c.hex}</p>
              <p className="text-[10px] text-purple-700 mt-0.5">{c.category}</p>
            </li>
          ))}
        </ul>
      )}

      <JumpToTabBanner
        message="Klopt de classificatie? Overrules kun je per kleur via de tag-toggles in de Kleuren-tab (Fase E user-override surface)."
        ctaLabel="Bewerk in Kleuren-tab"
        onJump={onJumpToColors}
      />
    </div>
  );
}

// ─── Step 3: Typografie ─────────────────────────────────────

interface TypographyStepProps {
  displayFont: BrandStyleguide["fonts"][number] | null;
  bodyFont: BrandStyleguide["fonts"][number] | null;
  total: number;
  onJumpToTypography: () => void;
}

function TypographyStep({
  displayFont,
  bodyFont,
  total,
  onJumpToTypography,
}: TypographyStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Type className="h-5 w-5 text-purple-600" />
          Typografie ({total})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          DISPLAY-font wordt gebruikt voor hero-headlines, BODY voor lopende
          tekst. De analyzer matchte deze tegen Google Fonts / Adobe Fonts;
          override in de Typografie-tab als je een andere keuze wilt.
        </p>
      </div>

      <div className="space-y-3">
        <FontPreview label="DISPLAY (Hero headlines)" font={displayFont} sample="Brand voice in beeld" />
        <FontPreview label="BODY (Body text)" font={bodyFont} sample="Dit is hoe lopende tekst eruitziet in jouw brand-style." />
      </div>

      <JumpToTabBanner
        message="Andere font in gedachten? Wissel in de Typografie-tab."
        ctaLabel="Bewerk in Typografie-tab"
        onJump={onJumpToTypography}
      />
    </div>
  );
}

function FontPreview({
  label,
  font,
  sample,
}: {
  label: string;
  font: BrandStyleguide["fonts"][number] | null;
  sample: string;
}) {
  if (!font) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </p>
        <p className="text-sm text-gray-400 italic mt-1">Niet gedetecteerd</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </p>
        <p className="text-xs text-gray-600 font-medium">
          {font.name}
          <span className="text-gray-400 ml-1.5">{font.availability}</span>
        </p>
      </div>
      <p
        className="text-base text-gray-900 mt-2 leading-snug"
        style={{ fontFamily: `"${font.name}", system-ui, -apple-system, sans-serif` }}
      >
        {sample}
      </p>
    </div>
  );
}

// ─── Step 4: Klaar ─────────────────────────────────────────

interface DoneStepProps {
  counts: { colors: number; fonts: number; components: number };
  onClose: () => void;
  onJumpToComponents: () => void;
}

function DoneStep({ counts, onClose, onJumpToComponents }: DoneStepProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Brand-style klaar voor gebruik
        </h3>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          Jouw merk-DNA ({counts.colors} kleuren, {counts.fonts} fonts,{" "}
          {counts.components} componenten) wordt nu meegenomen in landing-page
          generatie, content-creatie en F-VAL fidelity-scoring. Je kunt elke
          override later aanpassen via de Brand Styleguide tabs.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onJumpToComponents}>
          Bekijk componenten
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Sluit wizard
        </Button>
      </div>
    </div>
  );
}
