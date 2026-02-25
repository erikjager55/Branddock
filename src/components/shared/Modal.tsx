'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { COMPONENTS, COLORS, TYPOGRAPHY, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
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

// ─── Component ────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  showCloseButton = true,
  className: extraClassName,
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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 animate-in fade-in duration-200"
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
