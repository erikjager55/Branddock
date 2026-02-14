/**
 * COMPONENT: Filter Panel
 * 
 * Advanced filtering UI with multi-criteria, presets, and quick filters.
 */

import React, { useState } from 'react';
import { Plus, X, Save, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import {
  FilterCondition,
  FilterGroup,
  FilterField,
  FilterOperator,
  FilterPreset
} from '../types/filtering';
import { Button } from './ui/button';

interface FilterPanelProps {
  filters: FilterGroup;
  availableFields: FilterField[];
  presets: FilterPreset[];
  activePreset?: string;
  onFiltersChange: (filters: FilterGroup) => void;
  onPresetSelect: (presetId: string) => void;
  onPresetSave: (name: string, filters: FilterGroup) => void;
  onPresetDelete: (presetId: string) => void;
}

export function FilterPanel({
  filters,
  availableFields,
  presets,
  activePreset,
  onFiltersChange,
  onPresetSelect,
  onPresetSave,
  onPresetDelete
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Add new filter condition
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: availableFields[0]?.id || '',
      operator: 'contains',
      value: '',
      fieldType: availableFields[0]?.type || 'text'
    };

    onFiltersChange({
      ...filters,
      conditions: [...filters.conditions, newCondition]
    });
  };

  // Update filter condition
  const updateCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
    onFiltersChange({
      ...filters,
      conditions: filters.conditions.map(c =>
        c.id === conditionId ? { ...c, ...updates } : c
      )
    });
  };

  // Remove filter condition
  const removeCondition = (conditionId: string) => {
    onFiltersChange({
      ...filters,
      conditions: filters.conditions.filter(c => c.id !== conditionId)
    });
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      conditions: []
    });
  };

  // Save current filters as preset
  const handleSavePreset = () => {
    if (presetName.trim()) {
      onPresetSave(presetName.trim(), filters);
      setPresetName('');
      setShowPresetDialog(false);
    }
  };

  // Get operators for field type
  const getOperatorsForField = (fieldType: string): FilterOperator[] => {
    switch (fieldType) {
      case 'text':
        return ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'];
      case 'number':
        return ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'];
      case 'select':
      case 'multiselect':
      case 'status':
      case 'category':
        return ['in', 'notIn', 'isEmpty', 'isNotEmpty'];
      case 'boolean':
        return ['equals'];
      case 'date':
        return ['equals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'];
      default:
        return ['contains', 'equals'];
    }
  };

  // Operator labels
  const operatorLabels: Record<FilterOperator, string> = {
    equals: 'equals',
    notEquals: 'not equals',
    contains: 'contains',
    notContains: 'does not contain',
    startsWith: 'starts with',
    endsWith: 'ends with',
    greaterThan: 'greater than',
    lessThan: 'less than',
    in: 'is one of',
    notIn: 'is not one of',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty'
  };

  const hasActiveFilters = filters.conditions.length > 0;

  return (
    <div className="border border-border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
              {filters.conditions.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Presets */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Saved Filters</label>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center gap-1">
                    <Button
                      variant={activePreset === preset.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPresetSelect(preset.id)}
                      className="h-7 text-xs"
                    >
                      {preset.name}
                    </Button>
                    {!preset.isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPresetDelete(preset.id)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Conditions */}
          <div className="space-y-2">
            {filters.conditions.map((condition, index) => {
              const field = availableFields.find(f => f.id === condition.field);
              const operators = getOperatorsForField(condition.fieldType);

              return (
                <div key={condition.id} className="flex items-start gap-2">
                  {/* Logic operator (AND/OR) for subsequent conditions */}
                  {index > 0 && (
                    <select
                      value={filters.logic}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        logic: e.target.value as 'AND' | 'OR'
                      })}
                      className="h-9 px-2 text-xs border border-border rounded-md bg-background"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}

                  {/* Field selector */}
                  <select
                    value={condition.field}
                    onChange={(e) => {
                      const newField = availableFields.find(f => f.id === e.target.value);
                      updateCondition(condition.id, {
                        field: e.target.value,
                        fieldType: newField?.type || 'text',
                        operator: getOperatorsForField(newField?.type || 'text')[0]
                      });
                    }}
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background"
                  >
                    {availableFields.map(field => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator selector */}
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(condition.id, {
                      operator: e.target.value as FilterOperator
                    })}
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background"
                  >
                    {operators.map(op => (
                      <option key={op} value={op}>
                        {operatorLabels[op]}
                      </option>
                    ))}
                  </select>

                  {/* Value input */}
                  {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                    <>
                      {field?.type === 'select' || field?.type === 'multiselect' ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background"
                        >
                          <option value="">Select...</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          placeholder={field?.placeholder || 'Value...'}
                          className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background"
                        />
                      )}
                    </>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add Condition Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Filter
          </Button>

          {/* Save Preset */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-border">
              {showPresetDialog ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') setShowPresetDialog(false);
                    }}
                    autoFocus
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPresetDialog(false);
                      setPresetName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPresetDialog(true)}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save as Preset
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
