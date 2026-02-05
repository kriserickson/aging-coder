'use client';

import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ColumnConfig, SortConfig } from '@/lib/types';

interface DataGridProps<T> {
  data: T[];
  columns: ColumnConfig[];
  sortConfig: SortConfig | null;
  onSort: (column: string) => void;
  renderCell: (row: T, columnKey: string) => React.ReactNode;
  renderExpanded?: (row: T) => React.ReactNode;
  getRowKey: (row: T, index: number) => string;
}

export function DataGrid<T>({
  data,
  columns,
  sortConfig,
  onSort,
  renderCell,
  renderExpanded,
  getRowKey,
}: DataGridProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  const toggleExpand = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getSortIcon = (column: string) => {
    if (!sortConfig || sortConfig.column !== column) {
      return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-600" />
    );
  };

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">No data found.</div>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {renderExpanded && <th className="w-8 px-2 py-2" />}
            {visibleColumns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left font-medium text-gray-700 ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                }`}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && getSortIcon(col.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const key = getRowKey(row, index);
            const isExpanded = expandedRows.has(key);

            return (
              <>
                <tr key={key} className="border-b border-gray-100 hover:bg-blue-50/30">
                  {renderExpanded && (
                    <td className="w-8 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        className="p-0.5 rounded hover:bg-gray-200"
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    </td>
                  )}
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-3 py-2 overflow-hidden" style={col.width ? { width: col.width } : undefined}>
                      <div className="overflow-hidden">{renderCell(row, col.key)}</div>
                    </td>
                  ))}
                </tr>
                {isExpanded && renderExpanded && (
                  <tr key={`${key}-expanded`} className="bg-gray-50">
                    <td colSpan={visibleColumns.length + 1} className="px-4 py-3">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
