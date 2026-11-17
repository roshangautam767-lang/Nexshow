import { supabaseAdmin } from '@/lib/supabase/admin';

export type ShowRow = {
  id: number; starts_at: string; price_regular: number; price_premium: number; price_recliner: number;
  source: string; available: number; screen: string;
  movie: { tmdb_id: number; title: string };
  theatre: { id: number; name: string; address: string; source: string };
};

export function groupBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  items.forEach((i) => { const k = key(i); m.set(k, [...(m.get(k) ?? []), i]); });
  return m;
}

// Upcoming, active shows in one city. Returns null if the database cannot be reached.
export async function upcomingShows(city: string, opts: { tmdbId?: number; days?: number } = {}): Promise<ShowRow[] | null> {
  const db = supabaseAdmin();
  await db.rpc('release_expired_locks'); // frees seats whose hold has run out, so counts are honest
  const until = new Date(Date.now() + (opts.days ?? 14) * 86400000).toISOString();
  let q = db.from('shows')
    .select('id,starts_at,price_regular,price_premium,price_recliner,source,movies!inner(tmdb_id,title),screens!inner(name,theatres!inner(id,name,address,city,source,active))')
    .eq('active', true).gt('starts_at', new Date().toISOString()).lt('starts_at', until)
    .eq('screens.theatres.city', city).eq('screens.theatres.active', true)
    .order('starts_at');
  if (opts.tmdbId) q = q.eq('movies.tmdb_id', opts.tmdbId);
  const { data, error } = await q;
  if (error || !data) return null;

  const ids = data.map((s: any) => s.id);
  const { data: av } = ids.length ? await db.rpc('show_availability', { p_ids: ids }) : { data: [] };
  const avail = new Map<number, number>((av ?? []).map((a: any) => [a.show_id, Number(a.available)]));
  return data.map((s: any) => ({
    id: s.id, starts_at: s.starts_at, source: s.source, available: avail.get(s.id) ?? 0,
    price_regular: Number(s.price_regular), price_premium: Number(s.price_premium), price_recliner: Number(s.price_recliner),
    movie: { tmdb_id: s.movies.tmdb_id, title: s.movies.title }, screen: s.screens.name,
    theatre: { id: s.screens.theatres.id, name: s.screens.theatres.name, address: s.screens.theatres.address, source: s.screens.theatres.source },
  }));
}
