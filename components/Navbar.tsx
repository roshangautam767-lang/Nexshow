'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { CITIES } from '@/lib/cities';

export default function Navbar({ city, account }: { city: string; account: { loggedIn: boolean; isAdmin: boolean } }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }
  function pickCity(c: string) {
    document.cookie = `nx_city=${c}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="container-x flex flex-wrap items-center gap-3 py-3">
        <Link href="/" className="font-display text-3xl font-black leading-none">
          Nex<span className="text-red">Show</span>
        </Link>

        <form onSubmit={onSearch} role="search" className="order-3 w-full md:order-none md:max-w-md md:flex-1">
          <label htmlFor="q" className="sr-only">Search movies</label>
          <input
            id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for movies"
            className="w-full rounded border border-line bg-panel px-4 py-2 text-sm placeholder:text-mu focus:border-red"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-5 text-sm text-mu lg:flex" aria-label="Main">
          <Link href="/#now-showing" className="hover:text-tx">Now showing</Link>
          <Link href="/#coming-soon" className="hover:text-tx">Coming soon</Link>
          <Link href="/theatres" className="hover:text-tx">Theatres</Link>
          <Link href="/#offers" className="hover:text-tx">Movie Coins</Link>
        </nav>

        <div className="ml-auto lg:ml-0">
          <label htmlFor="city" className="sr-only">City</label>
          <select
            id="city" value={city} onChange={(e) => pickCity(e.target.value)}
            className="rounded border border-line bg-panel px-3 py-2 text-sm"
          >
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {account.loggedIn ? (
            <>
              {account.isAdmin && <Link href="/admin" className="text-mu hover:text-tx">Admin</Link>}
              <Link href="/account" className="btn-ghost px-4 py-2">My account</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-mu hover:text-tx">Log in</Link>
              <Link href="/register" className="btn px-4 py-2">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
