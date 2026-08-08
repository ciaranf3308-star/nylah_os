import { useState, useMemo, useEffect } from "react";
import type { PersonKey, CalendarEventV2 as CalendarEvent, CalendarEventStatus, CalendarEventResponse, CalendarResponseKind } from "../../types";
import { PERSONS } from "../../constants/themes";
import { HOUSEHOLD_TZ } from "../../lib/buildMeta";
import { todayKey, toLocalKey as toLocalKeyDublin, tzWallToUtc } from "../../lib/dates";
import { uid } from "../../shared/utils/helpers";
import { expandTemplateForMonthDublin, getDublinHourMinuteFromIso, shouldSuppressGeneratedOccurrence } from "../../lib/recurrence";
import { upsertCalendarSeries, upsertCalendarOverride } from "../../lib/normalized";
import { AddEventForm } from "./EventEditor";
import { inferKindFromTitle, EVENT_KINDS, getKindDef } from "../../lib/eventTypes";
import EventIcon from "../../components/EventIcon";

function PinnedCalendarCard({ ev, nowMs, onClear, onTap, tz }: { ev:any, nowMs:number, onClear:()=>void, onTap:()=>void, tz:string }){
  const title = ev.title || "Pinned";
  const iso = ev.start || ev.dueAt;
  const kind = (ev.kind || ev.eventKind || inferKindFromTitle(title) || "other") as string;
  const kindDef = (EVENT_KINDS as any)[kind] || EVENT_KINDS.other;
  const pal = kindDef.light;
  const diffMs = iso ? new Date(iso).getTime() - nowMs : 0;
  const daysLeft = Math.max(0, Math.ceil(diffMs/86400000));
  const hoursLeft = Math.max(0, Math.floor(diffMs/3600000));
  const minsLeft = Math.max(0, Math.floor((diffMs%3600000)/60000));
  const dateKey = (()=>{ try{ return iso ? new Date(iso).toLocaleDateString("en-GB",{timeZone:tz, month:"short", day:"numeric"}) : "" }catch{return ""}})();
  return (
    <button onClick={onTap} className="group w-full text-left rounded-[24px] border bg-[#FFFEFB] px-5 pt-4 pb-5 min-h-[172px] relative overflow-hidden shadow-[0_12px_30px_rgba(60,40,20,0.10),0_1px_0_rgba(255,255,255,0.9)_inset] hover:shadow-[0_18px_42px_rgba(60,40,20,0.15)] hover:-translate-y-[0.5px] transition-all" style={{borderColor:"#EDE2D6"}}>
      <div className="flex items-start justify-between relative z-[2]">
        <span className="inline-flex h-[28px] items-center rounded-full px-3.5 text-[12px] font-[700] tracking-[-0.01em] border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" style={{background: pal.bg, color: pal.fg, borderColor: pal.fg+"22"}}>{diffMs<=0 ? "today" : `${daysLeft}d left`}</span>
        <span className="flex items-center gap-2">
          <span className="h-[8px] w-[8px] rounded-full" style={{background:"#F59E4B", boxShadow:"0 0 0 4px rgba(245,158,75,0.18)"}} />
          <span onClick={(e)=>{ e.stopPropagation(); onClear(); }} className="h-[28px] w-[28px] grid place-items-center rounded-full bg-white border border-[#EDE2D6] text-[12px] hover:bg-[#FFF4EC] transition">✕</span>
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 relative z-[2]">
        <span className="text-[52px] font-[850] tracking-[-0.04em] text-[#12100E]" style={{fontFamily:'Fraunces, serif', lineHeight:0.9}}>{diffMs<=0 ? "0" : daysLeft}</span>
        <span className="text-[12.5px] font-[600] text-[#7C756E] px-2 py-0.5 rounded-full bg-white border border-[#F0E5D8]">{diffMs<=0 ? "today" : daysLeft>1 ? `${daysLeft} days` : `${hoursLeft}h ${minsLeft}m`}</span>
      </div>
      <div className="mt-1 text-[14.5px] font-[700] text-[#191410] truncate pr-[120px] relative z-[2]" style={{fontFamily:'Fraunces, serif'}}>{title}</div>
      <div className="mt-0.5 text-[12px] text-[#8E867F] pr-[120px] relative z-[2] flex items-center gap-1.5">
        <span className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[10.5px] font-[700] border" style={{background:pal.bg, color:pal.fg, borderColor:"rgba(0,0,0,0.06)"}}>{kindDef.label}</span>
        <span>{dateKey} {ev.location ? `• ${ev.location}` : ""}</span>
      </div>
      <div className="pointer-events-none absolute right-[-12px] bottom-[-14px] rotate-[-5deg] group-hover:rotate-[-3deg] group-hover:scale-[1.03] transition-transform duration-500">
        <div className="relative" style={{ width:164, height:164 }}>
          <div className="absolute inset-[12px] rounded-[28px] rotate-[8deg]" style={{ background:`radial-gradient(115% 90% at 32% 28%, white 0%, ${pal.bg} 48%, ${pal.chipBg||pal.bg} 82%)`, opacity:0.88 }} />
          <div className="relative w-full h-full grid place-items-center" style={{filter:"drop-shadow(0 14px 22px rgba(80,45,18,0.14))"}}>
            <EventIcon kind={kind} title={title} size={164} variant="watermark" theme="light"/>
          </div>
        </div>
      </div>
    </button>
  );
}
function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose:()=>void; title?: any; children:any }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-[480px] rounded-t-[24px] border bg-[var(--card-bg)] p-4 max-h-[88vh] overflow-auto" style={{borderColor:"var(--border)"}}>
        <div className="flex items-center justify-between mb-2"><div className="text-[14px] font-semibold">{title||""}</div><button onClick={onClose} className="h-[32px] w-[32px] grid place-items-center rounded-full border" style={{borderColor:"var(--border)"}}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

