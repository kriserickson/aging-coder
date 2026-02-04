'use client';

import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useColumnConfig } from '@/hooks/use-column-config';
import type { ColumnConfig, FitAnalytics, GroupedFitEntry, SortConfig } from '@/lib/types';
import { formatDate, truncate } from '@/lib/utils';
import { ColumnSelector } from './column-selector';
import { DataGrid } from './data-grid';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'timestamp', label: 'Date', visible: true, sortable: true },
  { key: 'jobTitle', label: 'Job Title', visible: true, sortable: true },
  { key: 'company', label: 'Company', visible: true, sortable: true },
  { key: 'verdict', label: 'Verdict', visible: true, sortable: true },
  { key: 'url', label: 'URL', visible: true, sortable: false },
  { key: 'clientId', label: 'Client', visible: false, sortable: true },
  { key: 'userAgent', label: 'User Agent', visible: false, sortable: false },
];

const GROUPED_COLUMNS: ColumnConfig[] = [
  { key: 'jobTitle', label: 'Job Title', visible: true, sortable: true },
  { key: 'company', label: 'Company', visible: true, sortable: true },
  { key: 'verdict', label: 'Verdict', visible: true, sortable: true },
  { key: 'count', label: 'Count', visible: true, sortable: true },
];

interface FitPanelProps {
  data: FitAnalytics[];
}

const verdictColors: Record<string, string> = {
  strong: 'bg-green-50 text-green-700 border-green-200',
  moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  weak: 'bg-red-50 text-red-700 border-red-200',
};

export function FitPanel({ data }: FitPanelProps) {
  const [columns, toggleColumn] = useColumnConfig('fit', DEFAULT_COLUMNS);
  const [groupedColumns, toggleGroupedColumn] = useColumnConfig('fit-grouped', GROUPED_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    column: 'timestamp',
    direction: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [grouped, setGrouped] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }
    const q = searchQuery.toLowerCase();
    return data.filter(
      entry =>
        entry.jobTitle?.toLowerCase().includes(q) ||
        entry.company?.toLowerCase().includes(q) ||
        entry.verdict?.toLowerCase().includes(q) ||
        entry.url?.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortConfig) {
      return filteredData;
    }
    const { column, direction } = sortConfig;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[column];
      const bVal = (b as unknown as Record<string, unknown>)[column];
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      const cmp = aStr.localeCompare(bStr);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortConfig]);

  const groupedData = useMemo((): GroupedFitEntry[] => {
    if (!grouped) {
      return [];
    }
    const map = new Map<string, GroupedFitEntry>();
    for (const entry of filteredData) {
      const key = `${entry.jobTitle?.trim().toLowerCase()}-${entry.company?.trim().toLowerCase() || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.entries.push(entry);
      } else {
        map.set(key, {
          jobTitle: entry.jobTitle,
          company: entry.company,
          verdict: entry.verdict,
          count: 1,
          entries: [entry],
        });
      }
    }
    const result = Array.from(map.values());
    if (sortConfig) {
      const { column, direction } = sortConfig;
      result.sort((a, b) => {
        let cmp = 0;
        if (column === 'count') {
          cmp = a.count - b.count;
        } else if (column === 'jobTitle') {
          cmp = (a.jobTitle || '').localeCompare(b.jobTitle || '');
        } else if (column === 'company') {
          cmp = (a.company || '').localeCompare(b.company || '');
        } else if (column === 'verdict') {
          cmp = (a.verdict || '').localeCompare(b.verdict || '');
        }
        return direction === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [filteredData, grouped, sortConfig]);

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const renderVerdictBadge = (verdict: string) => {
    const colorClass = verdictColors[verdict] || 'bg-gray-50 text-gray-600 border-gray-200';
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colorClass}`}>
        {verdict}
      </span>
    );
  };

  const renderCell = (row: FitAnalytics, key: string) => {
    switch (key) {
      case 'timestamp':
        return <span className="text-gray-600 whitespace-nowrap">{formatDate(row.timestamp)}</span>;
      case 'jobTitle':
        return <span className="text-gray-900 font-medium">{truncate(row.jobTitle, 50)}</span>;
      case 'company':
        return row.company ? (
          <span className="text-gray-700">{row.company}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      case 'verdict':
        return renderVerdictBadge(row.verdict);
      case 'url':
        return row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs"
          >
            {truncate(row.url, 40)}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        );
      case 'clientId':
        return (
          <span className="text-gray-500 font-mono text-xs">{truncate(row.clientId, 20)}</span>
        );
      case 'userAgent':
        return <span className="text-gray-500 text-xs">{truncate(row.userAgent, 40)}</span>;
      default:
        return null;
    }
  };

  const renderGroupedCell = (row: GroupedFitEntry, key: string) => {
    switch (key) {
      case 'jobTitle':
        return <span className="text-gray-900 font-medium">{truncate(row.jobTitle, 50)}</span>;
      case 'company':
        return row.company ? (
          <span className="text-gray-700">{row.company}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      case 'verdict':
        return renderVerdictBadge(row.verdict);
      case 'count':
        return <span className="font-medium text-blue-700">{row.count}</span>;
      default:
        return null;
    }
  };

  const renderExpanded = (row: FitAnalytics) => (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700">Job Title:</span>
          <p className="mt-0.5 text-gray-900">{row.jobTitle}</p>
        </div>
        <div>
          <span className="font-medium text-gray-700">Company:</span>
          <p className="mt-0.5 text-gray-900">{row.company || 'N/A'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700">Verdict:</span>
          <p className="mt-1">{renderVerdictBadge(row.verdict)}</p>
        </div>
        {row.url && (
          <div>
            <span className="font-medium text-gray-700">URL:</span>
            <p className="mt-0.5">
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {row.url}
              </a>
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Client: {row.clientId}</span>
        <span>{formatDate(row.timestamp)}</span>
      </div>
    </div>
  );

  const renderGroupedExpanded = (row: GroupedFitEntry) => (
    <div className="space-y-3 text-sm">
      <div className="font-medium text-gray-700">
        {row.count} assessment{row.count !== 1 ? 's' : ''}
      </div>
      {row.entries.map(entry => (
        <div key={entry.timestamp} className="border-l-2 border-blue-200 pl-3 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
            {renderVerdictBadge(entry.verdict)}
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                {truncate(entry.url, 30)}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search job title, company, verdict..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setGrouped(!grouped)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md ${
            grouped
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Group
        </button>
        <ColumnSelector
          columns={grouped ? groupedColumns : columns}
          onToggle={grouped ? toggleGroupedColumn : toggleColumn}
        />
        <span className="text-xs text-gray-500">{filteredData.length} entries</span>
      </div>

      {grouped ? (
        <DataGrid
          data={groupedData}
          columns={groupedColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
          renderCell={renderGroupedCell}
          renderExpanded={renderGroupedExpanded}
          getRowKey={(row, i) => `${row.jobTitle}-${row.company}-${i}`}
        />
      ) : (
        <DataGrid
          data={sortedData}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          renderCell={renderCell}
          renderExpanded={renderExpanded}
          getRowKey={(row, i) => `${row.timestamp}-${i}`}
        />
      )}
    </div>
  );
}
