/**
 * COMPONENT: Data View Renderer
 * 
 * Renders data in different view modes (Grid, List, Table, Kanban).
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ViewMode, GroupedData } from '../types/filtering';

interface DataViewRendererProps<T> {
  viewMode: ViewMode;
  items: T[];
  groups?: GroupedData<T>[];
  renderCard: (item: T) => React.ReactNode;
  renderListItem: (item: T) => React.ReactNode;
  renderTableRow: (item: T) => React.ReactNode;
  tableHeaders?: string[];
  onGroupToggle?: (groupKey: string) => void;
  emptyMessage?: string;
}

export function DataViewRenderer<T>({
  viewMode,
  items,
  groups,
  renderCard,
  renderListItem,
  renderTableRow,
  tableHeaders = [],
  onGroupToggle,
  emptyMessage = 'No items to display'
}: DataViewRendererProps<T>) {
  // Empty state
  if (!groups && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Grouped view
  if (groups) {
    return (
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.groupKey} className="space-y-3">
            {/* Group Header */}
            <button
              onClick={() => onGroupToggle?.(group.groupKey)}
              className="flex items-center gap-2 w-full text-left group"
            >
              {group.isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-medium group-hover:text-primary transition-colors">
                {group.groupLabel}
              </h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                {group.items.length}
              </span>
            </button>

            {/* Group Content */}
            {!group.isCollapsed && (
              <div className="pl-6">
                <ViewModeContent
                  viewMode={viewMode}
                  items={group.items}
                  renderCard={renderCard}
                  renderListItem={renderListItem}
                  renderTableRow={renderTableRow}
                  tableHeaders={tableHeaders}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Non-grouped view
  return (
    <ViewModeContent
      viewMode={viewMode}
      items={items}
      renderCard={renderCard}
      renderListItem={renderListItem}
      renderTableRow={renderTableRow}
      tableHeaders={tableHeaders}
    />
  );
}

// Internal component for rendering different view modes
function ViewModeContent<T>({
  viewMode,
  items,
  renderCard,
  renderListItem,
  renderTableRow,
  tableHeaders
}: {
  viewMode: ViewMode;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  renderListItem: (item: T) => React.ReactNode;
  renderTableRow: (item: T) => React.ReactNode;
  tableHeaders: string[];
}) {
  switch (viewMode) {
    case 'grid':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, index) => (
            <div key={index}>{renderCard(item)}</div>
          ))}
        </div>
      );

    case 'list':
      return (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index}>{renderListItem(item)}</div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {tableHeaders.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-muted/50 transition-colors">
                  {renderTableRow(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'kanban':
      // Kanban view requires grouped data
      return (
        <div className="text-center py-8 text-muted-foreground">
          Kanban view requires grouping. Please select a group field.
        </div>
      );

    default:
      return null;
  }
}

// Kanban-specific renderer
export function KanbanView<T>({
  groups,
  renderCard,
  onGroupToggle
}: {
  groups: GroupedData<T>[];
  renderCard: (item: T) => React.ReactNode;
  onGroupToggle?: (groupKey: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(group => (
        <div
          key={group.groupKey}
          className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{group.groupLabel}</h3>
              <span className="px-2 py-0.5 text-xs rounded-full bg-background text-muted-foreground">
                {group.items.length}
              </span>
            </div>
          </div>

          {/* Column Items */}
          <div className="space-y-3">
            {group.items.map((item, index) => (
              <div key={index}>{renderCard(item)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
