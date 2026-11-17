import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function Overview() {
  const db = supabaseAdmin();
  const [{ count: users }, { count: confirmed }, { data: paid }] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    db.from('bookings').select('total').eq('status', 'confirmed').limit(1000),
  ]);
  const revenue = (paid ?? []).reduce((s: number, r: any) => s + Number(r.total), 0);
  const stats = [['Registered users', users ?? 0], ['Confirmed bookings', confirmed ?? 0], ['Revenue', `₹${revenue.toFixed(2)}`]];
  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={String(k)} className="rounded-md border border-line border-t-red bg-panel p-5 [border-top-width:3px]">
            <p className="text-sm text-mu">{k}</p><p className="font-display text-5xl font-black">{v}</p>
          </div>
        ))}
      </div>
    </>
  );
}
