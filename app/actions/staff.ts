'use server';
import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findTicket, parseTicketInput } from '@/lib/ticket';

export type LookupResult =
  | { ok: false; error: string }
  | { ok: true; ticket: { ref: string; movie: string; theatre: string; screen: string; startsAt: string; seats: string[]; used: boolean } };

async function resolve(raw: string) {
  const parsed = parseTicketInput(raw);
  if (!parsed) return null;
  return findTicket('token' in parsed ? { token: parsed.token } : { ref: parsed.ref });
}

// Looking a ticket up changes nothing, so an accidental scan never uses it up.
export async function lookupTicket(raw: string): Promise<LookupResult> {
  await requireStaff();
  if (!parseTicketInput(raw)) return { ok: false, error: 'That is not a NexShow ticket code.' };
  const t = await resolve(raw);
  if (!t) return { ok: false, error: 'No paid ticket found for this code.' };
  return { ok: true, ticket: { ref: t.ref, movie: t.movie, theatre: t.theatre, screen: t.screen, startsAt: t.startsAt, seats: t.seats, used: t.used } };
}

// Admitting marks the ticket as used, once. The database blocks a second use.
export async function admitTicket(raw: string): Promise<{ result: 'accepted' | 'already_used' | 'invalid' }> {
  const staff = await requireStaff();
  const t = await resolve(raw);
  if (!t) return { result: 'invalid' };
  const { data, error } = await supabaseAdmin().rpc('verify_ticket', { p_staff: staff.id, p_token: t.token });
  if (error) return { result: 'invalid' };
  const r = (data as any)?.result;
  return { result: r === 'accepted' || r === 'already_used' ? r : 'invalid' };
}
