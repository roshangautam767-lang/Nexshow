'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Countdown({ expiresAt, label }: { expiresAt: string; label: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(t); router.refresh(); }
    };
    const t = setInterval(tick, 1000);
    tick();
    return () => clearInterval(t);
  }, [expiresAt, router]);
  const text = left === null ? '--:--' : `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  return <p role="timer" className="inline-block rounded border border-red bg-panel px-4 py-2 text-sm">{label} <span className="font-bold text-red2">{text}</span></p>;
}
