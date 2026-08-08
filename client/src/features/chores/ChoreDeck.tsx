// ChoreDeck.tsx — V211 Game Arena — fun-first, user-focused
// Boutique stays but adds: undo-toast hook via parent, stack depth x2, velocity-runway,
// spring snap, combo HUD flame + meter, double-tap claim, keyboard arrows, progress dots,
// arena tint on drag, empty celebration callout, reduced-motion safe.
// Preserves: 44px icon, 1.45px washes, Europe/Dublin timing, effectivePoints, 1.15× caps.
import React, { useEffect, useRef, useState } from "react";
import type { ChoreV2 } from "./choreTypes";
import { effectivePoints, getDueMsChore, isBonusChore, effortHuman } from "./choreScoring";
import { rotForId } from "../../shared/utils/helpers";
import { ChoreIcon, CHORE_ICONS, CHORE_ICON_BY_TEMPLATE } from "../../lib/choreIcons";
import { todayKey, toLocalKey as toLocalKeyDublin, HOUSEHOLD_TZ } from "../../lib/dates";

type Props = {
  deck: ChoreV2[];
  currentCard: ChoreV2 | null;
  deckCount: number;
  dragX: number;
  dragging: boolean;
  startX: React.MutableRefObject<number | null>;
  setDragX: (v: number) => void;
  setDragging: (v: boolean) => void;
  onSwipe: (dir: "left" | "right") => void;
  onUndo?: () => void;
  flippedId: string | null;
  setFlippedId: (cb: any) => void;
  pointsPops: { id: string; pts: number }[];
  nowMs: number;
  onTapCard: (c: ChoreV2) => void;
  combo: number;
  filter: "all" | "today" | "week" | "overdue";
  setFilter: (v: any) => void;
  showSkeletons: boolean;
  setShowRules: (v: boolean) => void;
};

function timingLabel(c: ChoreV2, nowMs: number) {
  try {
    const freq = (c.frequency || "").toUpperCase() || "ONCE";
    const dueMs = getDueMsChore(c);
    const diff = dueMs - nowMs;
    const dueKey = toLocalKeyDublin(new Date(dueMs).toISOString(), HOUSEHOLD_TZ);
    const isToday = dueKey === todayKey(HOUSEHOLD_TZ);
    const isOver = diff < 0;
    if (isOver) return `${freq} • OVERDUE`;
    if (isToday) return `${freq} • TODAY`;
    if (diff < 48 * 3600000) return `${freq} • TOMORROW`;
    return freq;
  } catch {
    return (c.frequency || "ONCE").toUpperCase();
  }
}

