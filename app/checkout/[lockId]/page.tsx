import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Countdown from '@/components/Countdown';
import { Field, Flash } from '@/components/Forms';
import { SourceBadge } from '@/components/ShowList';
import { requireUser } from '@/lib/auth';
import { fmtDateTime, money } from '@/lib/format';
import { TAX_RATE, checkCoupon, computeTotals, loadCheckout } from '@/lib/pricing';
import { IMG } from '@/lib/tmdb';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPendingBooking } from '@/app/actions/booking';

export default async function Checkout({ params, searchParams }: { params: { lockId: string }; searchParams: { coupon?: string; coins?: string; error?: string } }) {
  const user = await requireUser(`/checkout/${params.lockId}`);
  const db = supabaseAdmin();
  await db.rpc('release_expired_locks');

  // Already turned into a booking? Go there instead of creating a second one.
  if (/^[0-9a-f-]{36}$/i.test(params.lockId)) {
    const { data: existing } = await db.from('bookings').select('id').eq('lock_id', params.lockId).eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (existing) redirect(`/booking/${existing.id}`);
  }

  const data = await loadCheckout(params.lockId, user.id);
  if (!data) {
    return (
      <div className="container-x max-w-xl py-12">
        <h1 className="mb-2 font-display text-5xl font-black">Seat hold expired</h1>
        <p className="mb-6 text-mu">Seats are held for a few minutes while you check out. Please choose your seats again.</p>
        <Link href="/" className="btn">Browse movies</Link>
      </div>
    );
  }

  const [{ data: settings }, { data: wallet }, { data: profile }] = await Promise.all([
    db.from('coin_settings').select('max_redeem_per_booking,inr_per_coin').maybeSingle(),
    db.from('movie_coin_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    db.from('profiles').select('phone,whatsapp_consent').eq('id', user.id).maybeSingle(),
  ]);
  const balance = wallet?.balance ?? 0;
  const { coupon, error: couponError } = await checkCoupon(searchParams.coupon ?? '', data.subtotal);
  const t = computeTotals({
    subtotal: data.subtotal, couponDiscount: coupon?.discount ?? 0, coinsWanted: Math.max(0, Math.floor(Number(searchParams.coins || 0)) || 0),
    balance, maxRedeem: settings?.max_redeem_per_booking ?? 100, inrPerCoin: Number(settings?.inr_per_coin ?? 1), seatCount: data.seats.length,
  });
  const s = data.show;
  const poster = IMG(s.movies.poster_path, 'w185');

  return (
    <div className="container-x py-10">
      <h1 className="mb-2 font-display text-5xl font-black">Review your booking</h1>
      <Countdown expiresAt={data.lock.expires_at} label="Your seats are held for" />
      <div className="mt-4"><Flash error={searchParams.error ?? couponError} /></div>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <section className="rounded-md border border-line bg-panel p-5">
          <div className="flex gap-4">
            {poster && <Image src={poster} alt="" width={70} height={105} className="rounded border border-line" />}
            <div>
              <h2 className="font-display text-3xl font-black">{s.movies.title}</h2>
              <p>{s.screens.theatres.name}</p>
              <p className="text-sm text-mu">{s.screens.theatres.address}, {s.screens.theatres.city}</p>
              <p className="mt-1 text-sm">{s.screens.name} · {fmtDateTime(s.starts_at)}</p>
              <div className="mt-2"><SourceBadge source={s.screens.theatres.source} /></div>
            </div>
          </div>
          <h3 className="mb-2 mt-5 font-bold">Seats</h3>
          <ul className="space-y-1 text-sm">
            {data.seats.map((x) => <li key={x.id} className="flex justify-between"><span>{x.label} <span className="text-mu">· {x.category}</span></span><span>{money(x.price)}</span></li>)}
          </ul>
          <Link href={`/shows/${data.lock.show_id}`} className="mt-4 inline-block text-sm text-red2 hover:underline">Change seats</Link>
        </section>

        <section className="space-y-5">
          <form method="get" className="space-y-3 rounded-md border border-line bg-panel p-5">
            <h3 className="font-bold">Coupon and Movie Coins</h3>
            <Field label="Coupon code (optional)" name="coupon" defaultValue={searchParams.coupon ?? ''} />
            <Field label={`Movie Coins to use (you have ${balance}; up to ${settings?.max_redeem_per_booking ?? 100} per booking)`} name="coins" type="number" min={0} defaultValue={searchParams.coins ?? ''} />
            <button className="btn-ghost">Apply</button>
          </form>

          <div className="rounded-md border border-line bg-panel p-5 text-sm">
            <Row k="Tickets" v={money(data.subtotal)} />
            {coupon && <Row k={`Coupon ${coupon.code}`} v={`− ${money(coupon.discount)}`} />}
            {t.coins > 0 && <Row k={`Movie Coins (${t.coins})`} v={`− ${money(t.coinDiscount)}`} />}
            <Row k="Convenience fee" v={money(t.fee)} />
            {TAX_RATE > 0 && <Row k="Taxes" v={money(t.tax)} />}
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-lg font-bold"><span>Total</span><span>{money(t.total)}</span></div>
          </div>

          <form action={createPendingBooking} className="space-y-3 rounded-md border border-line bg-panel p-5">
            <input type="hidden" name="lockId" value={params.lockId} />
            <input type="hidden" name="coupon" value={coupon?.code ?? ''} />
            <input type="hidden" name="coins" value={t.coins} />
            <Field label="Phone number (for your ticket)" name="phone" type="tel" placeholder="+919876543210" defaultValue={profile?.phone ?? ''} />
            <label className="flex items-start gap-2 text-sm text-mu">
              <input type="checkbox" name="whatsapp_consent" defaultChecked={Boolean(profile?.whatsapp_consent)} className="mt-1" />
              <span>Yes, send my ticket on WhatsApp to this number.</span>
            </label>
            <button className="btn w-full">Confirm booking</button>
            <p className="text-xs text-mu">The final amount is recalculated securely when you confirm. You will pay in the next step.</p>
          </form>
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-1"><span className="text-mu">{k}</span><span>{v}</span></div>;
}
