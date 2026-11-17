import { Field, Flash } from '@/components/Forms';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createCoupon, toggleCoupon } from '@/app/actions/admin';

export default async function CouponsPage({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const { data: coupons } = await supabaseAdmin().from('coupons').select('*').order('id', { ascending: false });
  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Coupons</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      <form action={createCoupon} className="mb-8 grid gap-4 rounded-md border border-line bg-panel p-5 sm:grid-cols-2">
        <Field label="Code (letters and numbers)" name="code" required placeholder="WELCOME50" />
        <label className="block text-sm"><span className="mb-1 block text-mu">Discount type</span>
          <select name="kind" className="w-full rounded border border-line bg-bg px-3 py-2"><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></label>
        <Field label="Discount value" name="value" type="number" required step="0.01" min={1} />
        <Field label="Max uses (leave empty for unlimited)" name="max_uses" type="number" min={1} />
        <Field label="Expires on (optional)" name="expires" type="date" />
        <div className="self-end"><button className="btn">Create coupon</button></div>
      </form>
      {(coupons ?? []).length === 0 ? <p className="notice">No coupons yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead><tr className="bg-deep text-left"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Used</th><th className="p-3">Expires</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {(coupons ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-line bg-panel">
                  <td className="p-3 font-bold">{c.code}</td>
                  <td className="p-3 text-mu">{c.percent_off ? `${c.percent_off}%` : `₹${c.flat_off}`}</td>
                  <td className="p-3 text-mu">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="p-3 text-mu">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td className="p-3">
                    <form action={toggleCoupon}>
                      <input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(c.active)} />
                      <button className="rounded border border-red px-3 py-1 hover:bg-red/20">{c.active ? 'Active · turn off' : 'Off · turn on'}</button>
                    </form>
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
