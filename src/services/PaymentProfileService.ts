import { StoredPaymentMethod, ProfileStatus } from '../components/payment/StoredPaymentProfile';
import { PaymentMethodType } from '../components/payment/PaymentMethodSelector';

/**
 * Payment Profile Service
 * Manages stored payment methods and profiles
 * In production, this would sync with a backend API
 */

const STORAGE_KEY = 'payment_profile';

export interface PaymentProfile {
  methods: StoredPaymentMethod[];
  hasProfile: boolean;
}

class PaymentProfileService {
  private listeners: Set<() => void> = new Set();

  /**
   * Get the current payment profile
   */
  getProfile(): PaymentProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { methods: [], hasProfile: false };
      }

      const profile = JSON.parse(stored) as PaymentProfile;
      return profile;
    } catch (error) {
      console.error('Error loading payment profile:', error);
      return { methods: [], hasProfile: false };
    }
  }

  /**
   * Get the default payment method
   */
  getDefaultMethod(): StoredPaymentMethod | null {
    const profile = this.getProfile();
    return profile.methods.find(m => m.isDefault) || null;
  }

  /**
   * Add a new payment method
   */
  addPaymentMethod(
    type: PaymentMethodType,
    displayName: string,
    expiryDate?: string,
    setAsDefault: boolean = false
  ): void {
    const profile = this.getProfile();
    
    // If this is the first method or setAsDefault is true, make it default
    const isDefault = profile.methods.length === 0 || setAsDefault;
    
    // If setting as default, remove default from other methods
    if (isDefault) {
      profile.methods.forEach(m => m.isDefault = false);
    }

    const newMethod: StoredPaymentMethod = {
      id: `method-${Date.now()}`,
      type,
      isDefault,
      displayName,
      expiryDate,
      status: 'verified',
      lastUsed: new Date().toISOString(),
    };

    profile.methods.push(newMethod);
    profile.hasProfile = true;

    this.saveProfile(profile);
    this.notifyListeners();
  }

  /**
   * Remove a payment method
   */
  removePaymentMethod(methodId: string): void {
    const profile = this.getProfile();
    const methodIndex = profile.methods.findIndex(m => m.id === methodId);
    
    if (methodIndex === -1) return;

    const wasDefault = profile.methods[methodIndex].isDefault;
    profile.methods.splice(methodIndex, 1);

    // If we removed the default and there are other methods, make the first one default
    if (wasDefault && profile.methods.length > 0) {
      profile.methods[0].isDefault = true;
    }

    profile.hasProfile = profile.methods.length > 0;

    this.saveProfile(profile);
    this.notifyListeners();
  }

  /**
   * Set a payment method as default
   */
  setDefaultMethod(methodId: string): void {
    const profile = this.getProfile();
    
    profile.methods.forEach(m => {
      m.isDefault = m.id === methodId;
    });

    this.saveProfile(profile);
    this.notifyListeners();
  }

  /**
   * Update method status (e.g., mark as expired)
   */
  updateMethodStatus(methodId: string, status: ProfileStatus): void {
    const profile = this.getProfile();
    const method = profile.methods.find(m => m.id === methodId);
    
    if (method) {
      method.status = status;
      this.saveProfile(profile);
      this.notifyListeners();
    }
  }

  /**
   * Update last used timestamp
   */
  markMethodUsed(methodId: string): void {
    const profile = this.getProfile();
    const method = profile.methods.find(m => m.id === methodId);
    
    if (method) {
      method.lastUsed = new Date().toISOString();
      this.saveProfile(profile);
      this.notifyListeners();
    }
  }

  /**
   * Check if user has a valid payment profile
   */
  hasValidProfile(): boolean {
    const profile = this.getProfile();
    return profile.hasProfile && profile.methods.some(m => m.status === 'verified');
  }

  /**
   * Get profile variant for UI
   */
  getProfileVariant(): 'empty' | 'active' | 'expired' | 'error' {
    const profile = this.getProfile();
    
    if (!profile.hasProfile || profile.methods.length === 0) {
      return 'empty';
    }

    const defaultMethod = this.getDefaultMethod();
    if (!defaultMethod) {
      return 'empty';
    }

    if (defaultMethod.status === 'error') {
      return 'error';
    }

    if (defaultMethod.status === 'expired') {
      return 'expired';
    }

    return 'active';
  }

  /**
   * Subscribe to profile changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Clear all payment methods (for testing)
   */
  clearProfile(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Initialize with demo data (for first-time users)
   */
  initializeDemoProfile(): void {
    const profile = this.getProfile();
    
    // Only initialize if no profile exists
    if (profile.hasProfile) return;

    // Add a demo verified card
    this.addPaymentMethod(
      'card',
      'Visa •••• 4242',
      '12/26',
      true
    );
  }

  // Private methods
  private saveProfile(profile: PaymentProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving payment profile:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const paymentProfileService = new PaymentProfileService();

// Initialize demo profile on first load (for demo purposes)
if (typeof window !== 'undefined') {
  paymentProfileService.initializeDemoProfile();
}
