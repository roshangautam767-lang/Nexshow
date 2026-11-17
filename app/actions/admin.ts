'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CITIES } from '@/lib/cities';
import { getMovie } from '@/lib/tmdb';

const enc = encodeURIComponent;
const int = (v: FormDataEntryValue | null) => Number(String(v ?? '').trim());
const back = (path: string, kind: 'msg' | 'error', text: string) => redirect(`${path}?${kind}=${enc(text)}`);

export async function setRole(fd: FormData) {
  const me = await requireAdmin(); // every admin action re-checks the role on the server
  const id = String(fd.get('id') ?? '');
  const role = String(fd.get('role') ?? '');
  if (!['user', 'staff', 'admin'].includes(role)) back('/admin/users', 'error', 'Invalid role.');
  if (id === me.id) back('/admin/users', 'error', 'You cannot change your own role.');
  const { error } = await supabaseAdmin().from('profiles').update({ role }).eq('id', id);
  if (error) back('/admin/users', 'error', 'Could not update the role.');
  revalidatePath('/admin/users');
  back('/admin/users', 'msg', 'Role updated.');
}

export async function createCoupon(fd: FormData) {
  await requireAdmin();
  const code = String(fd.get('code') ?? '').trim().toUpperCase();
  const kind = String(fd.get('kind') ?? '');
  const value = int(fd.get('value'));
  const maxUsesRaw = String(fd.get('max_uses') ?? '').trim();
  const expiry = String(fd.get('expires') ?? '').trim();
  const P = '/admin/coupons';
  if (!/^[A-Z0-9]{3,20}$/.test(code)) back(P, 'error', 'Code must be 3 to 20 letters or numbers.');
  if (!Number.isFinite(value) || value <= 0) back(P, 'error', 'Enter a discount value greater than 0.');
  if (kind === 'percent' && value > 100) back(P, 'error', 'A percentage cannot be more than 100.');
  const max_uses = maxUsesRaw ? int(maxUsesRaw) : null;
  if (max_uses !== null && (!Number.isInteger(max_uses) || max_uses < 1)) back(P, 'error', 'Max uses must be a whole number of 1 or more.');
  const { error } = await supabaseAdmin().from('coupons').insert({
    code, percent_off: kind === 'percent' ? value : null, flat_off: kind === 'flat' ? value : null,
    max_uses, expires_at: expiry ? new Date(`${expiry}T23:59:59+05:30`).toISOString() : null,
  });
  if (error) back(P, 'error', error.code === '23505' ? 'That coupon code already exists.' : 'Could not create the coupon.');
  revalidatePath(P);
  back(P, 'msg', `Coupon ${code} created.`);
}

export async function toggleCoupon(fd: FormData) {
  await requireAdmin();
  const id = int(fd.get('id'));
  const active = String(fd.get('active')) === 'true';
  await supabaseAdmin().from('coupons').update({ active: !active }).eq('id', id);
  revalidatePath('/admin/coupons');
  redirect('/admin/coupons');
}

export async function updateCoinSettings(fd: FormData) {
  await requireAdmin();
  const v = {
    first_booking_coins: int(fd.get('first_booking_coins')), random_min: int(fd.get('random_min')),
    random_max: int(fd.get('random_max')), max_redeem_per_booking: int(fd.get('max_redeem_per_booking')),
    inr_per_coin: Number(String(fd.get('inr_per_coin') ?? '')),
  };
  const P = '/admin/coins';
  const whole = [v.first_booking_coins, v.random_min, v.random_max, v.max_redeem_per_booking].every((n) => Number.isInteger(n) && n >= 0);
  if (!whole) back(P, 'error', 'Coin amounts must be whole numbers, 0 or more.');
  if (v.random_max < v.random_min) back(P, 'error', 'The random maximum cannot be lower than the random minimum.');
  if (!(v.inr_per_coin > 0)) back(P, 'error', 'The value of 1 coin must be more than 0.');
  const { error } = await supabaseAdmin().from('coin_settings').update(v).eq('id', true);
  if (error) back(P, 'error', 'Could not save the settings.');
  revalidatePath(P);
  back(P, 'msg', 'Movie Coin settings saved.');
}

