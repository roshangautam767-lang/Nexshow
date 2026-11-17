import { Field } from '@/components/Forms';
import { requestWhatsApp, resendWhatsApp } from '@/app/actions/whatsapp';

type Row = { status: string; attempts: number; updated_at: string } | null;
const mask = (p: string) => `•••• ${p.replace(/\D/g, '').slice(-4)}`;
const box = 'max-w-sm rounded-md border border-line bg-panel p-4 text-sm';

// Only says "delivered" when WhatsApp itself has confirmed it.
export default function WhatsAppStatus({ bookingId, configured, consent, phone, row }: { bookingId: string; configured: boolean; consent: boolean; phone: string | null; row: Row }) {
  if (!configured) {
    return consent ? <p className={`${box} text-mu`}>WhatsApp delivery is not available right now. Your ticket is shown above.</p> : null;
  }
  if (consent && phone) {
    if (row && (row.status === 'delivered' || row.status === 'read')) return <p className={box}>Your ticket was delivered to WhatsApp ({mask(phone)}).</p>;
    if (row?.status === 'accepted') return <p className={`${box} text-mu`}>Your ticket was handed to WhatsApp for {mask(phone)}. Delivery is not confirmed yet. Your ticket is also shown above.</p>;
    const stale = row?.status === 'queued' && Date.now() - new Date(row.updated_at).getTime() > 2 * 60 * 1000;
    if (row?.status === 'queued' && !stale) return <p className={`${box} text-mu`}>Sending your ticket on WhatsApp…</p>;
    const canRetry = !row || row.attempts < 3;
    return (
      <div className={box}>
        <p className="text-red2">We could not send your ticket on WhatsApp. Your ticket is shown above.</p>
        {canRetry && <form action={resendWhatsApp} className="mt-2"><input type="hidden" name="id" value={bookingId} /><button className="btn-ghost">Try again</button></form>}
      </div>
    );
  }
  return (
    <form action={requestWhatsApp} className={`${box} space-y-3`}>
      <input type="hidden" name="id" value={bookingId} />
      <p className="font-bold">Get this ticket on WhatsApp</p>
      <Field label="WhatsApp number" name="phone" type="tel" required placeholder="+919876543210" />
      <p className="text-xs text-mu">By tapping send, you agree to receive this ticket on WhatsApp at that number.</p>
      <button className="btn">Send to WhatsApp</button>
    </form>
  );
}
