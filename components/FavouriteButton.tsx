import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { toggleFavourite } from '@/app/actions/account';

export default async function FavouriteButton({ tmdbId }: { tmdbId: number }) {
  const user = await getUser();
  if (!user) {
    return <Link href={`/login?next=${encodeURIComponent(`/movie/${tmdbId}`)}`} className="btn-ghost px-6 py-3">♡ Log in to save</Link>;
  }
  const { data } = await supabaseAdmin().from('favourites').select('movies!inner(tmdb_id)')
    .eq('user_id', user.id).eq('movies.tmdb_id', tmdbId).limit(1);
  const saved = (data?.length ?? 0) > 0;
  return (
    <form action={toggleFavourite}>
      <input type="hidden" name="tmdbId" value={tmdbId} />
      <button className="btn-ghost px-6 py-3">{saved ? '♥ Saved' : '♡ Save to favourites'}</button>
    </form>
  );
}
