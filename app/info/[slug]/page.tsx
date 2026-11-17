import { notFound } from 'next/navigation';

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: { title: 'About NexShow', body: [
    'NexShow is a movie ticket booking platform where you can discover movies, choose a theatre and show, pick your seats, pay securely and receive a digital ticket.',
    'Every confirmed booking also earns you Movie Coins, which you can use as a discount on future tickets.' ] },
  contact: { title: 'Contact', body: ['Contact details will be added before NexShow launches.'] },
  terms: { title: 'Terms of use', body: ['Draft: replace this page with reviewed terms and conditions before launch.'] },
  privacy: { title: 'Privacy policy', body: ['Draft: replace this page with a reviewed privacy policy before launch.'] },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default function Info({ params }: { params: { slug: string } }) {
  const page = PAGES[params.slug];
  if (!page) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="mb-6 font-display text-5xl font-black">{page.title}</h1>
      {page.body.map((p) => <p key={p} className="mb-4 text-mu">{p}</p>)}
    </div>
  );
}
