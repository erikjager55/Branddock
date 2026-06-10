'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { COMPONENTS, COLORS, TYPOGRAPHY, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /**
   * Body-scroll-lock uitzetten. Nodig wanneer de modal bóven een Puck-editor
   * rendert: Puck spiegelt body-attributen (incl. inline style) one-shot de
   * preview-iframe in, dus een body-`overflow:hidden` kan daar permanent
   * landen en de pagina-preview onscrollbaar maken (zie gotchas 2026-06-10).
   */
  lockBodyScroll?: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal width — defaults to 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional footer slot (for action buttons) */
  footer?: React.ReactNode;
  /** Whether to show the close (×) button — defaults to true */
  showCloseButton?: boolean;
  /** Extra classes for the content container */
  className?: string;
  /** Override z-index for stacked modals (default: 50) */
  zIndex?: number;
  /** Test ID for e2e tests */
  'data-testid'?: string;
}

// ─── Size mapping ─────────────────────────────────────────

const SIZE_MAP: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// ─── Body-scroll-lock (module-level teller) ───────────────
//
// Een per-modal save/restore is alleen correct bij LIFO-sluiting; sluiten
// twee overlappende modals in omgekeerde volgorde, dan restored de laatste
// een gesnapshotte 'hidden' en blijft body permanent gelockt. De teller lockt
// bij 0→1 en released pas wanneer de láátste lock verdwijnt —
// volgorde-onafhankelijk. Release zet bewust '' (geen snapshot-restore):
// enkele componenten schrijven body-overflow nog direct (LockConfirmDialog,
// ClawOverlay, ChatWithPersonaModal, BrandOnboardingWizard) en een snapshot
// kan hun 'hidden' bevriezen ná hun eigen cleanup; '' is in deze app altijd
// veilig omdat de app-shell via inner containers scrollt, nooit via body.

let bodyLockCount = 0;

/**
 * Centrale handhaving van de gotcha-regel 2026-06-10: NOOIT inline styles op
 * `document.body` zetten terwijl een Puck-editor gemount is — Puck spiegelt
 * body-attributen de preview-iframe in en maakt de pagina-preview dan
 * onscrollbaar. Op het chokepoint i.p.v. per caller, zodat ook geneste modals
 * (bv. GenerateImageModal binnen de image-picker) automatisch veilig zijn.
 */
function puckEditorMounted(): boolean {
  return !!document.querySelector('.Puck');
}

function acquireBodyLock(): void {
  if (bodyLockCount === 0 && !puckEditorMounted()) {
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;
}

function releaseBodyLock(): void {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    // '' is altijd veilig: de app-shell scrollt via inner containers, en als
    // de acquire door de Puck-guard niets schreef is dit een no-op.
    document.body.style.overflow = '';
  }
}

// ─── Component ────────────────────────────────────────────

export function Modal({
  isOpen,
  lockBodyScroll = true,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  showCloseButton = true,
  className: extraClassName,
  zIndex,
  'data-testid': testId,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Escape key closes modal ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // ── Focus trap (basic): auto-focus first focusable element ──
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const focusable = contentRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [isOpen]);

  // ── Prevent body scroll while open ──
  useEffect(() => {
    if (!isOpen || !lockBodyScroll) return;
    acquireBodyLock();
    return releaseBodyLock;
  }, [isOpen, lockBodyScroll]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-start justify-center bg-black/50 animate-in fade-in duration-200"
      style={{ paddingTop: '12vh', zIndex: zIndex ?? 50 }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={contentRef}
        className={cn(
          'bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh] w-full animate-in zoom-in-95 duration-200',
          SIZE_MAP[size],
          extraClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
      >
        {/* Header */}
        <div className={COMPONENTS.modal.header}>
          <div className="flex-1 min-w-0">
            <h2 className={TYPOGRAPHY.sectionHeading}>{title}</h2>
            {subtitle && (
              <p className={cn(TYPOGRAPHY.caption, 'mt-0.5')}>{subtitle}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(COMPONENTS.button.icon, 'flex-shrink-0')}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body — scrollable */}
        <div className={COMPONENTS.modal.body}>{children}</div>

        {/* Footer */}
        {footer && <div className={COMPONENTS.modal.footer}>{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
