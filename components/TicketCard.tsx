import { fmtDateTime } from '@/lib/format';

export type TicketView = { ref: string; movie: string; theatre: string; address: string; screen: string; startsAt: string; seats: string[]; used: boolean };

export default function TicketCard({ t, qr }: { t: TicketView; qr: string }) {
  return (
    <div className="max-w-sm overflow-hidden rounded-lg border border-red bg-panel">
      <div className="bg-red px-5 py-3"><p className="font-display text-3xl font-black">NexShow</p></div>
      <div className="space-y-3 p-5">
        <div><p className="text-xs uppercase tracking-wide text-mu">Movie</p><p className="text-lg font-bold">{t.movie}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-mu">Theatre</p><p>{t.theatre} · {t.screen}</p><p className="text-xs text-mu">{t.address}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-mu">Show</p><p>{fmtDateTime(t.startsAt)}</p></div>
        <div><p className="text-xs uppercase tracking-wide text-mu">Seats</p><p className="font-bold">{t.seats.join(', ')}</p></div>
        <div className="flex gap-6">
          <div><p className="text-xs uppercase tracking-wide text-mu">Booking ID</p><p className="font-mono">{t.ref}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-mu">Payment</p><p>Paid</p></div>
        </div>
        <div className="flex flex-col items-center border-t border-dashed border-line pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for booking ${t.ref}`} width={180} height={180} className="rounded bg-white p-2" />
          <p className={`mt-2 text-sm font-bold ${t.used ? 'text-red2' : 'text-mu'}`}>{t.used ? 'This ticket has been used' : 'Show this QR at the entrance'}</p>
        </div>
      </div>
    </div>
  );
}
