import { cookies } from 'next/headers';
import { ShowChips, SourceBadge } from '@/components/ShowList';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { groupBy, upcomingShows } from '@/lib/shows';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function TheatresPage() {
  const saved = cookies().get('nx_city')?.value;
  const city = CITIES.find((c) => c === saved) ?? DEFAULT_CITY;
  const [{ data: theatres, error }, shows] = await Promise.all([
    supabaseAdmin().from('theatres').select('id,name,address,source').eq('city', city).eq('active', true).order('name'),
    upcomingShows(city, { days: 7 }),
  ]);
  return (
    <div className="container-x py-10">
      <h1 className="mb-1 font-display text-5xl font-black">Theatres in {city}</h1>
      <p className="mb-6 text-mu">Shows for the next 7 days. Change your city from the menu at the top.</p>
      {error || shows === null ? <p className="notice">Theatres could not be loaded right now. Please try again in a moment.</p>
        : (theatres ?? []).length === 0 ? <p className="notice">No theatres have been added in {city} yet.</p>
        : (
          <div className="space-y-6">
            {(theatres ?? []).map((t: any) => {
              const mine = shows.filter((s) => s.theatre.id === t.id);
              return (
                <section key={t.id} className="rounded-md border border-line bg-panel p-5">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-3xl font-black">{t.name}</h2><SourceBadge source={t.source} /></div>
                  <p className="mb-4 text-sm text-mu">{t.address}</p>
                  {mine.length === 0 ? <p className="text-sm text-mu">No upcoming shows.</p> : (
                    <div className="space-y-5">
                      {Array.from(groupBy(mine, (s) => String(s.movie.tmdb_id)).values()).map((list) => (
                        <div key={list[0].movie.tmdb_id}>
                          <h3 className="mb-2 text-lg font-bold">{list[0].movie.title}</h3>
                          <ShowChips shows={list} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
    </div>
  );
}
