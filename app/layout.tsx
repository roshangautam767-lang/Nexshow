import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Big_Shoulders_Display, Figtree } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { getRole, getUser } from '@/lib/auth';

const display = Big_Shoulders_Display({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'NexShow – Smart Movie Ticket Booking & Reward Platform',
  description: 'Discover movies, pick your seats, pay securely and earn Movie Coins on every booking.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = cookies().get('nx_city')?.value;
  const city = CITIES.find((c) => c === saved) ?? DEFAULT_CITY;
  const user = await getUser();
  const role = user ? await getRole(user.id) : null;
  const account = { loggedIn: Boolean(user), isAdmin: role === 'admin', isStaff: role === 'admin' || role === 'staff' };
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Navbar city={city} account={account} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
