import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { finalizePayment } from '@/lib/payments';

export const dynamic = 'force-dynamic';

// Razorpay calls this by itself, so a payment is confirmed even if the customer closes the browser.
export async function POST(req: Request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  const raw = await req.text(); // the signature is computed on the exact raw text
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') ?? '')) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad payload' }, { status: 400 }); }
  const eventId = req.headers.get('x-razorpay-event-id');
  const db = supabaseAdmin();
  if (eventId) {
    const { data: seen } = await db.from('payment_events').select('event_id').eq('event_id', eventId).maybeSingle();
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
  }

  const pay = event?.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && pay?.id && pay?.order_id) {
    await finalizePayment(pay.id, pay.order_id);
  }
  // Failed attempts need no action: the booking stays open so the customer can try again before the hold ends.

  if (eventId) await db.from('payment_events').insert({ event_id: eventId, payload: event });
  return NextResponse.json({ ok: true });
}
