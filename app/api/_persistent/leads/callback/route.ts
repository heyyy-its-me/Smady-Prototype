import { NextRequest, NextResponse } from 'next/server';
import { failLeadResult, initLeadResult, updateLeadResult } from '@/lib/postgres-lead-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const requestId = body.request_id;
    if (typeof requestId !== 'string' || !requestId) return NextResponse.json({ error: 'Missing or invalid request_id' }, { status: 400 });
    await initLeadResult(requestId);
    if (body.status === 'failed' || body.status === 'error') {
      await failLeadResult(requestId, typeof body.error === 'string' ? body.error : 'Unknown error from n8n');
      return NextResponse.json({ ok: true, status: 'failed' });
    }
    if (Array.isArray(body.leads)) {
      const leads = body.leads.filter((lead): lead is Record<string, unknown> => typeof lead === 'object' && lead !== null);
      await updateLeadResult(requestId, { leads, total_count: typeof body.total_count === 'number' ? body.total_count : leads.length });
      return NextResponse.json({ ok: true, status: 'completed', lead_count: leads.length });
    }
    return NextResponse.json({ ok: true, status: 'received' });
  } catch (error) {
    console.error('Lead callback error:', error);
    return NextResponse.json({ error: 'Failed to process callback payload' }, { status: 500 });
  }
}
