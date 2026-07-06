'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AgentArtifactFull } from '../types/agents.types';

type ColumnType = 'text' | 'number' | 'date';

interface TableColumn {
  key: string;
  label: string;
  type: ColumnType;
}

type CellValue = string | number | boolean | null;

interface ParsedTable {
  columns: TableColumn[];
  rows: Record<string, CellValue>[];
  summary: string | null;
}

/** Boven deze rij-grens krijgt de tabel een vaste hoogte + verticale scroll. */
const SCROLL_THRESHOLD = 50;

/**
 * Renderer voor TABLE-artefacten van de Data Analyst (server-owned shape
 * `{columns, rows, summary?}` — zie table-contract.ts). Defensief geparsed:
 * misvormde content rendert een nette melding, nooit een crash. Sorteerbare
 * kolomkoppen + type-bewuste weergave (datum/nummer/tekst).
 */
export function TableArtifactView({ artifact }: { artifact: AgentArtifactFull }) {
  const { t, i18n } = useTranslation('agents');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const table = useMemo(() => parseTable(artifact.content), [artifact.content]);

  const sortedRows = useMemo(() => {
    if (!table || !sort) return table?.rows ?? [];
    const column = table.columns.find((c) => c.key === sort.key);
    if (!column) return table.rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...table.rows].sort((a, b) => factor * compareCells(a[sort.key], b[sort.key], column.type));
  }, [table, sort]);

  if (!table) {
    return (
      <p data-testid="artifact-table-invalid" className="text-sm text-muted-foreground">
        {t('artifact.table.invalid')}
      </p>
    );
  }

  if (table.rows.length === 0) {
    return (
      <div data-testid="artifact-table" className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('artifact.table.empty')}</p>
        {table.summary && <p className="text-xs text-gray-400">{table.summary}</p>}
      </div>
    );
  }

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  return (
    <div data-testid="artifact-table" className="space-y-2">
      <div
        className="overflow-x-auto border border-gray-200 rounded-lg"
        style={table.rows.length > SCROLL_THRESHOLD ? { maxHeight: '24rem', overflowY: 'auto' } : undefined}
      >
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.key === column.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap"
                  style={{ textAlign: column.type === 'number' ? 'right' : 'left' }}
                >
                  <button
                    type="button"
                    data-testid={`table-sort-${column.key}`}
                    onClick={() => toggleSort(column.key)}
                    title={t('artifact.table.sortHint', { column: column.label })}
                    className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-gray-900"
                  >
                    {column.label}
                    {sort?.key === column.key ? (
                      sort.dir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-300" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100 last:border-b-0">
                {table.columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-2 text-gray-700"
                    style={
                      column.type === 'number'
                        ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
                        : undefined
                    }
                  >
                    {formatCell(row[column.key], column.type, i18n.language)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
        <span data-testid="artifact-table-rowcount">
          {t('artifact.table.rowCount', { count: table.rows.length })}
        </span>
        {table.summary && <span className="truncate">{table.summary}</span>}
      </div>
    </div>
  );
}

// ─── Parsing (defensief — server-contract, maar nooit crashen) ─

function parseTable(content: Record<string, unknown>): ParsedTable | null {
  if (!Array.isArray(content.columns) || content.columns.length === 0) return null;
  if (!Array.isArray(content.rows)) return null;

  const columns: TableColumn[] = [];
  for (const raw of content.columns) {
    if (!raw || typeof raw !== 'object') return null;
    const col = raw as Record<string, unknown>;
    if (typeof col.key !== 'string' || typeof col.label !== 'string') return null;
    const type: ColumnType =
      col.type === 'number' || col.type === 'date' ? (col.type as ColumnType) : 'text';
    columns.push({ key: col.key, label: col.label, type });
  }

  const rows: Record<string, CellValue>[] = [];
  for (const raw of content.rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const source = raw as Record<string, unknown>;
    const row: Record<string, CellValue> = {};
    for (const column of columns) {
      const value = source[column.key];
      row[column.key] =
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
          ? value
          : null;
    }
    rows.push(row);
  }

  const summary = typeof content.summary === 'string' ? content.summary : null;
  return { columns, rows, summary };
}

// ─── Sorteren + type-bewuste weergave ────────────────────────

function compareCells(a: CellValue, b: CellValue, type: ColumnType): number {
  // Lege cellen altijd achteraan, ongeacht richting van de vergelijking zelf.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (type === 'number') {
    return toNumber(a) - toNumber(b);
  }
  if (type === 'date') {
    return toTimestamp(a) - toTimestamp(b);
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function toNumber(value: CellValue): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function toTimestamp(value: CellValue): number {
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function formatCell(value: CellValue, type: ColumnType, locale: string): string {
  if (value === null) return '—';
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString(locale, { maximumFractionDigits: 4 });
  }
  if (type === 'date') {
    const timestamp = Date.parse(String(value));
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return String(value);
}
