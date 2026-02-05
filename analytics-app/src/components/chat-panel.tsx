'use client';

import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useColumnConfig } from '@/hooks/use-column-config';
import type { ChatAnalytics, ColumnConfig, GroupedChatEntry, SortConfig } from '@/lib/types';
import { formatDate, truncate } from '@/lib/utils';
import { ColumnSelector } from './column-selector';
import { DataGrid } from './data-grid';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'timestamp', label: 'Date', visible: true, sortable: true, width: '140px' },
  { key: 'question', label: 'Question', visible: true, sortable: true, width: '25%' },
  { key: 'response', label: 'Response', visible: true, sortable: false, width: '30%' },
  { key: 'ragNames', label: 'RAG Data', visible: true, sortable: false, width: '20%' },
  { key: 'exactMatch', label: 'Exact Match', visible: true, sortable: true, width: '100px' },
  { key: 'clientId', label: 'Client', visible: false, sortable: true, width: '150px' },
  { key: 'userAgent', label: 'User Agent', visible: false, sortable: false, width: '200px' },
];

const GROUPED_COLUMNS: ColumnConfig[] = [
  { key: 'question', label: 'Question', visible: true, sortable: true, width: '40%' },
  { key: 'count', label: 'Count', visible: true, sortable: true, width: '80px' },
  { key: 'ragNames', label: 'RAG Data', visible: true, sortable: false, width: '30%' },
  { key: 'exactMatch', label: 'Exact Match', visible: true, sortable: true, width: '100px' },
];

interface ChatPanelProps {
  data: ChatAnalytics[];
}

export function ChatPanel({ data }: ChatPanelProps) {
  const [columns, toggleColumn] = useColumnConfig('chat', DEFAULT_COLUMNS);
  const [groupedColumns, toggleGroupedColumn] = useColumnConfig('chat-grouped', GROUPED_COLUMNS);
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
        entry.question?.toLowerCase().includes(q) ||
        entry.response?.toLowerCase().includes(q) ||
        entry.ragNames?.some(name => name.toLowerCase().includes(q)),
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

  const groupedData = useMemo((): GroupedChatEntry[] => {
    if (!grouped) {
      return [];
    }
    const map = new Map<string, GroupedChatEntry>();
    for (const entry of filteredData) {
      const key = entry.question?.trim().toLowerCase() || '';
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.entries.push(entry);
      } else {
        map.set(key, {
          question: entry.question,
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
        } else if (column === 'question') {
          cmp = a.question.localeCompare(b.question);
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

  const renderCell = (row: ChatAnalytics, key: string) => {
    switch (key) {
      case 'timestamp':
        return <span className="text-gray-600 whitespace-nowrap">{formatDate(row.timestamp)}</span>;
      case 'question':
        return <span className="text-gray-900">{truncate(row.question, 80)}</span>;
      case 'response':
        return <span className="text-gray-600">{truncate(row.response, 60)}</span>;
      case 'ragNames':
        return row.ragNames?.length ? (
          <div className="flex flex-wrap gap-1">
            {row.ragNames.map(name => (
              <span
                key={name}
                className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {truncate(name, 30)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      case 'exactMatch':
        return row.exactMatch ? (
          <span className="text-green-600 font-medium">Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
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

  const renderGroupedCell = (row: GroupedChatEntry, key: string) => {
    switch (key) {
      case 'question':
        return <span className="text-gray-900">{truncate(row.question, 80)}</span>;
      case 'count':
        return <span className="font-medium text-blue-700">{row.count}</span>;
      case 'ragNames': {
        const allNames = new Set(row.entries.flatMap(e => e.ragNames || []));
        return allNames.size ? (
          <div className="flex flex-wrap gap-1">
            {Array.from(allNames).map(name => (
              <span
                key={name}
                className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {truncate(name, 30)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      }
      case 'exactMatch': {
        const anyExact = row.entries.some(e => e.exactMatch);
        return anyExact ? (
          <span className="text-green-600 font-medium">Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        );
      }
      default:
        return null;
    }
  };

  const renderExpanded = (row: ChatAnalytics) => (
    <div className="space-y-2 text-sm">
      <div>
        <span className="font-medium text-gray-700">Question:</span>
        <p className="mt-0.5 text-gray-900 whitespace-pre-wrap">{row.question}</p>
      </div>
      <div>
        <span className="font-medium text-gray-700">Response:</span>
        <p className="mt-0.5 text-gray-800 whitespace-pre-wrap">{row.response}</p>
      </div>
      {row.ragNames?.length > 0 && (
        <div>
          <span className="font-medium text-gray-700">RAG Data Used:</span>
          <ul className="mt-0.5 list-disc list-inside text-gray-700">
            {row.ragNames.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Client: {row.clientId}</span>
        <span>Exact Match: {row.exactMatch ? 'Yes' : 'No'}</span>
        <span>{formatDate(row.timestamp)}</span>
      </div>
    </div>
  );

  const renderGroupedExpanded = (row: GroupedChatEntry) => (
    <div className="space-y-3 text-sm">
      <div className="font-medium text-gray-700">
        {row.count} occurrence{row.count !== 1 ? 's' : ''}
      </div>
      {row.entries.map((entry, i) => (
        <div key={`${entry.timestamp}-${i}`} className="border-l-2 border-blue-200 pl-3 py-1">
          <div className="text-xs text-gray-500 mb-1">{formatDate(entry.timestamp)}</div>
          <p className="text-gray-800 whitespace-pre-wrap">{truncate(entry.response, 200)}</p>
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
            placeholder="Search questions, responses, RAG data..."
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
          getRowKey={(row, i) => `${row.question}-${i}`}
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
