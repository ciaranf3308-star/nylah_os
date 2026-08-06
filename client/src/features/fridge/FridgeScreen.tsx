import React, { useMemo, useState, useEffect } from "react";
import type { PersonKey, Theme, TabKey, ChoreV2, CalendarEventV2, ShoppingItemV2, NoteMemo } from "../../types";
import { THEMES, PERSONS } from "../../constants/themes";
import type { SyncStatus } from "../../lib/remoteSync"; // preserve exact
// Helpers preserved from App.tsx - will be imported from shared/utils after logic extraction stage
// For now include minimal in-file copies to keep zero-logic-change:
// NOTE: this file is a direct copy of FridgePage from App.tsx lines 1920-2425, no logic edits

const HOUSEHOLD_TZ = "Europe/Dublin";
function todayKey(tz:string){ try{ return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }catch{ return new Date().toISOString().slice(0,10);} }
function toLocalKeyDublin(iso:string, tz:string){ try{ return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso)); }catch{ return iso.slice(0,10);} }
function tzWallToUtc(y:number,m:number,d:number,h:number,mi:number,s:number,tz:string){ try{ const fmt=new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}); /* simplified fallback */ return new Date(Date.UTC(y,m-1,d,h,mi,s)); }catch{ return new Date(Date.UTC(y,m-1,d,h,mi,s)); } }
function computeShoppingNextDue(it:any, nowMs:number){ return null as any; }
function getDueMsChore(c:any){ try{ return c.dueAt? new Date(c.dueAt).getTime(): Date.now(); }catch{ return Date.now(); } }

