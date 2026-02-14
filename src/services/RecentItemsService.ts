/**
 * RECENT ITEMS SERVICE
 * 
 * Tracks and manages recently accessed items across the application.
 * Persists to localStorage for cross-session history.
 */

import { RecentItem, RecentItemType, RecentItemsConfig } from '../types/workflow';

const DEFAULT_CONFIG: RecentItemsConfig = {
  maxItems: 10,
  persistKey: 'research-tool-recent-items',
  excludeTypes: []
};

class RecentItemsService {
  private items: RecentItem[] = [];
  private config: RecentItemsConfig;
  private listeners: Set<(items: RecentItem[]) => void> = new Set();

  constructor(config: Partial<RecentItemsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Add an item to recent items
   */
  addItem(item: Omit<RecentItem, 'timestamp'>): void {
    // Don't add excluded types
    if (this.config.excludeTypes?.includes(item.type)) {
      return;
    }

    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now()
    };

    // Remove existing item with same id if present
    this.items = this.items.filter(i => i.id !== item.id);

    // Add to front
    this.items.unshift(newItem);

    // Limit to max items
    if (this.items.length > this.config.maxItems) {
      this.items = this.items.slice(0, this.config.maxItems);
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get all recent items
   */
  getItems(): RecentItem[] {
    return [...this.items];
  }

  /**
   * Get recent items by type
   */
  getItemsByType(type: RecentItemType): RecentItem[] {
    return this.items.filter(i => i.type === type);
  }

  /**
   * Get recent items grouped by type
   */
  getItemsGroupedByType(): Map<RecentItemType, RecentItem[]> {
    const grouped = new Map<RecentItemType, RecentItem[]>();
    
    this.items.forEach(item => {
      const existing = grouped.get(item.type) || [];
      grouped.set(item.type, [...existing, item]);
    });

    return grouped;
  }

  /**
   * Clear all recent items
   */
  clear(): void {
    this.items = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear recent items of a specific type
   */
  clearByType(type: RecentItemType): void {
    this.items = this.items.filter(i => i.type !== type);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Remove a specific item
   */
  removeItem(id: string): void {
    this.items = this.items.filter(i => i.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: (items: RecentItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getItems()));
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.config.persistKey, JSON.stringify(this.items));
    } catch (error) {
      console.warn('Failed to save recent items to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.persistKey);
      if (stored) {
        this.items = JSON.parse(stored);
        
        // Filter out old items (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.items = this.items.filter(i => i.timestamp > thirtyDaysAgo);
        
        // Limit to max items
        if (this.items.length > this.config.maxItems) {
          this.items = this.items.slice(0, this.config.maxItems);
        }
      }
    } catch (error) {
      console.warn('Failed to load recent items from localStorage:', error);
      this.items = [];
    }
  }

  /**
   * Get formatted time ago string
   */
  getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  }

  /**
   * Get icon for item type
   */
  getTypeIcon(type: RecentItemType): string {
    const iconMap: Record<RecentItemType, string> = {
      'brand-asset': 'Palette',
      'persona': 'Users',
      'research-plan': 'Target',
      'research-method': 'Microscope',
      'strategy-tool': 'Zap',
      'product': 'Package',
      'trend': 'TrendingUp',
      'knowledge': 'BookOpen',
      'page': 'FileText'
    };
    
    return iconMap[type] || 'Circle';
  }

  /**
   * Get label for item type
   */
  getTypeLabel(type: RecentItemType): string {
    const labelMap: Record<RecentItemType, string> = {
      'brand-asset': 'Brand Asset',
      'persona': 'Persona',
      'research-plan': 'Research Plan',
      'research-method': 'Research Method',
      'strategy-tool': 'Strategy Tool',
      'product': 'Product',
      'trend': 'Trend',
      'knowledge': 'Knowledge',
      'page': 'Page'
    };
    
    return labelMap[type] || 'Item';
  }
}

// Singleton instance
export const recentItems = new RecentItemsService();
