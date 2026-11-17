import { Field, Flash } from '@/components/Forms';
import { SourceBadge } from '@/components/ShowList';
import { fmtDateTime, money } from '@/lib/format';
import { getNowPlaying, getUpcoming } from '@/lib/tmdb';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createShow, deleteShow, toggleShow } from '@/app/actions/admin';

const sel = 'w-full rounded border border-line bg-bg px-3 py-2';

export default async function ShowsAdmin({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const db = supabaseAdmin();
  const [{ data: screens }, { data: shows }, playing, soon] = await Promise.all([
    db.from('screens').select('id,name,theatres(name,city)').order('theatre_id'),
    db.from('shows').select('id,starts_at,price_regular,price_premium,price_recliner,source,active,movies(title),screens(name,theatres(name,city))').order('starts_at', { ascending: false }).limit(100),
    getNowPlaying(), getUpcoming(),
  ]);
  const movies = Array.from(new Map([...(playing ?? []), ...(soon ?? [])].map((m) => [m.id, m])).values());

  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Shows</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      {(screens ?? []).length === 0 ? <p className="notice mb-8">Add a theatre and a screen first, then you can create shows.</p> : (
        <form action={createShow} className="mb-8 grid gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
          <label className="block text-sm"><span className="mb-1 block text-mu">Movie (from TMDB)</span>
            <select name="tmdb_id" className={sel}>{movies.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.release_date?.slice(0, 4)})</option>)}</select></label>
          <Field label="Or type a TMDB movie ID" name="other_tmdb" type="number" min={1} />
          <label className="block text-sm"><span className="mb-1 block text-mu">Screen</span>
            <select name="screen_id" className={sel}>{(screens ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.theatres?.name} · {s.name} ({s.theatres?.city})</option>)}</select></label>
          <Field label="Date and time (India time)" name="starts" type="datetime-local" required />
          <Field label="Regular price (₹)" name="price_regular" type="number" min={0} step="1" required />
          <Field label="Premium price (₹)" name="price_premium" type="number" min={0} step="1" required />
          <Field label="Recliner price (₹)" name="price_recliner" type="number" min={0} step="1" required />
          <p className="self-end text-sm text-mu">Use 0 only for a seat type this screen does not have.</p>
          <div><button className="btn">Create show</button></div>
        </form>
      )}

      {(shows ?? []).length === 0 ? <p className="notice">No shows yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead><tr className="bg-deep text-left"><th className="p-3">Movie</th><th className="p-3">Theatre · screen</th><th className="p-3">When</th><th className="p-3">Prices</th><th className="p-3">Type</th><th className="p-3">Actions</th></tr></thead>
            <tbody>
              {(shows ?? []).map((s: any) => (
                <tr key={s.id} className={`border-b border-line bg-panel ${s.active ? '' : 'opacity-60'}`}>
                  <td className="p-3 font-bold">{s.movies?.title}</td>
                  <td className="p-3 text-mu">{s.screens?.theatres?.name} · {s.screens?.name}</td>
                  <td className="p-3 text-mu">{fmtDateTime(s.starts_at)}</td>
                  <td className="p-3 text-mu">{money(s.price_regular)} / {money(s.price_premium)} / {money(s.price_recliner)}</td>
                  <td className="p-3"><SourceBadge source={s.source} /></td>
                  <td className="flex gap-2 p-3">
                    <form action={toggleShow}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={String(s.active)} />
                      <button className="rounded border border-red px-3 py-1 hover:bg-red/20">{s.active ? 'Turn off' : 'Turn on'}</button></form>
                    <form action={deleteShow}><input type="hidden" name="id" value={s.id} />
                      <button className="rounded border border-line px-3 py-1 text-mu hover:border-red">Delete</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