// ---------------- Phase 5: theatres, screens and shows ----------------
const SOURCES = ['admin', 'partner', 'demo'];
const FK = '23503'; // the database refuses to delete something that is still in use

export async function createTheatre(fd: FormData) {
  await requireAdmin();
  const name = String(fd.get('name') ?? '').trim();
  const address = String(fd.get('address') ?? '').trim();
  const city = String(fd.get('city') ?? '');
  const source = String(fd.get('source') ?? 'admin');
  const P = '/admin/theatres';
  if (name.length < 2 || name.length > 100) back(P, 'error', 'Enter the theatre name.');
  if (address.length < 5 || address.length > 200) back(P, 'error', 'Enter the theatre address.');
  if (!(CITIES as readonly string[]).includes(city)) back(P, 'error', 'Choose one of the listed cities.');
  if (!SOURCES.includes(source)) back(P, 'error', 'Choose a listing type.');
  const { data, error } = await supabaseAdmin().from('theatres').insert({ name, address, city, source }).select('id').single();
  if (error || !data) back(P, 'error', 'Could not create the theatre.');
  redirect(`/admin/theatres/${data!.id}?msg=${enc('Theatre created. Now add a screen.')}`);
}

export async function updateTheatre(fd: FormData) {
  await requireAdmin();
  const id = int(fd.get('id'));
  const name = String(fd.get('name') ?? '').trim();
  const address = String(fd.get('address') ?? '').trim();
  const city = String(fd.get('city') ?? '');
  const source = String(fd.get('source') ?? 'admin');
  const active = fd.get('active') === 'on';
  const P = `/admin/theatres/${id}`;
  if (name.length < 2 || address.length < 5) back(P, 'error', 'Name and address are required.');
  if (!(CITIES as readonly string[]).includes(city) || !SOURCES.includes(source)) back(P, 'error', 'Invalid city or listing type.');
  const db = supabaseAdmin();
  const { error } = await db.from('theatres').update({ name, address, city, source, active }).eq('id', id);
  if (error) back(P, 'error', 'Could not save the theatre.');
  const { data: screens } = await db.from('screens').select('id').eq('theatre_id', id); // keep its shows labelled the same way
  if (screens?.length) await db.from('shows').update({ source }).in('screen_id', screens.map((x: any) => x.id));
  back(P, 'msg', 'Theatre saved.');
}

export async function deleteTheatre(fd: FormData) {
  await requireAdmin();
  const id = int(fd.get('id'));
  const { error } = await supabaseAdmin().from('theatres').delete().eq('id', id);
  if (error) back(`/admin/theatres/${id}`, 'error', error.code === FK ? 'This theatre still has shows. Delete or turn off its shows first.' : 'Could not delete the theatre.');
  back('/admin/theatres', 'msg', 'Theatre deleted.');
}

export async function createScreen(fd: FormData) {
  await requireAdmin();
  const theatre = int(fd.get('theatre_id'));
  const name = String(fd.get('name') ?? '').trim();
  const P = `/admin/theatres/${theatre}`;
  if (name.length < 1 || name.length > 40) back(P, 'error', 'Enter a screen name, for example Screen 1.');
  const { error } = await supabaseAdmin().rpc('create_screen', {
    p_theatre: theatre, p_name: name, p_regular_rows: int(fd.get('regular_rows')), p_premium_rows: int(fd.get('premium_rows')),
    p_recliner_rows: int(fd.get('recliner_rows')), p_seats_per_row: int(fd.get('seats_per_row')),
  });
  if (error) {
    const m = error.message ?? '';
    back(P, 'error', m.includes('BAD_ROWS') ? 'Total rows must be between 1 and 26.' : m.includes('BAD_SEATS') ? 'Seats per row must be between 1 and 30.'
      : error.code === '23505' ? 'This theatre already has a screen with that name.' : 'Could not create the screen. Did you run phase5.sql?');
  }
  back(P, 'msg', `${name} created with its seats.`);
}

