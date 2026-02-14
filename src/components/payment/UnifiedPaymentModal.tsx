import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { PaymentMethodSelector, PaymentMethodType } from './PaymentMethodSelector';
import { StoredPaymentProfile, ProfileVariant } from './StoredPaymentProfile';
import { paymentProfileService } from '../../services/PaymentProfileService';
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type PaymentStep = 'profile' | 'method-selection' | 'card-details' | 'processing' | 'success' | 'error';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  title: string;
  description?: string;
  actionLabel?: string; // e.g., "Unlock", "Purchase", "Pay"
}

export function UnifiedPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  title,
  description,
  actionLabel = 'Pay',
}: UnifiedPaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('profile');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [profileVariant, setProfileVariant] = useState<ProfileVariant>('empty');
  const [profile, setProfile] = useState(paymentProfileService.getProfile());
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Refresh profile when modal opens
      const currentProfile = paymentProfileService.getProfile();
      setProfile(currentProfile);
      setProfileVariant(paymentProfileService.getProfileVariant());
      
      // Determine initial step
      if (paymentProfileService.hasValidProfile()) {
        setStep('profile');
      } else {
        setStep('method-selection');
      }
    }
  }, [isOpen]);

  const handlePayWithSavedMethod = async () => {
    const defaultMethod = paymentProfileService.getDefaultMethod();
    if (!defaultMethod) return;

    setStep('processing');
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mark method as used
    paymentProfileService.markMethodUsed(defaultMethod.id);
    
    setStep('success');
    
    // Auto-close and trigger success after animation
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 1500);
  };

  const handleAddNewMethod = () => {
    setStep('method-selection');
  };

  const handleMethodSelected = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    
    // For card payments, show card details form
    if (method === 'card') {
      setStep('card-details');
    } else {
      // For other payment methods, process directly (mock)
      handleProcessPayment();
    }
  };

  const handleProcessPayment = async () => {
    setStep('processing');
    setError('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
      
      setStep('success');
      
      // Auto-close and trigger success after animation
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError('Payment failed. Please try again.');
      setStep('error');
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

  const handleClose = () => {
    // Reset state
    setStep('profile');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setName('');
    setError('');
    setSaveCard(true);
    onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <AnimatePresence mode="wait">
          {/* Step: Show saved profile */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </DialogHeader>

              <div className="mb-6">
                <StoredPaymentProfile
                  variant={profileVariant}
                  methods={profile.methods}
                  onAddPaymentMethod={handleAddNewMethod}
                  showActions={false}
                  compact={true}
                />
              </div>

              {amount > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg mb-6">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-2xl font-bold">${amount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                {amount > 0 ? (
                  <Button onClick={handlePayWithSavedMethod} className="flex-1 bg-primary">
                    {actionLabel} ${amount.toLocaleString()}
                  </Button>
                ) : (
                  <Button onClick={handleAddNewMethod} className="flex-1 bg-primary">
                    Add Payment Method
                  </Button>
                )}
              </div>

              <button
                onClick={handleAddNewMethod}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different payment method
              </button>
            </motion.div>
          )}

          {/* Step: Select payment method */}
          {step === 'method-selection' && (
            <motion.div
              key="method-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </DialogHeader>

              <PaymentMethodSelector
                selectedMethod={selectedMethod}
                onSelectMethod={handleMethodSelected}
                className="mb-6"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (paymentProfileService.hasValidProfile()) {
                      setStep('profile');
                    } else {
                      handleClose();
                    }
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Card details */}
          {step === 'card-details' && (
            <motion.div
              key="card-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle>Enter Card Details</DialogTitle>
                <DialogDescription>Total: ${amount.toLocaleString()}</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCardSubmit} className="space-y-4">
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
                    onClick={() => setStep('method-selection')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary">
                    {actionLabel} ${amount.toLocaleString()}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 text-center"
            >
              <motion.div
                className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-lg mb-1">Processing Payment...</h3>
              <p className="text-sm text-muted-foreground">Please wait while we process your transaction</p>
            </motion.div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-12 text-center"
            >
              <motion.div
                className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
              >
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </motion.div>
              <h3 className="font-semibold text-lg mb-1">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">Your payment has been processed successfully</p>
            </motion.div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Payment Failed</h3>
                <p className="text-sm text-muted-foreground">{error || 'Something went wrong. Please try again.'}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => setStep('method-selection')} className="flex-1">
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}