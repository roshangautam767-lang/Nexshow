import TicketVerifier from '@/components/TicketVerifier';
import { requireStaff } from '@/lib/auth';

export default async function VerifyPage() {
  await requireStaff();
  return (
    <div className="container-x py-10">
      <h1 className="mb-1 font-display text-5xl font-black">Verify tickets</h1>
      <p className="mb-6 max-w-xl text-mu">Scan the QR code on the customer’s ticket, or type the Booking ID. Checking a ticket does not use it. Only “Admit” does, and only once.</p>
      <TicketVerifier />
    </div>
  );
}
