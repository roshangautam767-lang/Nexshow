import { MovieGrid } from '@/components/MovieRow';
import { searchMovies } from '@/lib/tmdb';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const movies = q ? await searchMovies(q) : [];
  return (
    <div className="container-x py-10">
      <h1 className="mb-6 font-display text-4xl font-black">{q ? `Results for “${q}”` : 'Search movies'}</h1>
      {!q ? <p className="notice">Type a movie name in the search bar above.</p>
        : movies === null ? <p className="notice">Search is unavailable right now. Please try again in a moment.</p>
        : movies.length === 0 ? <p className="notice">No movies found for “{q}”. Check the spelling or try another title.</p>
        : <MovieGrid movies={movies} />}
    </div>
  );
}
