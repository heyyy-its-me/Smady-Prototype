import { NextRequest, NextResponse } from 'next/server';
import { initExecution } from '@/lib/execution-store';

const WEBHOOK_URLS: Record<string, string | undefined> = {
  leads: process.env.NEXT_PUBLIC_LEAD_MANAGEMENT_WEBHOOK_URL,
  outreach: process.env.NEXT_PUBLIC_OUTREACH_WEBHOOK_URL,
};

function databaseFailureDetail(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === '28P01' || code === '28000') return 'PostgreSQL rejected the configured database username or password.';
  if (code === '3D000') return 'The configured PostgreSQL database name does not exist.';
  if (code === 'ENOTFOUND') return 'Vercel cannot resolve the configured RDS host name.';
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENETUNREACH') return 'Vercel cannot reach RDS on port 5432. Make the RDS endpoint reachable and allow PostgreSQL traffic in its security group.';
  if (code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') return 'The RDS TLS certificate could not be verified.';
  return 'PostgreSQL initialization failed. Check the Vercel Function Logs for the server-side error code.';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const webhookUrl = WEBHOOK_URLS[agentId];
  if (!webhookUrl) return NextResponse.json({ error: `No webhook configured for agent "${agentId}".` }, { status: 404 });

  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 }); }

  if (typeof payload.request_id === 'string' && payload.request_id) {
    try { await initExecution(payload.request_id, agentId, 'Webhook trigger received by application'); }
    catch (error) {
      console.error('Failed to persist workflow execution:', error);
      return NextResponse.json({
        error: 'Unable to persist workflow execution state.',
        detail: databaseFailureDetail(error),
      }, { status: 503 });
    }
  }

  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to reach the configured n8n webhook.', detail: (error as Error).message }, { status: 502 });
  }
}
