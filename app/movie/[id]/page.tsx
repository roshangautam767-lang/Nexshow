import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import MovieRow from '@/components/MovieRow';
import Trailer from '@/components/Trailer';
import { ShowChips, SourceBadge } from '@/components/ShowList';
import { groupBy, upcomingShows } from '@/lib/shows';
import FavouriteButton from '@/components/FavouriteButton';
import { CITIES, DEFAULT_CITY, LANGUAGES } from '@/lib/cities';
import { IMG, getMovieFull } from '@/lib/tmdb';

export default async function MoviePage({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const m = await getMovieFull(params.id);
  if (!m) {
    return (
      <div className="container-x py-10">
        <p className="notice">This movie could not be loaded right now. <Link href="/" className="text-red2 underline">Back to home</Link></p>
      </div>
    );
  }

  const saved = cookies().get('nx_city')?.value;
  const city = CITIES.find((c) => c === saved) ?? DEFAULT_CITY;
  const poster = IMG(m.poster_path, 'w500');
  const back = IMG(m.backdrop_path, 'w1280');
  const lang = LANGUAGES.find((l) => l.code === m.original_language)?.name ?? m.original_language?.toUpperCase();
  const cast = (m.credits?.cast ?? []).slice(0, 12);
  const directors = (m.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name);
  const vids = (m.videos?.results ?? []).filter((v) => v.site === 'YouTube');
  const trailer = vids.find((v) => v.type === 'Trailer' && v.official) ?? vids.find((v) => v.type === 'Trailer') ?? vids.find((v) => v.type === 'Teaser');
  const similar = m.similar?.results ?? [];
  const shows = await upcomingShows(city, { tmdbId: m.id });

  return (
    <>
      <div className="relative h-[40vh] min-h-[260px] border-b border-line">
        {back && <Image src={back} alt="" fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-bg/30" />
      </div>

      <div className="container-x relative -mt-32 grid gap-8 pb-8 md:grid-cols-[260px_1fr]">
        <div className="relative aspect-[2/3] w-52 overflow-hidden rounded-md border border-line bg-panel md:w-full">
          {poster && <Image src={poster} alt={`${m.title} poster`} fill sizes="260px" className="object-cover" />}
        </div>
        <div className="self-end">
          <h1 className="font-display text-5xl font-black leading-none sm:text-6xl">{m.title}</h1>
          {m.tagline && <p className="mt-2 italic text-mu">{m.tagline}</p>}
          <p className="mt-3 text-sm text-mu">
            <span className="font-bold text-red2">★ {m.vote_average.toFixed(1)}</span>
            {m.runtime ? ` · ${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : ''}
            {lang ? ` · ${lang}` : ''}
            {m.release_date ? ` · ${m.release_date}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.genres.map((g) => <span key={g.id} className="rounded-full border border-line px-3 py-1 text-xs text-mu">{g.name}</span>)}
          </div>
          <p className="mt-4 max-w-2xl text-mu">{m.overview || 'No description available.'}</p>
          {directors.length > 0 && <p className="mt-3 text-sm text-mu">Director: <span className="text-tx">{directors.join(', ')}</span></p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#showtimes" className="btn px-8 py-3 text-lg tracking-wide">BOOK TICKETS</a>
            <FavouriteButton tmdbId={m.id} />
          </div>
        </div>
      </div>

      <section className="container-x py-6">
        <h2 className="mb-4 font-display text-3xl font-black">Trailer</h2>
        {trailer ? <div className="max-w-3xl"><Trailer videoKey={trailer.key} title={m.title} /></div> : <p className="notice">No trailer is available for this movie yet.</p>}
      </section>

      <section id="showtimes" className="container-x py-6">
        <h2 className="mb-4 font-display text-3xl font-black">Theatres, dates and show timings</h2>
        {shows === null ? (
          <p className="notice max-w-2xl">Show timings could not be loaded right now. Please try again in a moment.</p>
        ) : shows.length === 0 ? (
          <p className="notice max-w-2xl">No shows have been added for {m.title} in {city} yet. Try another city or check back soon.</p>
        ) : (
          <div className="space-y-5">
            {Array.from(groupBy(shows, (x) => String(x.theatre.id)).values()).map((list) => (
              <div key={list[0].theatre.id} className="rounded-md border border-line bg-panel p-5">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-bold">{list[0].theatre.name}</h3><SourceBadge source={list[0].theatre.source} /></div>
                <p className="mb-3 text-sm text-mu">{list[0].theatre.address}</p>
                <ShowChips shows={list} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="container-x py-6">
        <h2 className="mb-4 font-display text-3xl font-black">Cast</h2>
        {cast.length === 0 ? <p className="notice">Cast information is not available yet.</p> : (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {cast.map((c) => {
              const img = IMG(c.profile_path, 'w185');
              return (
                <div key={c.id} className="w-28 shrink-0 text-center">
                  <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-line bg-panel">
                    {img ? <Image src={img} alt={c.name} fill sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-mu">No photo</span>}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-tight">{c.name}</p>
                  {c.character && <p className="text-xs text-mu">{c.character}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {similar.length > 0 && <MovieRow id="similar" title="Similar movies" movies={similar} />}
    </>
  );
}
