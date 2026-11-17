// Turns a paid Razorpay payment into a confirmed booking. Used by both the checkout check and the webhook.
// It is safe to call many times for the same payment.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { capturePayment, fetchPayment, refundPayment } from '@/lib/razorpay';
import { notifyTicket } from '@/lib/whatsapp';

export type Finalized = { status: 'confirmed' | 'pending' | 'refunded' | 'error'; message: string; bookingId?: string };

export async function finalizePayment(paymentId: string, orderId: string): Promise<Finalized> {
  const db = supabaseAdmin();
  const { data: pay } = await db.from('payments').select('id,booking_id,amount,status').eq('razorpay_order_id', orderId).maybeSingle();
  if (!pay) return { status: 'error', message: 'We could not find this payment.' };
  if (pay.status === 'paid') return { status: 'confirmed', message: 'Payment received.', bookingId: pay.booking_id };
  if (pay.status === 'refunded') return { status: 'refunded', message: 'This payment was refunded.', bookingId: pay.booking_id };

  // Never trust the browser: ask Razorpay what really happened.
  const fetched = await fetchPayment(paymentId);
  if (!fetched.ok) return { status: 'error', message: fetched.error };
  let p = fetched.data;
  const paise = Math.round(Number(pay.amount) * 100);
  if (p.order_id !== orderId || p.amount !== paise) return { status: 'error', message: 'This payment does not match the booking.' };
  if (p.status === 'authorized') {
    const c = await capturePayment(paymentId, paise);
    if (!c.ok) return { status: 'pending', message: 'Your payment is being processed. Please check again in a minute.', bookingId: pay.booking_id };
    p = c.data;
  }
  if (p.status !== 'captured') return { status: 'pending', message: 'Your payment is still being processed. Please check again in a minute.', bookingId: pay.booking_id };

  const refund = async (message: string): Promise<Finalized> => {
    const r = await refundPayment(paymentId);
    if (!r.ok) return { status: 'error', message: 'Your payment was received but the booking could not be completed. Please contact support for a refund.', bookingId: pay.booking_id };
    await db.from('payments').update({ status: 'refunded', razorpay_payment_id: paymentId }).eq('id', pay.id);
    return { status: 'refunded', message, bookingId: pay.booking_id };
  };

  const { data: res, error } = await db.rpc('confirm_booking', { p_booking: pay.booking_id, p_razorpay_payment_id: paymentId });
  if (error) {
    // The money was taken but the seats were already released (hold expired or booking cancelled): give it back.
    if (/BOOKING_NOT_PENDING|BOOKING_NOT_FOUND/.test(error.message ?? '')) return refund('Your seat hold had expired, so the booking could not be completed. Your payment is being refunded.');
    return { status: 'error', message: 'Your payment was received but we could not confirm the booking. Please contact support.', bookingId: pay.booking_id };
  }
  // Was it THIS payment that confirmed the booking? If another payment did, this one is a duplicate charge.
  const { data: after } = await db.from('payments').select('status,razorpay_payment_id').eq('id', pay.id).maybeSingle();
  if (after?.status === 'paid' && after.razorpay_payment_id === paymentId) {
    await notifyTicket(pay.booking_id); // sends the WhatsApp ticket once; the booking is already safe if this fails
    return { status: 'confirmed', message: 'Payment received.', bookingId: pay.booking_id };
  }
  if ((res as any)?.status === 'already_confirmed') return refund('This booking was already paid. The extra payment is being refunded.');
  await notifyTicket(pay.booking_id);
  return { status: 'confirmed', message: 'Payment received.', bookingId: pay.booking_id };
}
