import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const RANK: Record<string, number> = { queued: 0, accepted: 1, delivered: 2, read: 3 };

// Meta calls this once when you save the webhook, to check you own it.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && sp.get('hub.mode') === 'subscribe' && sp.get('hub.verify_token') === token) return new Response(sp.get('hub.challenge') ?? '', { status: 200 });
  return new Response('Forbidden', { status: 403 });
}

// Meta reports what really happened to each message: delivered, read or failed.
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  const raw = await req.text();
  const given = (req.headers.get('x-hub-signature-256') ?? '').replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad payload' }, { status: 400 }); }
  const db = supabaseAdmin();
  const statuses = (body?.entry ?? []).flatMap((e: any) => (e?.changes ?? []).flatMap((c: any) => c?.value?.statuses ?? []));
  for (const st of statuses) {
    if (!st?.id) continue;
    const { data: row } = await db.from('whatsapp_messages').select('id,status').eq('wa_message_id', st.id).maybeSingle();
    if (!row) continue;
    const now = new Date().toISOString();
    if (st.status === 'failed') {
      if ((RANK[row.status] ?? 0) < RANK.delivered) {
        await db.from('whatsapp_messages').update({ status: 'failed', error: String(st.errors?.[0]?.message ?? st.errors?.[0]?.title ?? 'Delivery failed').slice(0, 300), updated_at: now }).eq('id', row.id);
      }
    } else if (st.status in RANK && RANK[st.status] > (RANK[row.status] ?? 0)) {
      await db.from('whatsapp_messages').update({ status: st.status, updated_at: now }).eq('id', row.id); // never goes backwards
    }
  }
  return NextResponse.json({ ok: true });
}
