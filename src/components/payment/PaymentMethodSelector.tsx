import React from 'react';
import { CreditCard, Smartphone, Building2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PaymentMethodType = 'card' | 'paypal' | 'ideal' | 'mobile-pay' | 'bank-transfer';

export type PaymentMethodStatus = 'selected' | 'available' | 'disabled';

export interface PaymentMethod {
  id: PaymentMethodType;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: PaymentMethodStatus;
  processingTime?: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  disabledMethods?: PaymentMethodType[];
  className?: string;
}

const PAYMENT_METHODS: Omit<PaymentMethod, 'status'>[] = [
  {
    id: 'card',
    title: 'Credit / Debit Card',
    description: 'Pay securely with Visa, Mastercard, or Amex',
    icon: <CreditCard className="h-5 w-5" />,
    processingTime: 'Instant',
  },
  {
    id: 'paypal',
    title: 'PayPal',
    description: 'Fast and secure payment with your PayPal account',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.679l-.04.22-.63 3.993-.032.17a.804.804 0 01-.794.679H7.72a.483.483 0 01-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z" />
        <path d="M2.718 12.307a.483.483 0 00.477.558h3.344a.805.805 0 00.794-.68l.04-.22.629-3.992.032-.17a.804.804 0 01.794-.68h.5c3.237 0 5.774 1.315 6.514 5.12.256 1.314.192 2.448-.3 3.328-.908 1.622-2.73 2.548-5.297 2.548H8.86l-.95 6.021H6.395l.846-5.365.522-3.307z" />
      </svg>
    ),
    processingTime: 'Instant',
  },
  {
    id: 'ideal',
    title: 'iDEAL',
    description: 'Direct bank payment for Dutch customers',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.72-2.84-.01-2.21-1.9-2.96-3.65-3.35z" />
      </svg>
    ),
    processingTime: 'Instant',
  },
  {
    id: 'mobile-pay',
    title: 'Apple Pay / Google Pay',
    description: 'Quick payment with your mobile wallet',
    icon: <Smartphone className="h-5 w-5" />,
    processingTime: 'Instant',
  },
  {
    id: 'bank-transfer',
    title: 'Bank Transfer',
    description: 'Manual bank transfer (2-3 business days)',
    icon: <Building2 className="h-5 w-5" />,
    processingTime: '2-3 business days',
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  disabledMethods = [],
  className,
}: PaymentMethodSelectorProps) {
  const getMethodStatus = (methodId: PaymentMethodType): PaymentMethodStatus => {
    if (disabledMethods.includes(methodId)) return 'disabled';
    if (selectedMethod === methodId) return 'selected';
    return 'available';
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">Select Payment Method</h3>
        <span className="text-xs text-muted-foreground">All payments are secure and encrypted</span>
      </div>

      <div className="space-y-2">
        {PAYMENT_METHODS.map((method) => {
          const status = getMethodStatus(method.id);
          const isDisabled = status === 'disabled';
          const isSelected = status === 'selected';

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => !isDisabled && onSelectMethod(method.id)}
              disabled={isDisabled}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                'hover:shadow-sm',
                isSelected && 'border-primary bg-primary/5',
                !isSelected && !isDisabled && 'border-border hover:border-primary/50',
                isDisabled && 'opacity-50 cursor-not-allowed bg-muted/30'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                  isSelected && 'bg-primary/10 text-primary',
                  !isSelected && !isDisabled && 'bg-muted text-muted-foreground',
                  isDisabled && 'bg-muted/50 text-muted-foreground'
                )}
              >
                {method.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn('font-medium', isSelected && 'text-primary')}>
                    {method.title}
                  </h4>
                  {method.processingTime && (
                    <span className="text-xs text-muted-foreground">
                      • {method.processingTime}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
