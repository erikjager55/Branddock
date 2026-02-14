/**
 * CUSTOM HOOK: useRecentItems
 * 
 * React hook for tracking and accessing recent items.
 * Automatically syncs with the RecentItemsService.
 */

import { useState, useEffect } from 'react';
import { RecentItem } from '../types/workflow';
import { recentItems } from '../services/RecentItemsService';

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    // Initial load
    setItems(recentItems.getItems());

    // Subscribe to changes
    const unsubscribe = recentItems.subscribe((newItems) => {
      setItems(newItems);
    });

    return unsubscribe;
  }, []);

  return {
    items,
    addItem: (item: Omit<RecentItem, 'timestamp'>) => recentItems.addItem(item),
    clear: () => recentItems.clear(),
    removeItem: (id: string) => recentItems.removeItem(id),
    getTimeAgo: (timestamp: number) => recentItems.getTimeAgo(timestamp),
    getTypeIcon: recentItems.getTypeIcon,
    getTypeLabel: recentItems.getTypeLabel
  };
}
