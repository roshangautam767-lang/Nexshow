import { money } from '@/lib/format';

export type SeatView = { id: number; row: string; no: number; category: 'regular' | 'premium' | 'recliner'; status: 'available' | 'locked' | 'booked' };
const LABEL = { regular: 'Regular', premium: 'Premium', recliner: 'Recliner' } as const;
const BORDER = { regular: 'border-line', premium: 'border-red2/60', recliner: 'border-red' } as const;
const STATE = {
  available: 'bg-panel text-mu',
  locked: 'border-dashed bg-bg text-mu',
  booked: 'bg-black text-mu/40 opacity-40',
} as const;

// Read-only seat map. Seat selection is added in the next phase.
export default function SeatMap({ seats, prices }: { seats: SeatView[]; prices: Record<string, number> }) {
  const rows = new Map<string, SeatView[]>();
  [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.no - b.no).forEach((s) => rows.set(s.row, [...(rows.get(s.row) ?? []), s]));
  let last = '';
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto w-max min-w-full px-2">
        <div className="mx-auto h-1.5 w-2/3 rounded-full bg-red shadow-[0_8px_30px_#e50914]" />
        <p className="mb-4 mt-2 text-center text-xs text-mu">Screen this way</p>
        {Array.from(rows.entries()).map(([row, list]) => {
          const cat = list[0].category;
          const heading = cat !== last;
          last = cat;
          return (
            <div key={row}>
              {heading && <p className="mb-2 mt-5 text-center text-xs uppercase tracking-wide text-mu">{LABEL[cat]} · {money(prices[cat])}</p>}
              <div className="mb-1.5 flex items-center justify-center gap-1.5">
                <span className="w-5 text-xs text-mu">{row}</span>
                {list.map((s) => (
                  <span key={s.id} title={`${row}${s.no}`} className={`grid h-7 place-items-center rounded-t-md border text-[10px] ${s.category === 'recliner' ? 'w-9' : 'w-7'} ${BORDER[s.category]} ${STATE[s.status]}`}>{s.no}</span>
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-mu">
          <span>□ Available</span><span>┅ Held by someone</span><span>■ Booked</span>
        </div>
      </div>
    </div>
  );
}
