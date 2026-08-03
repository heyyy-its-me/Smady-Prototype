import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URLS: Record<string, string | undefined> = {
  leads: process.env.NEXT_PUBLIC_LEAD_MANAGEMENT_WEBHOOK_URL,
  outreach: process.env.NEXT_PUBLIC_OUTREACH_WEBHOOK_URL,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const webhookUrl = WEBHOOK_URLS[agentId];

  if (!webhookUrl) {
    return NextResponse.json({ error: `No webhook configured for agent "${agentId}".` }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to reach the configured n8n webhook.', detail: (error as Error).message },
      { status: 502 },
    );
  }
}
