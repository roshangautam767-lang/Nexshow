import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TicketCard from '@/components/TicketCard';
import { findTicket, qrDataUrl } from '@/lib/ticket';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your NexShow ticket', robots: { index: false, follow: false } };

// Anyone holding the long random link can open the ticket, just like anyone holding the QR code can.
export default async function TicketPage({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{48}$/i.test(params.token)) notFound();
  const t = await findTicket({ token: params.token.toLowerCase() });
  if (!t) notFound();
  const qr = await qrDataUrl(t.token);
  return (
    <div className="container-x max-w-md py-10">
      <h1 className="mb-4 font-display text-4xl font-black">Your ticket</h1>
      <TicketCard qr={qr} t={{ ref: t.ref, movie: t.movie, theatre: t.theatre, address: t.address, screen: t.screen, startsAt: t.startsAt, seats: t.seats, used: t.used }} />
      <a href={`/ticket/${t.token}/pdf`} className="btn mt-4">Download PDF ticket</a>
    </div>
  );
}
