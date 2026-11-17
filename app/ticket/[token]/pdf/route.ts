import { findTicket } from '@/lib/ticket';
import { ticketPdfResponse } from '@/lib/ticketPdf';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{48}$/i.test(params.token)) return new Response('Ticket not found.', { status: 404 });
  const t = await findTicket({ token: params.token.toLowerCase() });
  if (!t) return new Response('Ticket not found.', { status: 404 });
  return ticketPdfResponse(t);
}
