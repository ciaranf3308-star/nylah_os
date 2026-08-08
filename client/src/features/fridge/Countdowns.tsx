import { useMemo } from "react";
import type { TabKey, CalendarEventV2 } from "../../types";
import { HOUSEHOLD_TZ, toLocalKey as toLocalKeyDublin } from "../../lib/dates";
import { getKindDef, inferKindFromTitle } from "../../lib/eventTypes";
import EventIcon from "../../components/EventIcon";

type Props = {
  calendar: CalendarEventV2[];
  nowMs: number;
  todayDateStr?: string;
  setTab: (k: TabKey) => void;
};

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
        {pinnedEvents.slice(0,2).map((ev:any)=>{
          const {days, overdue} = dueDiff(ev.dueAt);
          const absDays = Math.abs(days);
          const kindId = ((ev as any).kind || (ev as any).eventKind || inferKindFromTitle(ev.title||"") || "other") as string;
          const def = getKindDef(kindId);
          const pal = def.light;
          return (
            <button key={ev.id} onClick={()=> setTab("calendar")} className="group w-full text-left rounded-[24px] border bg-[#FFFEFB] px-5 pt-4 pb-5 min-h-[172px] relative overflow-hidden shadow-[0_12px_32px_rgba(60,40,20,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] hover:shadow-[0_18px_42px_rgba(60,40,20,0.16)] hover:-translate-y-[0.5px] transition-all text-left" style={{borderColor:"#E8DDD3"}}>
              {/* pill */}
              <div className="flex items-start justify-between relative z-[2]">
                <span className="inline-flex h-[28px] items-center rounded-full px-3.5 text-[12px] font-[700] tracking-[-0.01em] border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                  style={{ background: overdue ? "#FEE2E2" : `${pal.bg}`, color: overdue ? "#B91C1C" : pal.fg, borderColor: overdue ? "#FECACA" : `${pal.fg}22` }}>
                  {overdue ? `${absDays}d ago` : `${absDays}d left`}
                </span>
                <span className="h-[8px] w-[8px] rounded-full mt-2 mr-1 transition-all" style={{ background: overdue ? "#EF4444" : "#F59E4B", boxShadow: overdue ? "0 0 0 4px rgba(239,68,68,0.18)" : "0 0 0 4px rgba(245,158,75,0.18)" }}/>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5 relative z-[2]">
                <span className="text-[54px] font-[850] tracking-[-0.04em] text-[#12100E] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]" style={{fontFamily:'Fraunces, serif', lineHeight:0.9}}>{overdue ? `0` : `${absDays}`}</span>
                <span className="text-[13px] font-[600] text-[#7C756E]">{overdue ? "overdue" : "days"}</span>
              </div>

              <div className="mt-1 text-[15.5px] font-[700] text-[#191410] truncate pr-[124px] relative z-[2]" style={{fontFamily:'Fraunces, serif', letterSpacing:"-0.015em"}}>{ev.title}</div>
              <div className="mt-0.5 text-[12.5px] font-[500] text-[#8E867F] pr-[124px] relative z-[2] flex items-center gap-1.5">
                <EventIcon kind={def.id} title={ev.title} size={24} theme="light" variant="inline" />
                {fmtDay(ev.dueAt)}{(ev as any).location ? ` • ${(ev as any).location}` : ""}
              </div>

              {/* large crisp boutique illustration — breaks out overlay edge with shadow */}
              <div className="pointer-events-none absolute right-[-12px] bottom-[-14px] rotate-[-5deg] select-none group-hover:rotate-[-3deg] group-hover:scale-[1.02] transition-transform duration-500">
                <div className="relative" style={{ width:164, height:164 }}>
                  {/* warm wash blob behind */}
                  <div className="absolute inset-[14px] rounded-[32px] rotate-[8deg]" style={{ background:`radial-gradient(120% 90% at 35% 30%, white 0%, ${pal.bg} 48%, ${pal.chipBg||pal.bg} 82%)`, opacity:0.88, filter:"blur(0.2px)" }} />
                  {/* illustration */}
                  <div className="relative w-full h-full grid place-items-center" style={{ filter:"drop-shadow(0 14px 22px rgba(80,45,18,0.14)) drop-shadow(0 2px 6px rgba(80,45,18,0.08))" }}>
                    <EventIcon kind={def.id} title={ev.title} size={164} variant="watermark" theme="light" />
                  </div>
                </div>
              </div>

              {/* subtle grain cut */}
              <div className="pointer-events-none absolute inset-0 rounded-[24px] opacity-[0.015]" style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.95' numOctaves='1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}/>
            </button>
          )
        })}
      </div>
    </div>
  );
}
