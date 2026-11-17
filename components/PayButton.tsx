'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { confirmFreeBooking, createPaymentOrder, verifyPayment } from '@/app/actions/payment';

declare global { interface Window { Razorpay?: any } }

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayButton({ bookingId, free, amountLabel, title }: { bookingId: string; free: boolean; amountLabel: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error: boolean; text: string } | null>(null);

  async function pay() {
    setBusy(true); setMsg(null);
    if (free) {
      const r = await confirmFreeBooking(bookingId);
      if (!r.ok) setMsg({ error: true, text: r.error });
      router.refresh(); setBusy(false); return;
    }
    const order = await createPaymentOrder(bookingId);
    if (!order.ok) { setMsg({ error: true, text: order.error }); setBusy(false); return; }
    if (!(await loadCheckout())) { setMsg({ error: true, text: 'Could not load the payment window. Check your internet and try again.' }); setBusy(false); return; }

    const rzp = new window.Razorpay({
      key: order.keyId, amount: order.amountPaise, currency: 'INR', name: 'NexShow', description: title, order_id: order.orderId,
      prefill: { name: order.name, email: order.email, contact: order.contact }, theme: { color: '#e50914' },
      handler: async (resp: any) => {
        setMsg({ error: false, text: 'Verifying your payment…' });
        const v = await verifyPayment({ bookingId, orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
        if (v.status !== 'confirmed') setMsg({ error: v.status !== 'pending', text: v.message });
        router.refresh(); setBusy(false);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on('payment.failed', (r: any) => { setMsg({ error: true, text: r?.error?.description ?? 'The payment failed. You can try again.' }); setBusy(false); });
    rzp.open();
  }

  return (
    <div className="space-y-2">
      <button onClick={pay} disabled={busy} className="btn px-8 py-3 text-lg disabled:opacity-50">{busy ? 'Please wait…' : free ? 'Confirm booking' : `Pay ${amountLabel}`}</button>
      {msg && <p role={msg.error ? 'alert' : 'status'} className={`text-sm ${msg.error ? 'text-red2' : 'text-mu'}`}>{msg.text}</p>}
    </div>
  );
}
