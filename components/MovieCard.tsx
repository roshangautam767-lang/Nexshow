import Image from 'next/image';
import Link from 'next/link';
import { IMG, Movie } from '@/lib/tmdb';

export default function MovieCard({ movie }: { movie: Movie }) {
  const src = IMG(movie.poster_path);
  return (
    <Link href={`/movie/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-line bg-panel transition duration-300 group-hover:-translate-y-1 group-hover:border-red group-hover:shadow-[0_10px_30px_rgba(229,9,20,0.35)]">
        {src ? (
          <Image src={src} alt={`${movie.title} poster`} fill sizes="180px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-3 text-center text-sm text-mu">{movie.title}</div>
        )}
        {movie.vote_average > 0 && (
          <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 text-xs font-bold">
            ★ {movie.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-1 font-bold">{movie.title}</h3>
      <p className="text-sm text-mu">{movie.release_date?.slice(0, 4)}</p>
    </Link>
  );
}
