import React, { useState, useMemo, useEffect } from "react";
import type { PersonKey, ChoreV2 } from "../../types";
import { PERSONS } from "../../constants/themes";
// Preserved helpers - will be moved to shared/utils in next stage
const HOUSEHOLD_TZ="Europe/Dublin";
function getDueMsChore(c:any){ try{ return c.dueAt? new Date(c.dueAt).getTime(): Date.now(); }catch{return Date.now();} }
function ChoreIcon({id,size}:{id:any,size:number}){ return <span>{id}</span> as any; }
function ChoreCardMega({c,large,onTap}:{c:any,large?:boolean,onTap?:()=>void}){ return <div onClick={onTap}>{c.title}</div> as any; }

function ChoresPage({
  chores, setChores, currentUser, setCurrentUser, onCelebrate, nowMs,
}: {
  chores: ChoreV2[]; setChores: any; currentUser: PersonKey; setCurrentUser?: any; onCelebrate?: any; nowMs: number;
}) {
  const [tab, setTab] = useState<"deck"|"mine"|"open"|"done"|"admin">("deck");
  const [filter, setFilter] = useState<"all"|"today"|"week"|"overdue">("all");
  const [weekdayFilter, setWeekdayFilter] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [showAdd, setShowAdd] = useState(false);
  const [detailChore, setDetailChore] = useState<ChoreV2|null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number|null>(null);
  const [flippedId, setFlippedId] = useState<string|null>(null);
  const [pointsPops, setPointsPops] = useState<{id:string, pts:number}[]>([]);
  const [toast, setToast] = useState<string|null>(null);
  const [combo, setCombo] = useState(0);
  const [editing, setEditing] = useState<ChoreV2|null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFreq, setEditFreq] = useState<ChoreV2["frequency"]>("once");
  const [editWeekdays, setEditWeekdays] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [editPain, setEditPain] = useState(5);
  const [editBonus, setEditBonus] = useState(false);
  const [editType, setEditType] = useState<"one-off"|"repeat">("one-off");
  const [holdProgress, setHoldProgress] = useState(0);
  const [showSkeletons, setShowSkeletons] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundOn, setSoundOn] = useState(()=>{ try{return localStorage.getItem("couple_v1_sound_on")==="1"}catch{return false}});
  const [addIcon, setAddIcon] = useState<ChoreIconId>('broom');
  const [addPain, setAddPain] = useState(5);
  const [addBonus, setAddBonus] = useState(false);
  const [addFreq, setAddFreq] = useState<ChoreV2["frequency"]>("once");
  const [addWeekdays, setAddWeekdays] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [addType, setAddType] = useState<"one-off"|"repeat">("one-off");
  const [showRules, setShowRules] = useState(false);
  const [editIcon, setEditIcon] = useState<ChoreIconId>('broom');
  const holdRef = useRef<any>(null);

  const active = useMemo(()=> chores.filter(c=> !(c as any).deletedAt), [chores]);
  const deck = useMemo(()=> active.filter(c=> c.status==="deck"), [active]);
  const mine = useMemo(()=> active.filter(c=> c.assignedTo===currentUser && c.status!=="done"), [active, currentUser]);
  const open = useMemo(()=> active.filter(c=> c.status==="open" || c.status==="race" || (c.status==="assigned" && c.assignedTo!==currentUser)), [active, currentUser]);
  const done = useMemo(()=> active.filter(c=> c.status==="done"), [active]);
  const listForFilter = useMemo(()=>{
    let base: ChoreV2[] = [];
    if (tab==="deck") base = deck;
    else if (tab==="mine") base = mine;
    else if (tab==="open") base = open;
    else if (tab==="done") base = done;
    else base = active;
    if (filter==="today") {
      const todayK = todayKey(HOUSEHOLD_TZ);
      return base.filter(c=> {
        const k = c.dueAt ? toLocalKeyDublin(c.dueAt, HOUSEHOLD_TZ) : null;
        return k===todayK;
      });
    }
    if (filter==="week") {
      const now = nowMs;
      const weekEnd = now + 6*86400000;
      return base.filter(c=> {
        const due = getDueMsChore(c);
        return due>=now && due<=weekEnd;
      });
    }
    if (filter==="overdue") {
      const now = nowMs;
      return base.filter(c=> getDueMsChore(c)<now && c.status!=="done");
    }
    if(tab==="admin") return base;
    // weekday filter inside deck etc
    if(weekdayFilter.some(Boolean)){
      const names=["Mo","Tu","We","Th","Fr","Sa","Su"];
      const sel=names.filter((_,i)=>weekdayFilter[i]);
      return base.filter(c=>{
        const det=c.frequencyDetail||"";
        return sel.some(s=> det.includes(s));
      });
    }
    return base;
  }, [tab, deck, mine, open, done, active, filter, nowMs, weekdayFilter]);

  const deckCount = deck.length;
  const currentCard = deck[0] || null;

  // Monthly Championship
  const nowDate = new Date(nowMs);
  const monthKey = new Intl.DateTimeFormat('en-CA',{timeZone:HOUSEHOLD_TZ, year:'numeric', month:'2-digit'}).format(nowDate).slice(0,7);
  const nextResetAt = useMemo(()=>{
    try{
      const y = Number(new Intl.DateTimeFormat('en-GB',{timeZone:HOUSEHOLD_TZ, year:'numeric'}).format(nowDate));
      const m = Number(new Intl.DateTimeFormat('en-GB',{timeZone:HOUSEHOLD_TZ, month:'numeric'}).format(nowDate));
      const nextM = m===12 ? 1 : m+1;
      const nextY = m===12 ? y+1 : y;
      return tzWallToUtc(nextY, nextM, 1, 0,0,0, HOUSEHOLD_TZ);
    }catch{ return new Date(nowDate.getTime()+30*86400000); }
  }, [nowDate]);
  const [tick,setTick]=useState(()=>Date.now());
  useEffect(()=>{
    let id:any = null;
    const schedule = ()=>{
      const diff = nextResetAt.getTime()-Date.now();
      const isLastHour = diff>0 && diff<3600000;
      const interval = isLastHour ? 1000 : 60000;
      if(id) clearInterval(id);
      id = setInterval(()=>{ if(document.hidden) return; setTick(Date.now()); }, interval);
    };
    schedule();
    const onVis = ()=>{ if(!document.hidden){ setTick(Date.now()); schedule(); } };
    document.addEventListener("visibilitychange", onVis);
    return ()=>{ if(id) clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  },[nextResetAt]);
  useEffect(()=>{
    try{
      const mql=window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const fn=(e:any)=>setReducedMotion(e.matches);
      mql.addEventListener?.("change",fn);
      return ()=>mql.removeEventListener?.("change",fn);
    }catch{}
  },[]);
  useEffect(()=>{ const t=setTimeout(()=>setShowSkeletons(false), 700); return ()=>clearTimeout(t); },[tab]);

  const countdown = (()=>{ const diff = nextResetAt.getTime()-tick; if(diff<=0) return {d:0,h:0,m:0,s:0, label:'Resets now'}; const d=Math.floor(diff/86400000); const h=Math.floor((diff%86400000)/3600000); const m=Math.floor((diff%3600000)/60000); const s=Math.floor((diff%60000)/1000); return {d,h,m,s, label:`Resets 1st 00:00 • ${d}d ${h}h`}; })();

  // Monthly scores
  const monthScores = useMemo(()=>{
    let a=0,c=0;
    done.forEach(ch=>{ try{ const k = ch.completedAt ? toLocalKeyDublin(ch.completedAt, HOUSEHOLD_TZ) : null; if(!k) return; if(!k.startsWith(monthKey)) return; const pts = effectivePoints(ch, isBonusChore(ch, ch.completedAt? new Date(ch.completedAt).getTime():undefined)); if(ch.completedBy==='aisling') a+=pts; else if(ch.completedBy==='ciaran') c+=pts; }catch{} });
    return {a,c,total:(a+c)||1, pct: Math.round((Math.max(a,c)/((a+c)||1))*100 )};
  },[done, monthKey]);

  // history meta
  const metaHistory = useMemo(()=>{
    try{
      const raw=localStorage.getItem("couple_v1_chore_game_meta");
      if(raw){ const j=JSON.parse(raw); if(Array.isArray(j.history)) return j.history.slice(-3); }
    }catch{}
    // fallback synthetic from done grouped by month
    const map: Record<string,{a:number,c:number,winner:PersonKey|null,key:string}> = {};
    done.forEach(ch=>{
      try{
        const k= ch.completedAt ? toLocalKeyDublin(ch.completedAt, HOUSEHOLD_TZ)?.slice(0,7) : null;
        if(!k) return;
        if(!map[k]) map[k]={a:0,c:0,winner:null,key:k};
        const pts=effectivePoints(ch, false);
        if(ch.completedBy==='aisling') map[k].a+=pts; else if(ch.completedBy==='ciaran') map[k].c+=pts;
      }catch{}
    });
    const arr=Object.values(map).map(m=> ({...m, winner: (m.a===m.c? null : m.a>m.c? "aisling":"ciaran") as any})).sort((a,b)=> a.key.localeCompare(b.key)).slice(-3);
    return arr;
  },[done]);

  function effortHuman(pain:number): string {
    if(pain<=2) return "Tiny effort";
    if(pain<=4) return "Light effort";
    if(pain<=6) return "Medium effort";
    if(pain<=8) return "High effort";
    return "Tough";
  }
  function timingLabel(c: ChoreV2): string {
    const freq = (c.frequency||"").toUpperCase() || "ONCE";
    const dueMs = getDueMsChore(c);
    const diff = dueMs - nowMs;
    const dueKey = toLocalKeyDublin(new Date(dueMs).toISOString(), HOUSEHOLD_TZ);
    const isToday = dueKey === todayKey(HOUSEHOLD_TZ);
    const isOver = diff<0;
    if(isOver) return `${freq} • OVERDUE`;
    if(isToday) return `${freq} • DUE TODAY`;
    if(diff < 48*3600000) return `${freq} • DUE TOMORROW`;
    return freq;
  }

  function triggerPointsPop(id:string, pts:number){
    setPointsPops(p=> [...p, {id, pts}]);
    setTimeout(()=> setPointsPops(p=> p.filter(x=> x.id!==id)), 900);
    if(soundOn){
      try{
        const ctx=new (window as any).AudioContext();
        const o=ctx.createOscillator(); const g=ctx.createGain();
        o.frequency.value= 440 + Math.min(pts*2, 320);
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        o.start(); o.stop(ctx.currentTime+0.12);
      }catch{}
    }
  }

  function confettiByPoints(pts:number, el?: any){
    if(reducedMotion) return;
    const count = pts<60 ? 12 : pts<100 ? 24 : 36;
    try{ onCelebrate?.({ points: pts, count, el }); }catch{}
    // own fallback
    setTimeout(()=>{},0);
  }

  function handleSwipe(dir:"left"|"right") {
    if(!currentCard) return;
    const me = currentUser;
    const partner: PersonKey = me==="aisling"?"ciaran":"aisling";
    const nowISO=new Date().toISOString();
    const safeBaseSwipes = (currentCard.swipes as any) ?? {aisling:null, ciaran:null};
    const baseSwipes = safeBaseSwipes.a !== undefined || safeBaseSwipes.b !== undefined ? {aisling: safeBaseSwipes.a ?? null, ciaran: safeBaseSwipes.b ?? null} : safeBaseSwipes;
    // V78 mega fix: single-swipe decides, no need to wait for partner
    if(dir==="right"){
      const otherSwipe = (baseSwipes as any)[partner];
      const nextSwipes = { ...(baseSwipes as any), [me]: "right" } as any;
      let nextStatus: any = "assigned";
      let assigned: any = me;
      if(otherSwipe==="right"){
        nextStatus="open";
        assigned=null;
        setToast("RACE • first to do wins 1.15× bonus");
      } else {
        setToast(`${PERSONS[me].name} claimed ${currentCard.title} • ${currentCard.basePoints} pts`);
      }
      setChores((prev:any)=> prev.map((x:any)=> x.id===currentCard.id ? {...x, swipes: nextSwipes, status: nextStatus, assignedTo: assigned, updatedAt: nowISO, updatedBy: me, seen: true} : x));
      setDragX(0);
      setCombo(c=>c+1); triggerPointsPop(currentCard.id, currentCard.basePoints); if(nextStatus==="open") confettiByPoints(currentCard.basePoints);
      try{ import('./lib/push').then(m=> m.notifyOther(me as any, {title: `${(me==='aisling'?'Aisling':'Ciarán')} claimed ${currentCard.title}`, body: `${nextStatus==='open'?'Race — first wins 1.15×':'Your turn'}`, url: './?standalone'})) }catch{}
      try{ localStorage.setItem("couple_v1_last_local_write", nowISO); }catch{}
      try{ const cur = Number(localStorage.getItem("couple_v1_chore_streak")||0); localStorage.setItem("couple_v1_chore_streak", String(cur+1)); }catch{}
      if(navigator.vibrate){ try{navigator.vibrate(10)}catch{} }
      setTimeout(()=> setToast(null), 2200);
      return;
    } else {
      // PASS – move card to bottom of deck, clear my swipe so it resurfaces
      const nextSwipes = { ...(baseSwipes as any), [me]: null } as any;
      // if both passed recently, clear both to avoid stalemate
      if((baseSwipes as any)[partner]==="left" || (baseSwipes as any)[partner]==null){
        nextSwipes[partner]=null;
      }
      setChores((prev:any)=>{
        const without = (prev as any[]).filter((x:any)=> x.id!==currentCard.id);
        const meCard = {...currentCard, swipes: nextSwipes, status:"deck", assignedTo:null, updatedAt: nowISO, updatedBy: me, seen: true, snoozedUntil: new Date(Date.now()+24*3600000).toISOString() } as any;
        // insert at end of deck section to resurface later
        const deckCountNow = without.filter((c:any)=> c.status==="deck").length;
        // put after existing deck cards but before others
        let idx = 0;
        let deckSeen=0;
        for(let i=0;i<without.length;i++){
          if((without[i] as any).status==="deck") deckSeen++;
          if(deckSeen===deckCountNow) { idx=i+1; break; }
        }
        if(idx===0) idx=deckCountNow;
        const next = [...without.slice(0, idx), meCard, ...without.slice(idx)];
        return next;
      });
      setDragX(0);
      setCombo(0);
      setToast(`Passed • ${currentCard.title} will resurface later`);
      try{ localStorage.setItem("couple_v1_last_local_write", nowISO); }catch{}
      if(navigator.vibrate){ try{navigator.vibrate([10,30])}catch{} }
      setTimeout(()=> setToast(null), 1800);
      return;
    }
  }

  const ChoreCardMega = ({c, large=false, onTap}:{c:ChoreV2; large?:boolean; onTap?:()=>void})=>{
    const isFlipped=flippedId===c.id;
    const dueMs=getDueMsChore(c);
    const overdue=dueMs < nowMs && c.status!=="done";
    const dueToday=Math.abs(dueMs-nowMs)<24*3600000;
    const rotBase = large ? -0.8 : (rotForId(c.id)*0.3);
    const dragRot = Math.max(-12, Math.min(12, dragX*0.06));
    const totalRot = large ? rotBase + dragRot : rotBase;
    const points=effectivePoints(c, isBonusChore(c, nowMs));
    const overdueDays= overdue ? Math.max(1, Math.floor((nowMs-dueMs)/86400000)) : 0;
    const mult=c.multiplier>1 ? c.multiplier : (overdueDays>0?1.15:1);
    const resolveIconId = (ch:any): string => {
      if (ch.icon && (CHORE_ICONS as any)[ch.icon]) return ch.icon;
      if (ch.templateId && (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId]) return (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId];
      const t=(ch.title||'').toLowerCase();
      if (t.includes('bin') || t.includes('trash') || t.includes('rubbish')) return 'bins';
      if (t.includes('dish')) return 'dishes';
      if (t.includes('laundr') || t.includes('clothes')) return 'laundry';
      if (t.includes('vacuum') || t.includes('hoover')) return 'vacuum';
      if (t.includes('bathroom') || t.includes('toilet') || t.includes('shower')) return 'bathroom';
      if (t.includes('shop') || t.includes('grocer') || t.includes('market')) return 'groceries';
      if (t.includes('kitchen') || t.includes('cook')) return 'kitchen';
      if (t.includes('bed')) return 'bed';
      if (t.includes('window')) return 'windows';
      if (t.includes('garden') || t.includes('yard')) return 'garden';
      if (t.includes('mop') || t.includes('floor')) return 'mop';
      return 'broom';
    };
    const iconId = resolveIconId(c);

    return (
      <div className="relative w-full select-none cursor-pointer" style={{ perspective:"800px" }}>
        <div
          className={"relative w-full rounded-[28px] border bg-[var(--card-bg)] px-5 py-5 text-left overflow-hidden "+(large?"min-h-[300px] shadow-[var(--shadow-soft)]":"min-h-[112px] shadow-[var(--shadow-soft)]")+" active:scale-[0.98] hover:translate-y-[-1px] transition-all cursor-pointer"}
          style={{
            borderColor:"var(--border)",
            transform: `translateX(${large?dragX:0}px) rotate(${totalRot}deg)`,
            transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, border-color 200ms ease, scale 180ms cubic-bezier(0.34,1.56,0.64,1)",
            background: large ? "linear-gradient(180deg,var(--wash-top, #FFE8D6) 0%,var(--card-bg) 38%,var(--card-bg) 100%)" : "linear-gradient(180deg,var(--wash-top, #FFE8D6) 0%,var(--card-bg) 100%)",
            transformStyle:"preserve-3d" as any
          }}
          onClick={()=>{ try{ if(navigator.vibrate) navigator.vibrate(10);}catch{} }}
        >
          {/* V78 grain 0.12 opacity - theme aware */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.12] mix-blend-multiply" style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}} aria-hidden="true" />
          {/* Icon badge 64x64 circle theme-aware */}
          <div className="absolute right-4 top-4 grid h-[64px] w-[64px] place-items-center rounded-full border text-[var(--text)]" style={{background:"var(--chip-bg, #F7EFE8)", borderColor:"var(--border, #E8DDD3)", boxShadow:"var(--shadow-soft, 0 8px 24px rgba(0,0,0,0.08))"}} aria-hidden="true">
            <ChoreIcon id={iconId as any} size={28} />
          </div>
          {/* swipe tint overlays V78 pointer-events-none */}
          {large && dragX < -60 && (
            <div className="pointer-events-none absolute inset-0 rounded-[28px] flex items-center justify-start pl-8 gap-3" style={{ background:"rgba(254,226,226,0.92)", border:"1px solid #FECACA"}}>
              <span className="rounded-full bg-[var(--card-bg)] px-4 py-1.5 text-[13px] font-bold tracking-wide border" style={{borderColor:"#FCA5A5", color:"#991B1B"}}>PASS</span>
              <span className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[var(--card-bg)]/70 border" style={{borderColor:"#FCA5A5"}} aria-hidden="true"><svg width="56" height="56" viewBox="0 0 24 24" fill="#EF4444" opacity="0.9"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg></span>
            </div>
          )}
          {large && dragX > 60 && (
            <div className="pointer-events-none absolute inset-0 rounded-[28px] flex items-center justify-end pr-8 gap-3" style={{ background:"rgba(220,252,231,0.92)", border:"1px solid #BBF7D0"}}>
              <span className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[var(--card-bg)]/80 border" style={{borderColor:"#BBF7D0"}} aria-hidden="true"><svg width="56" height="56" viewBox="0 0 24 24" fill="#059669"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg></span>
              <span className="rounded-full bg-[#0A0A0A] px-4 py-1.5 text-[13px] font-bold text-white tracking-wide">MINE</span>
            </div>
          )}
          {/* content */}
          <button onClick={(e:any)=>{ e.stopPropagation(); const t=e.currentTarget as HTMLElement; const prev=t.style.transform; t.style.transform='scale(1.15)'; t.style.transition='transform 120ms cubic-bezier(0.34,1.56,0.64,1)'; try{ if((navigator as any).vibrate) (navigator as any).vibrate(10);}catch{} setTimeout(()=>{ t.style.transform=prev||'scale(1)'; setTimeout(()=>{ t.style.transform=''; },80); },140); onTap?.(); }} className="w-full text-left cursor-pointer relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[var(--muted)]">{timingLabel(c)}</span>
              {c.status==="open" && c.swipes?.aisling==="right" && c.swipes?.ciaran==="right" && <span className="animate-pulse rounded-full bg-[var(--card-bg)] border border-[#FCA5A5] px-2.5 py-0.5 text-[10px] font-bold text-[#991B1B]">RACE • 1.15×</span>}
            </div>
            <div className={"font-display font-semibold text-[var(--text)] "+(large?"text-[22px] leading-[26px] mt-2":"text-[15px] leading-[20px] mt-1")} style={{fontFamily:"Fraunces, serif"}}>{c.title}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-[var(--chip-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] border" style={{borderColor:'var(--border)'}}>{effortHuman(c.pain)}</span>
              <span className="text-[12px] font-semibold text-[#8B5E3C]">{points} pts {mult>1 ? `• ${mult}×` : ""}</span>
              {overdue && <span className="rounded-full bg-[var(--card-bg)] px-2 py-0.5 text-[10px] font-bold text-[#991B1B] border border-[#FECACA]">{overdueDays}d overdue</span>}
              {isFlipped && <span className="text-[11px] text-[var(--muted)]">tap to close</span>}
            </div>
            {large && (
              <div className="mt-3 h-1.5 w-full rounded-full bg-[#0A0A0A]/10 overflow-hidden flex"><div className="h-full rounded-full bg-gradient-to-r from-[#A89FDA] to-[var(--wash-top)]" style={{ width: Math.min(100, (points/120)*100)+"%"}} /></div>
            )}
          </button>

          {isFlipped && (
            <div className="mt-3 rounded-[16px] border bg-[var(--card-bg)]/80 backdrop-blur px-3 py-2.5 text-[12px] space-y-1 relative z-10" style={{borderColor:"var(--border)"}}>
              <div>Pain {c.pain}/10 • base {c.basePoints} • {c.multiplier>1?"bonus 1.15×":""} • {overdue? `${overdueDays}d overdue 1.15× → ${points}`: `${points} pts`}</div>
              <div>Due: {new Date(getDueMsChore(c)).toLocaleString("en-GB",{timeZone:HOUSEHOLD_TZ, weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})} • {c.frequency} {c.frequencyDetail? `• ${c.frequencyDetail}`:""}</div>
              <div>Assigned: {c.assignedTo? (PERSONS[c.assignedTo]?.name||c.assignedTo):"deck"} • Swipes {c.swipes?.aisling||"–"} / {c.swipes?.ciaran||"–"}</div>
            </div>
          )}

          {pointsPops.find(p=>p.id===c.id) && (
            <span className="pointer-events-none absolute right-6 top-6 text-[14px] font-extrabold text-[#059669]" style={{ animation:"popUpBouncy 700ms cubic-bezier(0.34,1.56,0.64,1) forwards", transform:"translateY(0)"}}>+{pointsPops.find(p=>p.id===c.id)?.pts}</span>
          )}
        </div>

        {large && deck.length>1 && (
          <div className="absolute inset-0 -z-10 rounded-[28px] border bg-[var(--card-bg)]/60 backdrop-blur-[1px] translate-y-1.5 scale-[0.98]" style={{ borderColor:"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,0.08)"}} aria-hidden="true" />
        )}
      </div>
    );
  };


  function openEdit(c:ChoreV2){
    setEditing(c);
    setEditTitle(c.title);
    setEditFreq(c.frequency as any || "once");
    setEditType((c.type as any)|| (c.frequency==="once"?"one-off":"repeat"));
    try{ const boolArr = (c.frequencyDetail||"").split(",").map((x:any)=> x.trim()).filter(Boolean); const map:any={Mo:0,Tu:1,We:2,Th:3,Fr:4,Sa:5,Su:6}; const arr=[false,false,false,false,false,false,false]; boolArr.forEach((k:string)=>{ if(map[k]!==undefined) arr[map[k]]=true; }); setEditWeekdays(arr); }catch{ setEditWeekdays([false,false,false,false,false,false,false]); }
    setEditPain(c.pain||5);
    setEditBonus(c.multiplier>1.05);
    setEditIcon(((c as any).icon as ChoreIconId) || 'broom');
  }

  function saveEdit(){
    if(!editing) return;
    const freqDetail = editWeekdays.some(Boolean) ? (()=>{ const names=["Mo","Tu","We","Th","Fr","Sa","Su"]; return names.filter((_,i)=> editWeekdays[i]).join(","); })() : undefined;
    const nowISO=new Date().toISOString();
    const updated:any = {
      ...editing,
      title: editTitle.trim() || editing.title,
      type: editType,
      frequency: editFreq,
      frequencyDetail: freqDetail,
      pain: editPain,
      basePoints: editPain*10,
      multiplier: editBonus ? 1.15 : 1,
      icon: editIcon,
      updatedAt: nowISO,
    };
    setChores((p:any)=> p.map((x:any)=> x.id===editing.id ? updated : x));
    setEditing(null);
    if(navigator.vibrate){ try{navigator.vibrate(10)}catch{} }
    triggerPointsPop(updated.id, updated.basePoints);
  }

  // templates — V77 with icon ids for pizazz
  const templates = [
    {k:"Bins", title:"Take bins out", pain:3, freq:"weekly", icon:"bins" as ChoreIconId},
    {k:"Dishes", title:"Wash dishes", pain:4, freq:"daily", icon:"dishes" as ChoreIconId},
    {k:"Laundry", title:"Laundry", pain:5, freq:"weekly", icon:"laundry" as ChoreIconId},
    {k:"Vacuum", title:"Vacuum living room", pain:6, freq:"weekly", icon:"vacuum" as ChoreIconId},
    {k:"Bathroom", title:"Clean bathroom", pain:8, freq:"weekly", icon:"bathroom" as ChoreIconId},
    {k:"Shop", title:"Groceries", pain:5, freq:"weekly", icon:"groceries" as ChoreIconId},
  ];

  // feed 7d
  const feed = useMemo(()=>{
    const sevenAgo=Date.now()-7*86400000;
    return done.filter(c=> c.completedAt && new Date(c.completedAt).getTime()>=sevenAgo).sort((a,b)=> new Date(b.completedAt||0).getTime()-new Date(a.completedAt||0).getTime()).slice(0,9);
  },[done]);

  const isClear = deck.length===0;

  return (
    <div className="w-full space-y-5 pb-[96px] min-h-[calc(100vh-16px)]">
      <style>{`
        @keyframes popUp{0%{transform:translateY(0); opacity:1} 100%{transform:translateY(-24px); opacity:0}}
        @keyframes popUpBouncy{0%{transform:translateY(12px) scale(0.7); opacity:0} 35%{transform:translateY(-10px) scale(1.15); opacity:1} 66%{transform:translateY(2px) scale(0.98)} 100%{transform:translateY(-22px) scale(1); opacity:0}}
        @keyframes pulseRace{0%,100%{transform:scale(1)} 50%{transform:scale(1.02)}}
        @keyframes floatHeart{0%{transform:translateY(0) scale(1)} 50%{transform:translateY(-3px) scale(1.05)} 100%{transform:translateY(0) scale(1)}}
      `}</style>

      {/* V103 Boutique Arena — Hume charcoal + Soho House linen, theme-aware contrast */}
      <div className="nylah-arena nylah-arena rounded-[28px] px-5 py-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-[160px] w-[160px] rounded-full blur-[24px] pointer-events-none" style={{background:'radial-gradient(100% 100% at 50% 50%, var(--accent) 0%, transparent 72%)', opacity:0.16}} aria-hidden="true" />
        <div className="flex items-center justify-between relative">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{fontFamily:'Fraunces, serif', color:'var(--muted)'}}>Championship Arena</span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide" style={{background:'var(--chip-bg)', border:'1px solid var(--border)', color:'var(--text)'}}> <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> LIVE</span>
        </div>

        {/* podium boutique — linen 1st not flat orange, Fraunces numbers */}
        <div className="mt-5 flex items-end justify-center gap-5 relative">
          {monthScores.a >= monthScores.c ? (
            <>
              {/* 2nd Ciaran */}
              <div className="flex flex-col items-center">
                <div className="grid h-11 w-11 place-items-center rounded-full border bg-[var(--card-bg)] text-[12px] font-bold shadow-sm" style={{borderColor:'var(--border)', color:'var(--text)'}}>{PERSONS["ciaran"].initial}</div>
                <div className="mt-1.5 h-[38px] w-[68px] rounded-t-[14px] grid place-items-center text-[11px] font-medium border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}>2nd</div>
                <div className="text-[13px] font-semibold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.c}</div>
              </div>
              {/* 1st Aisling — linen */}
              <div className="flex flex-col items-center relative">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2" aria-hidden="true">
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><path d="M2 8 L10 0 L18 8 L10 6 Z" fill="var(--accent)" opacity="0.9" /></svg>
                </span>
                <div className="relative">
                  <div className="grid h-14 w-14 place-items-center rounded-full border-2 text-[14px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]" style={{background:'var(--card-bg)', borderColor:'var(--accent)', color:'#292624'}}>{PERSONS["aisling"].initial}</div>
                  <span className="absolute -top-1 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold border" style={{background:'#121214', borderColor:'var(--accent)', color:'var(--accent)'}}>LEADING</span>
                </div>
                <div className="mt-1.5 h-[56px] w-[84px] rounded-t-[16px] grid place-items-center text-[13px] font-bold shadow-[0_10px_28px_rgba(0,0,0,0.14)] border" style={{background:'var(--card-bg)', color:'#292624', borderColor:'rgba(0,0,0,0.06)'}}>
                  <span className="inline-flex items-center gap-1" style={{fontFamily:'Fraunces, serif'}}><span style={{color:'var(--accent)'}}>✦</span> 1st</span>
                </div>
                <div className="text-[14px] font-bold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.a}</div>
              </div>
            </>
          ) : (
            <>
              {/* 2nd Aisling */}
              <div className="flex flex-col items-center">
                <div className="grid h-11 w-11 place-items-center rounded-full border bg-[var(--card-bg)] text-[12px] font-bold shadow-sm" style={{borderColor:'var(--border)', color:'var(--text)'}}>{PERSONS["aisling"].initial}</div>
                <div className="mt-1.5 h-[38px] w-[68px] rounded-t-[14px] grid place-items-center text-[11px] font-medium border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}>2nd</div>
                <div className="text-[13px] font-semibold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.a}</div>
              </div>
              {/* 1st Ciaran */}
              <div className="flex flex-col items-center relative">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2" aria-hidden="true">
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><path d="M2 8 L10 0 L18 8 L10 6 Z" fill="var(--accent)" opacity="0.9" /></svg>
                </span>
                <div className="relative">
                  <div className="grid h-14 w-14 place-items-center rounded-full border-2 text-[14px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]" style={{background:'var(--card-bg)', borderColor:'var(--accent)', color:'#292624'}}>{PERSONS["ciaran"].initial}</div>
                  <span className="absolute -top-1 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold border" style={{background:'#121214', borderColor:'var(--accent)', color:'var(--accent)'}}>LEADING</span>
                </div>
                <div className="mt-1.5 h-[56px] w-[84px] rounded-t-[16px] grid place-items-center text-[13px] font-bold shadow-[0_10px_28px_rgba(0,0,0,0.14)] border" style={{background:'var(--card-bg)', color:'#292624', borderColor:'rgba(0,0,0,0.06)'}}>
                  <span className="inline-flex items-center gap-1" style={{fontFamily:'Fraunces, serif'}}><span style={{color:'var(--accent)'}}>✦</span> 1st</span>
                </div>
                <div className="text-[14px] font-bold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.c}</div>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 relative">
          <div className="flex-1"><div className="text-[10px] uppercase tracking-[0.12em]" style={{color:'var(--muted)'}}>Aisling</div><div className="text-[22px] font-semibold" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.a}</div></div>
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="h-1.5 w-[110px] rounded-full overflow-hidden" style={{background:'var(--chip-bg)'}}><div className="h-full rounded-full" style={{ width: (monthScores.a/(monthScores.total))*100+"%", background:'linear-gradient(90deg,var(--accent),var(--accent-warm))' }} /></div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}>{monthScores.pct}% to win</span>
          </div>
          <div className="flex-1 text-right"><div className="text-[10px] uppercase tracking-[0.12em]" style={{color:'var(--muted)'}}>Ciaran</div><div className="text-[22px] font-semibold" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.c}</div></div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 relative">
          <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--text)'}}>Resets 1st 00:00 • {countdown.d}d {countdown.h}h {countdown.m}m {countdown.s}s</span>
          <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold border" style={{background:'var(--card-bg)', borderColor:'rgba(0,0,0,0.06)', color:'#292624'}}>Month {monthKey} • 600 pts</span>
        </div>

        {metaHistory.length>0 && (
          <div className="mt-3 flex gap-1.5 flex-wrap relative">
            {metaHistory.map((h:any)=>(
              <span key={h.key} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}><span className={"h-1.5 w-1.5 rounded-full "+(h.winner==="aisling"?"bg-[#E07A5F]":h.winner==="ciaran"?"bg-[#FF6B26]":"bg-[var(--muted)]")} />{h.key} {h.winner? (h.winner==="aisling"?"Á win":"C win"):"tie"}</span>
            ))}
          </div>
        )}

        {isClear && <div className="mt-2 text-[11px] relative" style={{color:'var(--muted)'}}>Deck clear — championship still live</div>}
      </div>

      {/* header */}

      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-[26px] font-semibold tracking-tight flex items-center gap-2" style={{fontFamily:"Fraunces, serif"}}>Chores <span className="inline-flex rounded-full bg-[var(--chip-bg)] border px-2.5 py-0.5 text-[11px] font-medium" style={{borderColor:"var(--border)"}}>{active.length} total</span></h2>
        <div className="flex items-center gap-2">
          <button onClick={()=> setSoundOn(s=>{ const n=!s; try{localStorage.setItem("couple_v1_sound_on", n?"1":"0")}catch{}; return n;})} className={"grid h-11 w-11 place-items-center rounded-full border bg-[var(--card-bg)] text-[12px] active:scale-[0.96] transition "+(soundOn?"ring-2 ring-[#A89FDA]":"")} style={{borderColor:"var(--border)", minHeight:44, minWidth:44, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}} aria-label="Sound toggle">{soundOn? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.6"><path d="M11 5 L6 9 H2 v6 h4 l5 4z"/><path d="M15 9a4 4 0 010 6"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6"><path d="M11 5 L6 9 H2 v6 h4 l5 4z"/><path d="M16 9l4 6M20 9l-4 6"/></svg>}</button>
          <button onClick={()=> setShowAdd(true)} className="grid h-11 w-11 place-items-center rounded-full bg-[#0A0A0A] text-white text-[18px] active:scale-[0.96]" style={{minHeight:44, minWidth:44, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>+</button>
        </div>
      </div>

      {/* 5 tabs - 44px min */}
      <div className="px-1 overflow-x-auto no-scrollbar">
        <div className="inline-flex rounded-full border p-1 gap-1" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)", boxShadow:"0 8px 24px rgba(0,0,0,0.06)"}}>
          {(["deck","mine","open","done","admin"] as const).map(t=> (
            <button key={t} onClick={()=> setTab(t)} className={"h-[44px] rounded-full px-4 text-[11px] font-semibold capitalize transition flex items-center gap-1 min-w-[52px] "+(tab===t?"bg-[#0A0A0A] text-white shadow-sm":"text-[var(--text-secondary)] hover:bg-[var(--card-bg)]")} style={{ minHeight:44, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>
              {t==="admin" ? <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.2a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.2a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.2a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.2a1.6 1.6 0 00-1.5 1z"/></svg> Admin</span> : <span>{t} {t==="deck"?"•"+deckCount:t==="mine"? "•"+mine.length:t==="open"? "•"+open.length:""}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab==="deck" ? (
        <>
          <div className="px-1 flex items-center justify-between">
            <span className="text-[12px] text-[var(--muted)] flex items-center gap-2"><span className="inline-flex h-5 w-5 place-items-center rounded-full bg-[#0A0A0A] text-white text-[10px] grid place-items-center">{deckCount}</span> cards left • Swipe or tap to flip</span>
            <div className="relative">
              <select value={filter} onChange={e=> setFilter(e.target.value as any)} className="h-[44px] min-h-[44px] rounded-[12px] border bg-[var(--card-bg)] px-3 pr-8 text-[12px] font-medium appearance-none bg-[var(--card-bg)]" style={{borderColor:"var(--border)"}}>
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="overdue">Overdue</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg></span>
            </div>
          </div>

          {/* streak + combo header */}
          <div className="px-1 flex items-center gap-2">
            {combo>1 && <span className="inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] px-3 py-1 text-[11px] font-bold text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15"><path d="M12 2a7 7 0 00-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 00-7-7z"/></svg> {combo}x combo</span>}
            {(deckCount===0) && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--chip-bg)] border px-3 py-1 text-[11px] font-semibold" style={{borderColor:"#C4B5FD"}}>Streak <svg width="10" height="12" viewBox="0 0 24 24" fill="#E07A5F"><path d="M12 2 C10 6 4 8 4 13 a6 6 0 0012 0 c0-5-6-7-4-11z"/></svg> {(() => { try{ return Number(localStorage.getItem("couple_v1_chore_streak")||0)}catch{return 0}})()}</span>}
          </div>

          {showSkeletons ? (
            <div className="space-y-3">
              <div className="rounded-[28px] border bg-[var(--card-bg)] h-[280px] animate-pulse" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
                <div className="p-5 space-y-3"><div className="h-3 w-24 rounded-full bg-[var(--chip-bg)]"/><div className="h-6 w-3/4 rounded-full bg-[var(--chip-bg)]"/><div className="h-12 w-full rounded-[16px] bg-[var(--card-bg)]"/></div>
              </div>
              <div className="h-[64px] rounded-[16px] bg-[var(--card-bg)] border animate-pulse" style={{borderColor:"var(--border)"}}/>
            </div>
          ) : currentCard ? (
            <div className="space-y-4 min-h-[340px]">
              <div className="relative min-h-[240px]" style={{ touchAction: "pan-y", minHeight:340, userSelect:"none"} as any}
                onPointerDown={(e:any)=>{ setDragging(true); setDragX(0); try{ (e.currentTarget as any).setPointerCapture(e.pointerId); }catch{}; startX.current = e.clientX; }}
                onPointerMove={(e:any)=>{ if(!dragging) return; const sx = startX.current; if(sx==null) return; const diff = e.clientX - sx; const clamped = Math.max(-180, Math.min(180, diff*0.7)); setDragX(clamped); }}
                onPointerUp={(e:any)=>{ if(Math.abs(dragX)>80){ handleSwipe(dragX>0?"right":"left"); } else setDragX(0); setDragging(false); startX.current=null; try{ (e.currentTarget as any).releasePointerCapture?.(e.pointerId); }catch{} }}
                onPointerCancel={(e:any)=>{ setDragX(0); setDragging(false); startX.current=null; }}
              >
                <ChoreCardMega c={currentCard} large onTap={()=> setFlippedId(f=> f===currentCard.id? null: currentCard.id)} />
              </div>
              <div className="flex gap-3 px-1">
                <button onClick={()=> handleSwipe("left")} className="flex-1 h-[56px] rounded-[16px] border bg-[var(--card-bg)] text-[14px] font-semibold tracking-wide active:scale-[0.96] shadow-sm flex items-center justify-center gap-1.5" style={{borderColor:"var(--border)", minHeight:56, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg> PASS</button>
                <button onClick={()=> handleSwipe("right")} className="flex-1 h-[56px] rounded-[16px] bg-[#0A0A0A] text-white text-[14px] font-bold tracking-wide active:scale-[0.96] shadow-[0_6px_18px_rgba(0,0,0,0.25)] flex items-center justify-center gap-1.5" style={{minHeight:56, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="#E07A5F" stroke="white" strokeWidth="1.3"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg> I'LL DO IT</button>
              </div>
              <div className="px-1 flex items-center gap-2">
                <div className="flex-1 text-[11px] text-[var(--muted)] leading-[1.35]"><b>→</b> claim (Mine), <b>←</b> pass, <b>both →</b> Race 1.15×, tap card = details • <b>{currentCard.basePoints}</b>pts = pain {currentCard.pain}/10 ×10</div>
                <button onClick={()=> setShowRules(true)} className="h-[32px] w-[32px] grid place-items-center rounded-full border bg-[var(--card-bg)] text-[11px] font-bold shrink-0" style={{borderColor:"var(--border)", minHeight:32, minWidth:32}}>?</button>
              </div>
              {/* next up preview */}
              {deck.length>1 && <div className="px-1 text-[11px] text-[var(--muted)]/60">Next up: {deck[1].title} • {deck[1].basePoints}pts</div>}
            </div>
          ) : (
            <div className="rounded-[28px] border bg-[var(--card-bg)] px-6 py-10 text-center relative overflow-hidden" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 38%,var(--card-bg) 100%)", boxShadow:"0 16px 40px rgba(0,0,0,0.12)"}}>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--card-bg)] border shadow-sm" style={{borderColor:"var(--border)"}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#E07A5F" aria-hidden="true"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg>
              </div>
              <div className="font-display text-[18px] font-semibold" style={{fontFamily:"Fraunces"}}>Deck clear • new drops tomorrow</div>
              <div className="text-[13px] text-[var(--muted)] mt-1">You crushed it. Moon, confetti, warm wash.</div>
              <button onClick={()=> setTab("open")} className="mt-4 h-[52px] rounded-full bg-[#0A0A0A] px-6 text-[13px] font-semibold text-white active:scale-[0.96]" style={{minHeight:52, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>See open • race 1.15×</button>
              <button onClick={()=> setShowAdd(true)} className="ml-2 mt-4 h-[52px] rounded-full border bg-[var(--card-bg)] px-5 text-[12px] font-semibold" style={{borderColor:"var(--border)", minHeight:52}}>Add a chore you hate</button>
            </div>
          )}

          {/* feed 7d */}
          {feed.length>0 && (
            <div className="rounded-[22px] border bg-[var(--card-bg)] px-4 py-3 space-y-2" style={{borderColor:"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,0.06)"}}>
              <div className="text-[11px] uppercase tracking-[0.13em] text-[var(--muted)] font-semibold">Feed • 7d</div>
              {feed.slice(0,4).map(c=>(
                <div key={c.id} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5"><span className={"h-6 w-6 grid place-items-center rounded-full border text-[10px] font-bold "+(c.completedBy==="aisling"?"bg-[var(--chip-bg)] border-[#C4B5FD]":"bg-[var(--wash-top)] border-[var(--border)]")}>{c.completedBy==="aisling"?"Á":"C"}</span> {PERSONS[c.completedBy as any]?.name||c.completedBy} did {c.title}</span>
                  <span className="text-[11px] text-[var(--muted)]">{c.completedAt? relTime(c.completedAt, nowMs):""}</span>
                </div>
              ))}
              <div className="flex gap-1.5 pt-1">
                {[
                  {k:"flame", svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="#E07A5F"><path d="M12 2 C10 6 4 8 4 13 a6 6 0 0012 0 c0-5-6-7-4-11z"/></svg>},
                  {k:"eye", svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>},
                  {k:"sparkle", svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="#A89FDA"><path d="M12 2l2.4 7.6H22l-6.2 4.6 2.4 7.8L12 17.4 5.8 22l2.4-7.8L2 9.6h7.6z"/></svg>},
                ].map(r=> <button key={r.k} onClick={()=>{ try{ const m={...reactionMap}; const arr=m[feed[0]?.id]||[]; if(!arr.includes(r.k)) m[feed[0].id]=[...arr, r.k]; setReactionMap(m);}catch{} }} className="h-[36px] w-[36px] grid place-items-center rounded-full border bg-[var(--card-bg)] active:scale-[0.94]" style={{borderColor:"var(--border)", minHeight:36, minWidth:36}}>{r.svg}</button>)}
              </div>
            </div>
          )}

          <div className="pt-2 border-t mt-4 space-y-2" style={{borderColor:"var(--chip-bg)"}}>
            <div className="flex items-center justify-between px-1">
              <span className="font-display text-[13px]" style={{fontFamily:"Fraunces"}}>This week • {monthScores.pct}% to win</span>
              <button onClick={()=> { try{const el=document.getElementById("stats")?.scrollIntoView();}catch{} }} className="text-[11px] underline text-[var(--muted)]">Stats</button>
            </div>
            <div className="rounded-[16px] border bg-[var(--card-bg)] px-4 py-3 flex items-center justify-between" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
              <span className="text-[12px] font-semibold">Aisling</span><span className="font-bold text-[14px]">{(() => { const sevenAgo=Date.now()-7*86400000; let a=0; done.forEach((c:any)=>{ const ts=c.completedAt? new Date(c.completedAt).getTime():0; if(ts>=sevenAgo && c.completedBy==='aisling') a+=effectivePoints(c, isBonusChore(c, ts)); }); return a; })()}</span>
              <span className="text-[11px] text-[var(--muted)]">vs</span>
              <span className="font-bold text-[14px]">{(() => { const sevenAgo=Date.now()-7*86400000; let b=0; done.forEach((c:any)=>{ const ts=c.completedAt? new Date(c.completedAt).getTime():0; if(ts>=sevenAgo && c.completedBy==='ciaran') b+=effectivePoints(c, isBonusChore(c, ts)); }); return b; })()}</span><span className="text-[12px] font-semibold">Ciarán</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#0A0A0A]/10 overflow-hidden flex gap-px">
              <div className="h-full bg-[#A89FDA]" style={{width: (monthScores.a/monthScores.total)*100+"%"}} />
              <div className="h-full bg-[#E07A5F]" style={{width: (monthScores.c/monthScores.total)*100+"%"}} />
            </div>
          </div>
        </>
      ) : tab==="admin" ? (
        <div className="space-y-4">
          <div className="rounded-[28px] border bg-[var(--card-bg)] p-4 space-y-3" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 36%,var(--card-bg) 100%)", boxShadow:"0 16px 40px rgba(0,0,0,0.12)"}}>
            {((import.meta as any).env?.DEV || (()=>{ try{ return localStorage.getItem("nylah_admin")==="1"}catch{return false}})()) && currentUser==="ciaran" ? <div className="font-display text-[17px] font-semibold flex items-center justify-between" style={{fontFamily:"Fraunces"}}>Admin <span className="text-[11px] rounded-full bg-[#0A0A0A] text-white px-2.5 py-1"> {active.length}</span></div> : null}
            <div className="text-[11px] text-[var(--muted)]">Templates one-tap • pain 1-10 • type chips 44px • Mo-Su 44px • points live • delete hold 800ms</div>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(t=>(
                <button key={t.k} onClick={()=>{
                  const nowISO=new Date().toISOString();
                  const nc:any={ id: uid("chk"), title:t.title, type:"one-off", frequency: t.freq as any, createdAt:nowISO, updatedAt:nowISO, pain:6, basePoints:60, swipes:{aisling:null,ciaran:null}, status:"deck", assignedTo:null, multiplier:1, timeWindowHours:24, templateId:t.k, icon:(t as any).icon||"broom" };
                  setChores((p:any)=> [nc, ...p]);
                  setToast(`${t.title} added`);
                  setTimeout(()=>setToast(null),2500);
                }} className="h-[44px] rounded-[16px] border bg-[var(--card-bg)] text-[11px] font-semibold active:scale-[0.96] shadow-sm" style={{borderColor:"var(--border)", minHeight:44, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>{t.k}</button>
              ))}
            </div>
            <div className="space-y-2 max-h-[280px] overflow-auto no-scrollbar">
              {active.slice(0,20).map((c:any)=> (
                <button key={c.id} onClick={()=> openEdit(c)} className="w-full text-left flex items-center justify-between gap-2 rounded-[16px] border bg-[var(--card-bg)] px-3 py-2.5 min-h-[44px] active:scale-[0.99]" style={{borderColor:"var(--border)"}}>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.title}</span>
                  <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">{c.frequency||"once"} • {c.pain}/10 {c.multiplier>1?"• 1.15×":""} <span className="h-5 w-5 grid place-items-center rounded-full bg-[#0A0A0A] text-white text-[10px]">{c.basePoints}</span></span>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={()=> { const nowISO=new Date().toISOString(); const all=active.map((c:any)=> ({...c, swipes:{aisling:null, ciaran:null}, status:"deck", updatedAt:nowISO, updatedBy:currentUser})); setChores((p:any)=> { const m=new Map(all.map((a:any)=>[a.id,a])); return (p as any[]).map((x:any)=> m.has(x.id) ? m.get(x.id) : x); }); setToast("Reshuffled");  setTimeout(()=>setToast(null),2000); }} className="h-[44px] rounded-full border bg-[var(--card-bg)] text-[11px] font-semibold active:scale-[0.96]" style={{borderColor:"var(--border)", minHeight:44}}>Reshuffle all</button>
              <button onClick={()=> { const kept = chores.filter((c:any)=> c.status!=="done" || (c.completedAt && toLocalKeyDublin(c.completedAt, HOUSEHOLD_TZ).startsWith(monthKey))); setChores(kept); setToast(`Archived old • kept ${monthKey}`); setTimeout(()=>setToast(null),2000); }} className="h-[44px] rounded-full bg-[#0A0A0A] text-white text-[11px] font-semibold active:scale-[0.96]" style={{minHeight:44}}>Archive old • {monthKey}</button>
            </div>
          </div>

          {editing && (
            <div className="rounded-[28px] border bg-[var(--card-bg)] p-4 space-y-3" style={{borderColor:"var(--border)", boxShadow:"var(--shadow-soft)"}}>
              <div className="font-display text-[15px] font-semibold flex items-center justify-between" style={{fontFamily:"Fraunces"}}>Edit {editing.id.slice(0,6)} <button onClick={()=> setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full border bg-[var(--card-bg)] text-[12px]" style={{borderColor:"var(--border)"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
              <input value={editTitle} onChange={e=> setEditTitle(e.target.value)} className="w-full h-[48px] rounded-[16px] border bg-[var(--card-bg)] px-4 text-[14px]" style={{borderColor:"var(--border)"}} placeholder="Title" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold tracking-wide uppercase text-[var(--muted)]">Pick an icon (gives pizazz)</div>
                <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto no-scrollbar snap-y pb-1" style={{scrollbarWidth:"thin"}}>
                  {ALL_CHORE_ICON_IDS.map(id=> (
                    <button key={id} onClick={()=> setEditIcon(id)} className="grid h-[48px] w-[48px] place-items-center rounded-full border text-[14px] active:scale-[0.96] transition-all" style={{minHeight:48, minWidth:48, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)", background: editIcon===id ? "#0A0A0A" : "var(--chip-bg)", color: editIcon===id ? "white" : "var(--text)", borderColor: editIcon===id ? "#0A0A0A" : "var(--border)"}}>
                      <ChoreIcon id={id} size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["one-off","daily","weekly","monthly"] as const).map(f=> (
                  <button key={f} onClick={()=>{ setEditType(f==="one-off"?"one-off":"repeat"); setEditFreq(f==="one-off"?"once":f as any); if(navigator.vibrate) try{navigator.vibrate(10)}catch{} }} className={"h-[44px] rounded-[12px] border text-[11px] font-semibold capitalize "+( (f==="one-off" && editType==="one-off") || editFreq===f ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[var(--card-bg)] text-[var(--text-secondary)]")} style={{borderColor:"var(--border)", minHeight:44}}>{f}</button>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> (
                  <button key={d} onClick={()=> { const a=[...editWeekdays]; a[i]=!a[i]; setEditWeekdays(a); if(navigator.vibrate) try{navigator.vibrate(10)}catch{} }} className={"h-[44px] rounded-full border text-[11px] font-medium "+(editWeekdays[i]?"bg-[#0A0A0A] text-white border-[#0A0A0A]":"bg-[var(--card-bg)]")} style={{borderColor:"var(--border)", minHeight:44}}>{d}</button>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]"><span>Pain {editPain}/10 base {editPain*10}</span><span className="text-[var(--muted)]">→ {(editPain*10*(editBonus?1.15:1)).toFixed(0)} pts {editBonus?"(1.15× bonus)":""}</span></div>
                <input type="range" min={1} max={10} value={editPain} onChange={e=> { setEditPain(Number(e.target.value)); if(navigator.vibrate) try{navigator.vibrate(10)}catch{} }} className="w-full accent-[#0A0A0A] h-[24px]" />
                <div className="text-[11px] text-[var(--muted)]">Preview: {editPain*10}pts → {(editPain*10*1.15).toFixed(0)}pts (2d overdue 1.15×) • {effortHuman(editPain)}</div>
              </div>
              <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={editBonus} onChange={e=> setEditBonus(e.target.checked)} /> Bonus 1.15× (under 10%)</label>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 h-[52px] rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold active:scale-[0.96]" style={{minHeight:52, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>Save</button>
                <div className="relative">
                  <button
                    onMouseDown={(e)=>{ 
                      let start=Date.now(); 
                      setHoldProgress(0); 
                      if(holdRef.current) clearInterval(holdRef.current);
                      holdRef.current=setInterval(()=>{
                        const elapsed=Date.now()-start;
                        const pct=Math.min(100, (elapsed/800)*100);
                        setHoldProgress(pct);
                        if(pct>=100){ 
                          clearInterval(holdRef.current); 
                          const nowISO=new Date().toISOString(); 
                          setChores((pp:any)=> pp.map((x:any)=> x.id===editing.id ? {...x, deletedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser } : x)); 
                          setEditing(null); 
                          setHoldProgress(0);
                          if(navigator.vibrate) try{navigator.vibrate([10,30,10])}catch{}
                        }
                      }, 16);
                    }}
                    onMouseUp={()=>{ if(holdRef.current) clearInterval(holdRef.current); setHoldProgress(0); }}
                    onMouseLeave={()=>{ if(holdRef.current) clearInterval(holdRef.current); setHoldProgress(0); }}
                    onTouchStart={(e)=>{ 
                      e.preventDefault();
                      let start=Date.now(); 
                      setHoldProgress(0); 
                      if(holdRef.current) clearInterval(holdRef.current);
                      holdRef.current=setInterval(()=>{
                        const elapsed=Date.now()-start;
                        const pct=Math.min(100, (elapsed/800)*100);
                        setHoldProgress(pct);
                        if(pct>=100){ 
                          clearInterval(holdRef.current); 
                          const nowISO=new Date().toISOString(); 
                          setChores((pp:any)=> pp.map((x:any)=> x.id===editing.id ? {...x, deletedAt: nowISO, updatedAt: nowISO, updatedBy: currentUser } : x)); 
                          setEditing(null); 
                          setHoldProgress(0);
                          if(navigator.vibrate) try{navigator.vibrate([10,30,10])}catch{}
                        }
                      }, 16);
                    }}
                    onTouchEnd={()=>{ if(holdRef.current) clearInterval(holdRef.current); setHoldProgress(0); }}
                    className="h-[52px] w-[112px] rounded-full border bg-[var(--card-bg)] px-5 text-[11px] text-[#B91C1C] relative overflow-hidden flex items-center justify-center gap-2" style={{borderColor:"var(--border)", minHeight:52}}
                  >
                    <span className="relative z-10 flex items-center gap-1">{holdProgress>8 ? `${Math.round(holdProgress)}%` : "Hold to delete"}</span>
                    {/* progress ring V64 800ms */}
                    <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 52 52" aria-hidden="true">
                      <circle cx="26" cy="26" r="23" fill="none" stroke="#FEF2F2" strokeWidth="2" />
                      <circle cx="26" cy="26" r="23" fill="none" stroke="#B91C1C" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="144.5" strokeDashoffset={144.5 - (144.5*holdProgress/100)} style={{transition:"stroke-dashoffset 16ms linear", transform:"rotate(-90deg)", transformOrigin:"50% 50%"}} />
                    </svg>
                    <span className="absolute inset-0 rounded-full border-2 border-[#B91C1C] pointer-events-none opacity-30" style={{ clipPath:`inset(0 ${100-holdProgress}% 0 0)`}} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* quest rings / steal / contested */}
          <div className="grid gap-2">
            {listForFilter.length===0 ? (
              <div className="rounded-[28px] border border-dashed bg-[var(--card-bg)] px-6 py-10 text-center" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
                <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--card-bg)] border"><svg width="24" height="24" viewBox="0 0 24 24" fill="#E07A5F"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg></div>
                <div className="font-display text-[16px]" style={{fontFamily:"Fraunces"}}>No {tab} chores</div>
                <div className="text-[12px] text-[var(--muted)] mt-1">Warm paper, no emoji, 64 circle chip</div>
                <button onClick={()=> setShowAdd(true)} className="mt-3 h-[44px] rounded-full bg-[#0A0A0A] px-5 text-[12px] text-white active:scale-[0.96]" style={{minHeight:44}}>Add a chore you hate</button>
              </div>
            ) : listForFilter.slice(0,18).map(c=>{
              const dueMs=getDueMsChore(c);
              const overdue=dueMs < nowMs;
              const dueToday=Math.abs(dueMs-nowMs)<24*3600000;
              const isContested=c.swipes?.aisling==="right" && c.swipes?.ciaran==="right";
              const hoursOpen=c.updatedAt ? (nowMs - new Date(c.updatedAt).getTime())/3600000 : 0;
              const canSteal=c.assignedTo && c.assignedTo!==currentUser && (hoursOpen>3 || overdue);
              return (
                <div key={c.id} className={"w-full text-left rounded-[22px] border bg-[var(--card-bg)] px-4 py-3 flex items-center gap-3 min-h-[92px] "+(isContested?"border-[#FCA5A5] bg-[var(--card-bg)]/30 animate-pulse":"")} style={{borderColor:isContested?"#FCA5A5":"var(--border)", boxShadow:"0 8px 24px rgba(0,0,0,0.06)", background: isContested?"#FEE2E2": overdue?"var(--card-bg)":"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
                  <span className={"grid h-10 w-10 place-items-center rounded-full border text-[12px] font-bold shrink-0 "+(overdue?"border-[#EF4444] ring-2 ring-[#EF4444]/30": dueToday?"border-[var(--wash-mid)] ring-2 ring-[var(--wash-mid)] animate-pulse":"border-[var(--border)] bg-[var(--card-bg)]")} style={{minHeight:40, minWidth:40}}>{PERSONS[(c.assignedTo||currentUser) as any]?.initial||"•"}</span>
                  <button onClick={()=> setDetailChore(c)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5"><span className="font-medium text-[14px] truncate">{c.title}</span>{isContested && <span className="rounded-full bg-[var(--card-bg)] border border-[#FCA5A5] px-2 py-0.5 text-[10px] font-bold text-[#991B1B]">RACE • 1.15×</span>}{c.assignedTo && !isContested && <span className="rounded-full bg-[var(--card-bg)] border px-2 py-0.5 text-[10px]" style={{borderColor:"var(--border)"}}>{c.assignedTo} • clear</span>}</div>
                    <div className="text-[11px] text-[var(--muted)]">{timingLabel(c)} • {effectivePoints(c,isBonusChore(c,nowMs))} pts</div>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={async()=> {
                      const nowISO=new Date().toISOString();
                      try{ const r=await claimChoreOccRpc(c.id, currentUser as any); if(r && !r.claimed){ setToast(`Already by ${r.alreadyBy||'other'}`);} }catch{} try{ completeChoreRpc(c.id, currentUser as any);}catch{};
                      setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, status:"done", completedBy:currentUser, completedAt:nowISO, updatedAt:nowISO, updatedBy:currentUser} : x));
                      triggerPointsPop(c.id, effectivePoints(c,false));
                      confettiByPoints(effectivePoints(c,false));
                      try{ import('./lib/push').then(m=> m.notifyOther(currentUser as any, {title: `${(currentUser==='aisling'?'Aisling':'Ciarán')} did ${c.title}`, body: `+${effectivePoints(c,false)} pts — ${monthKey}`, url: './?standalone'})) }catch{}
                      if(c.assignedTo && c.assignedTo!==currentUser){ setToast(`${PERSONS[currentUser].name} stole ${c.title}`); setTimeout(()=>setToast(null),3000); }
                    }} className="h-[36px] rounded-full bg-[#0A0A0A] px-3 text-[11px] text-white active:scale-[0.96] min-w-[52px]" style={{minHeight:36, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>Done</button>
                    {canSteal && <button onClick={()=>{ const nowISO=new Date().toISOString(); setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, assignedTo:currentUser, updatedAt:nowISO}:x)); setToast(`${PERSONS[currentUser].name} stole ${c.title}`); setTimeout(()=>setToast(null),3000); }} className="h-[32px] rounded-full border bg-[var(--card-bg)] px-2.5 text-[10px] font-semibold" style={{borderColor:"var(--border)", minHeight:32}}>Steal</button>}
                    <div className="flex gap-1">
                      <button onClick={()=>{ const nowISO=new Date().toISOString(); const d=new Date(nowMs+48*3600000).toISOString(); setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, dueAt:d, updatedAt:nowISO}:x)); setToast("Snoozed 48h"); setTimeout(()=>setToast(null),2000); }} className="h-[28px] rounded-full border bg-[var(--card-bg)] px-2 text-[10px]" style={{borderColor:"var(--border)"}}>Snooze</button>
                      <button onClick={()=>{ const nowISO=new Date().toISOString(); const other:PersonKey=currentUser==="aisling"?"ciaran":"aisling"; setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, assignedTo: (x.assignedTo===currentUser? other: currentUser) as any, updatedAt:nowISO}:x)); setToast("Delegated"); setTimeout(()=>setToast(null),2000); }} className="h-[28px] rounded-full border bg-[var(--card-bg)] px-2 text-[10px]" style={{borderColor:"var(--border)"}}>Swap</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-[var(--muted)]/60 px-1 flex items-center justify-between"><span>{monthKey} • {active.length} active</span><span className="tabular-nums">{countdown.d}d {countdown.h}h {countdown.m}m</span></div>

          {/* win streak message */}
          {(() => { const sevenAgo=Date.now()-7*86400000; let aStreak=0; let cur=true; const sorted=done.filter((c:any)=> c.completedAt && new Date(c.completedAt).getTime()>=sevenAgo).sort((aa:any,bb:any)=> new Date(bb.completedAt).getTime()-new Date(aa.completedAt).getTime()); for(const ch of sorted){ if(ch.completedBy===currentUser) aStreak++; else break; } return aStreak>=2 ? <div className="rounded-full bg-[#0A0A0A] text-white px-3 py-1.5 text-[11px] inline-flex gap-1 items-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15"><path d="M12 2a7 7 0 00-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 00-7-7z"/></svg> {aStreak} win streak • keep it</div> : null; })()}
        </div>
      )}

      {/* Detail sheet */}
      <BottomSheet open={!!detailChore} onClose={()=> { setDetailChore(null); setFlippedId(null); }} title={detailChore?.title}>
        {detailChore && (
          <div className="space-y-3">
            <div className="rounded-[16px] p-3 border" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 100%)"}}>
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{timingLabel(detailChore)}</div>
              <div className="text-[13px] font-medium mt-1">{detailChore.frequencyDetail ? `Repeats: ${detailChore.frequencyDetail}` : `Frequency: ${detailChore.frequency}`} • {detailChore.type}</div>
              <div className="text-[12px] text-[var(--muted)] mt-1">Pain {detailChore.pain}/10 • {effortHuman(detailChore.pain)} • {effectivePoints(detailChore, isBonusChore(detailChore, nowMs))} pts • {detailChore.multiplier>1?"1.15× bonus":"base"} • {detailChore.basePoints} base → {(detailChore.basePoints*1.15).toFixed(0)} (2d overdue 1.15×)</div>
              <div className="text-[12px] mt-1">Due: {new Date(getDueMsChore(detailChore)).toLocaleString("en-GB",{timeZone:HOUSEHOLD_TZ})}</div>
              <div className="text-[11px] mt-1">Streak <span className="inline-flex"><svg width="12" height="12" viewBox="0 0 24 24" fill="#E07A5F"><path d="M12 2 C10 6 4 8 4 13 a6 6 0 0012 0 c0-5-6-7-4-11z"/></svg></span> combo {combo} • {(() => { const q=(()=>{try{return localStorage.getItem("couple_v1_queue_count")||"0"}catch{return "0"}})(); return `Saved • ${active.length} • ${q} synced`; })()}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={async()=> { const nowISO=new Date().toISOString(); try{ const res=await claimChoreOccRpc(detailChore.id, currentUser as any); if(res && !res.claimed && res.alreadyBy){ setToast(`Already done by ${res.alreadyBy}`); setTimeout(()=>setToast(null),2500); } }catch{} try{ completeChoreRpc(detailChore.id, currentUser as any); }catch{} setChores((p:any)=> p.map((x:any)=> x.id===detailChore.id ? {...x, status:"done", completedBy: currentUser, completedAt:nowISO, updatedAt:nowISO, updatedBy:currentUser} : x)); setDetailChore(null); const pts=effectivePoints(detailChore,false); triggerPointsPop(detailChore.id, pts); confettiByPoints(pts); try{ import('./lib/push').then(m=> m.notifyOther(currentUser as any, {title: `${(currentUser==='aisling'?'Aisling':'Ciarán')} did ${detailChore.title}`, body: `+${pts} pts • ${monthKey}`, url: './?standalone'})) }catch{} }} className="flex-1 h-[52px] rounded-[16px] bg-[#0A0A0A] text-white text-[13px] font-semibold active:scale-[0.96]" style={{minHeight:52, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}>Mark done • +{effectivePoints(detailChore,false)}</button>
              <button onClick={()=> { const nowISO=new Date().toISOString(); setChores((p:any)=> p.map((x:any)=> x.id===detailChore.id ? {...x, status:"deck", swipes:{aisling:null,ciaran:null}, updatedAt:nowISO, updatedBy:currentUser}:x)); setDetailChore(null); triggerPointsPop(detailChore.id, 20); confettiByPoints(20); }} className="flex-1 h-[44px] rounded-[16px] border bg-[var(--card-bg)] text-[13px] active:scale-[0.96]" style={{borderColor:"var(--border)", minHeight:44}}>Reshuffle</button>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{ if(!detailChore) return; openEdit(detailChore); }} className="flex-1 h-[44px] rounded-full border bg-[var(--card-bg)] text-[12px]" style={{borderColor:"var(--border)", minHeight:44}}>Edit • Admin</button>
              <button onClick={()=>{ const nowISO=new Date().toISOString(); const half1={...detailChore, id: uid("chk"), title: detailChore.title+" • A", pain: Math.ceil(detailChore.pain/2), basePoints: Math.ceil(detailChore.basePoints/2), updatedAt:nowISO}; const half2={...detailChore, id: uid("chk"), title: detailChore.title+" • B", pain: Math.floor(detailChore.pain/2)||1, basePoints: Math.floor(detailChore.basePoints/2)||5, updatedAt:nowISO}; setChores((p:any)=> [half1, half2, ...p.filter((x:any)=> x.id!==detailChore.id)]); setDetailChore(null); setToast("Split into two"); setTimeout(()=>setToast(null),2000); }} className="flex-1 h-[44px] rounded-full border bg-[var(--card-bg)] text-[11px]" style={{borderColor:"var(--border)", minHeight:44}}>Split • Two</button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={showRules} onClose={()=> setShowRules(false)} title="How chores works">
        <div className="space-y-4 px-1">
          <div className="rounded-[16px] border bg-[var(--chip-bg)]/40 p-3 text-[12px] leading-[1.5]" style={{borderColor:"var(--border)"}}>
            <div className="font-semibold text-[13px] mb-1">The game</div>
            <div>Every chore lives in the Deck. You both swipe through the same deck. Right = you claim it, Left = you pass it on.</div>
          </div>
          <div className="space-y-2 text-[12px]">
            <div className="flex gap-2"><span className="h-6 w-6 grid place-items-center rounded-full bg-[#0A0A0A] text-white text-[10px] shrink-0">R</span><span><b>Swipe Right = I'll do it</b> — moves to your Mine. You own it. If you finish it, you get the points.</span></div>
            <div className="flex gap-2"><span className="h-6 w-6 grid place-items-center rounded-full bg-[var(--card-bg)] border text-[10px] shrink-0">L</span><span><b>Swipe Left = Pass</b> — you don't want it, rotates to your partner. If you both pass, it goes back to deck (24h snooze).</span></div>
            <div className="flex gap-2"><span className="h-6 w-6 grid place-items-center rounded-full bg-[var(--card-bg)] border-[#FCA5A5] border text-[10px] shrink-0">⚡</span><span><b>Both right = Race</b> — you both claimed it → it becomes Open + 1.15× bonus (15% extra). First to complete wins the boosted points.</span></div>
            <div className="flex gap-2"><span className="h-6 w-6 grid place-items-center rounded-full bg-[var(--wash-mid)] text-[10px] shrink-0">↔</span><span><b>Steal / Swap</b> — Mine items stuck &gt;3h or overdue can be stolen by partner. Anyone can swap owner.</span></div>
          </div>
          <div className="rounded-[16px] border bg-[var(--card-bg)] p-3 text-[12px] space-y-1.5" style={{borderColor:"var(--border)"}}>
            <div className="font-semibold text-[13px]">Points = pain × 10</div>
            <div className="text-[11px] text-[var(--muted)]">Pain 1 = Tiny (10pts), 5 = Medium (50pts), 10 = Brutal (100pts). Pain is effort, not priority.</div>
            <div>• Base = pain × 10 (10-100)</div>
            <div>• Bonus 1.15× if you check Bonus when adding (under 10% of chores should be bonus — nasty jobs)</div>
            <div>• Race 1.15× when both claim same chore</div>
            <div>• Overdue 1.15× after 2 days (auto)</div>
            <div>• Capped at 1.5× base max — hardest job 100 → 150 max</div>
            <div className="text-[11px] text-[var(--muted)] mt-1">Championship = calendar month, resets 1st 00:00 {HOUSEHOLD_TZ}. Scoreboard shows total + this week. Archive old after month.</div>
          </div>
          <button onClick={()=> setShowRules(false)} className="w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold">Got it • Let's play</button>
        </div>
      </BottomSheet>

      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Add chore — pain = points">
        <div className="space-y-3.5">
          <input id="chore-title" placeholder="Title — e.g. Clean kitchen, Bins, Dishes" className="w-full h-[52px] rounded-[16px] border bg-[var(--card-bg)] px-4 text-[14px] shadow-sm" style={{borderColor:"var(--border)", minHeight:52}} autoFocus />
          <div className="flex gap-1.5">
            {templates.slice(0,3).map(t=> <button key={t.k} onClick={()=>{ const el=document.getElementById("chore-title") as HTMLInputElement; if(el) el.value=t.title; setAddIcon(t.icon); setAddPain(t.k==="Bins"?3:t.k==="Dishes"?4:6); }} className="h-[36px] rounded-full border bg-[var(--card-bg)] px-3 text-[11px]" style={{borderColor:"var(--border)", minHeight:36}}>{t.k}</button>)}
            <button onClick={()=> setShowRules(true)} className="h-[36px] rounded-full border bg-[var(--chip-bg)] px-3 text-[10px]" style={{borderColor:"var(--border)"}}>How scoring works?</button>
          </div>

          {/* Pain slider - this IS points */}
          <div className="rounded-[16px] border bg-[var(--card-bg)] px-4 py-3 space-y-2" style={{borderColor:"var(--border)"}}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold">How annoying — {addPain}/10</span>
              <span className="text-[11px] rounded-full bg-[#0A0A0A] text-white px-2.5 py-1">{addPain*10}pts {addBonus?"→ "+(addPain*10*1.15).toFixed(0)+" bonus":""}</span>
            </div>
            <input type="range" min={1} max={10} value={addPain} onChange={e=> setAddPain(Number(e.target.value))} className="w-full accent-[#0A0A0A] h-[24px]" />
            <div className="flex justify-between text-[10px] text-[var(--muted)]"><span>1 Tiny 10pts</span><span>5 Medium 50pts</span><span>10 Brutal 100pts</span></div>
            <div className="text-[11px] text-[var(--muted)]"><b>{(() => { const p=addPain; if(p<=2) return "Tiny effort"; if(p<=4) return "Light effort"; if(p<=6) return "Medium effort"; if(p<=8) return "High effort"; return "Brutal"; })()}</b> — {addPain} × 10 = {addPain*10} base. Why not more than 100? Keeps it fair. Overdue or race adds 15% extra, max 1.5×.</div>
            <label className="flex items-center gap-2 text-[11px] pt-1"><input type="checkbox" checked={addBonus} onChange={e=> setAddBonus(e.target.checked)} /> Bonus 1.15× — only for truly awful jobs (under 10% of chores)</label>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-4 gap-1.5">
            {(["one-off","daily","weekly","monthly"] as const).map(f=> (
              <button key={f} onClick={()=>{ setAddType(f==="one-off"?"one-off":"repeat"); setAddFreq(f==="one-off"?"once":f as any); }} className={"h-[44px] rounded-[12px] border text-[11px] font-semibold capitalize "+( (f==="one-off" && addType==="one-off") || addFreq===f ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[var(--card-bg)] text-[var(--text-secondary)]")} style={{borderColor:"var(--border)", minHeight:44}}>{f}</button>
            ))}
          </div>
          {addType!=="one-off" && (
            <div className="grid grid-cols-7 gap-1">
              {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> (
                <button key={d} onClick={()=> { const a=[...addWeekdays]; a[i]=!a[i]; setAddWeekdays(a); }} className={"h-[40px] rounded-full border text-[10px] font-medium "+(addWeekdays[i]?"bg-[#0A0A0A] text-white border-[#0A0A0A]":"bg-[var(--card-bg)]")} style={{borderColor:"var(--border)", minHeight:40}}>{d}</button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold tracking-wide uppercase text-[var(--muted)] flex items-center justify-between"><span>Pick an icon</span><span className="text-[10px] font-medium normal-case opacity-60">{addPain*10}pts badge</span></div>
            <div className="grid grid-cols-5 gap-2 max-h-[116px] overflow-y-auto no-scrollbar p-1 rounded-[12px] bg-[var(--chip-bg)]/30">
              {ALL_CHORE_ICON_IDS.map(id=> (
                <button key={id} onClick={()=> setAddIcon(id)} className={"grid h-[44px] w-[44px] place-items-center rounded-full border text-[12px] active:scale-[0.96] transition-all"} style={{minHeight:44, minWidth:44, background: addIcon===id ? "#0A0A0A" : "var(--card-bg)", color: addIcon===id ? "white" : "var(--text)", borderColor: addIcon===id ? "#0A0A0A" : "var(--border)"}}>
                  <ChoreIcon id={id} size={18} />
                </button>
              ))}
            </div>
          </div>

          <button onClick={()=>{
            const el=document.getElementById("chore-title") as HTMLInputElement;
            if(!el?.value.trim()) return;
            const nowISO=new Date().toISOString();
            const pain=Math.min(10, Math.max(1, addPain||5));
            const base=pain*10;
            const mult = addBonus?1.15:1;
            const fd = addType==="one-off" ? undefined : (addWeekdays.some(Boolean) ? ["Mo","Tu","We","Th","Fr","Sa","Su"].filter((_,i)=>addWeekdays[i]).join(",") : addFreq);
            const nc:any={ id: uid("chk"), title:el.value.trim(), type:addType, frequency:addFreq, frequencyDetail: fd, createdAt:nowISO, updatedAt:nowISO, pain, basePoints:base, swipes:{aisling:null,ciaran:null}, status:"deck", assignedTo:null, multiplier:mult, timeWindowHours:24, icon: addIcon };
            setChores((p:any)=> [nc, ...p]); setShowAdd(false);
            setAddPain(5); setAddBonus(false);
            triggerPointsPop(nc.id, base);
            setToast(`${nc.title} • ${base}pts ${addBonus?"1.15×":""} → deck`);
            setTimeout(()=>setToast(null),2500);
          }} className="w-full h-[56px] rounded-[16px] bg-[#0A0A0A] text-white text-[15px] font-semibold active:scale-[0.96]" style={{minHeight:56}}>Add • {addPain*10}pts {addBonus?"1.15× bonus":""} • deck</button>
          <div className="text-[10px] text-[var(--muted)] text-center">Tap "?" top-right any deck card to see details. Championship resets 1st 00:00 {HOUSEHOLD_TZ}.</div>
        </div>
      </BottomSheet>

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-[88] rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-[12px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.28)] animate-[popUp_300ms_ease]">{toast}</div>
      )}
    </div>
  );
}