function CalendarPageV2(props: any) {
  let { events, setEvents, currentUser, nowMs, chores, setCurrentUser, onCelebrate } = props as {
    events: CalendarEvent[]; setEvents: (up: CalendarEvent[] | ((p: CalendarEvent[]) => CalendarEvent[])) => void;
    currentUser: PersonKey; nowMs: number; chores?: any; setCurrentUser?: any; onCelebrate?: any;
  };
  // v120 defensive defaults
  if (!Array.isArray(events)) events = [] as any;
  if (!Array.isArray(chores)) chores = [] as any;
  if (typeof setEvents !== 'function') setEvents = (()=>{}) as any;
  if (!currentUser) currentUser = "aisling" as any;
  if (typeof setCurrentUser !== 'function') setCurrentUser = (()=>{}) as any;
  if (typeof onCelebrate !== 'function') onCelebrate = (()=>{}) as any;
  if (typeof nowMs !== 'number') nowMs = Date.now();
  // --- Dublin constants ---
  const tz = HOUSEHOLD_TZ;
  const todayDublin = todayKey(tz);

  // --- helpers (pure, no UTC slicing) ---
  function localKeyFromIso(iso?: string): string | null {
    if (!iso) return null;
    const k = toLocalKeyDublin(iso, tz);
    return k || null;
  }
  function daysInMonthDublin(year: number, month0: number): number {
    return new Date(year, month0 + 1, 0).getDate();
  }
  function addDaysKey(base: string, delta: number): string {
    // base YYYY-MM-DD -> add delta calendar days (Dublin wall, using local)
    try {
      const [y,m,d] = base.split("-").map(Number);
      const dt = new Date(y, m-1, d);
      dt.setDate(dt.getDate()+delta);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth()+1).padStart(2,"0");
      const dd = String(dt.getDate()).padStart(2,"0");
      return `${yy}-${mm}-${dd}`;
    } catch { return base; }
  }
  function toTimeDublin(iso?: string): string {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", timeZone: tz, hour12:false });
    } catch { return ""; }
  }
  function toLongDateDublin(key: string): string {
    try {
      const [y,m,d] = key.split("-").map(Number);
      const dn = new Date(y, m-1, d).toLocaleDateString("en-GB", { weekday:"long", month:"long", day:"numeric", year:"numeric", timeZone: tz });
      return dn;
    } catch { return key; }
  }

  // migration: swipes -> responses
  function getResponses(ev: CalendarEvent): CalendarEventResponse[] {
    // Pure: only actual responses + legacy swipes migration. No invented proposer yes.
    if (ev.responses && ev.responses.length) return ev.responses as any;
    const res: CalendarEventResponse[] = [];
    if (ev.swipes) {
      if (ev.swipes?.aisling) {
        const v = ev.swipes.aisling as any;
        if (v === "yes" || v === "no" || v === "discuss") res.push({ eventId: ev.id, memberId: "aisling", response: v, respondedAt: ev.updatedAt || ev.createdAt });
      }
      if (ev.swipes?.ciaran) {
        const v = (ev.swipes as any).ciaran as any;
        if (v === "yes" || v === "no" || v === "discuss") res.push({ eventId: ev.id, memberId: "ciaran", response: v, respondedAt: ev.updatedAt || ev.createdAt });
      }
    }
    return res;
  }

  function computeStatusFromResponses(ev: CalendarEvent, responses: CalendarEventResponse[]): CalendarEventStatus {
    // Keep cancelled/completed/draft stable
    if ((ev as any).status === "cancelled" || (ev as any).status === "completed" || (ev as any).status === "draft") return ev.status as any;
    if ((ev as any).status === "dismissed") return "cancelled" as any;

    const attendees: string[] = (ev as any).attendees && (ev as any).attendees.length ? (ev as any).attendees : ["aisling","ciaran"];
    const proposer = (ev as any).proposer as PersonKey | undefined;

    // Single attendee - who it's FOR
    if (attendees.length === 1) {
      const sole = attendees[0] as PersonKey;
      // Personal event: I create for me => agreed immediately
      if (proposer && proposer === sole) return "agreed" as any;
      const soleResp = responses.find(r => r.memberId === sole);
      if (!soleResp) return (`awaiting_${sole}` as any) as any; // awaiting owner
      if (soleResp.response === "yes") return "agreed" as any;
      if (soleResp.response === "no") return "declined" as any;
      if (soleResp.response === "discuss") return "needs_discussion" as any;
      return (`awaiting_${sole}` as any) as any;
    }

    // Both attendees (or undefined -> both)
    const hasA = responses.find(r => r.memberId === "aisling");
    const hasC = responses.find(r => r.memberId === "ciaran");

    // Inject proposer yes implicitly for both-events when no explicit response from proposer yet
    const effectiveHasA = hasA ? hasA : (proposer === "aisling" && !hasA ? { memberId:"aisling", response:"yes" } as any : undefined);
    const effectiveHasC = hasC ? hasC : (proposer === "ciaran" && !hasC ? { memberId:"ciaran", response:"yes" } as any : undefined);

    const eA = effectiveHasA;
    const eC = effectiveHasC;

    if (!eA && !eC) return "proposed" as any;
    if (!eA) {
      if ((eC as any).response === "discuss") return "needs_discussion" as any;
      return "awaiting_aisling" as any;
    }
    if (!eC) {
      if ((eA as any).response === "discuss") return "needs_discussion" as any;
      return "awaiting_ciaran" as any;
    }
    const aR = (eA as any).response as string;
    const cR = (eC as any).response as string;
    if (aR === "yes" && cR === "yes") return "agreed" as any;
    if (aR === "no" && cR === "no") return "declined" as any;
    // mixed yes/no/discuss => needs discussion
    return "needs_discussion" as any;
  }

  function isEventOnDate(ev: CalendarEvent, dateKey: string): boolean {
    const startIso = ev.start || ev.dueAt;
    if (!startIso) return false;
    const sKey = localKeyFromIso(startIso);
    if (!sKey) return false;
    const eKey = ev.end || ev.endAt ? localKeyFromIso(ev.end || ev.endAt) : sKey;
    if (!eKey || sKey === eKey) return sKey === dateKey;
    return sKey <= dateKey && dateKey <= eKey;
  }

  // recurrence — FIXED: Dublin TZ, multi-weekday weekly, biweekly parity, monthly semantic, overrides aware
  function expandTemplateForMonth(template: CalendarEvent, y: number, m0: number): CalendarEvent[] {
    try {
      const tz = HOUSEHOLD_TZ;
      return expandTemplateForMonthDublin(template as any, y, m0, tz) as any;
    } catch (e) {
      console.warn("[calendar] expandTemplateForMonth fallback", e);
      return [];
    }
  }


  // --- state ---
  const [viewMonth, setViewMonth] = useState(() => {
    const ref = nowMs ? new Date(nowMs) : new Date();
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, year:"numeric", month:"numeric"});
      const parts = fmt.formatToParts(ref);
      const y = Number(parts.find(p=> p.type==="year")?.value || ref.getFullYear());
      const m = Number(parts.find(p=> p.type==="month")?.value || ref.getMonth()+1)-1;
      return new Date(y, m, 1);
    } catch { return new Date(ref.getFullYear(), ref.getMonth(), 1); }
  });
  const [selected, setSelected] = useState(() => {
    try{
      const saved = localStorage.getItem("couple_v1_calendar_selected");
      if(saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
    }catch{}
    return todayDublin;
  });
  const [mode, setMode] = useState<"month"|"agenda">(()=> {
    try { const s = localStorage.getItem("couple_v1_calendar_mode"); if(s==="agenda"||s==="month") return s as any; } catch {}
    return "month";
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(()=> viewMonth.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(()=> viewMonth.getMonth());
  const [showHistory, setShowHistory] = useState(false);

  const [calFilter, setCalFilter] = useState<"all"|"both"|"aisling"|"ciaran"|"chores">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent|null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent|null>(null);
  const [showEditSeriesAsk, setShowEditSeriesAsk] = useState<{ ev: CalendarEvent, draft: CalendarEvent }|null>(null);
  const [menuFor, setMenuFor] = useState<string|null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string,string>>({});
  const [confirmDialog, setConfirmDialog] = useState<null | {title:string; msg?:string; onConfirm:()=>void}>(null);

  useEffect(()=> {
    try { localStorage.setItem("couple_v1_calendar_mode", mode); } catch {}
  }, [mode]);

  useEffect(()=>{
    // keep picker synced when month changes externally
    setPickerYear(viewMonth.getFullYear());
    setPickerMonth(viewMonth.getMonth());
  }, [viewMonth]);

  useEffect(()=>{
    try{
      const vm = localStorage.getItem("couple_v1_calendar_viewMonth");
      if(vm && /^\d{4}-\d{2}$/.test(vm)){
        const [y,m] = vm.split("-").map(Number);
        setViewMonth(new Date(y, m-1, 1));
        localStorage.removeItem("couple_v1_calendar_viewMonth");
      }
      const sel = localStorage.getItem("couple_v1_calendar_selected");
      if(sel && /^\d{4}-\d{2}-\d{2}$/.test(sel)){
        if(sel!==selected){
          setSelected(sel);
          const [yy,mm] = sel.split("-").map(Number);
          setViewMonth(new Date(yy, mm-1, 1));
        }
        localStorage.removeItem("couple_v1_calendar_selected");
      }
    }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // month occurrences — fixed to suppress overridden dates to avoid duplication
  const monthOccurrences = useMemo(()=> {
    const y = viewMonth.getFullYear();
    const m0 = viewMonth.getMonth();
    const all: CalendarEvent[] = [];
    const tmplRecurring = events.filter(ev=> !ev.deletedAt && (ev.isTemplate || (ev.type==="repeat" && ev.frequency && ev.frequency!=="once")));
    for (const tmpl of tmplRecurring) {
      const occs = expandTemplateForMonth(tmpl, y, m0);
      // filter out those that have an override stored
      for (const o of occs) {
        if (shouldSuppressGeneratedOccurrence(o.templateId, o.occurrenceId, events)) continue;
        all.push(o);
      }
    }
    // also need next month for agenda later-this-week that may cross month boundary
    const nextM = m0===11 ? 0 : m0+1;
    const nextY = m0===11 ? y+1 : y;
    for (const tmpl of tmplRecurring) {
      const occs = expandTemplateForMonth(tmpl, nextY, nextM);
      for (const o of occs) {
        if (shouldSuppressGeneratedOccurrence(o.templateId, o.occurrenceId, events)) continue;
        all.push(o);
      }
    }
    return all;
  }, [events, viewMonth]);

  const visEvents = useMemo(()=> events.filter(ev=> !(ev as any).deletedAt && !(ev as any).isTemplate), [events]);
  const combinedForMonth = useMemo(()=> [...visEvents, ...monthOccurrences], [visEvents, monthOccurrences]);

  // month grid Mon-start
  const y = viewMonth.getFullYear();
  const m0 = viewMonth.getMonth();
  const firstDayDate = new Date(y, m0, 1);
  const jsWeekday = firstDayDate.getDay();
  const firstWdMon = (jsWeekday + 6) % 7;
  const dim = daysInMonthDublin(y, m0);
  const cells: Array<{ key:string|null, day:number|null, isToday:boolean, isSelected:boolean }> = [];
  for (let i=0;i<firstWdMon;i++) cells.push({key:null, day:null, isToday:false, isSelected:false});
  for (let d=1; d<=dim; d++) {
    const key = y+"-"+String(m0+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    cells.push({key, day:d, isToday:key===todayDublin, isSelected:key===selected});
  }
  while (cells.length % 7 !== 0) cells.push({key:null, day:null, isToday:false, isSelected:false});

  const byDay = useMemo(()=> {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of combinedForMonth) {
      for (let d=1; d<=dim; d++) {
        const dayKey = y+"-"+String(m0+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
        if (isEventOnDate(ev, dayKey)) {
          if (!map.has(dayKey)) map.set(dayKey, []);
          map.get(dayKey)!.push(ev);
        }
      }
    }
    return map;
  }, [combinedForMonth, y, m0, dim]);

  const selectedEvents = useMemo(()=> {
    const arr = combinedForMonth.filter(ev=> isEventOnDate(ev, selected));
    return arr.sort((a,b)=> {
      const ta = a.start ? new Date(a.start).getTime() : new Date(a.dueAt||a.createdAt).getTime();
      const tb = b.start ? new Date(b.start).getTime() : new Date(b.dueAt||b.createdAt).getTime();
      return ta-tb;
    });
  }, [combinedForMonth, selected]);

  const choreOverlay = useMemo(()=> {
    if (!chores) return [];
    return (chores as any[]).filter((c:any)=> {
      if (c.deletedAt) return false;
      const k = c.dueAt ? toLocalKeyDublin(c.dueAt, tz) : null;
      return k===selected;
    }).slice(0,3);
  }, [chores, selected]);

  const filteredSelected = useMemo(()=> {
    if (calFilter === "all") return selectedEvents;
    if (calFilter === "chores") return [] as CalendarEvent[];
    if (calFilter === "both") return selectedEvents.filter(ev => !ev.attendees || ev.attendees.length===2);
    if (calFilter === "aisling") return selectedEvents.filter(ev => ev.attendees?.length===1 && ev.attendees[0]==='aisling');
    if (calFilter === "ciaran") return selectedEvents.filter(ev => ev.attendees?.length===1 && ev.attendees[0]==='ciaran');
    return selectedEvents;
  }, [selectedEvents, calFilter]);

  function hardPersistCalendar(ev:any, op:'create'|'update'|'delete'='update'){
    try{
      const hid = (()=>{ try{ const fn = (require as any) ? null : null; return null } catch{ return null } })();
      // fire-and-forget true-live: enqueue + direct supabase upsert/delete
      (async()=>{
        try{
          const { getEffectiveRowId, getSupabase } = await import("../../lib/supabase");
          const hid2 = getEffectiveRowId() || ev.household_id || (typeof localStorage!=='undefined' ? localStorage.getItem('couple_v1_household_id') : null);
          if(!hid2){ console.warn('[cal] no hid skip persist', ev.id); return; }
          const payload = { ...ev, household_id: hid2 };
          payload.updated_at = payload.updated_at || payload.updatedAt || new Date().toISOString();
          payload.updatedAt = payload.updated_at;
          const sb = getSupabase();
          if(sb){
            try{
              if(op==='delete'){
                try{ await (sb as any).from('calendar_events').delete().eq('id', payload.id).eq('household_id', hid2); }catch{}
                try{ await (sb as any).from('calendar_events').update({ deleted_at: new Date().toISOString() } as any).eq('id', payload.id).eq('household_id', hid2); }catch{}
                // legacy couple_data pruning for ash-ciaran-2026
                try{
                  const { data: row } = await (sb as any).from('couple_data').select('calendar').eq('id', hid2).maybeSingle();
                  if(row && Array.isArray((row as any).calendar)){
                    const filtered = (row as any).calendar.filter((e:any)=> String(e.id)!==String(payload.id));
                    if(filtered.length !== (row as any).calendar.length){
                      await (sb as any).from('couple_data').update({ calendar: filtered, updated_at: new Date().toISOString() }).eq('id', hid2);
                    }
                  }
                }catch{}
              }else{
                const upRow:any = {
                  id: String(payload.id),
                  household_id: hid2,
                  data: payload,
                  updated_at: payload.updated_at || new Date().toISOString(),
                  created_at: payload.created_at || payload.createdAt || new Date().toISOString(),
                };
                const da = payload.deleted_at || payload.deletedAt || null;
                if(da) upRow.deleted_at = da; else if(payload.deleted_at===null || payload.deletedAt===null) upRow.deleted_at = null;
                const endVal = payload.end || payload.endAt || payload.end_at || null;
                if(endVal) upRow.end_at = endVal;
                try{
                  const { error } = await (sb as any).from('calendar_events').upsert(upRow, { onConflict:'id' } as any);
                  if(error){
                    // fallback insert/update
                    const code = (error as any).code;
                    const msg = String((error as any).message||'');
                    if(code==='42P10' || msg.includes('ON CONFLICT')){
                      const { error: insErr } = await (sb as any).from('calendar_events').insert(upRow as any);
                      if(insErr && String(insErr.code)==='23505'){
                        await (sb as any).from('calendar_events').update(upRow as any).eq('id', upRow.id).eq('household_id', hid2);
                      }
                    }
                  }
                }catch{}
              }
            }catch{}
          }
          try{
            const { enqueueOp } = await import("../../data/offlineQueue");
            await enqueueOp('calendar', op as any, String(payload.id), String(hid2), payload);
            try{
              const { remoteSaveOperations } = await import("../../lib/remoteSync");
              const { getQueue } = await import("../../data/offlineQueue");
              const q = await getQueue();
              await remoteSaveOperations(q as any);
            }catch{}
          }catch{}
        }catch(e){ console.warn('[cal true-live] err', (e as any)?.message||e); }
      })();
    }catch{}
  }

  function updateEvent(id:string, patch: Partial<CalendarEvent>) {
    const nowIso = new Date().toISOString();
    const mut = (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now());
    const fullPatch = { ...patch, updatedAt: nowIso, updatedBy: currentUser, mutationId: mut };
    setEvents((prev:any)=> prev.map((ev: CalendarEvent)=> ev.id===id ? { ...ev, ...fullPatch } : ev));
    // true-live multiplayer: immediate hard persist + queue for updated event
    try{
      const ev = (events as any[]).find((e:any)=> e.id===id);
      if(ev){
        hardPersistCalendar({ ...ev, ...fullPatch, id }, 'update');
      }else{
        // if not found in current events snapshot (stale), persist patch alone with id
        hardPersistCalendar({ id, ...fullPatch }, 'update');
      }
    }catch{}
  }
  async function removeEvent(idOrEv:any) {
    // resolve target event from id or object
    const id = typeof idOrEv === 'string' ? idOrEv : idOrEv?.id;
    if (!id) return;
    // find current event snapshot for smarter handling
    let target:any = typeof idOrEv === 'string' ? null : idOrEv;
    if (!target) {
      target = (events as any[]).find((e:any)=> e.id===id) || null;
    }
    if (!target) {
      // also check generated occurrences (monthOccurrences / combined)
      try {
        const combined = [...(events as any[]).filter((e:any)=> !e.deletedAt), ...(monthOccurrences as any[])];
        target = combined.find((e:any)=> e.id===id) || null;
      } catch {}
    }
    const isGeneratedOccurrence = !!(target && (target as any).templateId && (target as any).occurrenceId);
    const isTemplate = !!(target && ((target as any).isTemplate || ((target as any).frequency && (target as any).frequency!=='once' && (target as any).type==='repeat')));
    if (isGeneratedOccurrence) {
      const tplId = (target as any).templateId;
      const occId = (target as any).occurrenceId;
      const ovId = tplId + "#" + occId;
      const override = {
        id: ovId,
        templateId: tplId,
        occurrenceId: occId,
        isOverride: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
        title: (target as any).title,
        start: (target as any).start,
        dueAt: (target as any).dueAt,
      } as any;
      // local: add override so shouldSuppressGeneratedOccurrence hides it immediately, and it will sync as delete through queue
      setEvents((prev:any)=> {
        // remove any previous override for same occ, then push new deleted override
        const without = (prev as any[]).filter((e:any)=> !(e.templateId===tplId && e.occurrenceId===occId));
        return [...without, override];
      });
      try {
        await upsertCalendarOverride({ id: ovId, seriesId: tplId, series_id: tplId, occurrenceDate: occId, occurrence_date: occId, deleted: true, title: (target as any).title, data: override } as any);
      } catch {}
      return;
    }
    if (isTemplate) {
      // delete whole series — soft-delete template and any existing overrides for safety
      setEvents((prev:any)=> prev.map((ev:any)=> ev.id===id || ev.templateId===id ? { ...ev, deletedAt:new Date().toISOString(), updatedAt:new Date().toISOString(), updatedBy: currentUser } : ev).filter((ev:any)=> true));
      // also try server series delete via direct Supabase (normalized)
      try {
        const { getSupabase, getEffectiveRowId } = await import("../../lib/supabase");
        const sb = getSupabase();
        const hid = getEffectiveRowId() || (target as any).household_id;
        if (sb && hid) {
          try { await (sb as any).from('calendar_series').delete().eq('id', id).eq('household_id', hid); } catch {}
          try { await (sb as any).from('calendar_occurrence_overrides').delete().eq('series_id', id).eq('household_id', hid); } catch {}
          try { await (sb as any).from('calendar_occurrence_overrides').delete().eq('seriesId', id).eq('household_id', hid); } catch {}
          // also ensure calendar_events deleted
          try { await (sb as any).from('calendar_events').delete().eq('id', id).eq('household_id', hid); } catch {}
          try { await (sb as any).from('calendar_events').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('household_id', hid); } catch {}
        }
      } catch {}
      return;
    }
    // normal single event — soft-delete locally, queue will DELETE server, also nudge legacy giant JSON cleanup
    const nowDel = new Date().toISOString();
    setEvents((prev:any)=> prev.map((ev: CalendarEvent)=> ev.id===id ? { ...ev, deletedAt: nowDel, updatedAt: nowDel, updatedBy: currentUser } : ev));
    // true-live multiplayer: hard delete normalized, legacy, queue — defensible
    hardPersistCalendar({ id, deletedAt: nowDel, updatedAt: nowDel, household_id: (target as any)?.household_id || null } as any, 'delete');
    try {
      const { getSupabase, getEffectiveRowId } = await import("../../lib/supabase");
      const sb = getSupabase();
      const hid = getEffectiveRowId() || (target as any)?.household_id || localStorage.getItem('couple_v1_household_id');
      if (sb && hid) {
        try { await (sb as any).from('calendar_events').delete().eq('id', id).eq('household_id', hid); } catch (e:any) { /* fallback soft-delete if RLS blocks hard delete */ }
        try { await (sb as any).from('calendar_events').update({ deleted_at: new Date().toISOString() } as any).eq('id', id).eq('household_id', hid); } catch {}
        try{
          const { getQueue, persistQueue } = await import("../../data/offlineQueue");
          const q = await getQueue();
          const next = q.filter((o:any)=> !(o.id===id && o.kind==='calendar'));
          if(next.length!==q.length) await persistQueue(next as any);
        }catch{}
      }
    } catch {}
  }
  function handleResponse(ev: CalendarEvent, kind: CalendarResponseKind, comment?: string) {
    const existing = getResponses(ev);
    const otherComment = commentInputs[ev.id]?.trim();
    const finalComment = comment || otherComment || undefined;
    const nowIso = new Date().toISOString();
    const upserted = [...existing.filter(r=> r.memberId!==currentUser), { eventId: ev.id, memberId: currentUser, response: kind, comment: finalComment, respondedAt: nowIso }];
    const newSwipes = { aisling: null as any, ciaran: null as any };
    upserted.forEach(r=> {
      if (r.memberId==="aisling") newSwipes.aisling = r.response === "discuss" ? null : r.response;
      if (r.memberId==="ciaran") newSwipes.ciaran = r.response === "discuss" ? null : r.response;
    });
    // Single source of truth — no special-case overriding
    const derived = computeStatusFromResponses(ev, upserted as any);
    const patch: any = { responses: upserted, swipes: newSwipes, status: derived, mutationId: (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()) };
    const notiKey = ev.id+":"+derived+":"+upserted.map(r=> r.memberId+":"+r.response).join("|");
    if (ev.lastNotifiedState !== notiKey) {
      patch.lastNotifiedState = notiKey;
      try { if (onCelebrate && derived==="agreed") onCelebrate({ kind:"calendar-agreed", id:ev.id }); } catch {}
    }
    updateEvent(ev.id, patch);
    setCommentInputs(c=> ({...c, [ev.id]:""}));
    setActiveEvent(prev=> prev && prev.id===ev.id ? { ...prev, ...patch } as any : prev);
  }

  // pinned + ahead counts
  const pinnedEvent = useMemo(()=> (events as any[]).find((ev:any)=> ev.pinned), [events]);
  const scheduledAhead = useMemo(()=>{
    const now = nowMs || Date.now();
    return (events as any[]).filter((ev:any)=> !ev.deletedAt && ev.status==="agreed" && (new Date(ev.start || ev.dueAt || ev.createdAt).getTime() > now)).sort((a:any,b:any)=> new Date(a.start||a.dueAt||a.createdAt).getTime() - new Date(b.start||b.dueAt||b.createdAt).getTime()).slice(0,20);
  }, [events, nowMs]);
  const proposedAhead = useMemo(()=>{
    const now = nowMs || Date.now();
    return (events as any[]).filter((ev:any)=> !ev.deletedAt && ["proposed","awaiting_aisling","awaiting_ciaran","needs_discussion"].includes(ev.status) && (new Date(ev.start || ev.dueAt || ev.createdAt).getTime() > now)).sort((a:any,b:any)=> new Date(a.start||a.dueAt||a.createdAt).getTime() - new Date(b.start||b.dueAt||b.createdAt).getTime()).slice(0,20);
  }, [events, nowMs]);

  function countdownFor(iso?: string){
    if(!iso) return null;
    const ms = new Date(iso).getTime() - (nowMs || Date.now());
    if (ms <= 0) return { days:0, hours:0, mins:0, past:true, label:"today"};
    const days = Math.floor(ms/86400000);
    const hours = Math.floor((ms % 86400000)/3600000);
    const mins = Math.floor((ms % 3600000)/60000);
    return { days, hours, mins, past:false, label: days>1 ? `${days} days` : days===1 ? "1 day" : `${hours}h ${mins}m` };
  }
  function togglePin(ev: any){
    const nowISO = new Date().toISOString();
    if(ev.pinned || (ev as any).pinned_at || (ev as any).pinnedAt || (ev as any).isPinned){
      // unpin → multiplayer true-live
      updateEvent(ev.id, { pinned:false, pinnedAt: undefined, pinned_at: null as any, isPinned:false } as any);
    } else {
      // enforce at most one pinned locally: unpin existing others with persistence
      try{
        const existing = (events as any[]).filter((x:any)=> (x.pinned || x.pinned_at || x.pinnedAt || x.isPinned) && x.id!==ev.id);
        existing.forEach((x:any)=> { try{ updateEvent(x.id, { pinned:false, pinnedAt: undefined, pinned_at: null as any, isPinned:false } as any); }catch{} });
      }catch{}
      updateEvent(ev.id, { pinned:true, pinnedAt: nowISO, pinned_at: nowISO as any, isPinned:true } as any);
    }
  }

  // Agenda sections (no declined/cancelled unless history)
  const todayKeyStr = todayDublin;
  const tomorrowKeyStr = addDaysKey(todayKeyStr, 1);
  const laterKeys = [2,3,4,5,6].map(n=> addDaysKey(todayKeyStr, n));

  function eventsForKey(key: string): CalendarEvent[] {
    let arr = combinedForMonth.filter(ev=> isEventOnDate(ev, key));
    if (!showHistory) arr = arr.filter(ev=> !["declined","cancelled"].includes(ev.status as any));
    return arr.sort((a,b)=> {
      const ta = a.start ? new Date(a.start).getTime() : new Date(a.dueAt||a.createdAt).getTime();
      const tb = b.start ? new Date(b.start).getTime() : new Date(b.dueAt||b.createdAt).getTime();
      return ta-tb;
    });
  }


  // For agenda mode when viewing future month, show that month's events (fixes "changing month does nothing")
  const monthKeyPrefix = `${y}-${String(m0+1).padStart(2,"0")}`;
  const monthAllEvents = useMemo(()=> {
    return combinedForMonth.filter((ev:any)=> {
      const iso = (ev as any).start || (ev as any).dueAt;
      const lk = localKeyFromIso(iso);
      return !!lk && lk.startsWith(monthKeyPrefix);
    }).sort((a:any,b:any)=> new Date((a as any).start|| (a as any).dueAt).getTime() - new Date((b as any).start|| (b as any).dueAt).getTime());
  }, [combinedForMonth, monthKeyPrefix]);

  const agendaMonthGrouped = useMemo(()=> {
    const map = new Map<string, CalendarEvent[]>();
    for(const ev of monthAllEvents){
      const k = localKeyFromIso((ev as any).start || (ev as any).dueAt);
      if(!k) continue;
      if(!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev as any);
    }
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
  }, [monthAllEvents]);
  const todayEvents = useMemo(()=> eventsForKey(todayKeyStr), [combinedForMonth, todayKeyStr, showHistory]);
  const tomorrowEvents = useMemo(()=> eventsForKey(tomorrowKeyStr), [combinedForMonth, tomorrowKeyStr, showHistory]);
  const laterEventsFlat = useMemo(()=> {
    const all: { key:string, ev:CalendarEvent}[] = [];
    for (const k of laterKeys) {
      for (const ev of eventsForKey(k)) all.push({key:k, ev});
    }
    return all;
  }, [combinedForMonth, laterKeys.join("|"), showHistory]);

  function goPrevMonth(){
    const nm = new Date(viewMonth); nm.setMonth(nm.getMonth()-1);
    const nv = new Date(nm.getFullYear(), nm.getMonth(), 1);
    setViewMonth(nv);
    const k = `${nv.getFullYear()}-${String(nv.getMonth()+1).padStart(2,"0")}-01`;
    setSelected(k);
    try{ localStorage.setItem("couple_v1_calendar_selected", k); }catch{}
  }
  function goNextMonth(){
    const nm = new Date(viewMonth); nm.setMonth(nm.getMonth()+1);
    const nv = new Date(nm.getFullYear(), nm.getMonth(), 1);
    setViewMonth(nv);
    const k = `${nv.getFullYear()}-${String(nv.getMonth()+1).padStart(2,"0")}-01`;
    setSelected(k);
    try{ localStorage.setItem("couple_v1_calendar_selected", k); }catch{}
  }
  function goToday(){
    try {
      const fmt = new Intl.DateTimeFormat("en-US",{timeZone: tz, year:"numeric", month:"numeric"});
      const p = fmt.formatToParts(new Date());
      const yN = Number(p.find(x=> x.type==="year")?.value);
      const mN = Number(p.find(x=> x.type==="month")?.value)-1;
      setViewMonth(new Date(yN,mN,1));
      setSelected(todayDublin);
    } catch {
      const d=new Date(); setViewMonth(new Date(d.getFullYear(), d.getMonth(),1)); setSelected(todayDublin);
    }
  }

  // keep selected in sync when viewMonth jumps via picker
  useEffect(()=>{
    try{
      const vmKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,"0")}`;
      if(!selected || !selected.startsWith(vmKey)){
        // if selected not in this month, snap to 01 but only if month changed away from today? keep today if today in month
        if(todayDublin.startsWith(vmKey)) { setSelected(todayDublin); }
        else {
          const k01 = `${vmKey}-01`;
          setSelected(k01);
          try{ localStorage.setItem("couple_v1_calendar_selected", k01); }catch{}
        }
      }
    }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth]);

  // --- row components inline - V70 ownership clarity ---
  const AgendaRow = ({ ev, dateKey, compact }: { ev: CalendarEvent, dateKey?: string, compact?: boolean }) => {
    const isPending = ["proposed","awaiting_aisling","awaiting_ciaran","needs_discussion"].includes(ev.status as any);
    const timeStr = ev.allDay ? "All day" : toTimeDublin(ev.start || ev.dueAt);
    const loc = (ev as any).location;
    const attendees = (ev as any).attendees || ["aisling","ciaran"];
    const proposer = (ev as any).proposer as PersonKey | undefined;
    const isBoth = attendees.length!==1;
    // V105 boutique left-rule 3px
    const leftRuleColor = isBoth ? "#8B7357" : (attendees[0]==="aisling" ? "#A89FDA" : "#E07A5F");
    const timeMono = ev.allDay ? "All day" : timeStr;
    // dot pulse check — due within 24h urgent only (premium cut)
    let diffDays = 99;
    try { diffDays = Math.round((new Date(ev.start||ev.dueAt).getTime() - Date.now())/86400000); } catch {}
    const isSoon = Math.abs(diffDays)<=2;
    const forLabel = attendees.length===2 ? "Both" : attendees[0]==="aisling" ? "for Aisling" : "for Ciaran";
    const subStatus = (()=> {
      if (ev.status==="agreed") return "Agreed";
      if ((ev.status as any)==="declined") return "Declined";
      if (ev.status==="needs_discussion") return "Needs reply";
      if ((ev.status as any)==="awaiting_aisling") return "Awaiting Á";
      if ((ev.status as any)==="awaiting_ciaran") return "Awaiting C";
      if (ev.status==="proposed") return proposer ? `by ${PERSONS[proposer as any]?.name||proposer}` : "Proposed";
      return ev.status;
    })();
    const awaiting = (()=>{ const st=String((ev as any).status||''); if(st===`awaiting_${currentUser}`) return `Awaiting you`; if(st.startsWith('awaiting_')){ const who=st.replace('awaiting_',''); return `Awaiting ${who==='aisling'?'Aisling':'Ciarán'}`; } if(st==='proposed'){ const prop=(ev as any).proposer; if(prop && prop!==currentUser) return `Needs you`; if(prop && prop===currentUser) return `Awaiting ${prop==='aisling'?'Ciarán':'Aisling'}`; return "Proposed"; } if(st==='needs_discussion') return "Needs discussion"; return null; })();
    const sub = [loc, subStatus].filter(Boolean).join(" · ");
    return (
      <div className="w-full flex items-stretch gap-1.5">
        <button
          onClick={()=> setActiveEvent(ev)}
          className="flex-1 text-left flex items-stretch gap-0 rounded-[18px] border bg-[var(--card-bg)] overflow-hidden active:scale-[0.98] transition min-h-[64px] relative"
          style={{ borderColor:"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.86)", paddingLeft:3 }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]" style={{ background: leftRuleColor }} aria-hidden="true" />
          <span className="flex flex-1 items-center gap-3 px-3.5 py-3 min-w-0 ml-[3px]">
            <span className="flex flex-col items-center gap-1.5 shrink-0">
              <span className="tabular-nums text-[12px] font-medium tracking-[0.02em] rounded-full px-2 py-0.5 border" style={{fontFamily:'Inter Tight, var(--font-ui)', color:'var(--muted)', background:'var(--chip-bg)', border:'1px solid var(--border)'}}>{timeMono}</span>
              <span style={{background:leftRuleColor, boxShadow: isSoon?`0 0 0 4px ${leftRuleColor}22, 0 0 10px ${leftRuleColor}55`:'none'}} className={`h-[7px] w-[7px] rounded-full ${isSoon?"nylah-dot nylah-dot--urgent":""}`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="block text-[14px] font-semibold tracking-tight truncate" style={{color:'var(--text)', fontFamily:'var(--font-ui)'}}>{ev.title}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className="block text-[11px] truncate max-w-[150px]" style={{color:'var(--muted)'}}>{sub || forLabel}</span>
                {isPending && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border" style={{background:'var(--chip-bg)', color:'var(--text)', borderColor:'var(--border)'}}><span style={{color:'var(--accent)'}}>✦</span> Needs you</span>}
              </span>
            </span>
            <span className="shrink-0 rounded-full h-8 w-8 grid place-items-center border text-[12px]" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}} aria-hidden="true">›</span>
          </span>
        </button>
        <button onClick={(e)=>{ e.stopPropagation(); setConfirmDialog({title:"Delete event?", msg:`Remove "${ev.title}" for both?`, onConfirm:()=>{ removeEvent(ev.id); setConfirmDialog(null); }}); }} className="shrink-0 self-center h-[44px] w-[44px] grid place-items-center rounded-full border bg-[var(--card-bg)] text-[14px] active:scale-95" style={{borderColor:"var(--border)"}} aria-label={`Delete ${ev.title}`} title="Delete">🗑</button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Boutique pinned countdown – matches Fridge, large crisp illustration */}
      {pinnedEvent && (
        <PinnedCalendarCard ev={pinnedEvent} nowMs={nowMs||Date.now()} tz={tz} onClear={()=> togglePin(pinnedEvent)} onTap={()=> setActiveEvent(pinnedEvent)} />
      )}

      {/* Header: ‹ August 2026 › Today — tappable month opens picker, no Europe/Dublin badge */}
      <div className="flex items-center justify-between px-1">
        <button onClick={goPrevMonth} className="h-[44px] w-[44px] grid place-items-center rounded-full border bg-[var(--card-bg)] active:scale-[0.96] transition text-[16px]" style={{ borderColor:"var(--border)" }} aria-label="Previous month">‹</button>
        <button
          onClick={()=> setShowMonthPicker(v=> !v)}
          className="h-[44px] rounded-full border bg-[var(--card-bg)] px-4 font-display text-[18px] tracking-tight active:scale-[0.98] transition"
          style={{ borderColor:"var(--border)" }}
          aria-expanded={showMonthPicker}
          aria-haspopup="dialog"
        >
          {viewMonth.toLocaleDateString("en-GB", { month:"long", year:"numeric", timeZone: tz })}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="h-[44px] px-3 rounded-full border bg-[var(--card-bg)] text-[11px] font-medium active:scale-[0.96]" style={{borderColor:"var(--border)"}}>Today</button>
          <button onClick={goNextMonth} className="h-[44px] w-[44px] grid place-items-center rounded-full border bg-[var(--card-bg)] text-[16px]" style={{ borderColor:"var(--border)" }} aria-label="Next month">›</button>
        </div>
      </div>

      {/* Month/Year picker sheet inline (pills, type scale) */}
      {showMonthPicker && (
        <div className="rounded-[16px] border bg-[var(--card-bg)] p-3 space-y-2" style={{borderColor:"var(--border)"}}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Jump to</span>
            <button onClick={()=> setShowMonthPicker(false)} className="h-[32px] rounded-full border bg-[var(--chip-bg)] px-3 text-[11px]" style={{borderColor:"var(--border)"}}>Done</button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select value={pickerMonth} onChange={e=> setPickerMonth(Number(e.target.value))} className="w-full h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none bg-[var(--card-bg)]" style={{borderColor:"var(--border)"}}>
                {Array.from({length:12}).map((_,i)=> <option key={i} value={i}>{new Date(2020,i,1).toLocaleDateString("en-GB",{month:"long"})}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg></span>
            </div>
            <div className="relative w-[110px]">
              <select value={pickerYear} onChange={e=> setPickerYear(Number(e.target.value))} className="w-full h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none bg-[var(--card-bg)]" style={{borderColor:"var(--border)"}}>
                {Array.from({length:9}).map((_,i)=> { const yr = new Date().getFullYear()-3+i; return <option key={yr} value={yr}>{yr}</option>; })}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg></span>
            </div>
            <button onClick={()=> { setViewMonth(new Date(pickerYear, pickerMonth, 1)); setShowMonthPicker(false); }} className="h-[44px] min-h-[44px] rounded-[12px] bg-[#0A0A0A] px-4 text-[12px] font-medium text-white">Go</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({length:12}).map((_,i)=> (
              <button key={i} onClick={()=> setPickerMonth(i)} className={"h-[36px] rounded-full border text-[11px] transition "+(pickerMonth===i ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[var(--chip-bg)] border-[var(--border)]")}>{new Date(2020,i,1).toLocaleDateString("en-GB",{month:"short"})}</button>
            ))}
          </div>
        </div>
      )}

      {/* Segmented — V101 Linear pill classy */}
      <div className="px-1">
        <div className="nylah-seg">
          {(["month","agenda"] as const).map(m=> (
            <button
              key={m}
              onClick={()=> setMode(m)}
              className={mode===m ? "active" : ""}
              style={{fontFamily:'var(--font-ui)'}}
            >
              {m==="month" ? "Month" : "Agenda"}
            </button>
          ))}
        </div>
      </div>

      {mode==="month" ? (
        <>
          {/* V107 boutique calendar — Hume charcoal + linen, Fraunces numbers, orange today */}
          <div className="nylah-arena rounded-[24px] px-5 pt-5 pb-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.28] pointer-events-none nylah-arena" style={{}} />
            <div className="relative">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.13em] text-[var(--muted)] mb-2 px-1" style={{fontFamily:'var(--font-ui)'}}><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((c,i)=>{
                  if (!c.key) return <div key={"empty-"+i} className="min-h-[44px] min-w-[44px]" />;
                  const dayEvs = (byDay.get(c.key!) || []) as any[];
                  const evCount = dayEvs.length;
                  const hasEv = evCount>0;
                  const isSel = c.isSelected;
                  const isToday = c.isToday;
                  const attTypes = (()=>{ const s=new Set<string>(); for(const ev of dayEvs as any[]){ const at=(ev as any).attendees||["aisling","ciaran"]; if(at.length===2||at.length===0) s.add("both"); else s.add(at[0]); } return Array.from(s); })();
                  const hasA = attTypes.includes("aisling"); const hasC = attTypes.includes("ciaran"); const hasB = attTypes.includes("both");
                  const countCat = attTypes.length;
                  const bgForCell = isSel ? '#121214' : (()=>{ if(!hasEv) return 'var(--card-bg)'; if(countCat===1){ if(hasA) return '#E9E6FF'; if(hasC) return '#FFE9E1'; if(hasB) return '#FFF2D8'; } if(hasA && hasC && !hasB) return 'linear-gradient(90deg, #E9E6FF 0 50%, #FFE9E1 50% 100%)'; if(hasA && hasB) return 'linear-gradient(90deg, #E9E6FF 0 50%, #FFF2D8 50% 100%)'; if(hasC && hasB) return 'linear-gradient(90deg, #FFE9E1 0 50%, #FFF2D8 50% 100%)'; if(hasA && hasC && hasB) return 'linear-gradient(90deg, #E9E6FF 0 33%, #FFE9E1 33% 66%, #FFF2D8 66% 100%)'; return '#F7EFE6'; })();
                  const borderForCell = isSel ? '#121214' : isToday ? '#FF6B26' : hasEv ? (hasA && !hasC && !hasB ? '#C7BFFF' : hasC && !hasA && !hasB ? '#FFB59A' : '#E8DDD3') : 'var(--border)';
                  return (
                    <button
                      key={c.key}
                      onClick={()=> setSelected(c.key!)}
                      aria-label={c.key + (hasEv ? " has "+evCount+" events" : "")}
                      className={"relative min-h-[44px] w-full rounded-[14px] grid place-items-center border transition-all active:scale-[0.96] py-2.5 " + (isSel ? "" : isToday ? "" : "")}
                      style={{
                        minHeight:44,
                        background: bgForCell as any,
                        color: isSel ? '#FFFEFB' : 'var(--text)',
                        borderColor: borderForCell,
                        borderWidth: hasEv && !isSel ? '1.5px' : '1px',
                        boxShadow: isSel ? '0 8px 20px rgba(0,0,0,0.22), 0 0 0 1px #121214 inset' : isToday ? '0 0 0 4px rgba(255,107,38,0.12), 0 4px 16px rgba(255,107,38,0.12)' : hasEv ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 0 rgba(255,255,255,0.86) inset',
                        fontFamily: 'Fraunces, var(--font-display)',
                        fontWeight: isSel || isToday ? 700 : hasEv ? 600 : 500,
                        fontSize: '13px'
                      }}
                    >
                      <span className="leading-none">{c.day}</span>
                      {hasEv && (
                        <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 flex gap-[3px] justify-center items-center">
                          {dayEvs.slice(0,3).map((ev:any,j:number)=> {
                            const at = (ev as any).attendees || ["aisling","ciaran"];
                            const col = at.length===1 ? (at[0]==="aisling" ? "#7B6EE6" : "#E07A5F") : "#8B7357";
                            return <span key={j} className="rounded-full ring-1 ring-white/70" style={{ width:'6.5px', height:'6.5px', background:col }} />;
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Color key - who the dot is for */}
              <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#A89FDA"}}/> Aisling</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#E07A5F"}}/> Ciaran</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full" style={{background:"#8B7357"}}/> Both</span>
              </div>
            </div>
          </div>

          <div className="px-1 flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="font-display text-[14px]">{toLongDateDublin(selected) || selected}</span>{selected===todayDublin && <span className="text-[11px] rounded-full bg-[#0A0A0A] text-white px-2 py-0.5">Today</span>}</div>
            <button onClick={()=> setShowAdd(true)} className="h-[36px] rounded-full bg-[#0A0A0A] px-3 text-[11px] text-white">+ Add</button>
          </div>

          <div className="px-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--muted)]">Filter</span>
              <span className="text-[11px] text-[var(--muted)]">as {(PERSONS[currentUser]?.name||currentUser||'You')}</span>
            </div>
            <div className="relative">
              <select value={calFilter} onChange={e=> setCalFilter(e.target.value as any)} className="w-full h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none bg-[var(--card-bg)]" style={{borderColor:"var(--border)"}}>
                <option value="all">All</option>
                <option value="both">Both</option>
                <option value="aisling">Aisling</option>
                <option value="ciaran">Ciarán</option>
                <option value="chores">Chores</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg></span>
            </div>
          </div>

          {/* Compact selected-day list */}
          <div className="space-y-2">
            {calFilter==="chores" ? (
              <div className="space-y-1">
                <div className="px-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">Chores • {choreOverlay.length}</div>
                {choreOverlay.length>0 ? choreOverlay.map((c:any)=> <div key={c.id} className="rounded-[12px] border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{borderColor:"var(--border)"}}>{c.title}</div>) : <div className="rounded-[16px] border-dashed border bg-[var(--card-bg)] px-4 py-6 text-center text-[12px] text-[var(--muted)]">No chores that day</div>}
              </div>
            ) : filteredSelected.length===0 ? (
              <div className="rounded-[16px] border border-dashed bg-[var(--card-bg)] px-6 py-6 text-center" style={{borderColor:"var(--border)"}}>
                <div className="font-display text-[13px]">No plans</div>
                <div className="text-[11px] text-[var(--muted)] mt-1">{selected}</div>
                <button onClick={()=> setShowAdd(true)} className="mt-3 h-[36px] rounded-full bg-[#0A0A0A] px-4 text-[11px] text-white">Add event</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="px-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{filteredSelected.length} events</div>
                {filteredSelected.map(ev=> <AgendaRow key={ev.id} ev={ev} compact />)}
              </div>
            )}
          </div>
        </>
      ) : (
        // --- AGENDA MODE - boutique grouped ---
        <div className="space-y-5">
          {/* Single summary – replaces 2-col counts */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[16px] font-[700] tracking-tight" style={{fontFamily:'Fraunces, serif'}}>What’s ahead</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-[24px] items-center rounded-full px-2.5 text-[10.5px] font-[700] border bg-[#FEF1E2] text-[#A06A44] border-[#F4E1C9]">{scheduledAhead.length} ready</span>
              <span className="inline-flex h-[24px] items-center rounded-full px-2.5 text-[10.5px] font-[700] border bg-[#E8F1E8] text-[#5A7A64] border-[#CBE0CC]">{proposedAhead.length} needs you</span>
            </div>
          </div>

          {/* When viewing a future month in agenda, show that month's events — fixes "changing month does nothing" */}
          {(() => {
            const vmKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,"0")}`;
            const todayVm = todayDublin.slice(0,7);
            const isOtherMonth = vmKey !== todayVm;
            if(isOtherMonth){
              return (
                <div className="space-y-3">
                  <div className="rounded-[18px] border bg-[var(--card-bg)] px-4 py-3 flex items-center justify-between" style={{borderColor:"var(--border)"}}>
                    <div className="text-[13px] font-[650]">Showing {viewMonth.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
                    <span className="text-[11px] text-[var(--muted)]">{monthAllEvents.length} events</span>
                  </div>
                  {agendaMonthGrouped.length===0 ? (
                    <div className="rounded-[16px] border border-dashed bg-[var(--card-bg)] px-6 py-8 text-center text-[12px] text-[var(--muted)]">No events in {viewMonth.toLocaleDateString("en-GB",{month:"long"})}</div>
                  ) : agendaMonthGrouped.map(([k, evs])=> (
                    <div key={k} className="space-y-1.5">
                      <div className="px-1 text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--muted)]">{toLongDateDublin(k).slice(0, -6)}</div>
                      {evs.map(ev=> <AgendaRow key={ev.id+"-"+k} ev={ev as any} />)}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })()}
          <div className="rounded-[18px] border bg-[var(--card-bg)] px-3 py-3 flex items-center justify-between" style={{borderColor:"var(--border)"}}>
            <div className="flex items-center gap-2">
              <span className="grid h-[32px] w-[32px] place-items-center rounded-full border" style={{background:"#F9DCC0", borderColor:"#E8C5A6"}}>✦</span>
              <div>
                <div className="text-[12px] font-[650]">Today is {todayKeyStr.slice(5)}</div>
                <div className="text-[11px] text-[var(--muted)]">{todayEvents.length ? `${todayEvents.length} plans` : "Clear – want to add something?"}</div>
              </div>
            </div>
            <button onClick={()=> setShowAdd(true)} className="h-[36px] px-3.5 rounded-full bg-[#121214] text-white text-[11px] font-medium">+ Add</button>
          </div>

          {/* Today */}
          <div className="space-y-1.5">
            <div className="px-1 flex items-center justify-between">
              <span className="font-display text-[13px] flex items-center gap-2"><span className="h-[6px] w-[6px] rounded-full bg-[#FF6B26]" />Today • {todayKeyStr.slice(5)}</span>
              <span className="text-[11px] rounded-full bg-[#121214] text-white px-2 py-0.5 min-w-[22px] text-center">{todayEvents.length}</span>
            </div>
            <div className="space-y-1.5">
              {todayEvents.length===0 ? <div className="rounded-[14px] border border-dashed bg-[var(--card-bg)] px-4 py-4 text-center text-[11px] text-[var(--muted)]">No plans today – enjoy the breather</div> : todayEvents.map(ev=> <AgendaRow key={ev.id} ev={ev} dateKey={todayKeyStr} />)}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="px-1 flex items-center justify-between"><span className="font-display text-[13px] flex items-center gap-2"><span className="h-[6px] w-[6px] rounded-full bg-[#A89FDA]" />Tomorrow • {tomorrowKeyStr.slice(5)}</span><span className="text-[11px] text-[var(--muted)] border rounded-full px-2 py-0.5">{tomorrowEvents.length}</span></div>
            <div className="space-y-1.5">
              {tomorrowEvents.length===0 ? <div className="text-[11px] text-[var(--muted)] px-1 py-1">Free – nothing queued</div> : tomorrowEvents.map(ev=> <AgendaRow key={ev.id} ev={ev} dateKey={tomorrowKeyStr} />)}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="px-1"><span className="font-display text-[13px] flex items-center gap-2"><span className="h-[6px] w-[6px] rounded-full bg-[#8B7357]" />Later this week</span><span className="ml-3 text-[11px] text-[var(--muted)]">{laterEventsFlat.length} upcoming</span></div>
            <div className="space-y-1.5">
              {laterEventsFlat.length===0 ? <div className="text-[11px] text-[var(--muted)] px-1">Nothing else this week</div> : laterEventsFlat.slice(0,8).map(({key,ev})=> <AgendaRow key={ev.id+"-"+key} ev={ev} dateKey={key} />)}
              {laterEventsFlat.length>8 && <div className="px-1 text-[11px] text-[var(--muted)]">+{laterEventsFlat.length-8} more in {viewMonth.toLocaleDateString("en-GB",{month:"long"})} </div>}
            </div>
          </div>

          {/* Pending – boutique list with 44px kind chip */}
          <div className="rounded-[18px] border bg-[#FFFEFB] p-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)]" style={{borderColor:"#EDE2D6"}}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-[700] uppercase tracking-[0.08em] text-[#6B5A4E] flex items-center gap-1.5"><span className="h-[5px] w-[5px] rounded-full bg-[#FF6B26]" />Pending decisions • {proposedAhead.length}</span>
              <button onClick={()=> setShowHistory(v=>!v)} className="text-[11px] rounded-full border bg-white px-2.5 py-1 hover:bg-[#FFF4EC]" style={{borderColor:"#EDE2D6"}}>{showHistory ? "Hide" : "History"}</button>
            </div>
            {proposedAhead.length===0 ? (
              <div className="rounded-[12px] bg-[#FAF5EF] px-3 py-4 text-center text-[11px] text-[#8A7E74]">All caught up – nothing waiting</div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-auto no-scrollbar pr-0.5">
                {proposedAhead.slice(0,8).map(ev=> {
                  const kind = (ev as any).kind || (ev as any).eventKind || inferKindFromTitle(ev.title||"") || "other";
                  const kdef = (EVENT_KINDS as any)[kind] || EVENT_KINDS.other;
                  return (
                    <button key={ev.id} onClick={()=> setActiveEvent(ev)} className="w-full text-left flex items-center gap-3 rounded-[14px] border bg-white px-2.5 py-2.5 hover:bg-[#FFFEFB] transition min-h-[54px] group" style={{borderColor:"#F0E5D9"}}>
                      <span className="h-[44px] w-[44px] grid place-items-center rounded-full border shrink-0 text-[12px] font-[700]" style={{background:kdef.light.bg, borderColor:kdef.light.bg, color:kdef.light.fg}}>{kdef.label.slice(0,1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-[600] truncate group-hover:text-[#12100E]" style={{fontFamily:'Fraunces, serif'}}>{ev.title}</span>
                        <span className="block text-[11px] text-[#8E867F] truncate">{toLocalKeyDublin(ev.start||ev.dueAt,"")?.slice(5)} • {(ev as any).location || kdef.label}</span>
                      </span>
                      <span className="shrink-0 flex items-center gap-1.5"><span className="h-[6px] w-[6px] rounded-full bg-[#FF6B26] animate-pulse"/><span className="text-[10.5px] rounded-full bg-[#121214] text-white px-2 py-1 font-medium">{(ev.status||"").startsWith("awaiting")? "needs you" : "new"}</span></span>
                    </button>
                  );
                })}
              </div>
            )}
            {showHistory && (
              <div className="mt-3 pt-3 border-t" style={{borderColor:"#F0E5D9"}}>
                <div className="text-[11px] font-medium text-[#8A7E74] mb-1.5">History – declined / cancelled</div>
                <div className="flex flex-wrap gap-1.5">
                  {(events as any[]).filter(ev=> !ev.deletedAt && ["declined","cancelled"].includes(ev.status)).slice(0,10).map(ev=> <span key={ev.id} className="rounded-full border bg-white px-2.5 py-1 text-[11px] line-through opacity-70" style={{borderColor:"#EDE2D6"}}>{ev.title}</span>)}
                  {(events as any[]).filter(ev=> !ev.deletedAt && ["declined","cancelled"].includes(ev.status)).length===0 && <span className="text-[11px] text-[#9E968E]">No history yet</span>}
                </div>
              </div>
            )}
          </div>

          <button onClick={()=> setShowAdd(true)} className="w-full h-[48px] rounded-full bg-[#121214] text-white text-[13px] font-[600] shadow-[0_8px_20px_rgba(0,0,0,0.16)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.20)] transition">+ Add event • Dublin</button>
        </div>
      )}

      {/* V62 FAB - 56px black bottom-[88px] bigger shadow 0 12px 24px */}
      <div className="pointer-events-none sticky bottom-[88px] z-10 flex justify-end px-1 mt-2">
        <button onClick={()=> setShowAdd(true)} className="pointer-events-auto grid h-[56px] w-[56px] place-items-center rounded-full bg-[#0A0A0A] text-white shadow-[0_12px_24px_rgba(0,0,0,0.28)] active:scale-[0.98] text-[22px] font-semibold border border-white/10">+</button>
      </div>

      {/* Event detail sheet: V70 ownership clarity */}
      <BottomSheet open={!!activeEvent} onClose={()=> setActiveEvent(null)} title={activeEvent ? activeEvent.title : undefined}>
        {activeEvent && (()=> {
          const ev = activeEvent;
          const k = toLocalKeyDublin(ev.start||ev.dueAt||"", tz) || selected;
          const responses = getResponses(ev);
          const myResp = responses.find(r=> r.memberId===currentUser);
          const timeA = ev.allDay ? "All-day" : toTimeDublin(ev.start||ev.dueAt);
          const timeB = ev.end ? "→ "+toTimeDublin(ev.end) : "";
          const attendees = (ev as any).attendees || ["aisling","ciaran"];
          const proposer = (ev as any).proposer as PersonKey | undefined;
          const isBoth = attendees.length!==1;
          const ownerText = (()=> {
            const pName = proposer ? PERSONS[proposer as any].name : null;
            if (attendees.length===1) {
              const sole = attendees[0]; const soleName = PERSONS[sole as any].name;
              if (proposer && proposer===sole) return `${soleName}'s personal — created by ${pName}`;
              if (proposer) return `Created by ${pName} for ${soleName}`;
              return `${soleName}'s personal`;
            }
            return pName ? `Both — created by ${pName}` : "Both — shared";
          })();
          const myColor = currentUser==="aisling" ? "text-[#6B5CA8]" : "text-[#92400E]";
          return (
            <div className="space-y-3">
              <div className="rounded-[12px] border bg-[var(--card-bg)] px-3 py-2.5 text-[11px] space-y-1.5" style={{borderColor:"var(--border)"}}>
                <div className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 3v3M16 3v3"/></svg> {k} • {toLongDateDublin(k)}</div>
                <div className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> {timeA} {timeB}</div>
                {(ev as any).location && <div className="flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 21s7-6 7-10a7 7 0 1 0-14 0c0 4 7 10 7 10Z"/><circle cx="12" cy="11" r="2.5"/></svg> {(ev as any).location}</div>}
                <div className="flex items-center gap-2 flex-wrap"><span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{borderColor:'var(--border)', background: isBoth? 'var(--chip-bg)' : attendees[0]==="aisling" ? '#EDE8FF' : '#FFECD6', color: isBoth? '#6B5242' : attendees[0]==="aisling" ? '#6B5CA8':'#92400E'}}><span className={"grid h-[14px] w-[14px] place-items-center rounded-full text-[8px] font-bold text-white "+(isBoth?"bg-[#8B7357]":attendees[0]==="aisling"?"bg-[#A89FDA]":"bg-[#E07A5F]")}>{isBoth?"2":attendees[0]==="aisling"?"Á":"C"}</span>{ownerText}</span><span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] "+(ev.status==="agreed"?"bg-[var(--chip-bg)] text-[#6B5CA8] border-[#C4B5FD]": (ev.status as any)==="declined"?"bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]":"bg-[var(--card-bg)] text-[#92400E] border-[#FDBA74]")}>{String(ev.status||"proposed").replace("_"," ")}</span></div>
              </div>
              {ev.notes && <div className="text-[12px] bg-[var(--card-bg)] border rounded-[10px] p-2" style={{borderColor:"var(--border)"}}>{ev.notes}</div>}

              {/* Two-row ownership response matrix */}
              <div className="rounded-[12px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:'var(--border)'}}>
                {["aisling","ciaran"].map(pk=> {
                  const p = PERSONS[pk as any]; const resp = responses.find(r=> r.memberId===pk);
                  const isMe = pk===currentUser;
                  const label = (()=> {
                    if (!resp) return "Waiting";
                    if (resp.response==="yes") return "Yes";
                    if (resp.response==="no") return "No";
                    if (resp.response==="discuss") return "Needs talk";
                    return resp.response;
                  })();
                  const dot = resp?.response==="yes" ? "bg-[#16A34A]" : resp?.response==="no" ? "bg-[#DC2626]" : resp ? "bg-[#F59E0B]" : "bg-[var(--border)]";
                  const rowBg = isMe ? "bg-[var(--card-bg)]" : "bg-[var(--card-bg)]";
                  return (
                    <div key={pk} className={"flex items-center justify-between px-3 py-2 text-[12px] border-b last:border-0 "+rowBg+(isMe?" ring-[0.5px] ring-inset ring-[var(--border)]":"")} style={{borderColor:'var(--border)'}}>
                      <span className="flex items-center gap-2"><span className={"grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white "+(pk==="aisling"?"bg-[#A89FDA]":"bg-[#E07A5F]")}>{pk==="aisling"?"Á":"C"}</span><span className={"font-medium "+(isMe?myColor:"text-[var(--text)]")}>{p.name}{isMe?" (you)":""}</span></span>
                      <span className="flex items-center gap-1.5"><span className={"h-[7px] w-[7px] rounded-full "+dot}/><span className={"rounded-full border px-2 py-0.5 text-[10px] "+(isMe?"font-semibold bg-[var(--chip-bg)] text-[var(--text)]":"bg-[var(--card-bg)] text-[var(--text-secondary)]") } style={{borderColor:'var(--border)'}}>{label}</span></span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1.5">
                <button onClick={()=> handleResponse(ev,"yes")} className={"flex-1 h-[44px] rounded-full text-[11px] font-medium border "+(myResp?.response==="yes" ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[var(--card-bg)]") } style={{borderColor:"var(--border)"}}>Yes</button>
                <button onClick={()=> handleResponse(ev,"discuss")} className={"flex-1 h-[44px] rounded-full text-[11px] border "+(myResp?.response==="discuss" ? "bg-[var(--chip-bg)] border-[#A89FDA]" : "bg-[var(--chip-bg)]")} style={{borderColor:"var(--border)"}}>Discuss</button>
                <button onClick={()=> handleResponse(ev,"no")} className={"flex-1 h-[44px] rounded-full text-[11px] border "+(myResp?.response==="no" ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[var(--card-bg)]")} style={{borderColor:"var(--border)"}}>No</button>
              </div>

              <div className="flex gap-1.5">
                <input value={commentInputs[ev.id]||""} onChange={e=> setCommentInputs(c=> ({...c, [ev.id]: e.target.value}))} placeholder='Add a note — "Could we do Saturday?"' className="flex-1 rounded-full border bg-[var(--card-bg)] px-3 h-[44px] text-[11px]" style={{borderColor:"var(--border)"}} />
                <button disabled={!commentInputs[ev.id]?.trim()} onClick={()=> handleResponse(ev, (myResp as any)?.response as any || "discuss", commentInputs[ev.id])} className="rounded-full bg-[#0A0A0A] px-4 h-[44px] text-[11px] text-white disabled:opacity-40">Add note</button>
              </div>

              {responses.length>0 && (
                <div className="text-[11px] text-[var(--muted)]">
                  {responses.map(r=> `${(PERSONS[r.memberId as any]?.name||r.memberId||"?")}: ${r.response}${r.comment ? " — "+r.comment : ""}`).join(" • ")}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={()=> { setEditing(ev); setActiveEvent(null); }} className="flex-1 rounded-full border bg-[var(--card-bg)] h-[36px] text-[11px] font-medium" style={{borderColor:"var(--border)"}}>Edit</button>
                <button onClick={()=> togglePin(ev)} className="flex-1 rounded-full border bg-[var(--card-bg)] h-[36px] text-[11px]" style={{borderColor:"var(--border)"}}>{(ev as any).pinned ? "Unpin" : "Pin"}</button>
                <button onClick={()=> setConfirmDialog({title:"Cancel event?", msg:"It stays visible as cancelled.", onConfirm:()=>{ updateEvent(ev.id, { status:"cancelled" as any }); setActiveEvent(null); setConfirmDialog(null); }})} className="flex-1 rounded-full border bg-[var(--card-bg)] h-[36px] text-[11px] text-[#6B7280]" style={{borderColor:"var(--border)"}}>Cancel</button>
              </div>
              <button onClick={()=> setConfirmDialog({title:"Delete event?", msg:"This removes it for both of you. Can't be undone.", onConfirm:()=>{ removeEvent(ev.id); setActiveEvent(null); setConfirmDialog(null); }})} className="w-full rounded-full border border-[#FECACA] bg-[#FEF2F2] h-[44px] text-[12px] font-semibold text-[#B91C1C] flex items-center justify-center gap-1.5 active:scale-[0.98]">🗑 Delete event</button>
            </div>
          );
        })()}
      </BottomSheet>

      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Add event • Dublin">
        <AddEventForm onAdd={(ev:any)=> { setEvents((p:any)=> [ev, ...p]); setShowAdd(false); try{ hardPersistCalendar(ev,'create'); }catch{} }} currentUser={currentUser} selectedDate={selected} />
      </BottomSheet>

      <BottomSheet open={!!editing} onClose={()=> setEditing(null)} title={editing ? "Edit event" : undefined}>
        {editing && (
          <div className="space-y-3">
            <AddEventForm onAdd={(ev:any)=> {
              if (editing.templateId || editing.isTemplate) { setShowEditSeriesAsk({ ev: editing, draft: ev }); return; }
              setEvents((prev:any)=> prev.map((x:any)=> x.id===editing.id ? {...x, ...ev, id: x.id} : x));
              try{ hardPersistCalendar({...ev, id: editing.id},'update'); }catch{}
              setEditing(null);
            }} currentUser={currentUser} selectedDate={selected} initialEvent={editing} />
            <button onClick={()=> setConfirmDialog({title:"Delete event?", msg:"This removes it for both of you.", onConfirm:()=>{ removeEvent(editing!.id); setEditing(null); setConfirmDialog(null); }})} className="w-full rounded-full border border-[#FECACA] bg-[#FEF2F2] py-3 text-[12px] font-semibold text-[#B91C1C] min-h-[48px] flex items-center justify-center gap-1.5">🗑 Delete event</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!showEditSeriesAsk} onClose={()=> setShowEditSeriesAsk(null)} title="Edit recurring">
        {showEditSeriesAsk && (
          <div className="space-y-2">
            <div className="text-[12px]">This is a recurring event: {showEditSeriesAsk.ev.title}. How to apply change?</div>
            <button onClick={()=> {
              const { ev, draft } = showEditSeriesAsk;
              const templateId = ev.templateId || ev.id;
              const occurrenceId = ev.occurrenceId || (()=>{ try{ return toLocalKeyDublin(ev.dueAt||ev.start||"", HOUSEHOLD_TZ)||"" }catch{return ""}})();
              const nowISO = new Date().toISOString();
              const override = {
                ...draft,
                id: uid("cal_ovr"),
                templateId,
                occurrenceId,
                occurrenceDate: occurrenceId,
                seriesId: templateId,
                isTemplate: false,
                isOverride: true,
                updatedAt: nowISO,
                createdAt: nowISO,
              };
              setEvents((prev:any)=> {
                const filtered = prev.filter((x:any)=> !(x.templateId===templateId && x.occurrenceId===occurrenceId && x.id!==templateId));
                return [override, ...filtered];
              });
              try{ upsertCalendarOverride({ id: override.id, seriesId: templateId, occurrenceDate: occurrenceId, occurrenceId, data: override, title: (override as any).title }).catch(()=>{}); }catch{}
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full bg-[#0A0A0A] h-[44px] text-white text-[11px]">This event only</button>
            <button onClick={()=> {
              const { ev, draft } = showEditSeriesAsk;
              const templateId = ev.templateId || ev.id;
              const occurrenceId = ev.occurrenceId || (()=>{ try{ return toLocalKeyDublin(ev.dueAt||ev.start||"", HOUSEHOLD_TZ)||"" }catch{return ""}})();
              // split series: truncate original at day-1, new series starts at occurrence
              const prevDayKey = occurrenceId ? addDaysKey(occurrenceId, -1) : null;
              const nowISO = new Date().toISOString();
              const draftHourMin = (()=>{ try{ const hm=getDublinHourMinuteFromIso((draft as any).dueAt||(draft as any).start||ev.dueAt||"", HOUSEHOLD_TZ); return hm; }catch{return {h:9,m:0}} })();
              // derive new series dueAt from occurrence wall + draft time if draft provides new time
              let newDueAt = (draft as any).dueAt || (draft as any).start || ev.dueAt;
              // if draft has same time logic, reconstruct from occurrenceId + draft time to avoid device TZ
              try{
                if (occurrenceId) {
                  const [yy,mm,dd] = occurrenceId.split("-").map(Number);
                  if (yy&&mm&&dd) {
                    const h = draftHourMin.h; const m = draftHourMin.m;
                    const { tzWallToUtc: wallToUtc } = (()=>{ try{ return { tzWallToUtc } }catch{return {tzWallToUtc: (a:any,b:any,c:any,d:any,e:any)=> new Date()} } })() as any;
                    // use imported tzWallToUtc directly
                    const probe = tzWallToUtc(yy, mm, dd, h, m, 0, HOUSEHOLD_TZ);
                    newDueAt = probe.toISOString();
                  }
                }
              }catch{}
              const newSeriesId = uid("cal");
              const newSeries = {
                ...draft,
                id: newSeriesId,
                isTemplate: true,
                dueAt: newDueAt,
                start: newDueAt,
                originalDom: (draft as any).originalDom ?? (ev as any).originalDom ?? (()=>{ try{ const [,,dd]=occurrenceId.split("-").map(Number); return dd }catch{return undefined}})(),
                createdAt: nowISO,
                updatedAt: nowISO,
                recurrenceUntil: undefined,
              };
              setEvents((prev:any)=> {
                let out = prev.map((x:any)=> {
                  if (x.id===templateId) {
                    return { ...x, recurrenceUntil: prevDayKey, updatedAt: nowISO };
                  }
                  return x;
                });
                // remove future overrides for old series (occurrence >= this)
                out = out.filter((x:any)=> {
                  if (x.templateId===templateId && x.occurrenceId && occurrenceId) {
                    if (x.occurrenceId >= occurrenceId) return false;
                  }
                  return true;
                });
                return [newSeries, ...out];
              });
              try{ 
                upsertCalendarSeries({ id: templateId } as any).catch(()=>{});
                upsertCalendarSeries({ id: newSeriesId, title: (newSeries as any).title, frequency: (newSeries as any).frequency, frequencyDetail: (newSeries as any).frequencyDetail, timezone: HOUSEHOLD_TZ } as any).catch(()=>{});
              }catch{}
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full border bg-[var(--card-bg)] h-[44px] text-[11px]" style={{borderColor:"var(--border)"}}>This and future events</button>
            <button onClick={()=> {
              const { draft } = showEditSeriesAsk;
              const templateId = showEditSeriesAsk.ev.templateId || showEditSeriesAsk.ev.id;
              const nowISO = new Date().toISOString();
              setEvents((prev:any)=> prev.map((x:any)=> x.id===templateId ? {...x, ...draft, id: templateId, isTemplate:true, updatedAt: nowISO} : x).filter((x:any)=> !(x.templateId===templateId && x.id!==templateId)));
              try{ upsertCalendarSeries({ id: templateId, title: (draft as any).title, frequency: (draft as any).frequency, frequencyDetail: (draft as any).frequencyDetail, timezone: HOUSEHOLD_TZ } as any).catch(()=>{}); }catch{}
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full border bg-[var(--card-bg)] h-[44px] text-[11px]" style={{borderColor:"var(--border)"}}>Entire series</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!confirmDialog} onClose={()=> setConfirmDialog(null)} title={confirmDialog?.title || "Confirm"}>
        {confirmDialog && (
          <div className="space-y-3">
            {confirmDialog.msg && <div className="text-[12px] text-[var(--muted)]">{confirmDialog.msg}</div>}
            <div className="flex gap-2">
              <button onClick={()=> setConfirmDialog(null)} className="flex-1 rounded-full border bg-[var(--card-bg)] py-2.5 text-[12px] min-h-[44px]" style={{borderColor:"var(--border)"}}>Cancel</button>
              <button onClick={()=> { confirmDialog.onConfirm(); }} className="flex-1 rounded-full bg-[#0A0A0A] py-2.5 text-[12px] text-white min-h-[44px]">Confirm</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}



export default CalendarPageV2;
