// Show times are always displayed in Indian Standard Time.
const TZ = 'Asia/Kolkata';
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
export const fmtDateTime = (iso: string) => `${fmtDay(iso)}, ${fmtTime(iso)}`;
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
export const money = (n: number | string) => `₹${Number(n).toLocaleString('en-IN')}`;
