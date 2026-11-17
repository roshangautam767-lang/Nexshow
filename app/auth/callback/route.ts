import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Email confirmation and password-reset links land here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (code) {
    const { error } = await supabaseServer().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safe, url.origin));
  }
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('That link is invalid or has expired. Please try again.')}`, url.origin));
}
