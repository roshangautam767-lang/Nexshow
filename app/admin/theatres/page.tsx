import Link from 'next/link';
import { Field, Flash } from '@/components/Forms';
import { SourceBadge } from '@/components/ShowList';
import { CITIES } from '@/lib/cities';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createTheatre } from '@/app/actions/admin';

const sel = 'w-full rounded border border-line bg-bg px-3 py-2';

export default async function TheatresAdmin({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const { data: theatres } = await supabaseAdmin().from('theatres').select('id,name,city,address,source,active').order('city').order('name');
  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Theatres</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      <form action={createTheatre} className="mb-8 grid gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
        <Field label="Theatre name" name="name" required />
        <label className="block text-sm"><span className="mb-1 block text-mu">City</span>
          <select name="city" className={sel}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className="sm:col-span-2"><Field label="Address" name="address" required /></div>
        <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-mu">Listing type</span>
          <select name="source" className={sel}>
            <option value="admin">Listed by NexShow (admin-managed)</option>
            <option value="partner">Authorised partner inventory</option>
            <option value="demo">Demo data (for testing only)</option>
          </select></label>
        <div><button className="btn">Add theatre</button></div>
      </form>
      {(theatres ?? []).length === 0 ? <p className="notice">No theatres yet. Add the first one above.</p> : (
        <div className="space-y-3">
          {(theatres ?? []).map((t: any) => (
            <Link key={t.id} href={`/admin/theatres/${t.id}`} className="block rounded-md border border-line bg-panel p-4 hover:border-red">
              <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{t.name}</span><SourceBadge source={t.source} />{!t.active && <span className="text-xs text-red2">Turned off</span>}</div>
              <p className="text-sm text-mu">{t.address}, {t.city}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
