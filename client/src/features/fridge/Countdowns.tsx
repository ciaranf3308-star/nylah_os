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

function IconFootballMutedLarge() {
  return (
    <svg width="164" height="164" viewBox="0 0 24 24" fill="none" stroke="#D9A88B" strokeWidth="0.95" strokeLinecap="round" strokeLinejoin="round" opacity={0.52}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.4v2.8M20.6 12H17.8M12 20.6v-2.8M3.4 12h2.8M6.1 6.1l2 2M17.9 6.1l-2 2M17.9 17.9l-2-2M6.1 17.9l2-2" />
    </svg>
  );
}
function IconFootballMuted() {
  return <IconFootballMutedLarge />
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
    return pins;
  },[activeCalendar]);

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
            <button key={ev.id} onClick={()=> setTab("calendar")} className="group w-full text-left rounded-[22px] border bg-[#FFFEFB] px-5 pt-4 pb-5 min-h-[172px] relative overflow-hidden shadow-[0_12px_32px_rgba(60,40,20,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] hover:shadow-[0_16px_38px_rgba(60,40,20,0.16)] transition-all" style={{borderColor:"#EDE2D6"}}>
              {/* top pill - tangerine */}
              <div className="flex items-start justify-between relative z-[2]">
                <span className="inline-flex h-[28px] items-center rounded-full bg-[#FCE3D8] px-3.5 text-[12px] font-[700] text-[#C06A32] tracking-[-0.01em] border border-[#F1CAB0] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]">{overdue ? `${absDays}d ago` : `${absDays}d left`}</span>
                <span className="h-[8px] w-[8px] rounded-full bg-[#F59E4B] mt-2 mr-1 shadow-[0_0_0_4px_rgba(245,158,75,0.18)] group-hover:shadow-[0_0_0_6px_rgba(245,158,75,0.22)] transition" />
              </div>

              <div className="mt-3 flex items-baseline gap-1.5 relative z-[2]">
                <span className="text-[54px] font-[850] tracking-[-0.04em] text-[#12100E] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]" style={{fontFamily:'Fraunces, serif', lineHeight:0.9}}>{overdue ? `0` : `${absDays}`}</span>
                <span className="text-[13px] font-[600] text-[#7C756E]">{overdue ? "overdue" : "days"}</span>
              </div>

              <div className="mt-1 text-[15px] font-[700] text-[#191410] truncate pr-[118px] relative z-[2]" style={{fontFamily:'Fraunces, serif'}}>{ev.title}</div>
              <div className="mt-0.5 text-[12.5px] font-[500] text-[#8E867F] pr-[118px] relative z-[2]">{fmtDay(ev.dueAt)} {(ev as any).location ? ` • ${(ev as any).location}` : ""}</div>

              {/* large crisp washed illustration – 164px */}
              <div className="pointer-events-none absolute right-[-10px] bottom-[-10px] rotate-[-6deg] select-none">
                <div className="relative" style={{ width:164, height:164, filter: "drop-shadow(0 14px 20px rgba(100,60,20,0.12))" }}>
                  <div className="absolute inset-[10px] rounded-full blur-[0.2px]" style={{ background:"radial-gradient(120% 90% at 35% 30%, #FFF8F0 0%, #FBE7CF 42%, #F7D9B6 78%)", opacity:0.78 }} />
                  <div className="relative grid place-items-center w-full h-full"><IconFootballMuted/></div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
