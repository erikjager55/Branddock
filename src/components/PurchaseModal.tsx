import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  CreditCard,
  Sparkles,
  Zap,
  Shield,
  Info,
  ChevronRight,
  Clock,
  Target,
  CheckCircle2,
  Loader2,
  Users,
  Mic,
  ClipboardList,
  Presentation,
  ArrowLeft,
  Check,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentSection } from './payment/PaymentSection';

export interface UnlockableTool {
  id: string;
  name: string;
  description: string;
  price: number;
  icon?: any;
  supportsMultiAsset?: boolean;
  relatedAssets?: string[];
}

export interface BrandAssetOption {
  id: string;
  name: string;
  type: string;
  icon?: any;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedToolIds: string[]) => void;
  itemType: 'tool';
  itemId: string;
  itemName: string;
  availableTools: UnlockableTool[];
  currentAssetId?: string;
  availableAssets?: BrandAssetOption[];
}

// Method details mapping - same structure as ValidationPlanLandingPage
const methodDetailsMap: Record<string, {
  duration: string;
  participants: string;
  type: string;
  benefits: string[];
  whatsIncluded: string[];
}> = {
  'interviews': {
    duration: '60-90 min per interview',
    participants: '5-15 people',
    type: 'Qualitative',
    benefits: [
      'Deep, nuanced understanding',
      'Uncover hidden insights',
      'Build stakeholder buy-in',
    ],
    whatsIncluded: [
      'Interview guide development',
      'Professional facilitation',
      'Recording & transcription',
      'Thematic analysis',
      'Executive summary report',
    ],
  },
  'questionnaire': {
    duration: '15-20 min per response',
    participants: '20-100+ people',
    type: 'Quantitative',
    benefits: [
      'Quantifiable metrics',
      'Broader stakeholder reach',
      'Statistical validation',
    ],
    whatsIncluded: [
      'Custom questionnaire design',
      'Online survey platform',
      'Distribution & reminders',
      'Statistical analysis',
      'Data visualization dashboard',
    ],
  },
  'workshop': {
    duration: '2-3 hours',
    participants: '8-15 people',
    type: 'Collaborative',
    benefits: [
      'Team alignment',
      'Collaborative validation',
      'Immediate feedback',
    ],
    whatsIncluded: [
      'Workshop design & materials',
      'Expert facilitation',
      'Interactive exercises',
      'Live documentation',
      'Action plan & next steps',
    ],
  },
};

