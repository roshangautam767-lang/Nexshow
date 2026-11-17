import { Flash } from '@/components/Forms';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { setRole } from '@/app/actions/admin';

export default async function UsersPage({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const db = supabaseAdmin();
  const [{ data: profiles }, { data: authList }] = await Promise.all([
    db.from('profiles').select('id,full_name,phone,city,role,created_at').order('created_at', { ascending: false }).limit(200),
    db.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const emails = new Map((authList?.users ?? []).map((u) => [u.id, u.email]));
  return (
    <>
      <h1 className="mb-5 font-display text-4xl font-black">Users</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      {(profiles ?? []).length === 0 ? <p className="notice">No users yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead><tr className="bg-deep text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">City</th><th className="p-3">Role</th></tr></thead>
            <tbody>
              {(profiles ?? []).map((p: any) => (
                <tr key={p.id} className="border-b border-line bg-panel">
                  <td className="p-3">{p.full_name ?? '-'}</td><td className="p-3 text-mu">{emails.get(p.id) ?? '-'}</td>
                  <td className="p-3 text-mu">{p.phone ?? '-'}</td><td className="p-3 text-mu">{p.city ?? '-'}</td>
                  <td className="p-3">
                    <form action={setRole} className="flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role} aria-label={`Role for ${p.full_name ?? 'user'}`} className="rounded border border-line bg-bg px-2 py-1">
                        <option value="user">user</option><option value="staff">staff</option><option value="admin">admin</option>
                      </select>
                      <button className="rounded border border-red px-3 py-1 hover:bg-red/20">Save</button>
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
