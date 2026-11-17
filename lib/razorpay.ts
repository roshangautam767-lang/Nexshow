// Razorpay helpers. Server only: the secret key must never reach the browser.
import crypto from 'crypto';

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? ''; // the key ID is public; the secret is not

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<Result<T>> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  try {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method, cache: 'no-store', body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error?.description ?? `Razorpay returned an error (${res.status}).` };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: 'Could not reach Razorpay. Please try again.' };
  }
}

export type RzpOrder = { id: string; amount: number; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; status: string };

export const createOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  call<RzpOrder>('/orders', 'POST', { amount: amountPaise, currency: 'INR', receipt, notes });
export const fetchPayment = (id: string) => call<RzpPayment>(`/payments/${encodeURIComponent(id)}`, 'GET');
export const capturePayment = (id: string, amountPaise: number) =>
  call<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, 'POST', { amount: amountPaise, currency: 'INR' });
export const refundPayment = (id: string) => call<{ id: string }>(`/payments/${encodeURIComponent(id)}/refund`, 'POST', {});

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const hmac = (secret: string, text: string) => crypto.createHmac('sha256', secret).update(text).digest('hex');

// The browser hands back a signature after a payment. Only the server (with the secret key) can check it.
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return safeEqual(hmac(process.env.RAZORPAY_KEY_SECRET ?? '', `${orderId}|${paymentId}`), signature);
}
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && safeEqual(hmac(secret!, rawBody), signature);
}
