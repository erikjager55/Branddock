import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  CreditCard,
  Plus,
  Download,
  Calendar,
  DollarSign,
  Sparkles,
  Shield,
} from 'lucide-react';
import { StoredPaymentProfile } from '../payment/StoredPaymentProfile';
import { paymentProfileService } from '../../services/PaymentProfileService';
import { UnifiedPaymentModal } from '../payment/UnifiedPaymentModal';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export function BillingSettingsPage() {
  const [profile, setProfile] = useState(paymentProfileService.getProfile());
  const [profileVariant, setProfileVariant] = useState(paymentProfileService.getProfileVariant());
  const [showAddPayment, setShowAddPayment] = useState(false);

  const [invoices] = useState<Invoice[]>([
    {
      id: 'INV-001',
      date: '2026-01-01',
      amount: 499,
      status: 'paid',
      description: 'Stakeholder Interviews (5 sessions)',
    },
    {
      id: 'INV-002',
      date: '2025-12-15',
      amount: 899,
      status: 'paid',
      description: 'Online Questionnaire (100 responses)',
    },
    {
      id: 'INV-003',
      date: '2025-12-01',
      amount: 749,
      status: 'paid',
      description: 'Strategy Workshop (2 sessions)',
    },
  ]);

  // Subscribe to payment profile changes
  useEffect(() => {
    const unsubscribe = paymentProfileService.subscribe(() => {
      setProfile(paymentProfileService.getProfile());
      setProfileVariant(paymentProfileService.getProfileVariant());
    });

    return unsubscribe;
  }, []);

  const handleManagePayments = () => {
    // Could open a dedicated management modal
    setShowAddPayment(true);
  };

  const handleSetDefault = (methodId: string) => {
    paymentProfileService.setDefaultMethod(methodId);
  };

  const handleRemoveMethod = (methodId: string) => {
    paymentProfileService.removePaymentMethod(methodId);
  };

  const handleAddPaymentSuccess = () => {
    setShowAddPayment(false);
    // Profile will auto-update via subscription
  };

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your payment methods and view transaction history
          </p>
        </div>

        {/* Spending Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Spending Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Spent</span>
              </div>
              <p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">This Month</span>
              </div>
              <p className="text-2xl font-bold">$499</p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">Tools Unlocked</span>
              </div>
              <p className="text-2xl font-bold">8</p>
            </div>
          </div>
        </Card>

        {/* Payment Methods - Using StoredPaymentProfile */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Methods</h3>
          </div>

          <StoredPaymentProfile
            variant={profileVariant}
            methods={profile.methods}
            onManagePayments={handleManagePayments}
            onAddPaymentMethod={() => setShowAddPayment(true)}
            onSetDefault={handleSetDefault}
            onRemoveMethod={handleRemoveMethod}
            showActions={true}
            compact={false}
          />

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-4">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-900 dark:text-blue-100">
              Your payment information is encrypted and stored securely with 256-bit SSL
            </p>
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="space-y-2">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No transactions yet</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{invoice.description}</p>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'default'
                            : invoice.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{invoice.id}</span>
                      <span>•</span>
                      <span>{new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg">
                      ${invoice.amount.toLocaleString()}
                    </p>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Add Payment Method Modal */}
        <UnifiedPaymentModal
          isOpen={showAddPayment}
          onClose={() => setShowAddPayment(false)}
          onSuccess={handleAddPaymentSuccess}
          amount={0}
          title="Add Payment Method"
          description="Add a new payment method to your account for faster checkouts"
          actionLabel="Save Payment Method"
        />
      </div>
    </div>
  );
}
