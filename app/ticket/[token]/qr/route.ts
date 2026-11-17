import { findTicket, qrPng } from '@/lib/ticket';

export const dynamic = 'force-dynamic';

// The QR code as a plain image, for the "QR ticket link".
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{48}$/i.test(params.token)) return new Response('Not found.', { status: 404 });
  const t = await findTicket({ token: params.token.toLowerCase() });
  if (!t) return new Response('Not found.', { status: 404 });
  return new Response(Buffer.from(await qrPng(t.token)) as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
  });
}
