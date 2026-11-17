'use client';
import { useEffect, useRef, useState } from 'react';
import { admitTicket, lookupTicket, LookupResult } from '@/app/actions/staff';
import { dayKey, fmtDateTime } from '@/lib/format';

export default function TicketVerifier() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [info, setInfo] = useState<LookupResult | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const current = useRef('');

  async function check(raw: string) {
    setBusy(true); setOutcome(null); setCamError(null);
    current.current = raw;
    setInfo(await lookupTicket(raw));
    setBusy(false);
  }
  async function admit() {
    setBusy(true);
    const r = await admitTicket(current.current);
    setOutcome(r.result === 'accepted' ? 'Admitted. This ticket is now marked as used.' : r.result === 'already_used' ? 'Already used. Do not admit.' : 'Invalid ticket. Do not admit.');
    setInfo(await lookupTicket(current.current));
    setBusy(false);
  }

  useEffect(() => {
    if (!scanning) return;
    let scanner: any;
    let stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => { if (!stopped) { stopped = true; setScanning(false); setCode(text); check(text); } }, () => {});
      } catch {
        setScanning(false);
        setCamError('The camera could not be opened. Allow camera access, or type the code instead.');
      }
    })();
    return () => { stopped = true; if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {}); };
  }, [scanning]);

  const t = info && info.ok ? info.ticket : null;
  const otherDay = t ? dayKey(t.startsAt) !== dayKey(new Date().toISOString()) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setScanning((v) => !v)} className="btn">{scanning ? 'Stop camera' : 'Scan with camera'}</button>
      </div>
      {scanning && <div id="qr-reader" className="max-w-sm overflow-hidden rounded border border-line" />}
      {camError && <p role="alert" className="text-sm text-red2">{camError}</p>}

      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) check(code); }} className="flex max-w-md gap-2">
        <label className="sr-only" htmlFor="code">Ticket code or booking ID</label>
        <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Booking ID or ticket code"
          className="flex-1 rounded border border-line bg-panel px-3 py-2 focus:border-red" autoComplete="off" />
        <button className="btn-ghost" disabled={busy}>Check</button>
      </form>

      {info && !info.ok && <p role="alert" className="rounded border border-red bg-panel p-4 text-red2">{info.error}</p>}
      {t && (
        <div className="max-w-md space-y-2 rounded-md border border-line bg-panel p-5">
          <p className={`text-lg font-bold ${t.used ? 'text-red2' : ''}`}>{t.used ? 'Already used' : 'Valid ticket'}</p>
          <p className="font-bold">{t.movie}</p>
          <p className="text-sm text-mu">{t.theatre} · {t.screen}</p>
          <p className="text-sm">{fmtDateTime(t.startsAt)}</p>
          <p className="text-sm">Seats: <span className="font-bold">{t.seats.join(', ')}</span></p>
          <p className="text-sm text-mu">Booking ID {t.ref}</p>
          {otherDay && !t.used && <p className="text-sm text-red2">Note: this ticket is for a different day.</p>}
          {!t.used && <button onClick={admit} disabled={busy} className="btn mt-2 w-full">Admit</button>}
          {outcome && <p role="status" className="pt-2 font-bold">{outcome}</p>}
        </div>
      )}
    </div>
  );
}
