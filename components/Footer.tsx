import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-panel">
      <div className="container-x grid gap-8 py-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-display text-3xl font-black">Nex<span className="text-red">Show</span></p>
          <p className="mt-2 max-w-md text-sm text-mu">
            Book movie tickets, collect Movie Coins and get your e-ticket in seconds.
          </p>
          <p className="mt-6 max-w-xl text-xs text-mu">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Movie information and images are provided by TMDB.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-mu md:items-start">
          <Link href="/info/about" className="hover:text-tx">About</Link>
          <Link href="/info/contact" className="hover:text-tx">Contact</Link>
          <Link href="/info/terms" className="hover:text-tx">Terms</Link>
          <Link href="/info/privacy" className="hover:text-tx">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
