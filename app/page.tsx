import Hero, { Slide } from '@/components/Hero';
import Filters from '@/components/Filters';
import MovieRow, { MovieGrid } from '@/components/MovieRow';
import CoinOffers from '@/components/CoinOffers';
import { IMG, discover, getGenres, getNowPlaying, getTopRated, getTrending, getUpcoming } from '@/lib/tmdb';

export default async function Home({ searchParams }: { searchParams: { genre?: string; lang?: string } }) {
  const { genre, lang } = searchParams;
  const filtering = Boolean(genre || lang);
  const [playing, soon, trending, top, genres, filtered] = await Promise.all([
    getNowPlaying(), getUpcoming(), getTrending(), getTopRated(), getGenres(),
    filtering ? discover({ genre, lang }) : Promise.resolve(null),
  ]);

  const slides: Slide[] = (playing ?? [])
    .filter((m) => m.backdrop_path)
    .slice(0, 5)
    .map((m) => ({ id: m.id, title: m.title, overview: m.overview, backdrop: IMG(m.backdrop_path, 'w1280')!, rating: m.vote_average }));
  const allDown = !playing && !soon && !trending && !top;

  return (
    <>
      {slides.length > 0 && <Hero slides={slides} />}
      {allDown && (
        <div className="container-x py-10">
          <p className="notice">
            Movie data could not be loaded. Add your TMDB_API_KEY to the .env.local file and restart the server.
          </p>
        </div>
      )}
      <Filters genres={genres} genre={genre} lang={lang} />
      {filtering ? (
        <section id="results" className="container-x py-4">
          <h2 className="mb-4 font-display text-3xl font-black">Filtered movies</h2>
          {filtered === null ? <p className="notice">Movie data is unavailable right now.</p>
            : filtered.length === 0 ? <p className="notice">No movies match these filters. Try another genre or language.</p>
            : <MovieGrid movies={filtered} />}
        </section>
      ) : (
        <>
          <MovieRow id="now-showing" title="Currently showing" movies={playing} />
          <MovieRow id="coming-soon" title="Coming soon" movies={soon} />
          <MovieRow id="trending" title="Trending this week" movies={trending} />
          <MovieRow id="recommended" title="Recommended" movies={top} />
        </>
      )}
      <CoinOffers />
    </>
  );
}
