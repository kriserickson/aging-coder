import type { AnalyticsEntry } from './types';

export interface FetchResult {
  entries: AnalyticsEntry[];
  raw: unknown;
}

export async function fetchWorkerLogs(
  accountId: string,
  apiToken: string,
  _workerName: string,
  startTime: string,
  endTime: string,
): Promise<FetchResult> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`;

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  // Try minimal query first - events view with no filters
  const body = {
    queryId: `analytics-${startMs}`,
    limit: 100,
    view: 'events',
    timeframe: {
      from: startMs,
      to: endMs,
    },
    parameters: {
      needle: {
        value: 'Analytics:',
        matchCase: true,
        isRegex: false,
      },
    },
  };

  console.log('[CF API] Request:', JSON.stringify(body, null, 2));

  // Also fetch keys for debugging
  try {
    const keysRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );
    if (keysRes.ok) {
      const keysData = (await keysRes.json()) as Record<string, unknown>;
      const keys = keysData.result;
      console.log('[CF API] Available keys:', JSON.stringify(keys).slice(0, 2000));
    } else {
      console.log('[CF API] Keys endpoint failed:', keysRes.status);
    }
  } catch (e) {
    console.log('[CF API] Keys fetch error:', e);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CF API] Error response:', response.status, errorText.slice(0, 1000));
    throw new Error(`Cloudflare API error: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // Log response structure for debugging
  const d = data as Record<string, unknown>;
  console.log('[CF API] Response top keys:', Object.keys(d));
  if (d.result && typeof d.result === 'object') {
    const result = d.result as Record<string, unknown>;
    console.log('[CF API] result keys:', Object.keys(result));
    // Log first 2000 chars of result for debugging
    console.log('[CF API] result preview:', JSON.stringify(result).slice(0, 2000));
  } else {
    console.log('[CF API] Full response preview:', JSON.stringify(data).slice(0, 2000));
  }

  return { entries: parseQueryResponse(data), raw: data };
}

interface CfEvent {
  $metadata?: {
    message?: string;
    [key: string]: unknown;
  };
  $workers?: {
    scriptName?: string;
    [key: string]: unknown;
  };
  timestamp?: number | string;
  [key: string]: unknown;
}

function parseQueryResponse(data: unknown): AnalyticsEntry[] {
  const entries: AnalyticsEntry[] = [];
  if (!data || typeof data !== 'object') {
    return entries;
  }

  const d = data as Record<string, unknown>;

  // Cloudflare API wraps in { success, result, errors, messages }
  const result = (d.result || d) as Record<string, unknown>;

  // Try multiple response formats:
  // 1. Events view: result.events.events[]
  // 2. Grouped/calculations: result.calculations[].rows[]
  // 3. Direct rows: result.rows[]
  // 4. Direct events: result.events[] (as array)

  const allRows: Record<string, unknown>[] = [];

  // Format 1: events container
  const eventsContainer = result.events;
  if (eventsContainer && typeof eventsContainer === 'object' && !Array.isArray(eventsContainer)) {
    const ec = eventsContainer as Record<string, unknown>;
    if (Array.isArray(ec.events)) {
      allRows.push(...ec.events);
    }
  } else if (Array.isArray(eventsContainer)) {
    allRows.push(...eventsContainer);
  }

  // Format 2: calculations array with aggregates or rows
  if (Array.isArray(result.calculations)) {
    for (const calc of result.calculations) {
      if (calc && typeof calc === 'object') {
        const c = calc as Record<string, unknown>;
        if (Array.isArray(c.aggregates)) {
          allRows.push(...c.aggregates);
        }
        if (Array.isArray(c.rows)) {
          allRows.push(...c.rows);
        }
      }
    }
  }

  // Format 3: direct rows
  if (Array.isArray(result.rows)) {
    allRows.push(...result.rows);
  }

  console.log(`[CF API] Found ${allRows.length} total rows to parse`);

  for (const row of allRows) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    // Extract message from various possible field locations
    const message =
      (row as CfEvent)?.$metadata?.message ||
      (row['$metadata.message'] as string) ||
      (row.message as string) ||
      null;

    if (!message || typeof message !== 'string') {
      continue;
    }

    // Extract timestamp
    const ts = row.timestamp || row.Timestamp;
    const timestamp =
      typeof ts === 'number'
        ? new Date(ts).toISOString()
        : typeof ts === 'string'
          ? ts
          : new Date().toISOString();

    const parsed = parseAnalyticsMessage(message, timestamp);
    if (parsed) {
      entries.push(parsed);
    }
  }

  console.log(`[CF API] Parsed ${entries.length} analytics entries`);
  return entries;
}

function parseAnalyticsMessage(message: string, fallbackTimestamp: string): AnalyticsEntry | null {
  const match = message.match(/Analytics:\s*(.+)$/);
  if (!match) {
    return null;
  }

  try {
    const data = JSON.parse(match[1]);
    if (!data.type) {
      return null;
    }
    if (!data.timestamp) {
      data.timestamp = fallbackTimestamp;
    }
    return data as AnalyticsEntry;
  } catch {
    return null;
  }
}

// Debug helper - fetch available telemetry keys
export async function fetchTelemetryKeys(accountId: string, apiToken: string): Promise<unknown> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/keys`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} ${errorText}`);
  }

  return response.json();
}