export async function deleteScreen(fd: FormData) {
  await requireAdmin();
  const id = int(fd.get('id'));
  const P = `/admin/theatres/${int(fd.get('theatre_id'))}`;
  const { error } = await supabaseAdmin().from('screens').delete().eq('id', id);
  if (error) back(P, 'error', error.code === FK ? 'This screen still has shows. Delete or turn off its shows first.' : 'Could not delete the screen.');
  back(P, 'msg', 'Screen deleted.');
}

export async function createShow(fd: FormData) {
  await requireAdmin();
  const P = '/admin/shows';
  const tmdbId = int(fd.get('other_tmdb') || fd.get('tmdb_id'));
  const screenId = int(fd.get('screen_id'));
  const starts = String(fd.get('starts') ?? '').trim();
  const price = { regular: Number(fd.get('price_regular') || 0), premium: Number(fd.get('price_premium') || 0), recliner: Number(fd.get('price_recliner') || 0) };
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) back(P, 'error', 'Choose a movie.');
  if (!Number.isInteger(screenId) || screenId <= 0) back(P, 'error', 'Choose a screen.');
  const when = new Date(`${starts}:00+05:30`); // the form time is Indian Standard Time
  if (!starts || Number.isNaN(when.getTime())) back(P, 'error', 'Choose the show date and time.');
  if (Object.values(price).some((p) => !Number.isFinite(p) || p < 0)) back(P, 'error', 'Prices cannot be negative.');

  const db = supabaseAdmin();
  const { data: cats } = await db.from('seats').select('category').eq('screen_id', screenId);
  const present = new Set((cats ?? []).map((c: any) => c.category as keyof typeof price));
  if (present.size === 0) back(P, 'error', 'That screen has no seats.');
  for (const c of Array.from(present)) if (!(price[c] > 0)) back(P, 'error', `Set a price above 0 for ${c} seats, because this screen has them.`);

  const m = await getMovie(String(tmdbId));
  if (!m) back(P, 'error', 'Could not load that movie from TMDB. Check the ID.');
  const { data: row } = await db.from('movies').upsert({
    tmdb_id: m!.id, title: m!.title, overview: m!.overview, poster_path: m!.poster_path, backdrop_path: m!.backdrop_path,
    release_date: m!.release_date || null, runtime_min: m!.runtime, language: m!.original_language,
    genres: m!.genres.map((g) => g.name), rating: m!.vote_average,
  }, { onConflict: 'tmdb_id' }).select('id').single();
  if (!row) back(P, 'error', 'Could not save the movie.');

  const { error } = await db.rpc('create_show', {
    p_movie: row!.id, p_screen: screenId, p_starts: when.toISOString(),
    p_price_regular: price.regular, p_price_premium: price.premium, p_price_recliner: price.recliner,
  });
  if (error) {
    const msg = error.message ?? '';
    back(P, 'error', msg.includes('SHOW_OVERLAP') ? 'Another show on this screen overlaps that time.' : msg.includes('SHOW_IN_PAST') ? 'The show time must be in the future.'
      : error.code === '23505' ? 'A show already starts at that time on this screen.' : 'Could not create the show. Did you run phase5.sql?');
  }
  back(P, 'msg', `Show created for ${m!.title}. Its seats are ready.`);
}

export async function toggleShow(fd: FormData) {
  await requireAdmin();
  await supabaseAdmin().from('shows').update({ active: String(fd.get('active')) !== 'true' }).eq('id', int(fd.get('id')));
  redirect('/admin/shows');
}

export async function deleteShow(fd: FormData) {
  await requireAdmin();
  const { error } = await supabaseAdmin().from('shows').delete().eq('id', int(fd.get('id')));
  if (error) back('/admin/shows', 'error', error.code === FK ? 'This show has bookings, so it cannot be deleted. Turn it off instead.' : 'Could not delete the show.');
  back('/admin/shows', 'msg', 'Show deleted.');
}
