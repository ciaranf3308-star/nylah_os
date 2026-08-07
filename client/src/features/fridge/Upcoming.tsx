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

function IconFriends() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8C5A3E" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="3.2" />
      <path d="M6.2 14.2c0-2.3 1.8-4.2 4.2-4.6" />
      <path d="M13.6 9.6c2.4.4 4.2 2.3 4.2 4.6v2.2H6.2v-2.2c0-.4.1-.8.2-1.2" />
      <circle cx="18" cy="9" r="1.5" />
    </svg>
  );
}
function IconFootball() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8C5A3E" strokeWidth="1.25" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0" />
      <path d="M12 4.4v2.8M19 12h-2.8M12 19.6v-2.8M5 12h2.8M6.6 6.6l2 2M17.4 6.6l-2 2M17.4 17.4l-2-2M6.6 17.4l2-2" />
    </svg>
  );
}
function IconPlane() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5E7A6B" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11l15.8-4.6a.6.6 0 0 1 .8.7L14.9 20a.6.6 0 0 1-1 .3l-2.4-3.6-3.1 2.1a.6.6 0 0 1-.9-.4l-.3-3.8L18 7.2" />
    </svg>
  );
}
function getBubble(k: EventKind | string) {
  const key = (k||"").toLowerCase();
  if (key === "sports") return { bg:"#F9D5BC", Icon: IconFootball };
  if (key === "friends" || key==="family" || key==="date") {
    if (key==="family") return { bg:"#DDEBD5", Icon: IconFriends };
    // brunch/people use same peach as sports per ref
    return { bg:"#F9D5BC", Icon: IconFriends };
  }
  if (key==="travel") return { bg:"#D6E6DC", Icon: IconPlane };
  return { bg:"#F9D5BC", Icon: IconFriends };
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
          const Icon = bubble.Icon;
          const isAisling = Array.isArray(ev.attendees) && ev.attendees.includes("aisling") || ev.attendees?.length===1;
          return (
            <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-center gap-3 px-3.5 py-3.5 min-h-[66px] hover:bg-[#FFD9C4]/18 transition" style={{ borderTop: idx===0?undefined:"1px solid #F0E5D8" }}>
              <span className="h-[44px] w-[44px] shrink-0 grid place-items-center rounded-full border" style={{ background: bubble.bg, borderColor:"#E9CBB6" }}><Icon /></span>
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
