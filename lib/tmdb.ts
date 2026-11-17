// TMDB data layer. Returns null when the API is unavailable so pages can show a graceful fallback.
const BASE = 'https://api.themoviedb.org/3';

export type Movie = {
  id: number; title: string; overview: string; poster_path: string | null; backdrop_path: string | null;
  release_date: string; vote_average: number; genre_ids?: number[]; original_language?: string;
};
export type MovieDetails = Movie & {
  runtime: number | null; tagline: string; genres: { id: number; name: string }[];
};
export type Genre = { id: number; name: string };

export const IMG = (path: string | null, size = 'w500') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const url = new URL(BASE + path);
  const all = { language: 'en-US', region: 'IN', ...params };
  Object.entries(all).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {};
  if (key.length > 60) headers.Authorization = `Bearer ${key}`; // v4 read access token
  else url.searchParams.set('api_key', key);
  try {
    const res = await fetch(url.toString(), { headers, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function list(path: string, params: Record<string, string> = {}): Promise<Movie[] | null> {
  const data = await get<{ results: Movie[] }>(path, params);
  return data ? data.results : null;
}

export const getNowPlaying = () => list('/movie/now_playing');
export const getUpcoming = () => list('/movie/upcoming');
export const getTrending = () => list('/trending/movie/week');
export const getTopRated = () => list('/movie/top_rated');
export const searchMovies = (q: string) => list('/search/movie', { query: q, include_adult: 'false' });
export const getMovie = (id: string) => get<MovieDetails>(`/movie/${id}`);
export async function getGenres(): Promise<Genre[] | null> {
  const data = await get<{ genres: Genre[] }>('/genre/movie/list');
  return data ? data.genres : null;
}
export function discover(opts: { genre?: string; lang?: string }) {
  const p: Record<string, string> = { sort_by: 'popularity.desc', include_adult: 'false' };
  if (opts.genre) p.with_genres = opts.genre;
  if (opts.lang) p.with_original_language = opts.lang;
  return list('/discover/movie', p);
}

// ---- Phase 3: cast, crew, trailers and similar movies ----
export type Cast = { id: number; name: string; character: string; profile_path: string | null };
export type Video = { key: string; name: string; site: string; type: string; official: boolean };
export type MovieFull = MovieDetails & {
  credits?: { cast: Cast[]; crew: { id: number; name: string; job: string }[] };
  videos?: { results: Video[] };
  similar?: { results: Movie[] };
};
export const getMovieFull = (id: string) =>
  get<MovieFull>(`/movie/${id}`, { append_to_response: 'credits,videos,similar', include_video_language: 'en,hi,null' });
