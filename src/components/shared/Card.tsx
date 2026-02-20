'use client';

import React from 'react';
import { COMPONENTS, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Add hover shadow + pointer cursor */
  hoverable?: boolean;
  /** Padding size — defaults to 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Show border — defaults to true */
  border?: boolean;
  /** Test ID for e2e tests */
  'data-testid'?: string;
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

// ─── Padding mapping ──────────────────────────────────────

const PADDING_MAP: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-7',
};

// ─── Compound sub-components ──────────────────────────────

function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div className={cn('px-5 pt-5 pb-0', className)}>
      {children}
    </div>
  );
}
CardHeader.displayName = 'Card.Header';

function CardBody({ children, className }: CardSectionProps) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}
CardBody.displayName = 'Card.Body';

function CardFooter({ children, className }: CardSectionProps) {
  return (
    <div className={cn('px-5 pb-5 pt-0 border-t border-gray-100 mt-auto', className)}>
      {children}
    </div>
  );
}
CardFooter.displayName = 'Card.Footer';

// ─── Main Component ───────────────────────────────────────

function CardRoot({
  children,
  className,
  onClick,
  hoverable = false,
  padding = 'md',
  border = true,
  'data-testid': testId,
}: CardProps) {
  const baseClasses = cn(
    'bg-white rounded-xl',
    border && 'border border-border',
    hoverable && 'hover:shadow-md hover:border-primary/20 cursor-pointer transition-all duration-200',
    PADDING_MAP[padding],
    className,
  );

  return (
    <div
      className={baseClasses}
      data-testid={testId}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// ─── Compound export ──────────────────────────────────────

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default Card;
