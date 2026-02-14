import React from 'react';
import { CreditCard, Smartphone, Building2, AlertCircle, CheckCircle2, Clock, Settings, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { PaymentMethodType } from './PaymentMethodSelector';

export type ProfileStatus = 'verified' | 'expired' | 'needs-update' | 'error';

export interface StoredPaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  displayName: string; // e.g., "Visa •••• 4242", "PayPal (john@example.com)"
  expiryDate?: string; // For cards
  status: ProfileStatus;
  lastUsed?: string;
}

export type ProfileVariant = 'empty' | 'active' | 'expired' | 'error';

interface StoredPaymentProfileProps {
  variant: ProfileVariant;
  methods?: StoredPaymentMethod[];
  onManagePayments?: () => void;
  onAddPaymentMethod?: () => void;
  onSetDefault?: (methodId: string) => void;
  onRemoveMethod?: (methodId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

const getPaymentIcon = (type: PaymentMethodType) => {
  switch (type) {
    case 'card':
      return <CreditCard className="h-4 w-4" />;
    case 'paypal':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.679l-.04.22-.63 3.993-.032.17a.804.804 0 01-.794.679H7.72a.483.483 0 01-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z" />
        </svg>
      );
    case 'ideal':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.31 13.14c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V8h-2.34v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21z" />
        </svg>
      );
    case 'mobile-pay':
      return <Smartphone className="h-4 w-4" />;
    case 'bank-transfer':
      return <Building2 className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: ProfileStatus) => {
  switch (status) {
    case 'verified':
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    case 'needs-update':
      return (
        <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Update Required
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
  }
};

export function StoredPaymentProfile({
  variant,
  methods = [],
  onManagePayments,
  onAddPaymentMethod,
  onSetDefault,
  onRemoveMethod,
  showActions = true,
  compact = false,
  className,
}: StoredPaymentProfileProps) {
  const defaultMethod = methods.find((m) => m.isDefault);
  const otherMethods = methods.filter((m) => !m.isDefault);

  // Empty state
  if (variant === 'empty' || methods.length === 0) {
    return (
      <div className={cn('rounded-lg border-2 border-dashed border-border p-6 text-center', className)}>
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-medium text-foreground mb-1">No Payment Method Saved</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Add a payment method to speed up future purchases
        </p>
        {showActions && onAddPaymentMethod && (
          <Button onClick={onAddPaymentMethod} size="sm">
            Add Payment Method
          </Button>
        )}
      </div>
    );
  }

  // Error state
  if (variant === 'error') {
    return (
      <div className={cn('rounded-lg border-2 border-red-200 bg-red-50 p-4', className)}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-red-900 mb-1">Payment Method Error</h4>
            <p className="text-sm text-red-700 mb-3">
              There's an issue with your saved payment method. Please update your payment details.
            </p>
            {showActions && onManagePayments && (
              <Button onClick={onManagePayments} variant="outline" size="sm" className="border-red-300 hover:bg-red-100">
                Update Payment Method
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expired state
  if (variant === 'expired') {
    return (
      <div className={cn('rounded-lg border-2 border-orange-200 bg-orange-50 p-4', className)}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-orange-900 mb-1">Payment Method Expired</h4>
            <p className="text-sm text-orange-700 mb-3">
              Your saved payment method has expired. Please update your payment details to continue.
            </p>
            {showActions && onManagePayments && (
              <Button onClick={onManagePayments} variant="outline" size="sm" className="border-orange-300 hover:bg-orange-100">
                Update Payment Method
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active state with payment methods
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Saved Payment Methods</h3>
          {showActions && onManagePayments && (
            <Button onClick={onManagePayments} variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          )}
        </div>
      )}

      {/* Default payment method */}
      {defaultMethod && (
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
              {getPaymentIcon(defaultMethod.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">{defaultMethod.displayName}</h4>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
                  Default
                </Badge>
                {getStatusBadge(defaultMethod.status)}
              </div>
              {defaultMethod.expiryDate && (
                <p className="text-sm text-muted-foreground">Expires {defaultMethod.expiryDate}</p>
              )}
              {defaultMethod.lastUsed && (
                <p className="text-xs text-muted-foreground mt-1">Last used {defaultMethod.lastUsed}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other payment methods */}
      {otherMethods.length > 0 && !compact && (
        <div className="space-y-2">
          {otherMethods.map((method) => (
            <div
              key={method.id}
              className="rounded-lg border border-border bg-background p-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                  {getPaymentIcon(method.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-medium text-foreground">{method.displayName}</h4>
                    {getStatusBadge(method.status)}
                  </div>
                  {method.expiryDate && (
                    <p className="text-xs text-muted-foreground">Expires {method.expiryDate}</p>
                  )}
                </div>
                {showActions && (
                  <div className="flex items-center gap-1">
                    {onSetDefault && !method.isDefault && (
                      <Button
                        onClick={() => onSetDefault(method.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                    {onRemoveMethod && (
                      <Button
                        onClick={() => onRemoveMethod(method.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add payment method button */}
      {showActions && onAddPaymentMethod && !compact && (
        <Button onClick={onAddPaymentMethod} variant="outline" size="sm" className="w-full">
          <CreditCard className="h-4 w-4 mr-2" />
          Add Another Payment Method
        </Button>
      )}
    </div>
  );
}
