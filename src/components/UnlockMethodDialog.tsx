import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import {
  Lock,
  Unlock,
  ShoppingCart,
  Check,
  Sparkles,
  TrendingUp,
  DollarSign,
  Package,
  ArrowRight,
  Crown,
  Target,
  Award,
  Users,
  Palette,
  BookOpen,
} from 'lucide-react';

interface UnlockMethodDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  methodName: string;
  assetName: string;
  foundationId: string;
  foundationName: string;
  bundleInfo: {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    discount: number;
    assetsIncluded: number;
    strategyToolsUnlocked: number;
    timeline: string;
    icon: any;
    color: string;
  };
  onPurchase: (bundleId: string) => void;
}

export function UnlockMethodDialog({
  open,
  onOpenChange,
  onClose,
  methodName,
  assetName,
  foundationName,
  foundationId,
  bundleInfo,
  onPurchase,
}: UnlockMethodDialogProps) {
  const BundleIcon = bundleInfo.icon || Package;

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (onClose && !newOpen) {
      onClose();
    }
  };

  const benefits = [
    `Unlock all ${bundleInfo.assetsIncluded} assets in ${foundationName}`,
    `Access ${bundleInfo.strategyToolsUnlocked} strategy generation tools`,
    `Complete research in ${bundleInfo.timeline}`,
    'Comprehensive research insights',
    'Multi-method validation',
    'Expert-designed frameworks',
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/20">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">Unlock Validation Method</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Purchase a bundle to access this research capability
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* What you're trying to unlock */}
          <Card className="border-2 border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 border border-amber-300">
                  <Lock className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-1">
                    You're trying to access:
                  </h4>
                  <div className="space-y-1 text-sm text-amber-800">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Method:</span>
                      <Badge variant="outline" className="bg-white border-amber-300">
                        {methodName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Asset:</span>
                      <span>{assetName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Foundation:</span>
                      <span>{foundationName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Recommended Bundle */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Recommended Bundle</h3>
            </div>

            <Card className="border-2 border-primary shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-4 rounded-xl bg-${bundleInfo.color}-50 border-2 border-${bundleInfo.color}-200`}>
                    <BundleIcon className={`w-8 h-8 text-${bundleInfo.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-xl font-bold mb-1">{bundleInfo.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Complete {foundationName} research bundle
                        </p>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        Save {bundleInfo.discount}%
                      </Badge>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3 mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary">
                          €{bundleInfo.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">one-time</span>
                      </div>
                      <div className="text-lg text-muted-foreground line-through">
                        €{bundleInfo.originalPrice.toLocaleString()}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {bundleInfo.assetsIncluded}
                        </div>
                        <div className="text-xs text-muted-foreground">Assets</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {bundleInfo.strategyToolsUnlocked}
                        </div>
                        <div className="text-xs text-muted-foreground">Tools</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {bundleInfo.timeline}
                        </div>
                        <div className="text-xs text-muted-foreground">Timeline</div>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-2">What's included:</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {benefits.map((benefit, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={() => {
                      onPurchase(bundleInfo.id);
                      handleOpenChange(false);
                    }}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Purchase Bundle - €{bundleInfo.price.toLocaleString()}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleOpenChange(false)}
                  >
                    Maybe Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Why purchase a bundle?</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• <strong>Better value:</strong> Save {bundleInfo.discount}% compared to individual methods</li>
                    <li>• <strong>Complete insights:</strong> Multiple research methods validate findings</li>
                    <li>• <strong>Unlock strategy tools:</strong> Generate advanced strategies automatically</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}