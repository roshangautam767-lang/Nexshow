import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { fmtDateTime } from '@/lib/format';
import { TicketData, qrPng } from '@/lib/ticket';

// PDF standard fonts only draw Latin characters, so anything else becomes "?".
const safe = (s: string) => s.replace(/[\u2000-\u200b\u202f\u00a0]/g, ' ').replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of safe(text).split(' ')) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) cur = test;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

export async function ticketPdfResponse(t: TicketData): Promise<Response> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([360, 640]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const white = rgb(1, 1, 1), grey = rgb(0.7, 0.6, 0.6), red = rgb(0.9, 0.035, 0.078);

  page.drawRectangle({ x: 0, y: 0, width: 360, height: 640, color: rgb(0.02, 0, 0) });
  page.drawRectangle({ x: 0, y: 570, width: 360, height: 70, color: red });
  page.drawText('NexShow', { x: 24, y: 592, size: 30, font: bold, color: white });

  let y = 540;
  const field = (label: string, lines: string[], size = 13) => {
    page.drawText(safe(label).toUpperCase(), { x: 24, y, size: 8, font: reg, color: grey });
    lines.forEach((ln, i) => page.drawText(ln, { x: 24, y: y - 16 - i * 15, size, font: i === 0 ? bold : reg, color: white }));
    y -= 20 + Math.max(1, lines.length) * 15 + 8;
  };
  field('Movie', wrap(t.movie, bold, 15, 310, 2), 15);
  field('Theatre and screen', wrap(`${t.theatre} - ${t.screen}`, bold, 13, 310, 2));
  field('Show', [safe(fmtDateTime(t.startsAt))]);
  field('Seats', wrap(t.seats.join(', '), bold, 13, 310, 2));
  field('Booking ID', [t.ref]);
  field('Payment', ['Paid']);

  const png = await pdf.embedPng(await qrPng(t.token));
  page.drawRectangle({ x: 100, y: 60, width: 160, height: 160, color: white });
  page.drawImage(png, { x: 106, y: 66, width: 148, height: 148 });
  page.drawText('Show this QR at the entrance', { x: 100, y: 40, size: 10, font: reg, color: grey });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes) as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="NexShow-ticket-${t.ref}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