export function PurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemId,
  itemName,
  availableTools,
  currentAssetId,
  availableAssets = [],
}: PurchaseModalProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedAdditionalAssets, setSelectedAdditionalAssets] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'payment' | 'processing' | 'success'>('select');

  // Get the tool from availableTools (there should only be one)
  const tool = availableTools[0];
  const methodDetails = methodDetailsMap[itemId];

  // Get icon
  const getIcon = (id: string) => {
    switch (id) {
      case 'interviews':
        return Mic;
      case 'questionnaire':
        return ClipboardList;
      case 'workshop':
        return Presentation;
      default:
        return Users;
    }
  };

  const Icon = tool ? (tool.icon || getIcon(itemId)) : Users;
  
  // Filter out the current asset from available assets
  const additionalAssets = availableAssets.filter(asset => asset.id !== currentAssetId);

  // Calculate total number of assets (1 for current + selected additional)
  const totalAssets = 1 + selectedAdditionalAssets.size;

  // Calculate total price based on quantity and number of assets
  const totalPrice = useMemo(() => {
    if (!tool) return 0;
    return tool.price * quantity * totalAssets;
  }, [tool, quantity, totalAssets]);
  
  const toggleAdditionalAsset = (assetId: string) => {
    setSelectedAdditionalAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const updateQuantity = (delta: number) => {
    setQuantity(prev => {
      // For questionnaire, increment by 50
      if (itemId === 'questionnaire') {
        const newQty = prev + (delta * 50);
        return Math.max(50, newQty);
      }
      // For others, increment by 1
      const newQty = prev + delta;
      return Math.max(1, newQty);
    });
  };

  const handleConfirmPurchase = async () => {
    if (!isSelected || !tool) return;

    setPaymentStep('processing');
    setIsProcessing(true);

    // Mock payment processing - 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    setPaymentStep('success');

    // Wait for success animation then confirm
    setTimeout(() => {
      onConfirm([tool.id]);
      handleReset();
    }, 1500);
  };

  const handleReset = () => {
    setIsSelected(false);
    setQuantity(1);
    setSelectedAdditionalAssets(new Set());
    setIsProcessing(false);
    setPaymentStep('select');
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setTimeout(handleReset, 300);
    }
  };

  // Get quantity description
  const getQuantityDescription = () => {
    switch (itemId) {
      case 'interviews':
        return 'Number of interviews to conduct';
      case 'questionnaire':
        return 'Target number of responses (increments of 50)';
      case 'workshop':
        return 'Number of workshop sessions';
      default:
        return 'Number of sessions';
    }
  };

  if (!tool || !methodDetails) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <AnimatePresence mode="wait">
          {/* Selection Step */}
          {paymentStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col max-h-[90vh]"
            >
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Unlock Premium Tool</DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      for {itemName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Tool Details - Scrollable */}
              <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
                <div className="space-y-4">
                  {/* Method Selection */}
                  <div
                    className={`border rounded-lg p-4 transition-all ${ isSelected
                        ? 'border-primary bg-blue-50 dark:bg-blue-950/20 ring-2 ring-primary'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-muted'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        {/* Header with checkbox */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {/* Checkbox */}
                              <button
                                onClick={() => setIsSelected(!isSelected)}
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </button>
                              <p className="font-medium">{tool.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {methodDetails.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground ml-7">
                              {tool.description}
                            </p>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3 ml-7">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{methodDetails.duration}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{methodDetails.participants}</span>
                          </div>
                        </div>

                        {/* What's Included */}
                        <div className="ml-7 mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">What's Included</p>
                          <div className="space-y-1">
                            {methodDetails.whatsIncluded.map((item, idx) => (
                              <div key={idx} className="flex items-start space-x-1.5 text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Benefits */}
                        <div className="flex flex-wrap gap-1.5 ml-7 mb-3">
                          {methodDetails.benefits.map((benefit, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              {benefit}
                            </Badge>
                          ))}
                        </div>

                        {/* Quantity Selector (only visible when selected) */}
                        {isSelected && (
                          <div className="ml-7 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium mb-1">Quantity</p>
                                <p className="text-xs text-muted-foreground">
                                  {getQuantityDescription()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(-1);
                                  }}
                                  disabled={itemId === 'questionnaire' ? quantity <= 50 : quantity <= 1}
                                >
                                  -
                                </Button>
                                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(1);
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </div>

                            {/* Total calculation for single asset */}
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {quantity} × {totalAssets} asset{totalAssets > 1 ? 's' : ''} × ${tool.price}
                                </span>
                                <span className="font-medium">
                                  ${totalPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Assets Section (only visible when tool is selected) */}
                  {isSelected && additionalAssets.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm mb-1">
                            Add More Brand Assets
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unlock this tool for additional assets and save on bulk pricing
                          </p>
                        </div>
                        {selectedAdditionalAssets.size > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            +{selectedAdditionalAssets.size}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {additionalAssets.map((asset) => {
                          const isAssetSelected = selectedAdditionalAssets.has(asset.id);
                          const AssetIcon = asset.icon || Users;

                          return (
                            <div
                              key={asset.id}
                              className={`flex items-center space-x-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isAssetSelected
                                  ? 'border-primary bg-blue-50 dark:bg-blue-950/20'
                                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }`}
                              onClick={() => toggleAdditionalAsset(asset.id)}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAdditionalAsset(asset.id);
                                }}
                                className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isAssetSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                              >
                                {isAssetSelected && <Check className="h-2.5 w-2.5 text-white" />}
                              </button>

                              {/* Icon */}
                              <div className={`h-8 w-8 rounded flex items-center justify-center flex-shrink-0 ${
                                isAssetSelected ? 'bg-primary/10' : 'bg-muted'
                              }`}>
                                <AssetIcon className={`h-4 w-4 ${
                                  isAssetSelected ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{asset.type}</p>
                                <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                              </div>

                              {/* Price indicator */}
                              <div className="text-xs text-muted-foreground flex-shrink-0">
                                +${tool.price * quantity}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bulk unlock info */}
                      {selectedAdditionalAssets.size > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-blue-900 dark:text-blue-100">
                              <span className="font-semibold">Bulk unlock:</span> {tool.name} will be unlocked for{' '}
                              <span className="font-semibold">{totalAssets} brand asset{totalAssets > 1 ? 's' : ''}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-3 flex-shrink-0 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isSelected ? `${quantity} × ${tool.name}` : 'No tool selected'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Instant Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Lifetime Access</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 gap-2 flex-shrink-0 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setPaymentStep('payment')}
                  disabled={!isSelected}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Continue to Payment
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* Payment Step */}
          {paymentStep === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col max-h-[90vh]"
            >
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPaymentStep('select')}
                    className="mr-auto -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Complete Payment</DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      Total: ${totalPrice.toLocaleString()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
                <PaymentSection
                  amount={totalPrice}
                  onSuccess={handleConfirmPurchase}
                  onCancel={() => setPaymentStep('select')}
                />
              </div>
            </motion.div>
          )}

          {/* Processing Step */}
          {paymentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center"
                >
                  <Loader2 className="h-8 w-8 text-white" />
                </motion.div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-1">Processing Payment...</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please wait while we process your transaction
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success Step */}
          {paymentStep === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="py-12"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </motion.div>
                </motion.div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg mb-1">Payment Successful!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Unlocking your tool now...
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}