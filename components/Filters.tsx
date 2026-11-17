import Link from 'next/link';
import { LANGUAGES } from '@/lib/cities';
import { Genre } from '@/lib/tmdb';

function href(genre?: string, lang?: string) {
  const p = new URLSearchParams();
  if (genre) p.set('genre', genre);
  if (lang) p.set('lang', lang);
  const s = p.toString();
  return s ? `/?${s}#results` : '/';
}
const chip = (on: boolean) =>
  `whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition ${on ? 'border-red bg-red text-white' : 'border-line text-mu hover:border-red hover:text-tx'}`;

export default function Filters({ genres, genre, lang }: { genres: Genre[] | null; genre?: string; lang?: string }) {
  return (
    <section className="container-x space-y-3 py-6" aria-label="Filters">
      {genres && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link href={href(undefined, lang)} className={chip(!genre)}>All genres</Link>
          {genres.map((g) => (
            <Link key={g.id} href={href(String(g.id), lang)} className={chip(genre === String(g.id))}>{g.name}</Link>
          ))}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link href={href(genre, undefined)} className={chip(!lang)}>All languages</Link>
        {LANGUAGES.map((l) => (
          <Link key={l.code} href={href(genre, l.code)} className={chip(lang === l.code)}>{l.name}</Link>
        ))}
      </div>
    </section>
  );
}
