import { NextRequest, NextResponse } from 'next/server';
import { fetchWorkerLogs } from '@/lib/cloudflare-api';

export async function GET(request: NextRequest) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const workerName = process.env.CF_WORKER_NAME || 'aging-coder-chat';

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: 'CF_ACCOUNT_ID and CF_API_TOKEN must be set in .env.local' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  // Default to last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const startTime = start || sevenDaysAgo.toISOString();
  const endTime = end || now.toISOString();

  const debug = searchParams.get('debug') === 'true';

  try {
    const { entries, raw } = await fetchWorkerLogs(
      accountId,
      apiToken,
      workerName,
      startTime,
      endTime
    );

    const response: Record<string, unknown> = { entries, startTime, endTime };
    if (debug) {
      response.raw = raw;
    }
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
