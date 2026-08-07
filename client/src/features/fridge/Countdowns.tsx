import { useMemo } from "react";
import type { TabKey, CalendarEventV2 } from "../../types";
import { HOUSEHOLD_TZ, toLocalKey as toLocalKeyDublin } from "../../lib/dates";
import { inferKindFromTitle } from "../../lib/eventTypes";

type Props = {
  calendar: CalendarEventV2[];
  nowMs: number;
  todayDateStr?: string;
  setTab: (k: TabKey) => void;
};

function IconFootballMuted() {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#E6C8B2" strokeWidth="1.15" strokeLinecap="round" opacity={0.72}>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M12 4.5v2.6M19.2 12H16.6M12 19.5v-2.6M4.8 12h2.6M6.5 6.5l1.9 1.9M17.5 6.5l-1.9 1.9M17.5 17.5l-1.9-1.9M6.5 17.5l1.9-1.9" />
    </svg>
  );
}

export default function Countdowns({ calendar, nowMs, todayDateStr, setTab }: Props) {
  const computedToday = todayDateStr || (()=>{ try{ return new Intl.DateTimeFormat("en-CA",{timeZone:HOUSEHOLD_TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(nowMs)); }catch{ return new Date(nowMs).toISOString().slice(0,10);} })();

  const activeCalendar = useMemo(() => (calendar as any[]).filter((ev:any)=> !(ev as any).deletedAt), [calendar]);

  const fmtDay = (iso:string) => {
    try {
      const d = new Date(iso);
      const wd = new Intl.DateTimeFormat('en-GB',{weekday:'short', timeZone:HOUSEHOLD_TZ}).format(d);
      const mnDay = new Intl.DateTimeFormat('en-GB',{month:'short', day:'numeric', timeZone:HOUSEHOLD_TZ}).format(d);
      const t = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit', timeZone:HOUSEHOLD_TZ} as any).format(d);
      return `${wd} ${mnDay.replace(',','')} • ${t}`;
    } catch { return "" }
  };
  const dueDiff = (iso:string) => {
    try{
      const dueMs = new Date(iso).getTime();
      const diffMs = dueMs - nowMs;
      const days = Math.ceil(diffMs / 86400000);
      return { diffMs, days, overdue: diffMs<0 };
    }catch{ return { diffMs:0, days:0, overdue:false } }
  };

  const pinnedEvents = useMemo(()=>{
    const pins = (activeCalendar as any[]).filter((ev:any)=> ev.pinned_at || ev.pinnedAt || ev.isPinned || ev.pinned).sort((a:any,b:any)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,2);
    if(pins.length>0) return pins;
    // fallback: nearest agreed future event in 14d to show countdown demo like reference
    const in14 = nowMs + 14*86400000;
    const nearest = (activeCalendar as any[]).filter((ev:any)=>{
      const s:any=ev.status;
      if(!(s==='agreed'||s==='accepted'||s==='yes'||s==='confirmed'||s==='proposed')) return false;
      const ms=new Date(ev.dueAt).getTime();
      return ms>nowMs && ms<=in14;
    }).sort((a:any,b:any)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,1);
    return nearest as any[];
  },[activeCalendar, nowMs]);

  if (pinnedEvents.length===0) return null;

  return (
    <div className="space-y-3">
      <div className="px-1 flex items-center gap-2">
        <span className="text-[22px] font-[750] tracking-[-0.02em] text-[#17110E]" style={{fontFamily:'Fraunces, serif'}}>Pinned & countdowns</span>
        <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[#EDE2D6] bg-[#FFFEFB] text-[#8B6453] text-[12px]">☆</span>
      </div>

      <div className="space-y-3">
        {pinnedEvents.slice(0,1).map((ev:any)=>{
          const {days, overdue} = dueDiff(ev.dueAt);
          const absDays = Math.abs(days);
          const kind = (ev as any).kind || (ev as any).eventKind || inferKindFromTitle(ev.title||"") || "sports";
          const isSports = (kind||"").toLowerCase()==="sports" || /united/.test((ev.title||"").toLowerCase());
          return (
            <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left rounded-[22px] border bg-[#FFFEFB] px-5 pt-4 pb-5 min-h-[148px] relative overflow-hidden shadow-[0_6px_18px_rgba(60,40,20,0.08)] hover:shadow-[0_10px_26px_rgba(60,40,20,0.12)] transition" style={{borderColor:"#EDE2D6"}}>
              {/* top pill */}
              <div className="flex items-start justify-between">
                <span className="inline-flex h-[28px] items-center rounded-full bg-[#FCE3D8] px-3.5 text-[12px] font-[650] text-[#C06A32] tracking-[-0.01em] border border-[#F1CAB0]">{absDays}d left</span>
                <span className="h-[8px] w-[8px] rounded-full bg-[#F59E4B] mt-2 mr-1" />
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[54px] font-[800] tracking-[-0.04em] text-[#12100E]" style={{fontFamily:'Fraunces, serif', lineHeight:0.9}}>{absDays}</span>
                <span className="text-[13px] font-[500] text-[#7C756E]">days</span>
              </div>

              <div className="mt-1 text-[14px] font-[650] text-[#191410] truncate" style={{fontFamily:'Fraunces, serif'}}>{ev.title}</div>
              <div className="mt-0.5 text-[12px] text-[#8E867F]">{fmtDay(ev.dueAt)}</div>

              {isSports && <div className="pointer-events-none absolute right-[-6px] bottom-[-10px] opacity-[0.22]"><IconFootballMuted/></div>}
            </button>
          )
        })}
      </div>
    </div>
  );
}
