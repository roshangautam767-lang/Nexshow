// WhatsApp Business Cloud API. Server only. A business can start a chat only with an approved TEMPLATE message,
// so the wording of the ticket message lives in the template you create in Meta's WhatsApp Manager (see the guide).
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDateTime } from '@/lib/format';
import { findTicket } from '@/lib/ticket';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

// WhatsApp wants the number with country code and no "+". A bare 10-digit number is treated as Indian (+91).
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}
// Template values cannot contain new lines, tabs or long runs of spaces.
const clean = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 200) || '-';

export type WaOutcome = 'not_configured' | 'no_consent' | 'already' | 'accepted' | 'failed';

export async function sendTicketMessage(bookingId: string, opts: { retry?: boolean } = {}): Promise<WaOutcome> {
  if (!whatsappConfigured()) return 'not_configured';
  const db = supabaseAdmin();
  const { data: b } = await db.from('bookings').select('id,user_id,status,phone,whatsapp_consent').eq('id', bookingId).maybeSingle();
  if (!b || b.status !== 'confirmed' || !b.whatsapp_consent || !b.phone) return 'no_consent'; // no consent, no message
  const to = normalizePhone(b.phone);
  if (!to) return 'no_consent';
  const ticket = await findTicket({ id: bookingId });
  if (!ticket) return 'failed';

  // Claim the send. The unique booking_id means two requests can never both send.
  const { data: existing } = await db.from('whatsapp_messages').select('id,status,attempts,updated_at').eq('booking_id', bookingId).maybeSingle();
  let rowId: number;
  if (existing) {
    const stale = existing.status === 'queued' && Date.now() - new Date(existing.updated_at).getTime() > 2 * 60 * 1000;
    if (!(opts.retry && (existing.status === 'failed' || stale) && existing.attempts < 3)) return 'already';
    const { data: claimed } = await db.from('whatsapp_messages')
      .update({ status: 'queued', to_phone: to, attempts: existing.attempts + 1, error: null, updated_at: new Date().toISOString() })
      .eq('id', existing.id).eq('status', existing.status).select('id').maybeSingle();
    if (!claimed) return 'already';
    rowId = claimed.id;
  } else {
    const { data: ins, error } = await db.from('whatsapp_messages').insert({ booking_id: bookingId, to_phone: to }).select('id').single();
    if (error || !ins) return 'already';
    rowId = ins.id;
  }

  const { data: profile } = await db.from('profiles').select('full_name').eq('id', b.user_id).maybeSingle();
  const first = (profile?.full_name ?? '').trim().split(/\s+/)[0] || 'there';
  const link = `${site()}/ticket/${ticket.token}`;
  const params = [first, ticket.movie, `${ticket.theatre}, ${ticket.screen}`, fmtDateTime(ticket.startsAt), ticket.seats.join(', '), ticket.ref, link, `${link}/qr`];
  const payload = {
    messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME || 'nexshow_ticket', language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
      components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: clean(p) })) }],
    },
  };

  const finish = (patch: Record<string, unknown>) => db.from('whatsapp_messages').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', rowId);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST', signal: ctrl.signal, cache: 'no-store', body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    const id = json?.messages?.[0]?.id;
    if (res.ok && id) { await finish({ status: 'accepted', wa_message_id: id }); return 'accepted'; } // accepted is NOT delivered
    await finish({ status: 'failed', error: String(json?.error?.message ?? `WhatsApp returned ${res.status}`).slice(0, 300) });
    return 'failed';
  } catch {
    await finish({ status: 'failed', error: 'Could not reach WhatsApp.' });
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

// Called right after a booking is confirmed. It must never break the booking, so every error is swallowed.
export async function notifyTicket(bookingId: string) {
  try { await sendTicketMessage(bookingId); } catch { /* the ticket is still shown on the website */ }
}
