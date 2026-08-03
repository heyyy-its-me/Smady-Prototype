import { NextRequest, NextResponse } from 'next/server';
import { getLeadResult, initLeadResult } from '@/lib/postgres-lead-store';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!requestId) return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
  await initLeadResult(requestId);
  const result = await getLeadResult(requestId);
  if (!result) return NextResponse.json({ error: 'Request ID not found', status: 'unknown' }, { status: 404 });
  if (result.status === 'processing') return NextResponse.json({ status: 'processing', request_id: requestId, message: 'n8n workflow is still processing' });
  if (result.status === 'failed') return NextResponse.json({ status: 'failed', request_id: requestId, error: result.error ?? 'Unknown error' });
  return NextResponse.json({ status: 'completed', request_id: requestId, total_count: result.total_count, leads: result.leads, completed_at: result.completedAt });
}
