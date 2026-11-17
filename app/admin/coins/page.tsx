import { Field, Flash } from '@/components/Forms';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updateCoinSettings } from '@/app/actions/admin';

export default async function CoinsPage({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const { data: s } = await supabaseAdmin().from('coin_settings').select('*').maybeSingle();
  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Movie Coin settings</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      {!s ? <p className="notice">Coin settings were not found. Re-run the coin_settings part of schema.sql.</p> : (
        <form action={updateCoinSettings} className="grid max-w-2xl gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
          <Field label="Coins for the first booking" name="first_booking_coins" type="number" min={0} required defaultValue={s.first_booking_coins} />
          <Field label="Value of 1 coin (₹)" name="inr_per_coin" type="number" step="0.01" min={0.01} required defaultValue={s.inr_per_coin} />
          <Field label="Random reward: minimum" name="random_min" type="number" min={0} required defaultValue={s.random_min} />
          <Field label="Random reward: maximum" name="random_max" type="number" min={0} required defaultValue={s.random_max} />
          <Field label="Max coins usable per booking" name="max_redeem_per_booking" type="number" min={0} required defaultValue={s.max_redeem_per_booking} />
          <div className="self-end"><button className="btn">Save settings</button></div>
        </form>
      )}
    </>
  );
}
