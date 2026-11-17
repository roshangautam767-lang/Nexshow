import { getUser } from '@/lib/auth';
import { findTicket } from '@/lib/ticket';
import { ticketPdfResponse } from '@/lib/ticketPdf';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return new Response('Please log in.', { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response('Ticket not found.', { status: 404 });
  const t = await findTicket({ id: params.id, userId: user.id }); // only the owner of a paid booking gets a ticket
  if (!t) return new Response('Ticket not found.', { status: 404 });
  return ticketPdfResponse(t);
}
