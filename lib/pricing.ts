import { supabaseAdmin } from '@/lib/supabase/admin';

// Optional settings in .env.local. Both default to 0: set them to what your accountant tells you.
export const FEE_PER_TICKET = Number(process.env.CONVENIENCE_FEE_PER_TICKET ?? 0) || 0;
export const TAX_RATE = (Number(process.env.TAX_RATE_PERCENT ?? 0) || 0) / 100;
export const HOLD_SECONDS = 420;            // seats are held for 7 minutes while choosing
export const PAY_WINDOW_MS = 10 * 60 * 1000; // after "Confirm booking" the hold is extended to 10 minutes for payment
export const MAX_SEATS = 10;

export type CheckoutSeat = { id: number; label: string; category: string; price: number };
export type CheckoutData = {
  lock: { id: string; show_id: number; expires_at: string };
  show: any; seats: CheckoutSeat[]; subtotal: number;
};

// Everything shown at checkout comes from the database, never from the browser.
export async function loadCheckout(lockId: string, userId: string): Promise<CheckoutData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(lockId)) return null;
  const db = supabaseAdmin();
  const { data: lock } = await db.from('seat_locks').select('id,show_id,expires_at,released').eq('id', lockId).eq('user_id', userId).maybeSingle();
  if (!lock || lock.released || new Date(lock.expires_at) <= new Date()) return null;
  const [{ data: show }, { data: rows }] = await Promise.all([
    db.from('shows').select('id,starts_at,price_regular,price_premium,price_recliner,movies(tmdb_id,title,poster_path),screens(name,theatres(name,address,city,source))').eq('id', lock.show_id).maybeSingle(),
    db.from('show_seats').select('seat_id,seats(row_label,seat_no,category)').eq('lock_id', lockId),
  ]);
  if (!show || !rows?.length) return null;
  const s: any = show;
  const priceOf: Record<string, number> = { regular: Number(s.price_regular), premium: Number(s.price_premium), recliner: Number(s.price_recliner) };
  const seats: CheckoutSeat[] = rows.map((r: any) => ({
    id: r.seat_id, label: `${r.seats.row_label}${r.seats.seat_no}`, category: r.seats.category, price: priceOf[r.seats.category],
  })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  return { lock, show: s, seats, subtotal: seats.reduce((t, x) => t + x.price, 0) };
}

type CouponResult = { coupon: { id: number; code: string; discount: number } | null; error?: string };
export async function checkCoupon(code: string, subtotal: number): Promise<CouponResult> {
  const c = code.trim().toUpperCase();
  if (!c) return { coupon: null };
  const { data } = await supabaseAdmin().from('coupons').select('*').eq('code', c).eq('active', true).maybeSingle();
  if (!data) return { coupon: null, error: 'That coupon code is not valid.' };
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return { coupon: null, error: 'That coupon has expired.' };
  if (data.max_uses !== null && data.used_count >= data.max_uses) return { coupon: null, error: 'That coupon has been fully used.' };
  const raw = data.percent_off ? (subtotal * data.percent_off) / 100 : Number(data.flat_off);
  return { coupon: { id: data.id, code: data.code, discount: Math.min(subtotal, Math.round(raw * 100) / 100) } };
}

// Same arithmetic as the create_booking database function, used to preview the price before confirming.
export function computeTotals(o: { subtotal: number; couponDiscount: number; coinsWanted: number; balance: number; maxRedeem: number; inrPerCoin: number; seatCount: number }) {
  const afterCoupon = Math.max(0, o.subtotal - o.couponDiscount);
  const coins = Math.max(0, Math.min(o.coinsWanted, o.balance, o.maxRedeem, Math.floor(afterCoupon / o.inrPerCoin)));
  const coinDiscount = coins * o.inrPerCoin;
  const taxable = Math.max(0, afterCoupon - coinDiscount);
  const fee = FEE_PER_TICKET * o.seatCount;
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  return { coins, coinDiscount, fee, tax, total: taxable + fee + tax };
}
