'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CITIES } from '@/lib/cities';
import { getMovie } from '@/lib/tmdb';

const enc = encodeURIComponent;
const PHONE = /^\+?[0-9]{10,15}$/;

export async function updateProfile(fd: FormData) {
  const user = await requireUser();
  const full_name = String(fd.get('full_name') ?? '').trim();
  const phone = String(fd.get('phone') ?? '').replace(/[\s-]/g, '');
  const city = String(fd.get('city') ?? '');
  const whatsapp_consent = fd.get('whatsapp_consent') === 'on';
  const fail = (m: string) => redirect(`/account?error=${enc(m)}`);
  if (full_name.length < 2 || full_name.length > 80) fail('Please enter your name.');
  if (phone && !PHONE.test(phone)) fail('Enter a valid phone number, for example +919876543210.');
  if (city && !(CITIES as readonly string[]).includes(city)) fail('Please choose one of the listed cities.');
  if (whatsapp_consent && !phone) fail('Add a phone number to receive tickets on WhatsApp.');

  // Only these four fields can be changed here. The role can never be set from this form.
  const { error } = await supabaseAdmin().from('profiles')
    .update({ full_name, phone: phone || null, city: city || null, whatsapp_consent }).eq('id', user.id);
  if (error) fail('Could not save your profile. Please try again.');
  revalidatePath('/account');
  redirect(`/account?msg=${enc('Profile saved.')}`);
}

export async function toggleFavourite(fd: FormData) {
  const tmdbId = Number(fd.get('tmdbId'));
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
  const user = await requireUser(`/movie/${tmdbId}`);
  const m = await getMovie(String(tmdbId));
  if (!m) return;
  const db = supabaseAdmin();
  const { data: row } = await db.from('movies').upsert({
    tmdb_id: m.id, title: m.title, overview: m.overview, poster_path: m.poster_path, backdrop_path: m.backdrop_path,
    release_date: m.release_date || null, runtime_min: m.runtime, language: m.original_language,
    genres: m.genres.map((g) => g.name), rating: m.vote_average,
  }, { onConflict: 'tmdb_id' }).select('id').single();
  if (!row) return;
  const { data: existing } = await db.from('favourites').select('movie_id').eq('user_id', user.id).eq('movie_id', row.id).maybeSingle();
  if (existing) await db.from('favourites').delete().eq('user_id', user.id).eq('movie_id', row.id);
  else await db.from('favourites').insert({ user_id: user.id, movie_id: row.id });
  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath('/account');
}
