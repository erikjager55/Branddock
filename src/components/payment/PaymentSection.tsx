import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { PaymentMethodSelector, PaymentMethodType } from './PaymentMethodSelector';
import { StoredPaymentProfile, ProfileVariant } from './StoredPaymentProfile';
import { paymentProfileService } from '../../services/PaymentProfileService';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CreditCard, AlertCircle, Lock } from 'lucide-react';

interface PaymentSectionProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  actionLabel?: string;
}

export function PaymentSection({
  amount,
  onSuccess,
  onCancel,
  actionLabel = 'Pay',
}: PaymentSectionProps) {
  const [profileVariant, setProfileVariant] = useState<ProfileVariant>('empty');
  const [profile, setProfile] = useState(paymentProfileService.getProfile());
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [showCardForm, setShowCardForm] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const currentProfile = paymentProfileService.getProfile();
    setProfile(currentProfile);
    setProfileVariant(paymentProfileService.getProfileVariant());
    
    // If no valid profile, show method selection by default
    if (!paymentProfileService.hasValidProfile()) {
      setShowMethodSelection(true);
    }
  }, []);

  const handlePayWithSavedMethod = async () => {
    const defaultMethod = paymentProfileService.getDefaultMethod();
    if (!defaultMethod) return;

    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mark method as used
    paymentProfileService.markMethodUsed(defaultMethod.id);
    
    setIsProcessing(false);
    onSuccess();
  };

  const handleMethodSelected = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    
    // For card payments, show card details form
    if (method === 'card') {
      setShowCardForm(true);
    } else {
      // For other payment methods, process directly (mock)
      handleProcessPayment();
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save payment method if requested
      if (saveCard && selectedMethod === 'card') {
        const last4 = cardNumber.replace(/\s/g, '').slice(-4);
        paymentProfileService.addPaymentMethod(
          'card',
          `Card •••• ${last4}`,
          expiry.replace(' / ', '/'),
          true
        );
      } else if (selectedMethod !== 'card') {
        // Save other payment methods with appropriate display names
        const displayNames: Record<PaymentMethodType, string> = {
          'card': '',
          'paypal': 'PayPal Account',
          'ideal': 'iDEAL',
          'mobile-pay': 'Apple Pay',
          'bank-transfer': 'Bank Account',
        };
        
        if (saveCard) {
          paymentProfileService.addPaymentMethod(
            selectedMethod,
            displayNames[selectedMethod],
            undefined,
            true
          );
        }
      }
      
      setIsProcessing(false);
      onSuccess();
    } catch (err) {
      setError('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim() || !cardNumber.trim() || !expiry.trim() || !cvc.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    await handleProcessPayment();
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? ' / ' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Show saved profile with option to pay
  if (!showMethodSelection && paymentProfileService.hasValidProfile()) {
    return (
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-900 dark:text-blue-100">
            Your payment is secured with 256-bit SSL encryption
          </p>
        </div>

        <StoredPaymentProfile
          variant={profileVariant}
          methods={profile.methods}
          onAddPaymentMethod={() => setShowMethodSelection(true)}
          showActions={false}
          compact={true}
        />

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="font-medium">Total Amount</span>
          <span className="text-2xl font-bold">${amount.toLocaleString()}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isProcessing}>
            Back
          </Button>
          <Button 
            onClick={handlePayWithSavedMethod} 
            className="flex-1 bg-primary"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : `${actionLabel} $${amount.toLocaleString()}`}
          </Button>
        </div>

        <button
          onClick={() => setShowMethodSelection(true)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Use a different payment method
        </button>
      </div>
    );
  }

  // Show method selection
  if (!showCardForm) {
    return (
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-900 dark:text-blue-100">
            Your payment is secured with 256-bit SSL encryption
          </p>
        </div>

        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onSelectMethod={handleMethodSelected}
        />

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (paymentProfileService.hasValidProfile()) {
                setShowMethodSelection(false);
              } else {
                onCancel();
              }
            }}
            className="flex-1"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Show card form
  return (
    <form onSubmit={handleCardSubmit} className="space-y-4">
      {/* Security Notice */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <p className="text-xs text-blue-900 dark:text-blue-100">
          Your payment is secured with 256-bit SSL encryption
        </p>
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => {
              const formatted = formatCardNumber(e.target.value);
              if (formatted.replace(/\s/g, '').length <= 16) {
                setCardNumber(formatted);
                setError('');
              }
            }}
            className="pl-10"
            disabled={isProcessing}
          />
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Cardholder Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          disabled={isProcessing}
        />
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Expiry Date</Label>
          <Input
            id="expiry"
            type="text"
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => {
              const formatted = formatExpiry(e.target.value);
              if (formatted.replace(/\s|\//g, '').length <= 4) {
                setExpiry(formatted);
                setError('');
              }
            }}
            disabled={isProcessing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <Input
            id="cvc"
            type="text"
            placeholder="123"
            value={cvc}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/gi, '');
              if (value.length <= 4) {
                setCvc(value);
                setError('');
              }
            }}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Save card checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm text-muted-foreground">
          Save this card for future purchases
        </span>
      </label>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Test card info */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs font-medium text-yellow-900 mb-1">Test Mode - Use test card:</p>
        <p className="text-xs text-yellow-800 font-mono">
          4242 4242 4242 4242 • Any future date • Any 3 digits
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCardForm(false)}
          className="flex-1"
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-primary"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : `${actionLabel} $${amount.toLocaleString()}`}
        </Button>
      </div>
    </form>
  );
}
