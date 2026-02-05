import { NextResponse } from 'next/server';
import { fetchTelemetryKeys } from '@/lib/cloudflare-api';

export async function GET() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: 'CF_ACCOUNT_ID and CF_API_TOKEN must be set in .env.local' },
      { status: 500 },
    );
  }

  try {
    const keys = await fetchTelemetryKeys(accountId, apiToken);
    return NextResponse.json(keys);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
