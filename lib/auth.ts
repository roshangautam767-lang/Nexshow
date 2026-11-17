import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getUser() {
  if (!supabaseConfigured()) return null;
  const { data } = await supabaseServer().auth.getUser(); // verified with Supabase, not just read from the cookie
  return data.user;
}

export async function getRole(userId: string): Promise<string> {
  const { data } = await supabaseAdmin().from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role ?? 'user';
}

export async function requireUser(next = '/account') {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser('/admin');
  if ((await getRole(user.id)) !== 'admin') redirect('/');
  return user;
}

// Theatre staff and admins can check tickets at the entrance.
export async function requireStaff() {
  const user = await requireUser('/staff/verify');
  const role = await getRole(user.id);
  if (role !== 'staff' && role !== 'admin') redirect('/');
  return user;
}
