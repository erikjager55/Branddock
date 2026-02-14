/**
 * COMPONENT: Sort & Group Controls
 * 
 * Controls for sorting and grouping data.
 */

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Layers, X } from 'lucide-react';
import { SortConfig, SortField, GroupConfig, GroupField, SortDirection } from '../types/filtering';
import { Button } from './ui/button';

interface SortGroupControlsProps {
  sort: SortConfig;
  group?: GroupConfig;
  availableSortFields: SortField[];
  availableGroupFields: GroupField[];
  onSortChange: (sort: SortConfig) => void;
  onGroupChange: (group?: GroupConfig) => void;
}

export function SortGroupControls({
  sort,
  group,
  availableSortFields,
  availableGroupFields,
  onSortChange,
  onGroupChange
}: SortGroupControlsProps) {
  const currentSort = sort.options[0];

  const handleSortFieldChange = (field: string) => {
    onSortChange({
      options: [{
        field,
        direction: currentSort?.direction || 'asc'
      }]
    });
  };

  const handleSortDirectionToggle = () => {
    if (!currentSort) return;

    onSortChange({
      options: [{
        ...currentSort,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
      }]
    });
  };

  const handleGroupFieldChange = (field: string) => {
    if (field === '') {
      onGroupChange(undefined);
    } else {
      onGroupChange({
        field,
        direction: group?.direction || 'asc'
      });
    }
  };

  const handleGroupDirectionToggle = () => {
    if (!group) return;

    onGroupChange({
      ...group,
      direction: group.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortIcon = () => {
    if (!currentSort) return ArrowUpDown;
    return currentSort.direction === 'asc' ? ArrowUp : ArrowDown;
  };

  const SortIcon = getSortIcon();

  return (
    <div className="flex items-center gap-2">
      {/* Sort Controls */}
      <div className="flex items-center gap-1">
        <select
          value={currentSort?.field || ''}
          onChange={(e) => handleSortFieldChange(e.target.value)}
          className="h-9 px-3 text-sm border border-border rounded-md bg-background"
        >
          <option value="">Sort by...</option>
          {availableSortFields.map(field => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </select>

        {currentSort && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortDirectionToggle}
            className="h-9 w-9 p-0"
            title={`Sort ${currentSort.direction === 'asc' ? 'ascending' : 'descending'}`}
          >
            <SortIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Group Controls */}
      <div className="flex items-center gap-1">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <select
          value={group?.field || ''}
          onChange={(e) => handleGroupFieldChange(e.target.value)}
          className="h-9 px-3 text-sm border border-border rounded-md bg-background"
        >
          <option value="">No grouping</option>
          {availableGroupFields.map(field => (
            <option key={field.id} value={field.id}>
              Group by {field.label}
            </option>
          ))}
        </select>

        {group && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGroupDirectionToggle}
              className="h-9 w-9 p-0"
              title={`Group ${group.direction === 'asc' ? 'A-Z' : 'Z-A'}`}
            >
              {group.direction === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGroupChange(undefined)}
              className="h-9 w-9 p-0"
              title="Clear grouping"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
