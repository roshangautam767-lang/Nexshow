'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SeatView } from '@/components/SeatMap';
import { startCheckout } from '@/app/actions/booking';
import { money } from '@/lib/format';

const LABEL = { regular: 'Regular', premium: 'Premium', recliner: 'Recliner' } as const;
const BORDER = { regular: 'border-line', premium: 'border-red2/60', recliner: 'border-red' } as const;

export default function SeatPicker({ showId, seats, prices, loggedIn, closed, max }: {
  showId: number; seats: SeatView[]; prices: Record<string, number>; loggedIn: boolean; closed: boolean; max: number;
}) {
  const [sel, setSel] = useState<number[]>([]);
  const byId = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
  const rows = useMemo(() => {
    const m = new Map<string, SeatView[]>();
    [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.no - b.no).forEach((s) => m.set(s.row, [...(m.get(s.row) ?? []), s]));
    return Array.from(m.entries());
  }, [seats]);

  function toggle(s: SeatView) {
    if (s.status !== 'available' || closed) return;
    setSel((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : cur.length >= max ? cur : [...cur, s.id]));
  }
  const chosen = sel.map((id) => byId.get(id)!).sort((a, b) => a.row.localeCompare(b.row) || a.no - b.no);
  const total = chosen.reduce((t, s) => t + prices[s.category], 0);
  let last = '';

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="mx-auto w-max min-w-full px-2">
          <div className="mx-auto h-1.5 w-2/3 rounded-full bg-red shadow-[0_8px_30px_#e50914]" />
          <p className="mb-4 mt-2 text-center text-xs text-mu">Screen this way</p>
          {rows.map(([row, list]) => {
            const cat = list[0].category;
            const heading = cat !== last;
            last = cat;
            return (
              <div key={row}>
                {heading && <p className="mb-2 mt-5 text-center text-xs uppercase tracking-wide text-mu">{LABEL[cat]} · {money(prices[cat])}</p>}
                <div className="mb-1.5 flex items-center justify-center gap-1.5">
                  <span className="w-5 text-xs text-mu">{row}</span>
                  {list.map((s) => {
                    const on = sel.includes(s.id);
                    const state = on ? 'bg-red border-red2 text-white' : s.status === 'available' ? 'bg-panel text-mu hover:border-red2' : s.status === 'locked' ? 'border-dashed bg-bg text-mu' : 'bg-black text-mu/40 opacity-40';
                    return (
                      <button key={s.id} type="button" onClick={() => toggle(s)} disabled={s.status !== 'available' || closed}
                        aria-pressed={on} aria-label={`Seat ${row}${s.no}, ${LABEL[s.category]}, ${s.status}`} title={`${row}${s.no}`}
                        className={`grid h-7 place-items-center rounded-t-md border text-[10px] ${s.category === 'recliner' ? 'w-9' : 'w-7'} ${on ? '' : BORDER[s.category]} ${state}`}>{s.no}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-mu"><span>□ Available</span><span className="text-red2">■ Your choice</span><span>┅ Held by someone</span><span>■ Booked</span></div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-panel p-4">
        <div>
          <p className="font-bold">{chosen.length === 0 ? 'Select your seats' : `${chosen.length} seat${chosen.length > 1 ? 's' : ''}: ${chosen.map((s) => `${s.row}${s.no}`).join(', ')}`}</p>
          <p className="text-sm text-mu">{chosen.length === 0 ? `You can choose up to ${max} seats.` : `Tickets: ${money(total)} (fees and discounts are shown at checkout)`}</p>
          {sel.length >= max && <p className="text-xs text-red2">That is the maximum of {max} seats per booking.</p>}
        </div>
        {closed ? <p className="text-sm text-mu">Booking is closed for this show.</p>
          : !loggedIn ? <Link href={`/login?next=${encodeURIComponent(`/shows/${showId}`)}`} className="btn">Log in to book</Link>
          : (
            <form action={startCheckout}>
              <input type="hidden" name="showId" value={showId} />
              <input type="hidden" name="seats" value={sel.join(',')} />
              <button className="btn disabled:opacity-40" disabled={sel.length === 0}>Continue to checkout</button>
            </form>
          )}
      </div>
    </div>
  );
}
