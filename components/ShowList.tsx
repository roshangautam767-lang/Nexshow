import Link from 'next/link';
import { ShowRow } from '@/lib/shows';
import { dayKey, fmtDay, fmtTime, money } from '@/lib/format';

// Keeps real partner inventory, admin-managed listings and demo data clearly apart.
export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, [string, string]> = {
    partner: ['Partner theatre', 'border-red text-red2'],
    admin: ['Listed by NexShow', 'border-line text-mu'],
    demo: ['Demo data', 'border-dashed border-mu text-mu'],
  };
  const [label, cls] = map[source] ?? map.admin;
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function ShowChips({ shows }: { shows: ShowRow[] }) {
  const days = new Map<string, ShowRow[]>();
  shows.forEach((s) => { const k = dayKey(s.starts_at); days.set(k, [...(days.get(k) ?? []), s]); });
  return (
    <div className="space-y-3">
      {Array.from(days.entries()).map(([k, list]) => (
        <div key={k}>
          <p className="mb-1 text-sm font-bold">{fmtDay(list[0].starts_at)}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => {
              const prices = [s.price_regular, s.price_premium, s.price_recliner].filter((p) => p > 0);
              return (
                <Link key={s.id} href={`/shows/${s.id}`} className="rounded border border-line bg-bg px-3 py-2 text-sm transition hover:border-red">
                  <span className="font-bold">{fmtTime(s.starts_at)}</span>
                  <span className="block text-xs text-mu">{s.screen}{prices.length ? ` · from ${money(Math.min(...prices))}` : ''}</span>
                  <span className={`block text-xs ${s.available > 0 ? 'text-mu' : 'text-red2'}`}>{s.available > 0 ? `${s.available} seats left` : 'Sold out'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
