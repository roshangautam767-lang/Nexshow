'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const enc = encodeURIComponent;
const str = (v: FormDataEntryValue | null) => String(v ?? '').trim();
const safeNext = (n: string) => (n.startsWith('/') && !n.startsWith('//') ? n : '/account');
const PHONE = /^\+?[0-9]{10,15}$/;

export async function signIn(fd: FormData) {
  const next = safeNext(str(fd.get('next')));
  const { error } = await supabaseServer().auth.signInWithPassword({ email: str(fd.get('email')), password: String(fd.get('password') ?? '') });
  if (error) redirect(`/login?error=${enc(error.message)}&next=${enc(next)}`);
  redirect(next);
}

export async function signUp(fd: FormData) {
  const full_name = str(fd.get('full_name'));
  const email = str(fd.get('email'));
  const phone = str(fd.get('phone')).replace(/[\s-]/g, '');
  const password = String(fd.get('password') ?? '');
  const fail = (m: string) => redirect(`/register?error=${enc(m)}`);
  if (full_name.length < 2 || full_name.length > 80) fail('Please enter your name.');
  if (password.length < 8) fail('Password must be at least 8 characters.');
  if (phone && !PHONE.test(phone)) fail('Enter a valid phone number, for example +919876543210.');

  const { data, error } = await supabaseServer().auth.signUp({
    email, password,
    options: { data: { full_name, phone: phone || null }, emailRedirectTo: `${SITE}/auth/callback?next=/account` },
  });
  if (error) fail(error.message);
  if (data?.session) redirect('/account');
  redirect(`/login?msg=${enc('Account created. Check your email to confirm it, then log in.')}`);
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect('/');
}

export async function requestReset(fd: FormData) {
  await supabaseServer().auth.resetPasswordForEmail(str(fd.get('email')), { redirectTo: `${SITE}/auth/callback?next=/reset-password` });
  redirect(`/forgot-password?msg=${enc('If that email has an account, a reset link is on its way.')}`);
}

export async function updatePassword(fd: FormData) {
  const pw = String(fd.get('password') ?? '');
  if (pw.length < 8) redirect(`/reset-password?error=${enc('Password must be at least 8 characters.')}`);
  if (pw !== String(fd.get('confirm') ?? '')) redirect(`/reset-password?error=${enc('The two passwords do not match.')}`);
  const { error } = await supabaseServer().auth.updateUser({ password: pw });
  if (error) redirect(`/reset-password?error=${enc(error.message)}`);
  redirect(`/account?msg=${enc('Password updated.')}`);
}
