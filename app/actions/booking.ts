'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FEE_PER_TICKET, HOLD_SECONDS, MAX_SEATS, PAY_WINDOW_MS, TAX_RATE, checkCoupon, loadCheckout } from '@/lib/pricing';

const enc = encodeURIComponent;
const PHONE = /^\+?[0-9]{10,15}$/;
const UUID = /^[0-9a-f-]{36}$/i;

// Step 1: hold the chosen seats on the server (all or nothing).
export async function startCheckout(fd: FormData) {
  const showId = Number(fd.get('showId'));
  if (!Number.isInteger(showId) || showId <= 0) redirect('/');
  const user = await requireUser(`/shows/${showId}`);
  const back: (m: string) => never = (m) => redirect(`/shows/${showId}?error=${enc(m)}`);

  const seatIds = Array.from(new Set(String(fd.get('seats') ?? '').split(',').map(Number))).filter((n) => Number.isInteger(n) && n > 0);
  if (seatIds.length === 0) back('Choose at least one seat.');
  if (seatIds.length > MAX_SEATS) back(`You can book up to ${MAX_SEATS} seats at a time.`);

  const db = supabaseAdmin();
  const { data: show } = await db.from('shows').select('starts_at,active').eq('id', showId).maybeSingle();
  if (!show || !show.active) back('This show is not available.');
  if (new Date(show!.starts_at) <= new Date()) back('This show has already started.');

  await db.rpc('release_user_locks', { p_user: user.id, p_show: showId });
  const { data: lockId, error } = await db.rpc('lock_seats', { p_user: user.id, p_show: showId, p_seats: seatIds, p_ttl_seconds: HOLD_SECONDS });
  if (error || !lockId) back(error?.message?.includes('SEATS_UNAVAILABLE') ? 'Some of those seats were just taken. Please choose again.' : 'Could not hold those seats. Did you run phase6.sql?');
  redirect(`/checkout/${lockId}`);
}

// Step 2: turn the hold into an unpaid (pending) booking. Prices are recalculated by the database.
export async function createPendingBooking(fd: FormData) {
  const lockId = String(fd.get('lockId') ?? '');
  const user = await requireUser(`/checkout/${lockId}`);
  const here = `/checkout/${lockId}`;
  const fail: (m: string) => never = (m) => redirect(`${here}?error=${enc(m)}`);
  const expired = () => redirect(`/account?error=${enc('Your seat hold expired. Please choose your seats again.')}`);

  const data = await loadCheckout(lockId, user.id);
  if (!data) expired();

  const phone = String(fd.get('phone') ?? '').replace(/[\s-]/g, '');
  const consent = fd.get('whatsapp_consent') === 'on';
  if (phone && !PHONE.test(phone)) fail('Enter a valid phone number, for example +919876543210.');
  if (consent && !phone) fail('Add a phone number to receive tickets on WhatsApp.');

  const { coupon, error: couponError } = await checkCoupon(String(fd.get('coupon') ?? ''), data!.subtotal);
  if (couponError) fail(couponError);
  const coinsWanted = Math.max(0, Math.floor(Number(fd.get('coins') || 0)) || 0);

  const db = supabaseAdmin();
  const { data: bookingId, error } = await db.rpc('create_booking', {
    p_user: user.id, p_lock: lockId, p_coins: coinsWanted, p_coupon: coupon?.id ?? null, p_coupon_discount: coupon?.discount ?? 0,
    p_fee: FEE_PER_TICKET * data!.seats.length, p_tax_rate: TAX_RATE, p_phone: phone || null, p_consent: consent,
  });
  if (error || !bookingId) {
    if (error?.message?.includes('LOCK_EXPIRED')) expired();
    fail('Could not create your booking. Please try again.');
  }
  // Give the person time to pay: extend the hold from now.
  await db.from('seat_locks').update({ expires_at: new Date(Date.now() + PAY_WINDOW_MS).toISOString() }).eq('id', lockId);
  redirect(`/booking/${bookingId}`);
}

export async function cancelBooking(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const user = await requireUser(`/booking/${id}`);
  if (UUID.test(id)) {
    const db = supabaseAdmin();
    const { data: b } = await db.from('bookings').select('id').eq('id', id).eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (b) await db.rpc('fail_booking', { p_booking: id, p_reason: 'cancelled' }); // frees the seats and returns reserved coins
  }
  redirect(`/account?msg=${enc('Booking cancelled. Your seats and coins were released.')}`);
}