export function ChoreDeck(props: Props) {
  const {
    deck,
    currentCard,
    deckCount,
    dragX,
    dragging,
    startX,
    setDragX,
    setDragging,
    onSwipe,
    onUndo,
    flippedId,
    pointsPops,
    nowMs,
    onTapCard,
    combo,
    filter,
    setFilter,
    showSkeletons,
    setShowRules,
  } = props;

  const arenaRef = useRef<HTMLDivElement>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [lastTapAt, setLastTapAt] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(()=>{
    try{
      const mql=window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const fn=(e:any)=>setReducedMotion(e.matches);
      mql.addEventListener?.("change",fn);
      return ()=>mql.removeEventListener?.("change",fn);
    }catch{}
  },[]);

  useEffect(()=>{
    try{
      const seen = localStorage.getItem("couple_v1_chore_tutor_v211");
      if(!seen && deckCount>0 && !showSkeletons){
        const t=setTimeout(()=> setShowCoach(true), 420);
        return ()=> clearTimeout(t);
      }
    }catch{}
  },[deckCount, showSkeletons]);

  function dismissTutor(){
    setShowCoach(false);
    try{ localStorage.setItem("couple_v1_chore_tutor_v211","1"); }catch{}
  }

  // keyboard for desktop demo testers
  useEffect(()=>{
    const h=(e: KeyboardEvent)=>{
      if(!currentCard) return;
      if(e.key==="ArrowLeft"){ e.preventDefault(); onSwipe("left"); }
      if(e.key==="ArrowRight"){ e.preventDefault(); onSwipe("right"); }
      if(e.key==="z" && (e.metaKey || e.ctrlKey) && onUndo){ e.preventDefault(); onUndo(); }
    };
    window.addEventListener("keydown", h);
    return ()=> window.removeEventListener("keydown", h);
  },[currentCard, onSwipe, onUndo]);

  const ChoreCard = ({ c, large=false, onTap, idx=0 }: { c: ChoreV2; large?: boolean; onTap?: ()=>void; idx?: number }) => {
    const isFlipped = flippedId===c.id;
    const dueMs = getDueMsChore(c as any);
    const overdue = dueMs < nowMs && c.status!=="done";
    const rotBase = large ? 0 : (rotForId(c.id)*0.12) + (idx*0.3);
    const dragRot = Math.max(-2.2, Math.min(2.2, dragX*0.018));
    const totalRot = large ? dragRot : rotBase;
    const points = effectivePoints(c, isBonusChore(c, nowMs));
    const overdueDays = overdue ? Math.max(1, Math.floor((nowMs - dueMs)/86400000)) : 0;
    const mult = c.multiplier>1 ? c.multiplier : overdueDays>0?1.15:1;
    const resolveIconId = (ch:any):string=>{
      if(ch.icon && (CHORE_ICONS as any)[ch.icon]) return ch.icon;
      if(ch.templateId && (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId]) return (CHORE_ICON_BY_TEMPLATE as any)[ch.templateId];
      const t=(ch.title||"").toLowerCase();
      if(t.includes("bin")||t.includes("trash")||t.includes("rubbish")) return "bins";
      if(t.includes("dish")) return "dishes";
      if(t.includes("laundr")||t.includes("clothes")) return "laundry";
      if(t.includes("vacuum")||t.includes("hoover")) return "vacuum";
      if(t.includes("bathroom")||t.includes("toilet")||t.includes("shower")) return "bathroom";
      if(t.includes("shop")||t.includes("grocer")||t.includes("market")) return "groceries";
      if(t.includes("kitchen")||t.includes("cook")) return "kitchen";
      if(t.includes("bed")) return "bed";
      if(t.includes("window")) return "windows";
      if(t.includes("garden")||t.includes("yard")) return "garden";
      if(t.includes("mop")||t.includes("floor")) return "mop";
      return "broom";
    };
    const iconId = resolveIconId(c);
    const isRace = c.status==="open" && (c as any).swipes?.aisling==="right" && (c as any).swipes?.ciaran==="right";

    // arena tint intensity
    const dragAbs = Math.min(1, Math.abs(dragX)/120);
    const tintRight = large && dragX>8 ? dragAbs : 0;
    const tintLeft = large && dragX<-8 ? dragAbs : 0;

    return (
      <div className="relative w-full select-none">
        {large && deck.length>1 && (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-[20px] translate-y-[9px] scale-[0.972] rotate-[-0.6deg]" style={{background:"var(--card-bg)",border:"1px solid var(--border)",opacity:0.5}} aria-hidden />
            <div className="pointer-events-none absolute inset-0 rounded-[20px] translate-y-[5px] scale-[0.986] rotate-[0.4deg]" style={{background:"var(--card-bg)",border:"1px solid var(--border)",opacity:0.74}} aria-hidden />
          </>
        )}

        <div
          className={
            "relative w-full rounded-[20px] border text-left overflow-hidden "+
            (large ? "min-h-[288px] " : "min-h-[106px] ") +
            "transition-[transform,box-shadow,border-color,background] active:scale-[0.985]"
          }
          style={{
            borderColor: tintRight>0.2 ? "#121214" : tintLeft>0.2 ? "var(--border)" : "var(--border)",
            background: tintRight>0 ? `color-mix(in srgb, var(--card-bg) ${100 - tintRight*18}%, #121214 ${tintRight*10}%)` : "var(--card-bg)",
            boxShadow: large ? (tintRight>0.2 ? "0 10px 28px rgba(18,18,20,0.12), 0 2px 0 rgba(0,0,0,0.06)" : "0 6px 20px rgba(18,18,20,0.06), 0 1px 0 rgba(0,0,0,0.02)") : "0 2px 10px rgba(18,18,20,0.04)",
            transform: `translateX(${large?dragX:0}px) rotate(${totalRot}deg)`,
            transition: dragging ? "none" : "transform 440ms cubic-bezier(0.22,1.34,0.36,1), box-shadow 200ms ease, border-color 200ms ease, background 200ms ease",
          }}
          onClick={()=>{
            const now=Date.now();
            if(now-lastTapAt<320 && large){
              // double-tap = claim
              try{ if(navigator.vibrate) navigator.vibrate(10);}catch{}
              onSwipe("right");
              setLastTapAt(0);
              return;
            }
            setLastTapAt(now);
            try{ if(navigator.vibrate) navigator.vibrate(6);}catch{}
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-[0.016] mix-blend-multiply" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}} aria-hidden />
          <div className="pointer-events-none absolute -right-10 -top-14 h-[184px] w-[184px] rounded-full blur-[20px]" style={{background:"radial-gradient(70% 70% at 50% 50%, var(--chip-bg) 0%, transparent 72%)", opacity:0.78}} aria-hidden />

          <div className="relative z-10 flex items-center justify-between px-[18px] pt-[14px]">
            <span className="text-[10px] font-[650] tracking-[0.18em] uppercase" style={{color:"var(--muted)"}}>
              {timingLabel(c, nowMs)}
            </span>
            <div className="flex items-center gap-2">
              {isRace && <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--chip-bg)]/85 px-2 py-[2px] text-[10px] font-[700] tracking-[0.05em] animate-[pulseRace_1.2s_ease_infinite]" style={{borderColor:"#F2C7B2", color:"var(--text-secondary)"}}><span className="h-[4px] w-[4px] rounded-full bg-[#E07A5F] animate-pulse" /> RACE 1.15×</span>}
              <span className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[var(--chip-bg)] text-[var(--text)]" style={{border:"1px solid var(--border)"}} aria-hidden>
                <ChoreIcon id={iconId as any} size={20} />
              </span>
            </div>
          </div>

          {large && dragX<-56 && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <div className="rounded-full border bg-[var(--card-bg)]/90 px-4 py-2 text-[12px] font-[650] tracking-[0.06em] backdrop-blur-md shadow-[0_3px_14px_rgba(0,0,0,0.10)]" style={{borderColor:"var(--border)", color:"var(--text-secondary)", transform:`scale(${0.92+Math.min(0.12, Math.abs(dragX)/480)})`}}>← pass</div>
            </div>
          )}
          {large && dragX>56 && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <div className="rounded-full bg-[#121214] px-4 py-2 text-[12px] font-[700] tracking-[0.06em] text-white shadow-[0_6px_18px_rgba(0,0,0,0.20)] dark:bg-[#FF6B26] dark:text-[#121214]" style={{transform:`scale(${0.92+Math.min(0.14, dragX/420)})`}}>mine → {effectivePoints(c,false)} pts</div>
            </div>
          )}

          <button onClick={(e:any)=>{ e.stopPropagation(); onTap?.(); }} className="relative z-10 w-full cursor-pointer text-left">
            <div className="px-[18px] pt-[2px] pb-[12px]">
              <div className={"font-[630] text-[var(--text)] "+(large ? "text-[22px] leading-[1.13] tracking-[-0.014em] mt-[7px] max-w-[78%]" : "text-[15px] leading-[1.28] mt-1 max-w-[78%]")} style={{fontFamily:"Fraunces, ui-serif, Georgia, serif"}}>
                {c.title}
              </div>
              <div className="mt-[10px] flex flex-wrap items-center gap-2">
                <span className="inline-flex h-[20px] items-center rounded-full border bg-transparent px-2.5 text-[10.5px] font-[550]" style={{borderColor:"var(--border)", color:"var(--muted)"}}>{effortHuman(c.pain)}</span>
                <span className="text-[11.5px] font-[650] tracking-[0.01em]" style={{color:"var(--accent-strong)"}}>{points} pts{mult>1? ` • ${mult}×`:""}</span>
                {overdue && <span className="inline-flex items-center gap-1 text-[11px] font-[560]" style={{color:"#A77166"}}><span className="h-[4px] w-[4px] rounded-full bg-[#D9A8A0]" />{overdueDays}d late +15%</span>}
                {isFlipped && <span className="text-[10.5px]" style={{color:"var(--muted)"}}>tap to close</span>}
              </div>
              {large && (
                <div className="mt-[14px] h-[2.2px] w-full overflow-hidden rounded-full" style={{background:"var(--border)"}}>
                  <div className="h-full rounded-full bg-[#D9CFC5] transition-all duration-500" style={{width: Math.min(100, (points/120)*100)+"%", background:"color-mix(in srgb, var(--border) 90%, #121214 10%)"}} />
                </div>
              )}
            </div>
          </button>

          {isFlipped && (
            <div className="relative z-10 mx-[12px] mb-[12px] rounded-[12px] border bg-[var(--chip-bg)] px-3 py-2.5 text-[11px] leading-[1.5]" style={{borderColor:"var(--border)", color:"var(--text-secondary)"}}>
              <div>Pain {c.pain}/10 • base {c.basePoints} {c.multiplier>1? "• bonus 1.15×" : ""} {overdue? `• ${overdueDays}d overdue 1.15× → ${points}` : `• ${points} pts`} • double-tap to claim instantly</div>
              <div>Due {new Date(getDueMsChore(c as any)).toLocaleString("en-GB",{timeZone:HOUSEHOLD_TZ, weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})} • {c.frequency}{c.frequencyDetail? ` • ${c.frequencyDetail}`:""} • Owner {c.assignedTo||"deck"}</div>
            </div>
          )}

          {pointsPops.find(p=> p.id===c.id) && (
            <span className="pointer-events-none absolute right-5 top-[54px] z-20 text-[13px] font-[800] text-[#6EA57A]" style={{animation:"popUpBouncy 720ms cubic-bezier(0.34,1.56,0.64,1) forwards"}}>+{pointsPops.find(p=> p.id===c.id)?.pts}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="px-[2px] flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-['Fraunces'] text-[13px] font-[660] tracking-[-0.01em] tabular-nums" style={{color:"var(--text)"}}>{deckCount} left</span>
          <span className="text-[11px] font-[450] tracking-[0.02em]" style={{color:"var(--muted)"}}>swipe • tap • double-tap mine</span>
          {combo>1 && (
            <span className="ml-1 inline-flex h-[22px] items-center gap-1 rounded-full border bg-[#121214] px-2.5 text-[11px] font-[750] text-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]" style={{borderColor:"#121214"}}>
              <span className="grid h-3 w-3 place-items-center text-[10px]">🔥</span> {combo}× streak
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {deckCount===0 && (
            <span className="hidden sm:inline-flex h-[22px] items-center rounded-full border bg-[var(--chip-bg)] px-2.5 text-[10.5px] font-[560]" style={{borderColor:"var(--border)", color:"var(--muted)"}}>
              {( ()=>{ try{return Number(localStorage.getItem("couple_v1_chore_streak")||0);}catch{return 0;}})()} day run
            </span>
          )}
          <div className="relative">
            <select value={filter} onChange={e=> setFilter(e.target.value as any)} className="h-[32px] min-w-[88px] appearance-none bg-transparent px-0 pr-5 text-[11.5px] font-[520] outline-none" style={{border:"none", borderBottom:"1px solid var(--border)", color:"var(--muted)"}}>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="overdue">Overdue</option>
            </select>
            <span className="pointer-events-none absolute right-[2px] top-1/2 -translate-y-1/2" style={{color:"var(--muted)"}}><svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M2.6 4.2 L6 7.6 L9.4 4.2" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" /></svg></span>
          </div>
        </div>
      </div>

      {showSkeletons ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[20px] border bg-[var(--card-bg)] h-[278px] animate-pulse" style={{borderColor:"var(--border)"}}>
            <div className="p-[18px] space-y-3"><div className="h-2 w-20 rounded-full bg-[var(--border)]" /><div className="h-5 w-3/4 rounded-full bg-[var(--border)]" /><div className="h-3 w-full rounded-full bg-[var(--chip-bg)]" /></div>
          </div>
          <div className="h-[54px] rounded-[14px] bg-[var(--chip-bg)] border animate-pulse" style={{borderColor:"var(--border)"}} />
        </div>
      ) : currentCard ? (
        <div className="mt-[10px] space-y-3">
          <div
            ref={arenaRef}
            className="relative touch-manipulation"
            style={{ touchAction:"pan-y", minHeight: 304, userSelect:"none"} as any}
            onPointerDown={(e:any)=>{
              setDragging(true); setDragX(0);
              try{ (e.currentTarget as any).setPointerCapture(e.pointerId);}catch{}
              startX.current=e.clientX;
            }}
            onPointerMove={(e:any)=>{
              if(!dragging) return;
              const sx=startX.current; if(sx==null) return;
              const diff=e.clientX-sx;
              const clamped=Math.max(-184, Math.min(184, diff*0.78));
              setDragX(clamped);
            }}
            onPointerUp={(e:any)=>{
              if(Math.abs(dragX)>72) onSwipe(dragX>0?"right":"left");
              else setDragX(0);
              setDragging(false); startX.current=null;
              try{ (e.currentTarget as any).releasePointerCapture?.(e.pointerId);}catch{}
            }}
            onPointerCancel={()=>{
              setDragX(0); setDragging(false); startX.current=null;
            }}
          >
            {/* depth peek */}
            {deck[1] && <div className="absolute inset-0 pointer-events-none translate-y-[6px] scale-[0.984]"><ChoreCard c={deck[1] as any} idx={1} /></div>}
            <ChoreCard c={currentCard} large onTap={()=> onTapCard(currentCard)} />
          </div>

          {/* Soho arena buttons + undo */}
          <div className="grid grid-cols-[1fr_1.35fr] gap-[10px] px-[1px]">
            <button onClick={()=> onSwipe("left")} className="h-[54px] rounded-[14px] border bg-[var(--card-bg)] text-[13px] font-[620] tracking-[0.03em] active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5" style={{borderColor:"var(--border)", color:"var(--text-secondary)", boxShadow:"0 1px 0 rgba(0,0,0,0.02) inset", minHeight:54, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}> <span className="text-[13px] opacity-60">×</span> Pass <span className="text-[10px] opacity-50 ml-1">←</span></button>
            <button onClick={()=> onSwipe("right")} className="h-[54px] rounded-[14px] bg-[#121214] text-[13px] font-[700] tracking-[0.02em] text-white active:scale-[0.98] shadow-[0_7px_20px_rgba(0,0,0,0.18)] transition-transform flex items-center justify-center gap-1.5 dark:bg-[#FF6B26] dark:text-[#121214]" style={{minHeight:54, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}><span className="h-[5px] w-[5px] rounded-full bg-[#F7EFE8] opacity-80 dark:bg-[#121214]/70" /> I’ll do it <span className="text-[10px] opacity-70 ml-0.5">→</span></button>
          </div>

          {/* mini progress dots */}
          <div className="flex items-center justify-between px-[2px] pt-[2px]">
            <div className="flex items-center gap-1">
              {deck.slice(0,6).map((_,i)=> <span key={i} className={"h-[4px] rounded-full transition-all "+(i===0?"w-[16px] bg-[#121214]":"w-[6px] bg-[var(--border)]")} style={{opacity: i===0?0.9: 0.6 - i*0.08}} />)}
              {deck.length>6 && <span className="text-[10px] text-[var(--muted)] ml-1">+{deck.length-6}</span>}
            </div>
            <div className="flex items-center gap-2">
              {onUndo && <button onClick={()=> onUndo()} className="text-[11px] font-[500] underline decoration-dotted underline-offset-4 text-[var(--muted)] hover:text-[var(--text)]">Undo</button>}
              <button onClick={()=> setShowRules(true)} className="text-[11px] font-[500] underline decoration-dotted underline-offset-4 text-[var(--muted)]">Rules</button>
            </div>
          </div>

          {deck.length>1 && <div className="px-[2px] text-[11px] font-[460]" style={{color:"var(--muted)"}}>Next <span className="font-[600]" style={{color:"var(--text-secondary)"}}>{deck[1].title}</span> • {deck[1].basePoints}pts • double-tap current to insta-claim</div>}

          {showCoach && (
            <div className="mt-2 rounded-[16px] border bg-[#FFFEFC] px-3.5 py-3 text-[12px] leading-[1.45] shadow-[0_8px_24px_rgba(0,0,0,0.06)]" style={{borderColor:"#EDE2D2"}}>
              <div className="font-[650] text-[12.5px] font-['Fraunces']">How to play — 10 sec</div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-[10px] border bg-white px-2 py-2"><span className="font-[650]">→ Right</span><br/>You claim it — goes to Mine. Points when you finish.</div>
                <div className="rounded-[10px] border bg-white px-2 py-2"><span className="font-[650]">← Left</span><br/>Pass — partner sees it next. Both pass? Snoozes 24h.</div>
                <div className="rounded-[10px] border bg-[#FFF7EF] px-2 py-2 border-[#F2D3BA]"><span className="font-[650]">Both →</span><br/>Race! 1.15× bonus — first to do wins boosted.</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={dismissTutor} className="h-[36px] rounded-full bg-[#121214] px-3.5 text-[11.5px] font-[640] text-white">Got it — play</button>
                <span className="text-[11px] text-[var(--muted)]">Tip: double-tap card = instant claim. ←/→ keys work on desktop.</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-[20px] border bg-[var(--card-bg)] px-6 py-[32px] text-center shadow-[0_6px_20px_rgba(0,0,0,0.04)] relative overflow-hidden" style={{borderColor:"var(--border)"}}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-[160px] w-[160px] rounded-full blur-[22px] opacity-60" style={{background:"radial-gradient(70% 70% at 50% 50%, #A8D5BA 0%, transparent 70%)"}} />
          <div className="mx-auto mb-3 grid h-[54px] w-[54px] place-items-center rounded-full bg-[var(--chip-bg)] border" style={{borderColor:"var(--border)"}}>
            <span className="text-[18px]">🎉</span>
          </div>
          <div className="font-['Fraunces'] text-[17px] font-[680] tracking-[-0.01em]" style={{color:"var(--text)"}}>Deck clear — you legend</div>
          <div className="mt-1.5 text-[12.5px] font-[460] leading-[1.5]" style={{color:"var(--muted)"}}>No chores left to claim. New drops at midnight Europe/Dublin. Go touch grass.</div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="inline-flex h-[28px] items-center rounded-full bg-[#121214] px-3 text-[11px] font-[640] text-white">All caught up</span>
            <span className="text-[11px] text-[var(--muted)] tabular-nums">{combo>0?`${combo} combo saved •`:``} {( ()=>{ try{return Number(localStorage.getItem("couple_v1_chore_streak")||0);}catch{return 0;}})()} day run</span>
          </div>
        </div>
      )}
    </>
  );
}

export default ChoreDeck;
