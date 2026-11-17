import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash } from '@/components/Forms';
import { SeatView } from '@/components/SeatMap';
import SeatPicker from '@/components/SeatPicker';
import { SourceBadge } from '@/components/ShowList';
import { getUser } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { MAX_SEATS } from '@/lib/pricing';
import { IMG } from '@/lib/tmdb';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function ShowPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const db = supabaseAdmin();
  await db.rpc('release_expired_locks');
  const { data: show } = await db.from('shows')
    .select('id,starts_at,price_regular,price_premium,price_recliner,active,movies(tmdb_id,title,poster_path),screens(name,theatres(name,address,city,source))')
    .eq('id', params.id).maybeSingle();
  if (!show || !show.active) notFound();
  const { data: rows } = await db.from('show_seats').select('seat_id,status,seats(row_label,seat_no,category)').eq('show_id', params.id);
  const user = await getUser();

  const s: any = show;
  const seats: SeatView[] = (rows ?? []).map((r: any) => ({ id: r.seat_id, row: r.seats.row_label, no: r.seats.seat_no, category: r.seats.category, status: r.status }));
  const free = seats.filter((x) => x.status === 'available').length;
  const poster = IMG(s.movies.poster_path, 'w185');
  const started = new Date(s.starts_at) <= new Date();

  return (
    <div className="container-x py-10">
      <div className="mb-8 flex flex-wrap items-start gap-5">
        {poster && <Image src={poster} alt="" width={90} height={135} className="rounded border border-line" />}
        <div>
          <Link href={`/movie/${s.movies.tmdb_id}`} className="text-sm text-red2 hover:underline">← {s.movies.title}</Link>
          <h1 className="font-display text-4xl font-black">{s.screens.theatres.name}</h1>
          <p className="text-mu">{s.screens.theatres.address}, {s.screens.theatres.city}</p>
          <p className="mt-1">{s.screens.name} · {fmtDateTime(s.starts_at)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><SourceBadge source={s.screens.theatres.source} /><span className="text-sm text-mu">{free} of {seats.length} seats available</span></div>
        </div>
      </div>
      <Flash error={searchParams.error} />
      {started && <p className="notice mb-6">This show has already started.</p>}
      <SeatPicker showId={s.id} seats={seats} loggedIn={Boolean(user)} closed={started} max={MAX_SEATS}
        prices={{ regular: Number(s.price_regular), premium: Number(s.price_premium), recliner: Number(s.price_recliner) }} />
    </div>
  );
}
