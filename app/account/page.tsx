import Link from 'next/link';
import { Field, Flash } from '@/components/Forms';
import { fmtDateTime, money } from '@/lib/format';
import { MovieGrid } from '@/components/MovieRow';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CITIES } from '@/lib/cities';
import { Movie } from '@/lib/tmdb';
import { signOut } from '@/app/actions/auth';
import { updateProfile } from '@/app/actions/account';

export default async function Account({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const user = await requireUser();
  const db = supabaseAdmin();
  const [{ data: profile }, { data: wallet }, { data: favs }, { data: bookings }] = await Promise.all([
    db.from('profiles').select('full_name,phone,city,whatsapp_consent').eq('id', user.id).maybeSingle(),
    db.from('movie_coin_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    db.from('favourites').select('movies(tmdb_id,title,poster_path,release_date,rating)').eq('user_id', user.id),
    db.from('bookings').select('id,status,total,created_at,shows(starts_at,movies(title),screens(theatres(name)))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const favourites: Movie[] = (favs ?? []).flatMap((f: any) => (f.movies ? [f.movies] : [])).map((m: any) => ({
    id: m.tmdb_id, title: m.title, overview: '', poster_path: m.poster_path, backdrop_path: null,
    release_date: m.release_date ?? '', vote_average: Number(m.rating ?? 0),
  }));

  return (
    <div className="container-x py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl font-black">My account</h1>
        <form action={signOut}><button className="btn-ghost">Log out</button></form>
      </div>
      <Flash error={searchParams.error} msg={searchParams.msg} />

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-3xl font-black">Profile</h2>
          <form action={updateProfile} className="space-y-4 rounded-md border border-line bg-panel p-5">
            <p className="text-sm text-mu">Email: <span className="text-tx">{user.email}</span></p>
            <Field label="Full name" name="full_name" required defaultValue={profile?.full_name ?? ''} />
            <Field label="Phone (for WhatsApp tickets)" name="phone" type="tel" placeholder="+919876543210" defaultValue={profile?.phone ?? ''} />
            <label className="block text-sm">
              <span className="mb-1 block text-mu">City</span>
              <select name="city" defaultValue={profile?.city ?? ''} className="w-full rounded border border-line bg-bg px-3 py-2">
                <option value="">Not set</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-mu">
              <input type="checkbox" name="whatsapp_consent" defaultChecked={Boolean(profile?.whatsapp_consent)} className="mt-1" />
              <span>Yes, send my booking confirmation and ticket on WhatsApp to the number above.</span>
            </label>
            <button className="btn">Save profile</button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 font-display text-3xl font-black">Movie Coin wallet</h2>
          <div className="rounded-md border border-line bg-panel p-5">
            <p className="font-display text-6xl font-black text-red">{wallet?.balance ?? 0}</p>
            <p className="text-sm text-mu">Coins are added after your first confirmed booking. 1 coin = ₹1 off.</p>
          </div>
          <h2 className="mb-3 mt-8 font-display text-3xl font-black">Bookings</h2>
          {(bookings ?? []).length === 0 ? <p className="notice">You have no bookings yet. Pick a movie and choose your seats.</p> : (
            <div className="space-y-2">
              {(bookings ?? []).map((b: any) => (
                <Link key={b.id} href={`/booking/${b.id}`} className="block rounded-md border border-line bg-panel p-3 text-sm hover:border-red">
                  <span className="font-bold">{b.shows?.movies?.title}</span> <span className="text-mu">· {b.shows?.screens?.theatres?.name}</span>
                  <span className="block text-mu">{b.shows ? fmtDateTime(b.shows.starts_at) : ''} · {b.status} · {money(b.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-3xl font-black">Favourite movies</h2>
        {favourites.length === 0 ? <p className="notice">No favourites yet. Open any movie and tap “Save to favourites”.</p> : <MovieGrid movies={favourites} />}
      </section>
    </div>
  );
}