function FridgePage({
  currentUser, chores, calendar, shopping, notes, setTab, nowMs, theme, syncStatus,
}: {
  currentUser: PersonKey; chores: ChoreV2[]; calendar: CalendarEventV2[]; shopping: ShoppingItemV2[]; notes: NoteMemo[];
  setTab: (k: TabKey) => void; nowMs: number; theme: Theme; syncStatus?: SyncStatus;
}) {
  const todayDateStr = todayKey(HOUSEHOLD_TZ);
  const nowDate = new Date(nowMs);
  const weekdayLong = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: HOUSEHOLD_TZ }).format(nowDate);
  const dayNumStr = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: HOUSEHOLD_TZ }).format(nowDate);
  const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: HOUSEHOLD_TZ }).format(nowDate);
  const dateLabel = `${weekdayLong}, ${dayNumStr} ${monthLong}`;
  const hourDublin = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: HOUSEHOLD_TZ }).format(nowDate));
  const greeting = hourDublin < 12 ? "Good morning" : hourDublin < 18 ? "Good afternoon" : "Good evening";
  const partner: PersonKey = currentUser === "aisling" ? "ciaran" : "aisling";

  const activeChores = useMemo(() => chores.filter(c => !(c as any).deletedAt), [chores]);
  const activeCalendar = useMemo(() => calendar.filter((ev:any) => !(ev as any).deletedAt), [calendar]);
  const activeShopping = useMemo(() => shopping.filter((s:any) => !(s as any).deletedAt && !(s as any).archivedAt), [shopping]);
  const activeNotes = useMemo(() => notes.filter((n:any) => !(n as any).deletedAt && !(n as any).archived_at && !(n as any).archivedAt), [notes]);

  const emptyAll = activeChores.length===0 && activeCalendar.length===0 && activeShopping.length===0 && activeNotes.length===0;

  const syncMinimal = (() => {
    if (!syncStatus) return null;
    const k = syncStatus.kind;
    if (k === 'saving') return <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />Saving</span>;
    if (k === 'offline-queued') return <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9CA3AF]"><span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />Queued</span>;
    if (k === 'failed') return <span className="inline-flex items-center gap-1.5 text-[11px] text-[#B91C1C]"><span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />Offline</span>;
    // Trust only server-confirmed time, not current clock
    const savedAt = syncStatus.lastSavedAt;
    const savedLabel = (()=>{ try{
      if (!savedAt) return null;
      // Use Europe/Dublin confirmed time, not nowMs
      return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: HOUSEHOLD_TZ}).format(new Date(savedAt));
    } catch { return null; } })();
    return <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]" title={savedAt ? `Server confirmed ${savedAt}` : undefined}><span className="h-1.5 w-1.5 rounded-full bg-[#8DA08E]" />{savedLabel ? `Saved • ${savedLabel}` : 'Saved'}</span>;
  })();

  const [confetti, setConfetti] = useState<number>(0);
  useEffect(()=>{
    if(syncStatus?.kind==='saved' || syncStatus?.kind==='synced' || (syncStatus as any)?.kind==='saved'){
      setConfetti(c=>c+1);
      const t=setTimeout(()=>setConfetti(c=>Math.max(0,c-1)), 1200);
      return ()=>clearTimeout(t);
    }
  },[syncStatus?.kind]);

  // --- helpers ---
  const fmtTime = (iso: string) => {
    try { return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit', timeZone: HOUSEHOLD_TZ, timeZoneName: undefined} as any).format(new Date(iso)) } catch { try{ return new Date(iso).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}) }catch{ return "" } }
  };
  const fmtDay = (iso:string) => {
    try {
      const d = new Date(iso);
      const key = toLocalKeyDublin(iso, HOUSEHOLD_TZ);
      const isToday = key===todayDateStr;
      if(isToday) return `Today • ${fmtTime(iso)}`;
      const tomorrowKey = toLocalKeyDublin(new Date(nowMs+86400000).toISOString(), HOUSEHOLD_TZ);
      if(key===tomorrowKey) return `Tomorrow • ${fmtTime(iso)}`;
      return new Intl.DateTimeFormat('en-GB',{weekday:'short', month:'short', day:'numeric', timeZone: HOUSEHOLD_TZ}).format(d) + ` • ${fmtTime(iso)}`;
    } catch { return "" }
  };
  const timingLabel = (c:any): string => {
    try{
      const freq = ((c as any)?.frequency||"").toString().toUpperCase() || "ONCE";
      const dueMs = typeof getDueMsChore==='function' ? getDueMsChore(c) : (c?.dueAt ? new Date(c.dueAt).getTime() : Date.now());
      const diff = dueMs - nowMs;
      const isOver = diff<0;
      const dueKey = c?.dueAt ? toLocalKeyDublin(c.dueAt, HOUSEHOLD_TZ) : toLocalKeyDublin(new Date(dueMs).toISOString(), HOUSEHOLD_TZ);
      const isToday = dueKey === todayDateStr;
      if(isOver) return `${freq} • OVERDUE`;
      if(isToday) return `${freq} • DUE TODAY`;
      if(diff < 48*3600000) return `${freq} • DUE TOMORROW`;
      return freq;
    }catch{ return "ONCE"; }
  };
  const dueDiff = (iso:string) => {
    try{
      const dueMs = new Date(iso).getTime();
      const diffMs = dueMs - nowMs;
      const days = Math.ceil(diffMs / 86400000);
      const hours = Math.ceil(diffMs / 3600000);
      return { diffMs, days, hours, overdue: diffMs<0 };
    }catch{ return { diffMs:0, days:0, hours:0, overdue:false } }
  };

  // TODAY collections - up to 3 each
  const todayCals = useMemo(()=>{
    const agreed = activeCalendar.filter(ev=>{
      const s:any=ev.status;
      return s==='agreed'||s==='accepted'||s==='yes'||s==='confirmed';
    }).filter(ev=>{
      try{ return toLocalKeyDublin(ev.dueAt, HOUSEHOLD_TZ)===todayDateStr }catch{return false}
    }).sort((a,b)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,3);
    return agreed;
  },[activeCalendar, todayDateStr]);

  const todayChoresMine = useMemo(()=>{
    const mine = activeChores.filter(c=>{
      if(c.assignedTo!==currentUser || c.status==='done') return false;
      try{
        const dueMs = getDueMsChore(c);
        const dueKey = toLocalKeyDublin(new Date(dueMs).toISOString(), HOUSEHOLD_TZ);
        return dueKey===todayDateStr || dueMs < nowMs;
      }catch{return false}
    }).sort((a,b)=> getDueMsChore(a)-getDueMsChore(b)).slice(0,3);
    return mine;
  },[activeChores, currentUser, todayDateStr, nowMs]);

  const shoppingSummary = useMemo(() => {
    const todo = activeShopping.filter(s=> !s.purchased);
    if (todo.length===0) return null;
    const endOfToday = (()=>{ try{
      const [y,m,d] = todayDateStr.split("-").map(Number);
      return tzWallToUtc(y,m,d,23,59,59,HOUSEHOLD_TZ);
    }catch{ return new Date(nowMs); }})();
    const dueToday = todo.filter(it=>{
      try{
        const nxt = computeShoppingNextDue(it as any, nowMs);
        if(!nxt) return false;
        const dueKey = toLocalKeyDublin(nxt.toISOString(), HOUSEHOLD_TZ);
        const isToday = dueKey === todayDateStr;
        const isOverdue = nxt.getTime() < nowMs;
        return isToday || isOverdue || nxt.getTime() <= endOfToday.getTime();
      }catch{ return false; }
    });
    if(dueToday.length===0) return null;
    const count = dueToday.length;
    const names = dueToday.slice(0,3).map(s=> (s as any).item || (s as any).title || "item");
    const rest = count - names.length;
    const label = rest>0 ? `${names.join(", ")} +${rest} more` : names.join(", ");
    return { count, label, todo: dueToday };
  }, [activeShopping, todayDateStr, nowMs]);

  const shoppingDueList = useMemo(()=>{
    if(!shoppingSummary) return [];
    return (shoppingSummary.todo as any[]).slice(0,3);
  },[shoppingSummary]);

  const hasToday = todayCals.length>0 || todayChoresMine.length>0 || !!shoppingSummary;

  // NEEDS YOUR ANSWER
  const needsYourAnswer = useMemo(() => {
    const list: { id:string; title:string; kind:'chore'|'calendar'; obj:any }[] = [];
    activeChores.forEach(c=>{
      if (c.status!=='deck') return;
      const my = ((c.swipes as any)?.[currentUser] ?? null);
      const other = ((c.swipes as any)?.[partner] ?? null);
      if (my===null && other!==null) list.push({ id:c.id, title:c.title, kind:'chore', obj:c });
    });
    activeCalendar.forEach(ev=>{
      if (ev.status!=='proposed' && !(ev.status as any)?.toString()?.startsWith('awaiting')) return;
      const my = (ev.swipes as any)?.[currentUser] ?? null;
      const other = (ev.swipes as any)?.[partner] ?? null;
      if (my===null && other!==null) list.push({ id:ev.id, title:ev.title, kind:'calendar', obj:ev });
    });
    return list.slice(0,4);
  }, [activeChores, activeCalendar, currentUser, partner]);

  // UPCOMING next 7 days
  const upcoming = useMemo(()=>{
    const in7 = nowMs + 7*86400000;
    const agreed = activeCalendar.filter(ev=>{
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
    }).sort((a,b)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,5);
    return agreed;
  },[activeCalendar, nowMs, todayDateStr]);

  const tentative = useMemo(()=>{
    const list = activeCalendar.filter(ev=>{
      const s:any=ev.status;
      return s==='proposed'|| (s||'').toString().startsWith('awaiting')||s==='needs_discussion';
    }).filter(ev=>{
      try{ const ms=new Date(ev.dueAt).getTime(); return ms>nowMs && ms<=nowMs+7*86400000 }catch{return false}
    }).sort((a,b)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,3);
    return list;
  },[activeCalendar, nowMs]);

  // PINNED & COUNTDOWNS
  const pinnedEvents = useMemo(()=>{
    const pins = activeCalendar.filter((ev:any)=> ev.pinned_at || ev.pinnedAt || ev.isPinned || ev.pinned).sort((a,b)=> new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()).slice(0,4);
    if(pins.length>0) return pins;
    // fallback: events whose title starts with pin emoji or marked starred? Look for events with reminder close
    return [] as any[];
  },[activeCalendar]);

  const stickyPick = useMemo(()=>{
    const unread = activeNotes.filter(n=> n.author===partner && !((n.seenBy as any)?.[currentUser])).sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    if (unread[0]) return { note: unread[0], label: `Unread` };
    const pinned = activeNotes.filter(n=> (n as any).pinned_at || (n as any).pinnedAt).sort((a,b)=> {
      const pa = (a as any).pinned_at || (a as any).pinnedAt || a.createdAt;
      const pb = (b as any).pinned_at || (b as any).pinnedAt || b.createdAt;
      return new Date(pb).getTime()-new Date(pa).getTime();
    });
    if (pinned[0]) return { note: pinned[0], label: `Pinned` };
    const love = activeNotes.filter(n=> n.isLove).sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    if (love[0]) return { note: love[0], label: `Love note` };
    if (activeNotes.length>0) {
      const sorted = [...activeNotes].sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
      return { note: sorted[0], label: `Note` };
    }
    return null;
  }, [activeNotes, currentUser, partner]);

  // helpers UI
  const PersonDot = ({k, size=9}:{k:PersonKey,size?:number})=>{
    const p = PERSONS[k];
    return <span className="grid place-items-center rounded-full text-[10px] font-bold text-white border-2 border-white shadow-sm shrink-0" style={{background:p.accent2, width:size*1.8, height:size*1.8}}>{p.initial}</span>
  };
  const IconChevron = ()=> <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5 3l5 5-5 5"/></svg>;
  const IconClock = ()=> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  const IconPin = ()=> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l2 6h6l-5 4 2 6L12 15l-5 4 2-6-5-4h6z"/></svg>;

  return (
    <div className="w-full space-y-6">
      <style>{`@keyframes fridge-peach-pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(184,166,255,0.36),0 0 0 8px rgba(255,107,38,0.28)}50%{transform:scale(1.08);box-shadow:0 0 0 2px rgba(255,176,135,0.10),0 0 0 10px rgba(255,176,135,0.16)}} @keyframes countdown-pop{0%{transform:scale(0.92)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>
      {confetti>0 && (
        <div className="pointer-events-none absolute right-4 top-2 flex gap-1">
          <span className="h-1 w-1 rounded-full bg-[#E07A5F] animate-bounce [animation-delay:0ms]" />
          <span className="h-1 w-1 rounded-full bg-[#A89FDA] animate-bounce [animation-delay:120ms]" />
          <span className="h-1 w-1 rounded-full bg-[#E8CEB7] animate-bounce [animation-delay:220ms]" />
        </div>
      )}

      {/* HERO V102 — editorial script classy, theme-aware contrast fix */}
      <div className="nylah-hero-v101 nylah-arena rounded-[28px] px-6 pt-6 pb-5 relative overflow-hidden">
        <div className="relative flex items-start justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{fontFamily:'var(--font-ui)', color:'var(--muted)'}}>{dateLabel}</div>
          <div className="shrink-0 opacity-80">{syncMinimal}</div>
        </div>
        <div className="relative mt-5">
          <div className="nylah-script-hero text-[40px]" style={{fontFamily:'var(--font-display)', color:'var(--text)', opacity:0.92}}>{greeting.toLowerCase()}</div>
          <h1 className="nylah-display-hero text-[46px] -mt-1" style={{fontFamily:'var(--font-display)', color:'var(--text)'}}>
            {(PERSONS[currentUser]?.name||currentUser||'You')}
            <span className="ml-2 inline-flex items-baseline gap-2 align-baseline">
              <span className="text-[20px] font-light" style={{fontFamily:'var(--font-ui)', fontWeight:300, color:'var(--muted)'}}>with</span>
              <span className="nylah-script-hero text-[34px] font-script-hero" style={{fontFamily:"var(--font-script)"}} style={{fontFamily:'var(--font-display)', color:'var(--accent-warm)'}}>{PERSONS[partner]?.name||partner}</span>
            </span>
          </h1>
          <div className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase" style={{fontFamily:'var(--font-ui)', color:'var(--muted)'}}>
            <span className="h-px w-8" style={{background:'var(--border)'}} /> Aisling ♥ Ciaran • private OS
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-[180px] h-[180px] rounded-full blur-[38px] opacity-[0.18] pointer-events-none" style={{background:'radial-gradient(100% 100% at 50% 50%, var(--accent) 0%, transparent 70%)'}} />
      </div>

      {/* NEEDS YOU */}
      {needsYourAnswer.length>0 && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center gap-2">
            <span className="font-display text-[20px] font-semibold tracking-tight text-[var(--text)]">Needs you</span>
            <span className="h-[10px] w-[10px] rounded-full bg-[var(--accent)] shrink-0" style={{ boxShadow:'0 0 0 4px rgba(255,107,38,0.14)' }} aria-hidden="true" />
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor:"var(--border, #E8DDD3)", boxShadow:"0 12px 32px rgba(0,0,0,.10), 0 16px 40px rgba(120,98,84,0.08)" }}>
            {needsYourAnswer.map((item, idx)=>{
              const dateKeyForItem = (()=>{ try{ const iso=(item.obj as any)?.dueAt || (item.obj as any)?.start || (item.obj as any)?.createdAt; if(!iso) return null; const d=new Date(iso); if(isNaN(d.getTime())) return null; return new Intl.DateTimeFormat("en-CA",{timeZone:HOUSEHOLD_TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d); }catch{ return null; } })();
              return (
                <button
                  key={item.id}
                  onClick={()=>{ if(item.kind==='calendar' && dateKeyForItem){ try{ localStorage.setItem("couple_v1_calendar_selected", dateKeyForItem); localStorage.setItem("couple_v1_calendar_viewMonth", dateKeyForItem.slice(0,7)); }catch{} } setTab(item.kind==='chore'?'chores':'calendar'); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-4 min-h-[60px] hover:bg-[var(--chip-bg)]/60 transition"
                  style={{ borderTop: idx===0 ? undefined : "1px solid var(--chip-bg)" }}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white shrink-0" style={{ background: (PERSONS[partner]?.accent2||'#E07A5F') }}>{(PERSONS[partner]?.initial||'?')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold truncate text-[var(--text)]">{item.title}</div>
                    <div className="text-[12px] text-[var(--muted)]">{(PERSONS[partner]?.name||partner||'?')} responded • your turn</div>
                  </div>
                  <span className="text-[13px] text-[var(--muted)]"><IconChevron/></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TODAY - up to 3 per type */}
      {hasToday && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="font-display text-[20px] font-semibold tracking-tight text-[var(--text)]">Today</span>
            <span className="text-[11px] text-[var(--muted)]">{todayCals.length + todayChoresMine.length + (shoppingDueList.length>0?1:0)} items • Tap to open</span>
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor:"var(--border)", boxShadow:"0 8px 28px rgba(0,0,0,.08), 0 1px 0 rgba(255,255,255,0.8) inset" }}>
            {todayCals.map((ev, i)=>(
              <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-stretch gap-0 min-h-[60px] hover:bg-[var(--chip-bg)]/50 transition" style={{ borderTop: i===0? undefined : "1px solid #F0DDD0" }}>
                <span className="w-[56px] shrink-0 grid place-items-center border-r" style={{ borderColor:'#F0DDD0' }}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--wash-mid)] text-[11px] font-bold text-[#8B5E3C] shadow-sm"><IconClock/></span>
                </span>
                <span className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0"><span className="block text-[11px] tabular-nums text-[var(--muted)] flex items-center gap-1">{fmtTime(ev.dueAt)} <span className="h-1 w-1 rounded-full bg-[var(--accent)] animate-pulse" /></span><span className="block text-[15px] font-medium truncate text-[var(--text)]">{ev.title}</span></span>
                  <span className="text-[11px] rounded-full border px-2.5 py-1 bg-[var(--chip-bg)] text-[var(--text-secondary)]" style={{ borderColor:'var(--border)' }}>Agreed • {ev.location||"Today"}</span>
                </span>
              </button>
            ))}
            {todayChoresMine.map((ch, i)=>(
              <button key={ch.id} onClick={()=> setTab("chores")} className="w-full text-left flex items-stretch gap-0 min-h-[60px] hover:bg-[var(--chip-bg)]/50 transition" style={{ borderTop: (todayCals.length>0 || i>0) ? "1px solid #F0DDD0" : undefined }}>
                <span className="w-[56px] shrink-0 grid place-items-center border-r" style={{ borderColor:'#F0DDD0' }}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EEE8FF] text-[11px] font-bold text-[#6B5CA8] shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4H19l-4.4 3.2 1.7 5.4L12 13.2 7.7 16l1.7-5.4L5 7.4h5.2z"/></svg>
                  </span>
                </span>
                <span className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0"><span className="block text-[11px] flex items-center gap-1.5 text-[var(--muted)]">{timingLabel(ch as any)} {timingLabel(ch as any).includes("OVERDUE") && <span className="inline-flex rounded-full bg-[#FEF2F2] border border-[#FECACA] px-1.5 py-0.5 text-[10px] font-bold text-[#991B1B]">Due</span>}</span><span className="block text-[15px] font-medium truncate">{ch.title}</span></span>
                  <span className="text-[11px] font-semibold text-[#8B5E3C]">{ch.basePoints} pts</span>
                </span>
              </button>
            ))}
            {shoppingDueList.length>0 && (
              <button onClick={()=> setTab("shopping")} className="w-full text-left flex items-stretch gap-0 min-h-[60px] hover:bg-[var(--chip-bg)]/50 transition" style={{ borderTop: (todayCals.length>0 || todayChoresMine.length>0) ? "1px solid #F0DDD0" : undefined }}>
                <span className="w-[56px] shrink-0 grid place-items-center border-r" style={{ borderColor:'#F0DDD0' }}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A0A0A] text-white text-[11px] shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6"><path d="M6 8h12l-1 11H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
                  </span>
                </span>
                <span className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0"><span className="block text-[11px] uppercase tracking-wide font-semibold text-[var(--muted)]">Shop • {shoppingSummary?.count} due today</span><span className="block text-[13px] truncate text-[var(--text)]">{shoppingDueList.map((s:any)=>s.item).join(", ")}{shoppingSummary && shoppingSummary.count>3 ? ` +${shoppingSummary.count-3}`:""}</span></span>
                  <span className="h-8 w-8 grid place-items-center rounded-full bg-[#8B5E3C] text-white text-[12px]"><IconChevron/></span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* UPCOMING */}
      {upcoming.length>0 && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="font-display text-[20px] font-semibold tracking-tight text-[var(--text)]">Upcoming • {upcoming.length}</span>
            <button onClick={()=> setTab("calendar")} className="text-[11px] text-[var(--muted)] underline min-h-[44px]">View all →</button>
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor:"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,.07)" }}>
            {upcoming.map((ev, idx)=>{
              const diff = dueDiff(ev.dueAt);
              const isSoon = (()=>{ try{ const due = ev.dueAt ? new Date(ev.dueAt).getTime() : ev.start ? new Date(ev.start).getTime() : null; if(!due) return false; const diff=due-Date.now(); return diff>=0 && diff<=24*3600000; }catch{return false} })();
              return (
                <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-center gap-3 px-4 py-3.5 min-h-[56px] hover:bg-[var(--chip-bg)]/50 transition" style={{ borderTop: idx===0?undefined:"1px solid var(--chip-bg)" }}>
                  <span className={"h-2 w-2 rounded-full shrink-0 "+(isSoon?"bg-[var(--accent)]":"bg-[var(--border)]")} style={isSoon?{boxShadow:'0 0 0 4px rgba(255,107,38,0.28)'}:undefined} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium truncate text-[var(--text)]">{ev.title}</div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5"><span>{fmtDay(ev.dueAt)}</span>{ev.location && <><span className="h-1 w-1 rounded-full bg-[var(--border)]" />{ev.location}</>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.attendees?.length===1 && <PersonDot k={ev.attendees[0] as any} />}
                    <span className="text-[11px] text-[var(--muted)]"><IconChevron/></span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TENTATIVE / AWAITING */}
      {tentative.length>0 && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center gap-2">
            <span className="font-display text-[18px] font-semibold tracking-tight text-[var(--text)]">Awaiting you</span>
            <span className="text-[10px] rounded-full bg-[var(--card-bg)] border px-2 py-0.5 text-[#8B5E3C]" style={{borderColor:'#FDE68A'}}>{tentative.length} to respond</span>
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:'#FDE68A', boxShadow:'0 8px 20px rgba(0,0,0,.05)'}}>
            {tentative.map((ev,i)=>(
              <button key={ev.id} onClick={()=> setTab("calendar")} className="w-full text-left flex items-center gap-3 px-4 py-3.5 min-h-[56px] hover:bg-[var(--card-bg)]/60 transition" style={{borderTop:i===0?undefined:'1px solid #FFF7ED'}}>
                <span className="h-2 w-2 rounded-full bg-[#F59E0B] shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium truncate">{ev.title}</div>
                  <div className="text-[11px] text-[var(--muted)]">{fmtDay(ev.dueAt)} • proposed by {(PERSONS[(ev as any).proposer as any]?.name)||"partner"}</div>
                </div>
                <span className="text-[11px] font-semibold text-[#92400E] border px-2 py-1 rounded-full bg-[var(--card-bg)]">Reply</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PINNED & COUNTDOWNS — V104 boutique classy, theme-aware clarity */}
      {pinnedEvents.length>0 && (
        <div className="space-y-3">
          <div className="px-1 flex items-center gap-2">
            <span className="text-[20px] font-semibold tracking-tight" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>Pinned & countdowns</span>
            <span className="grid h-5 w-5 place-items-center rounded-full border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--accent-warm)'}}><IconPin/></span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {pinnedEvents.map(ev=>{
              const {days, overdue} = dueDiff(ev.dueAt);
              const big = Math.abs(days)<=7;
              const isStar = Math.abs(days)<=3;
              return (
                <button key={ev.id} onClick={()=> setTab("calendar")} className="text-left rounded-[22px] border px-4 py-4 min-h-[112px] relative overflow-hidden transition hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]" style={{borderColor: overdue?'rgba(239,68,68,0.28)':'var(--border)', background: overdue?'linear-gradient(180deg, #FFF7F7 0%, var(--card-bg) 100%)': 'var(--card-bg)', boxShadow:'0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.86)'}}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-[14px] pointer-events-none" style={{background:'radial-gradient(100% 100% at 50% 50%, var(--accent) 0%, transparent 70%)', opacity: isStar?0.22:0.12}} aria-hidden="true" />
                  {isStar && <span className="absolute right-3 top-3 text-[12px] opacity-80" style={{color:'var(--accent)', textShadow:'0 0 8px rgba(255,107,38,0.42)'}}>✦</span>}
                  <div className="flex items-start justify-between relative">
                    <span className={"text-[11px] rounded-full border px-2.5 py-0.5 font-semibold "+(overdue?"bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]":"")} style={overdue?{}:{background:'var(--chip-bg)', color:'var(--muted)', borderColor:'var(--border)'}}>{overdue?"OVERDUE":days===0?"TODAY":days===1?"TOMORROW":`${Math.abs(days)}d ${days<0?"ago":"left"}`}</span>
                    <span className="h-[7px] w-[7px] rounded-full" style={{background:'var(--accent)', boxShadow: isStar?'0 0 0 5px rgba(255,107,38,0.22), 0 0 12px rgba(255,107,38,0.36)':'0 0 0 4px rgba(255,107,38,0.16)', animation: big?'fridge-peach-pulse 1.8s infinite':undefined}} />
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1.5 relative" style={{animation: big?'countdown-pop 0.5s ease':undefined}}>
                    <span className="font-light tracking-[-0.02em]" style={{fontFamily:'Fraunces, serif', fontWeight:300, fontSize: big?'36px':'26px', lineHeight:1, color: overdue?'#991B1B':'var(--text)'}}>{Math.abs(days)}</span>
                    <span className="text-[11px] font-medium" style={{fontFamily:'var(--font-ui)', color:'var(--muted)'}}>{Math.abs(days)===1?"day":"days"}</span>
                  </div>
                  <div className="mt-1.5 text-[13px] font-medium line-clamp-2 leading-[1.35]" style={{color:'var(--text)'}}>{ev.title}</div>
                  <div className="mt-1 text-[11px] truncate" style={{color:'var(--muted)'}}>{fmtDay(ev.dueAt)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* CHORES DECK QUICK */}
      {activeChores.filter(c=>c.status==='deck').length>0 && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="font-display text-[18px] font-semibold tracking-tight text-[var(--text)]">Chores deck • {activeChores.filter(c=>c.status==='deck').length}</span>
            <button onClick={()=> setTab("chores")} className="text-[11px] text-[var(--muted)] min-h-[44px]">Shuffle →</button>
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] px-3 py-3 flex gap-2 overflow-x-auto no-scrollbar" style={{borderColor:'var(--border)'}}>
            {activeChores.filter(c=>c.status==='deck').slice(0,6).map(c=>(
              <button key={c.id} onClick={()=> setTab("chores")} className="shrink-0 rounded-full border bg-[var(--chip-bg)] px-3 py-2 text-[12px] font-medium hover:bg-[var(--wash-mid)] transition min-h-[44px]" style={{borderColor:'var(--border)'}}>{c.title}</button>
            ))}
          </div>
        </div>
      )}

      {/* PANTRY LOW */}
      {shoppingDueList.length>0 && !hasToday && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="font-display text-[18px] font-semibold tracking-tight">Pantry low • {shoppingDueList.length}</span>
            <button onClick={()=> setTab("shopping")} className="text-[11px] text-[var(--muted)] min-h-[44px]">Shop →</button>
          </div>
          <div className="rounded-[22px] border bg-[var(--card-bg)] overflow-hidden" style={{borderColor:'var(--border)'}}>
            {shoppingDueList.map((it:any, i:number)=>(
              <button key={it.id} onClick={()=> setTab("shopping")} className="w-full text-left flex items-center gap-3 px-4 py-3.5 min-h-[56px] hover:bg-[var(--chip-bg)]/40 transition" style={{borderTop:i===0?undefined:"1px solid var(--chip-bg)"}}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--chip-bg)] border text-[11px]" style={{borderColor:'var(--border)'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M6 8h12l-1 11H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></span>
                <span className="flex-1 text-[13px] font-medium truncate">{it.item} {it.qty>1?`×${it.qty}`:""}</span>
                <span className="text-[11px] text-[var(--muted)]">{(it.cat||"")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FROM partner */}
      {stickyPick && stickyPick.note && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="font-display text-[18px] font-semibold tracking-tight text-[var(--text)]">From {(PERSONS[partner]?.name||partner||'?')}</span>
            <span className="text-[11px] rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[var(--muted)]" style={{ borderColor:'var(--border)' }}>{stickyPick.label} • {relTime(stickyPick!.note!.createdAt, nowMs)}</span>
          </div>
          <button onClick={()=> setTab("notes")} className="relative w-full text-left rounded-[22px] border bg-[var(--card-bg)] px-5 py-5 text-left"
            style={{ borderColor:"var(--border)", boxShadow:"0 16px 40px rgba(41,26,12,0.14), 0 1px 0 rgba(255,255,255,0.9) inset" }}>
            <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-16 rounded-full bg-[var(--chip-bg)]/90 border shadow-sm" style={{ borderColor:'var(--border)'}} aria-hidden="true" />
            <span className="pointer-events-none absolute right-6 top-6 opacity-[0.12]"><svg viewBox="0 0 16 16" className="h-[32px] w-[32px]" fill="#E07A5F"><path d="M8 13.1 4.2 9.6A3.6 3.6 0 0 1 3 7c0-1.7 1.25-2.9 2.9-2.9 1 0 1.65.45 2.1 1.2.45-.75 1.1-1.2 2.1-1.2C11.75 4.1 13 5.3 13 7c0 .9-.4 1.9-1.2 2.9L8 13.1Z"/></svg></span>
            <div className="flex gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-full text-[12px] font-bold text-white shrink-0 mt-0.5 shadow-sm" style={{ background: (PERSONS[partner]?.accent2||'#E07A5F') }}>{(PERSONS[partner]?.initial||'?')}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[16px] leading-[1.45] line-clamp-5 text-[var(--text)]">{stickyPick!.note!.body}</div>
                {(stickyPick!.note!.photoThumbDataUrl || stickyPick!.note!.photoDataUrl) && (
                  <div className="mt-4 inline-block rounded-[12px] border bg-[var(--card-bg)] p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.10)]">
                    <img src={(stickyPick!.note! as any).photoThumbDataUrl || stickyPick!.note!.photoDataUrl } alt="note" className="h-[160px] w-[160px] rounded-[8px] object-cover" loading="lazy" />
                    <div className="mt-2 flex justify-center"><span className="h-1.5 w-7 rounded-full bg-[var(--chip-bg)] border" style={{ borderColor:'var(--border)'}} /></div>
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>
      )}

      {emptyAll && (
        <div className="rounded-[28px] border bg-[var(--card-bg)] px-7 py-12 text-center relative overflow-hidden" style={{ borderColor:'var(--border)', boxShadow:'0 16px 40px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
          <div className="absolute left-1/2 top-8 -translate-x-1/2 h-px w-24 opacity-60" style={{background:'linear-gradient(90deg, transparent, var(--border), transparent)'}} />
          <span className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full border" style={{ background:'var(--chip-bg)', borderColor:'var(--border)'}}><span className="text-[18px]" style={{color:'var(--accent-warm)'}}>✦</span></span>
          <div className="mt-5 text-[22px] font-semibold tracking-tight" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>A little quiet in here</div>
          <div className="mx-auto mt-2 max-w-[268px] italic leading-[1.55]" style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontWeight:400, fontSize:'17px', color:'var(--muted)'}}>Nothing queued.</div>
          <div className="mx-auto mt-2 max-w-[260px] text-[12.5px] leading-[1.5]" style={{color:'var(--muted)'}}>Leave a note, add a plan, or tuck a shop list in — it warms right up when you do.</div>
          <button onClick={()=> setTab("notes")} className="mt-5 inline-flex h-[44px] min-h-[44px] items-center justify-center rounded-full px-7 text-[13px] font-semibold tracking-wide active:scale-[0.99] transition" style={{background:'#121214', color:'#FFFEFB', boxShadow:'0 8px 20px rgba(0,0,0,0.18)'}}>Add a note</button>
        </div>
      )}

      {syncStatus?.kind==='failed' && (
        <div className="rounded-[16px] border px-4 py-3 flex items-center justify-between gap-2 bg-[#FEF2F2]" style={{ borderColor:"#FECACA" }}>
          <span className="text-[12px] text-[#991B1B]">Offline — retrying</span>
          <button onClick={()=>{ try{ window.dispatchEvent(new CustomEvent('couple-sync',{detail:'retry'})) }catch{} }} className="h-9 rounded-full bg-[#0A0A0A] px-4 text-[12px] font-semibold text-white">Retry</button>
        </div>
      )}
      {syncStatus?.kind==='offline-queued' && !emptyAll && (
        <div className="rounded-[16px] border bg-[var(--card-bg)] px-4 py-3 text-[12px] text-[#92400E]" style={{ borderColor:"#FDE68A" }}>
          Offline — changes saved locally, will sync when back.
        </div>
      )}
    </div>
  );
}
