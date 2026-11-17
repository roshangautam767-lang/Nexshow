import MovieCard from './MovieCard';
import { Movie } from '@/lib/tmdb';

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((m) => <MovieCard key={m.id} movie={m} />)}
    </div>
  );
}

export default function MovieRow({ id, title, movies }: { id: string; title: string; movies: Movie[] | null }) {
  return (
    <section id={id} className="container-x py-8">
      <h2 className="mb-4 font-display text-3xl font-black">{title}</h2>
      {movies === null ? (
        <p className="notice">Movie data is unavailable right now. Please try again in a moment.</p>
      ) : movies.length === 0 ? (
        <p className="notice">No movies to show here yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {movies.slice(0, 20).map((m) => (
            <div key={m.id} className="w-40 shrink-0 sm:w-44"><MovieCard movie={m} /></div>
          ))}
        </div>
      )}
    </section>
  );
}
