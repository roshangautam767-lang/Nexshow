'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PAY_WINDOW_MS } from '@/lib/pricing';
import { createOrder, razorpayConfigured, razorpayKeyId, verifyCheckoutSignature } from '@/lib/razorpay';
import { Finalized, finalizePayment } from '@/lib/payments';

const UUID = /^[0-9a-f-]{36}$/i;

export type OrderResult =
  | { ok: true; orderId: string; amountPaise: number; keyId: string; name: string; email: string; contact: string }
  | { ok: false; error: string };

// Step 1 of paying: create (or reuse) a Razorpay order. The amount always comes from the booking in the database.
export async function createPaymentOrder(bookingId: string): Promise<OrderResult> {
  if (!UUID.test(bookingId)) return { ok: false, error: 'Invalid booking.' };
  const user = await requireUser(`/booking/${bookingId}`);
  if (!razorpayConfigured()) return { ok: false, error: 'Online payments are not set up yet.' };
  const db = supabaseAdmin();
  await db.rpc('release_expired_locks');

  const { data: b } = await db.from('bookings').select('id,booking_ref,status,total,phone,lock_id').eq('id', bookingId).eq('user_id', user.id).maybeSingle();
  if (!b || b.status !== 'pending') return { ok: false, error: 'This booking can no longer be paid. Please choose your seats again.' };
  const amountPaise = Math.round(Number(b.total) * 100);
  if (amountPaise < 100) return { ok: false, error: 'This amount is too small to pay online.' };

  const { data: open } = await db.from('payments').select('razorpay_order_id').eq('booking_id', bookingId).in('status', ['created', 'pending']).limit(1);
  let orderId = open?.[0]?.razorpay_order_id as string | undefined; // one open order per booking: no duplicate payments
  if (!orderId) {
    const r = await createOrder(amountPaise, b.booking_ref, { booking_id: b.id });
    if (!r.ok) return { ok: false, error: r.error };
    orderId = r.data.id;
    const { error } = await db.from('payments').insert({ booking_id: b.id, razorpay_order_id: orderId, amount: Number(b.total), status: 'created' });
    if (error) return { ok: false, error: 'Could not start the payment. Please try again.' };
  }
  if (b.lock_id) await db.from('seat_locks').update({ expires_at: new Date(Date.now() + PAY_WINDOW_MS).toISOString() }).eq('id', b.lock_id).eq('released', false);

  const { data: profile } = await db.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  return { ok: true, orderId, amountPaise, keyId: razorpayKeyId(), name: profile?.full_name ?? '', email: user.email ?? '', contact: b.phone ?? '' };
}

// Step 2: the browser reports a finished payment. Check the signature, then ask Razorpay and confirm.
export async function verifyPayment(input: { bookingId: string; orderId: string; paymentId: string; signature: string }): Promise<Finalized> {
  const { bookingId, orderId, paymentId, signature } = input;
  const bad: Finalized = { status: 'error', message: 'We could not verify this payment.' };
  if (!UUID.test(bookingId) || !/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId) || !signature) return bad;
  const user = await requireUser(`/booking/${bookingId}`);
  const { data: pay } = await supabaseAdmin().from('payments').select('booking_id,bookings!inner(user_id)').eq('razorpay_order_id', orderId).eq('booking_id', bookingId).maybeSingle();
  if (!pay || (pay as any).bookings?.user_id !== user.id) return bad;
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) return bad;
  const result = await finalizePayment(paymentId, orderId);
  revalidatePath(`/booking/${bookingId}`);
  return result;
}

// A booking fully covered by Movie Coins or a coupon needs no payment.
export async function confirmFreeBooking(bookingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(bookingId)) return { ok: false, error: 'Invalid booking.' };
  const user = await requireUser(`/booking/${bookingId}`);
  const db = supabaseAdmin();
  const { data: b } = await db.from('bookings').select('id,status,total').eq('id', bookingId).eq('user_id', user.id).maybeSingle();
  if (!b || b.status !== 'pending' || Number(b.total) !== 0) return { ok: false, error: 'This booking cannot be confirmed without payment.' };
  const { error } = await db.rpc('confirm_booking', { p_booking: bookingId, p_razorpay_payment_id: null });
  if (error) return { ok: false, error: 'Could not confirm the booking. Please try again.' };
  revalidatePath(`/booking/${bookingId}`);
  return { ok: true };
}
