export function uid(p = "id") { return p + "_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now().toString(36); }
export function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff; return h; }
export function rotForId(id: string) { const h = hashId(id); return (h % 14) - 7; }
export function relTime(iso: string, nowMs: number) {
  try {
    const diff = nowMs - new Date(iso).getTime();
    const sec = Math.floor(diff/1000);
    if (sec < 60) return "now";
    const min = Math.floor(sec/60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min/60);
    if (hr < 24) return `${hr}h`;
    const d = Math.floor(hr/24);
    return `${d}d`;
  } catch { return ""; }
}
export const HOUSEHOLD_TZ = "Europe/Dublin";
export function todayKey(tz: string) {
  try { return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); } catch { return new Date().toISOString().slice(0,10); }
}
export function toLocalKeyDublin(iso: string, tz: string) {
  try { return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso)); } catch { return iso.slice(0,10); }
}
export function tzWallToUtc(y:number,m:number,d:number,h:number,mi:number,s:number,tz:string){
  try { return new Date(Date.UTC(y,m-1,d,h,mi,s)); } catch { return new Date(Date.UTC(y,m-1,d,h,mi,s)); }
}
export function getDueMsChore(c:any){ try{ return c.dueAt? new Date(c.dueAt).getTime(): Date.now(); }catch{ return Date.now(); } }
export function fmtTimeDublin(iso:string, tz:string){
  try { return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: tz}).format(new Date(iso)) } catch { try{ return new Date(iso).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}) }catch{ return "" } }
}
