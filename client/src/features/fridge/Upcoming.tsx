import { useMemo } from "react";
import type { PersonKey, TabKey, ChoreV2, CalendarEventV2, ShoppingItemV2 } from "../../types";
import { HOUSEHOLD_TZ, toLocalKey as toLocalKeyDublin, tzWallToUtc } from "../../lib/dates";
import { getDueMsChore } from "../../shared/utils/helpers";
import { computeShoppingNextDue } from "../../lib/shoppingDue";
import { inferKindFromTitle, type EventKind } from "../../lib/eventTypes";

type Props = {
  currentUser: PersonKey;
  calendar: CalendarEventV2[];
  chores: ChoreV2[];
  shopping: ShoppingItemV2[];
  nowMs: number;
  todayDateStr: string;
  setTab: (k: TabKey) => void;
};

function IconFriends({stroke}:{stroke:string}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.2" cy="7.8" r="2.6" />
      <path d="M4.2 19c.5-2.9 2.5-5 5-5s4.5 2.1 5 5" />
      <circle cx="17.2" cy="9.2" r="1.7" />
      <path d="M18.8 19c.2-1.6-.6-2.9-1.8-3.6" opacity={0.85}/>
    </svg>
  );
}
function IconFootball({stroke}:{stroke:string}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0" />
      <path d="M12 4.4v2.8M19 12h-2.8M12 19.6v-2.8M5 12h2.8M6.6 6.6l2 2M17.4 6.6l-2 2M17.4 17.4l-2-2M6.6 17.4l2-2" />
    </svg>
  );
}
function IconPlane({stroke}:{stroke:string}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11l15.8-4.6a.6.6 0 0 1 .8.7L14.9 20a.6.6 0 0 1-1 .3l-2.4-3.6-3.1 2.1a.6.6 0 0 1-.9-.4l-.3-3.8L18 7.2" />
    </svg>
  );
}
function getBubble(k: EventKind | string) {
  const key = (k||"").toLowerCase();
  if (key === "sports") return { bg:"#F9DCC0", fg:"#8D5A3E", border:"#E8C5A6", Icon: (p:any)=> <IconFootball stroke={p.fg}/> };
  if (key === "friends") return { bg:"#DDE8DC", fg:"#5A6F64", border:"#C4D5CC", Icon: (p:any)=> <IconFriends stroke={p.fg}/> };
  if (key === "family") return { bg:"#F2E3C9", fg:"#7A6A55", border:"#E6D4B0", Icon: (p:any)=> <IconFriends stroke={p.fg}/> };
  if (key === "date") return { bg:"#F2E9DC", fg:"#7A6A55", border:"#E2D2BA", Icon: (p:any)=> <IconFriends stroke={p.fg}/> };
  if (key==="travel") return { bg:"#D6E6DC", fg:"#5E7A6B", border:"#C0D5C8", Icon: (p:any)=> <IconPlane stroke={p.fg}/> };
  if (key==="birthday") return { bg:"#FCE8E2", fg:"#9E6A5E", border:"#F0D0C6", Icon: (p:any)=> <IconFriends stroke={p.fg}/> };
  // default to friends/people neutral
  return { bg:"#D8E5DF", fg:"#5A7367", border:"#C8D9CE", Icon: (p:any)=> <IconFriends stroke={p.fg}/> };
}

export default function Upcoming({ currentUser, calendar, chores, shopping, nowMs, todayDateStr, setTab }: Props) {
  const activeChores = useMemo(() => (chores as any[]).filter(c => !(c as any).deletedAt), [chores]);
  const activeCalendar = useMemo(() => (calendar as any[]).filter((ev:any) => !(ev as any).deletedAt), [calendar]);
  const activeShopping = useMemo(() => (shopping as any[]).filter((s:any) => !(s as any).deletedAt && !(s as any).archivedAt), [shopping]);

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

      <div className="rounded-[22px] border bg-[#FFFEFB] overflow-hidden shadow-[0_6px_20px_rgba(60,40,20,0.08)]" style={{ borderColor:"#EDE2D6" }}>
        {upcoming.map((ev:any, idx:number)=>{
          const kind = (ev as any).kind || (ev as any).eventKind || inferKindFromTitle(ev.title||"") || "friends";
          const bubble = getBubble(kind);
          const Icon = (bubble as any).Icon;
          const isAisling = (()=> {
            const at = (ev as any).attendees as string[]|undefined;
            if (!at) return (ev as any).ownerId==="aisling" || (ev as any).person==="aisling";
            if (at.length===1) return at[0]==="aisling";
            return at.includes("aisling") && !at.includes("ciaran");
          })();
          return (
            <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-center gap-3 px-3.5 py-3.5 min-h-[66px] hover:bg-[#FFD9C4]/12 transition" style={{ borderTop: idx===0?undefined:"1px solid #F0E5D8" }}>
              <span className="h-[44px] w-[44px] shrink-0 grid place-items-center rounded-full border" style={{ background: (bubble as any).bg, borderColor:(bubble as any).border }}><Icon fg={(bubble as any).fg} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-[650] text-[#19140F] truncate" style={{ fontFamily:"Fraunces, serif", letterSpacing:"-0.01em" }}>{ev.title}</div>
                <div className="mt-0.5 text-[12px] text-[#7E766F] flex items-center gap-1" style={{ fontFamily:"Inter, sans-serif" }}>{fmtDayShort(ev.dueAt)}</div>
              </div>
              <div className="flex items-center gap-2 pl-1">
                {isAisling && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#8D7AD6] text-[11px] font-bold text-white shadow-sm ring-2 ring-white">A</span>
                )}
                <span className="text-[#9E9791]"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 3l5 5-5 5"/></svg></span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}
