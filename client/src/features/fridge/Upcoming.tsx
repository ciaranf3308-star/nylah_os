import { useMemo } from "react";
import type { PersonKey, TabKey, ChoreV2, CalendarEventV2, ShoppingItemV2 } from "../../types";
import { HOUSEHOLD_TZ, toLocalKey as toLocalKeyDublin } from "../../lib/dates";
import { inferKindFromTitle } from "../../lib/eventTypes";
import { getKindDef } from "../../lib/eventTypes";
import EventIcon from "../../components/EventIcon";

type Props = {
  currentUser: PersonKey;
  calendar: CalendarEventV2[];
  chores: ChoreV2[];
  shopping: ShoppingItemV2[];
  nowMs: number;
  todayDateStr: string;
  setTab: (k: TabKey) => void;
};

function getBubble(k: string) {
  const def = getKindDef(k);
  const pal = def.light;
  return { bg: pal.bg, fg: pal.fg, border: pal.chipBg || pal.bg, kind: def.id };
}

export default function Upcoming({ currentUser, calendar, chores, shopping, nowMs, todayDateStr, setTab }: Props) {
  const activeCalendar = useMemo(() => (calendar as any[]).filter((ev:any) => !(ev as any).deletedAt), [calendar]);

  const fmtTime = (iso: string) => {
    try { return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: HOUSEHOLD_TZ} as any).format(new Date(iso)) } catch { try{ return new Date(iso).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}) }catch{ return "" } }
  };
  const fmtDayShort = (iso:string) => {
    try {
      const d = new Date(iso);
      const key = toLocalKeyDublin(iso, HOUSEHOLD_TZ);
      const isToday = key===todayDateStr;
      if(isToday) return `Today • ${fmtTime(iso)}`;
      const tomorrowKey = toLocalKeyDublin(new Date(nowMs+86400000).toISOString(), HOUSEHOLD_TZ);
      if(key===tomorrowKey) return `Tomorrow • ${fmtTime(iso)}`;
      const wd = new Intl.DateTimeFormat('en-GB',{weekday:'short', timeZone: HOUSEHOLD_TZ}).format(d);
      const mn = new Intl.DateTimeFormat('en-GB',{month:'short', day:'numeric', timeZone: HOUSEHOLD_TZ}).format(d);
      return `${wd} ${mn.replace(',','')} • ${fmtTime(iso)}`;
    } catch { return "" }
  };

  const upcoming = useMemo(()=>{
    const in7 = nowMs + 7*86400000;
    const agreed = (activeCalendar as any[]).filter(ev=>{
      const s:any=ev.status;
      if(!(s==='agreed'||s==='accepted'||s==='yes'||s==='confirmed'||s==='proposed'||(s||'').toString().startsWith('awaiting'))) return false;
      try{
        const ms = new Date(ev.dueAt).getTime();
        if(isNaN(ms)) return false;
        if(ms <= nowMs) return false;
        if(ms > in7) return false;
        const k = toLocalKeyDublin(ev.dueAt, HOUSEHOLD_TZ);
        if(k===todayDateStr) return false;
        return true;
      }catch{return false}
    }).sort((a:any,b:any)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,3);
    return agreed;
  },[activeCalendar, nowMs, todayDateStr]);

  if (upcoming.length===0) return null;

  return (
    <div className="space-y-2.5">
      <div className="px-1 flex items-center justify-between">
        <span className="text-[22px] font-[750] tracking-[-0.02em] text-[#17110E]" style={{ fontFamily:"Fraunces, serif" }}>Upcoming • {upcoming.length}</span>
        <button onClick={()=> setTab("calendar")} className="text-[12px] tracking-[-0.01em] underline underline-offset-2 text-[#7C746E] min-h-[44px] px-2">View all →</button>
      </div>

      <div className="rounded-[28px] border bg-[#FFFEFB] overflow-hidden shadow-[0_10px_32px_rgba(60,40,20,0.10),0_2px_0_rgba(255,255,255,0.9)_inset]" style={{ borderColor:"#E8DDD3" }}>
        {upcoming.map((ev:any, idx:number)=>{
          const kind = (ev as any).kind || (ev as any).eventKind || inferKindFromTitle(ev.title||"") || "friends";
          const bubble = getBubble(kind);
          const isAisling = (()=> {
            const at = (ev as any).attendees as string[]|undefined;
            if (!at) return (ev as any).ownerId==="aisling" || (ev as any).person==="aisling";
            if (at.length===1) return at[0]==="aisling";
            return at.includes("aisling") && !at.includes("ciaran");
          })();
          return (
            <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-center gap-3.5 px-4 py-4 min-h-[74px] hover:bg-[#FFF6EF]/70 transition group" style={{ borderTop: idx===0?undefined:"1px solid #F2E6D8" }}>
              {/* beautiful boutique bubble — breaks out slightly */}
              <span className="h-[48px] w-[48px] shrink-0 grid place-items-center rounded-full border shadow-sm group-active:scale-[0.97] transition" 
                style={{ 
                  background: `radial-gradient(120% 90% at 30% 20%, white 0%, ${bubble.bg} 42%)`,
                  borderColor:"rgba(0,0,0,0.06)",
                  boxShadow:"0 2px 10px rgba(60,30,10,0.10), inset 0 1px 0 white"
                }}>
                <EventIcon kind={bubble.kind} size={32} theme="light" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-[650] text-[#19140F] truncate" style={{ fontFamily:"Fraunces, serif", letterSpacing:"-0.015em" }}>{ev.title}</div>
                <div className="mt-0.5 text-[12px] text-[#8B847D] flex items-center gap-1.5" style={{ fontFamily:"Inter, sans-serif" }}>
                  <span className="inline-flex h-1 w-1 rounded-full" style={{background:bubble.fg, opacity:0.6}}/>
                  {fmtDayShort(ev.dueAt)}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-1">
                {isAisling && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#8D7AD6] text-[11px] font-bold text-white shadow-sm ring-2 ring-white">A</span>
                )}
                <span className="text-[#A69E95] group-hover:text-[#5A524B] transition"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 3l5 5-5 5"/></svg></span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
