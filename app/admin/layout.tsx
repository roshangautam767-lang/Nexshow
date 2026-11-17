import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

const links = [
  { href: '/admin', label: 'Overview' }, { href: '/admin/theatres', label: 'Theatres' }, { href: '/admin/shows', label: 'Shows' }, { href: '/admin/users', label: 'Users' },
  { href: '/admin/coupons', label: 'Coupons' }, { href: '/admin/coins', label: 'Movie Coin settings' }, { href: '/staff/verify', label: 'Verify tickets' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-x grid gap-8 py-10 md:grid-cols-[220px_1fr]">
      <aside>
        <h2 className="mb-3 font-display text-3xl font-black">Admin</h2>
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Admin">
          {links.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap rounded border border-line bg-panel px-3 py-2 text-sm hover:border-red">{l.label}</Link>)}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
