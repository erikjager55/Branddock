/**
 * TYPE DEFINITIONS: Bulk Operations
 * 
 * Types for batch operations and bulk actions system.
 */

export type BulkActionType = 
  | 'change-status'
  | 'assign-tags'
  | 'remove-tags'
  | 'change-category'
  | 'change-priority'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'export'
  | 'duplicate';

export type BulkOperationStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BulkAction {
  id: string;
  type: BulkActionType;
  label: string;
  icon: string;
  description: string;
  requiresConfirmation: boolean;
  confirmMessage?: string;
  color?: 'default' | 'primary' | 'destructive' | 'warning';
  isDestructive?: boolean;
}

export interface BulkOperationConfig {
  action: BulkActionType;
  itemIds: string[];
  params?: Record<string, any>;
  executeAt?: Date; // For scheduled actions
}

export interface BulkOperationResult {
  id: string;
  action: BulkActionType;
  status: BulkOperationStatus;
  itemsTotal: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  startedAt: Date;
  completedAt?: Date;
  errors?: string[];
  canUndo: boolean;
  undoData?: any;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  totalItems: number;
}

export interface BulkActionHandler<T = any> {
  action: BulkActionType;
  execute: (items: T[], params?: Record<string, any>) => Promise<BulkOperationResult>;
  undo?: (undoData: any) => Promise<void>;
  validate?: (items: T[], params?: Record<string, any>) => string | null; // Returns error message or null
}
