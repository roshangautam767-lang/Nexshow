import Link from 'next/link';
import { notFound } from 'next/navigation';
import Countdown from '@/components/Countdown';
import PayButton from '@/components/PayButton';
import TicketCard from '@/components/TicketCard';
import { qrDataUrl } from '@/lib/ticket';
import { razorpayConfigured } from '@/lib/razorpay';
import { SourceBadge } from '@/components/ShowList';
import { requireUser } from '@/lib/auth';
import { fmtDateTime, money } from '@/lib/format';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cancelBooking } from '@/app/actions/booking';

const STATUS: Record<string, string> = {
  pending: 'Awaiting payment', confirmed: 'Confirmed', expired: 'Expired', cancelled: 'Cancelled', failed: 'Failed',
};

export default async function BookingPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const user = await requireUser(`/booking/${params.id}`);
  const db = supabaseAdmin();
  await db.rpc('release_expired_locks'); // an unpaid booking whose hold ran out becomes "expired" here

  const { data: b } = await db.from('bookings')
    .select('id,booking_ref,status,subtotal,convenience_fee,tax,coupon_discount,coin_discount,coins_redeemed,total,lock_id,show_id,ticket_token,ticket_used_at,shows(starts_at,movies(title),screens(name,theatres(name,address,city,source)))')
    .eq('id', params.id).eq('user_id', user.id).maybeSingle();
  if (!b) notFound();

  const [{ data: bs }, { data: lock }] = await Promise.all([
    db.from('booking_seats').select('seat_id,price').eq('booking_id', b.id),
    b.lock_id ? db.from('seat_locks').select('expires_at').eq('id', b.lock_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = (bs ?? []).map((x: any) => x.seat_id);
  const { data: seatRows } = ids.length ? await db.from('seats').select('id,row_label,seat_no,category').in('id', ids) : { data: [] };
  const labels = (seatRows ?? []).map((r: any) => `${r.row_label}${r.seat_no}`).sort((a: string, c: string) => a.localeCompare(c, undefined, { numeric: true }));
  const s: any = b.shows;
  const qr = b.status === 'confirmed' && b.ticket_token ? await qrDataUrl(b.ticket_token) : null;

  return (
    <div className="container-x max-w-2xl py-10">
      <p className="text-sm text-mu">Booking {b.booking_ref}</p>
      <h1 className="mb-2 font-display text-5xl font-black">{STATUS[b.status] ?? b.status}</h1>

      {b.status === 'pending' && lock && (
        <div className="mb-4 space-y-3">
          <Countdown expiresAt={lock.expires_at} label="Your seats are held for" />
          {Number(b.total) === 0 || razorpayConfigured()
            ? <PayButton bookingId={b.id} free={Number(b.total) === 0} amountLabel={money(b.total)} title={s?.movies?.title ?? 'NexShow booking'} />
            : <p className="notice">Online payments are not set up yet. Add your Razorpay test keys to .env.local.</p>}
          <p className="text-xs text-mu">If you do not pay before the timer ends, your seats are released automatically.</p>
        </div>
      )}
      {b.status === 'confirmed' && qr && (
        <div className="mb-6 space-y-3">
          <TicketCard qr={qr} t={{ ref: b.booking_ref, movie: s?.movies?.title ?? '', theatre: s?.screens?.theatres?.name ?? '', address: [s?.screens?.theatres?.address, s?.screens?.theatres?.city].filter(Boolean).join(', '), screen: s?.screens?.name ?? '', startsAt: s?.starts_at ?? '', seats: labels, used: Boolean(b.ticket_used_at) }} />
          <a href={`/booking/${b.id}/pdf`} className="btn">Download PDF ticket</a>
        </div>
      )}
      {['expired', 'cancelled', 'failed'].includes(b.status) && <p className="notice mb-4">This booking is no longer active. Any Movie Coins you reserved were returned to your wallet.</p>}

      <section className="rounded-md border border-line bg-panel p-5">
        <h2 className="font-display text-3xl font-black">{s?.movies?.title}</h2>
        <p>{s?.screens?.theatres?.name} · {s?.screens?.name}</p>
        <p className="text-sm text-mu">{s?.screens?.theatres?.address}, {s?.screens?.theatres?.city}</p>
        <p className="mt-1 text-sm">{s ? fmtDateTime(s.starts_at) : ''}</p>
        <div className="mt-2"><SourceBadge source={s?.screens?.theatres?.source ?? 'admin'} /></div>
        <p className="mt-4 text-sm"><span className="text-mu">Seats:</span> {labels.join(', ') || '—'}</p>
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <Line k="Tickets" v={money(b.subtotal)} />
          {Number(b.coupon_discount) > 0 && <Line k="Coupon" v={`− ${money(b.coupon_discount)}`} />}
          {Number(b.coin_discount) > 0 && <Line k={`Movie Coins (${b.coins_redeemed})`} v={`− ${money(b.coin_discount)}`} />}
          <Line k="Convenience fee" v={money(b.convenience_fee)} />
          {Number(b.tax) > 0 && <Line k="Taxes" v={money(b.tax)} />}
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><span>Total</span><span>{money(b.total)}</span></div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {b.status === 'pending' && (
          <form action={cancelBooking}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost">Cancel booking</button></form>
        )}
        <Link href="/account" className="btn-ghost">My account</Link>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-mu">{k}</span><span>{v}</span></div>;
}
