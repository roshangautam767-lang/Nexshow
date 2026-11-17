import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase/admin';

// The QR holds only a random reference. It contains no name, phone or email.
export const qrText = (token: string) => `NXT:${token}`;
export const qrDataUrl = (token: string) => QRCode.toDataURL(qrText(token), { margin: 1, width: 260, errorCorrectionLevel: 'M' });
export const qrPng = (token: string) => QRCode.toBuffer(qrText(token), { type: 'png', margin: 1, width: 320, errorCorrectionLevel: 'M' });

export type TicketData = {
  id: string; ref: string; token: string; used: boolean; movie: string; theatre: string; address: string;
  screen: string; startsAt: string; seats: string[];
};

// What staff type or scan: the QR text, the bare code, or the short booking ID printed on the ticket.
export function parseTicketInput(raw: string): { token: string } | { ref: string } | null {
  const t = raw.trim();
  const tok = t.match(/^(?:NXT:)?([0-9a-f]{48})$/i);
  if (tok) return { token: tok[1].toLowerCase() };
  if (/^[0-9a-f]{10}$/i.test(t)) return { ref: t.toUpperCase() };
  return null;
}

export async function findTicket(match: { id?: string; userId?: string; token?: string; ref?: string }): Promise<TicketData | null> {
  const db = supabaseAdmin();
  let q = db.from('bookings')
    .select('id,booking_ref,ticket_token,ticket_used_at,shows(starts_at,movies(title),screens(name,theatres(name,address,city)))')
    .eq('status', 'confirmed');
  if (match.id) q = q.eq('id', match.id);
  if (match.userId) q = q.eq('user_id', match.userId);
  if (match.token) q = q.eq('ticket_token', match.token);
  if (match.ref) q = q.eq('booking_ref', match.ref);
  const { data: b } = await q.maybeSingle();
  if (!b) return null;

  const { data: bs } = await db.from('booking_seats').select('seat_id').eq('booking_id', b.id);
  const ids = (bs ?? []).map((x: any) => x.seat_id);
  const { data: rows } = ids.length ? await db.from('seats').select('row_label,seat_no').in('id', ids) : { data: [] };
  const seats = (rows ?? []).map((r: any) => `${r.row_label}${r.seat_no}`).sort((a: string, c: string) => a.localeCompare(c, undefined, { numeric: true }));
  const s: any = b.shows;
  return {
    id: b.id, ref: b.booking_ref, token: b.ticket_token, used: Boolean(b.ticket_used_at), seats,
    movie: s?.movies?.title ?? '', theatre: s?.screens?.theatres?.name ?? '', screen: s?.screens?.name ?? '',
    address: [s?.screens?.theatres?.address, s?.screens?.theatres?.city].filter(Boolean).join(', '), startsAt: s?.starts_at ?? '',
  };
}
