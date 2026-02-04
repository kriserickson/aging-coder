'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import { ChatPanel } from '@/components/chat-panel';
import { FitPanel } from '@/components/fit-panel';
import { IpFilter } from '@/components/ip-filter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIpFilter } from '@/hooks/use-ip-filter';
import type { AnalyticsEntry, ChatAnalytics, FitAnalytics } from '@/lib/types';

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function Home() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [allChatData, setAllChatData] = useState<ChatAnalytics[]>([]);
  const [allFitData, setAllFitData] = useState<FitAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excludedIps, setExcludedIps] = useIpFilter();
  const id = useId();

  const allClientIds = useMemo(() => {
    const ids = new Set<string>();
    allChatData.forEach(e => {
      ids.add(e.clientId)
    });
    allFitData.forEach(e => {
      ids.add(e.clientId)
    });
    return Array.from(ids);
  }, [allChatData, allFitData]);

  const chatData = useMemo(
    () =>
      excludedIps.length > 0
        ? allChatData.filter(e => !excludedIps.includes(e.clientId))
        : allChatData,
    [allChatData, excludedIps],
  );

  const fitData = useMemo(
    () =>
      excludedIps.length > 0
        ? allFitData.filter(e => !excludedIps.includes(e.clientId))
        : allFitData,
    [allFitData, excludedIps],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startISO = new Date(`${dateRange.start}T00:00:00Z`).toISOString();
      const endISO = new Date(`${dateRange.end}T23:59:59Z`).toISOString();

      const res = await fetch(
        `/api/logs?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`,
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const { entries } = (await res.json()) as { entries: AnalyticsEntry[] };

      const chat: ChatAnalytics[] = [];
      const fit: FitAnalytics[] = [];

      for (const entry of entries) {
        if (entry.type === 'chat') {
          chat.push(entry as ChatAnalytics);
        } else if (entry.type === 'fit-assessment') {
          fit.push(entry as FitAnalytics);
        }
      }

      setAllChatData(chat);
      setAllFitData(fit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (    
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">CV Chat Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor={`${id}-start-date`} className="text-gray-600">
              From:
            </label>
            <input
              id={`${id}-start-date`}
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor={`${id}-end-date`} className="text-gray-600">
              To:
            </label>
            <input
              id={`${id}-end-date`}
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <IpFilter
            excludedIps={excludedIps}
            onUpdate={setExcludedIps}
            allClientIds={allClientIds}
          />
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat Questions ({chatData.length})</TabsTrigger>
          <TabsTrigger value="fit">Fit Assessments ({fitData.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatPanel data={chatData} />
        </TabsContent>

        <TabsContent value="fit">
          <FitPanel data={fitData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
