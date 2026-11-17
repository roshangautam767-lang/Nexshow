'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type Slide = { id: number; title: string; overview: string; backdrop: string; rating: number };

export default function Hero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const s = slides[i];
  if (!s) return null;
  return (
    <section className="relative h-[70vh] min-h-[420px] overflow-hidden border-b border-line">
      <AnimatePresence mode="wait">
        <motion.div key={s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <Image src={s.backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/30 to-transparent" />
        </motion.div>
      </AnimatePresence>
      <div className="container-x relative flex h-full flex-col justify-end pb-14">
        <h1 className="max-w-3xl font-display text-5xl font-black leading-none sm:text-7xl">{s.title}</h1>
        <p className="mt-3 font-bold text-red2">★ {s.rating.toFixed(1)}</p>
        <p className="mt-2 line-clamp-3 max-w-xl text-mu">{s.overview}</p>
        <div className="mt-5 flex items-center gap-5">
          <Link href={`/movie/${s.id}`} className="btn">View details</Link>
          <div className="flex gap-2" role="group" aria-label="Choose featured movie">
            {slides.map((x, n) => (
              <button key={x.id} onClick={() => setI(n)} aria-label={`Show ${x.title}`} aria-current={n === i}
                className={`h-2.5 w-2.5 rounded-full ${n === i ? 'bg-red' : 'bg-mu/50'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
