import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Field, Flash } from '@/components/Forms';
import { CITIES } from '@/lib/cities';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createScreen, deleteScreen, deleteTheatre, updateTheatre } from '@/app/actions/admin';

const sel = 'w-full rounded border border-line bg-bg px-3 py-2';

export default async function TheatreDetail({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; msg?: string } }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const db = supabaseAdmin();
  const { data: t } = await db.from('theatres').select('*').eq('id', params.id).maybeSingle();
  if (!t) notFound();
  const { data: screens } = await db.from('screens').select('id,name,seats(count)').eq('theatre_id', params.id).order('name');

  return (
    <>
      <Link href="/admin/theatres" className="text-sm text-red2 hover:underline">← All theatres</Link>
      <h1 className="mb-5 mt-1 font-display text-4xl font-black">{t.name}</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />

      <form action={updateTheatre} className="mb-8 grid gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={t.id} />
        <Field label="Theatre name" name="name" required defaultValue={t.name} />
        <label className="block text-sm"><span className="mb-1 block text-mu">City</span>
          <select name="city" defaultValue={t.city} className={sel}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className="sm:col-span-2"><Field label="Address" name="address" required defaultValue={t.address} /></div>
        <label className="block text-sm"><span className="mb-1 block text-mu">Listing type</span>
          <select name="source" defaultValue={t.source} className={sel}>
            <option value="admin">Listed by NexShow</option><option value="partner">Authorised partner</option><option value="demo">Demo data</option>
          </select></label>
        <label className="flex items-end gap-2 pb-2 text-sm text-mu"><input type="checkbox" name="active" defaultChecked={t.active} /> Visible to customers</label>
        <div><button className="btn">Save theatre</button></div>
      </form>

      <h2 className="mb-3 font-display text-3xl font-black">Screens</h2>
      {(screens ?? []).length === 0 ? <p className="notice mb-6">No screens yet. Add one below.</p> : (
        <div className="mb-6 space-y-2">
          {(screens ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-line bg-panel p-4">
              <p><span className="font-bold">{s.name}</span> <span className="text-sm text-mu">· {s.seats?.[0]?.count ?? 0} seats</span></p>
              <form action={deleteScreen}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="theatre_id" value={t.id} />
                <button className="rounded border border-red px-3 py-1 text-sm hover:bg-red/20">Delete</button></form>
            </div>
          ))}
        </div>
      )}

      <form action={createScreen} className="mb-8 grid gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
        <input type="hidden" name="theatre_id" value={t.id} />
        <h3 className="font-display text-2xl font-bold sm:col-span-2">Add a screen and its seat layout</h3>
        <Field label="Screen name" name="name" required placeholder="Screen 1" />
        <Field label="Seats in each row" name="seats_per_row" type="number" min={1} required defaultValue={12} />
        <Field label="Regular rows (front)" name="regular_rows" type="number" min={0} required defaultValue={4} />
        <Field label="Premium rows (middle)" name="premium_rows" type="number" min={0} required defaultValue={3} />
        <Field label="Recliner rows (back)" name="recliner_rows" type="number" min={0} required defaultValue={1} />
        <p className="self-end text-sm text-mu">Rows are named A, B, C… from the front. Up to 26 rows in total.</p>
        <div><button className="btn">Create screen</button></div>
      </form>

      <form action={deleteTheatre}><input type="hidden" name="id" value={t.id} />
        <button className="rounded border border-red px-4 py-2 text-sm text-red2 hover:bg-red/20">Delete this theatre</button></form>
    </>
  );
}
