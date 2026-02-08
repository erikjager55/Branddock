"use client";

import { useState, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortable?: boolean;
  selectable?: boolean;
  loading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  onSelectionChange?: (selected: T[]) => void;
  getRowKey?: (row: T) => string;
  className?: string;
}

type SortDirection = "asc" | "desc";

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = false,
  selectable = false,
  loading = false,
  emptyState,
  onSelectionChange,
  getRowKey,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const rowKey = useCallback(
    (row: T, index: number) =>
      getRowKey ? getRowKey(row) : (row.id as string) || String(index),
    [getRowKey]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const allSelected =
    data.length > 0 && selectedKeys.size === data.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    } else {
      const keys = new Set(data.map((row, i) => rowKey(row, i)));
      setSelectedKeys(keys);
      onSelectionChange?.(data);
    }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
    onSelectionChange?.(
      data.filter((row, i) => next.has(rowKey(row, i)))
    );
  };

  if (!loading && data.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border-dark",
        className
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-dark bg-background-dark">
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-border-dark accent-primary"
                />
              </th>
            )}
            {columns.map((col) => {
              const isSortable = sortable && col.sortable !== false;
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-text-dark/60",
                    isSortable && "cursor-pointer select-none hover:text-text-dark",
                    col.className
                  )}
                  onClick={isSortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {isSortable &&
                      (isSorted ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                      ))}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-dark/50">
                  {selectable && (
                    <td className="px-3 py-3">
                      <Skeleton variant="rect" width={16} height={16} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton variant="text" />
                    </td>
                  ))}
                </tr>
              ))
            : sortedData.map((row, rowIndex) => {
                const key = rowKey(row, rowIndex);
                const isSelected = selectedKeys.has(key);

                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-border-dark/50 transition-colors",
                      isSelected
                        ? "bg-primary/5"
                        : "hover:bg-surface-dark/50"
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          className="rounded border-border-dark accent-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-text-dark",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : (row[col.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
