'use client';
import { useState } from 'react';

export default function Trailer({ videoKey, title }: { videoKey: string; title: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-line bg-panel">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button onClick={() => setPlay(true)} aria-label={`Play ${title} trailer`} className="group absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://img.youtube.com/vi/${videoKey}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-red text-2xl text-white shadow-lg">▶</span>
          </span>
        </button>
      )}
    </div>
  );
}
