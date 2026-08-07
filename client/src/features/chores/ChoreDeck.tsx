// ChoreDeck.tsx — Tinder swipe deck UI (Deck tab)
// Preserve 44px min spring cubic-bezier(0.34,1.56,0.64,1), Fraunces/Inter styles, grain 0.12 opacity, 64px badge
import React from "react";
import type { ChoreV2 } from "./choreTypes";
import { effectivePoints, getDueMsChore, isBonusChore, effortHuman } from "./choreScoring";
import { rotForId } from "../../shared/utils/helpers";
import { ChoreIcon, CHORE_ICONS, CHORE_ICON_BY_TEMPLATE } from "../../lib/choreIcons";

type Props = {
  deck: ChoreV2[];
  currentCard: ChoreV2 | null;
  deckCount: number;
  dragX: number;
  dragging: boolean;
  startX: React.MutableRefObject<number|null>;
  setDragX: (v:number)=>void;
  setDragging: (v:boolean)=>void;
  onSwipe: (dir:"left"|"right")=>void;
  flippedId: string | null;
  setFlippedId: (cb:any)=>void;
  pointsPops: {id:string, pts:number}[];
  nowMs: number;
  onTapCard: (c:ChoreV2)=>void;
  combo: number;
  filter: "all"|"today"|"week"|"overdue";
  setFilter: (v:any)=>void;
  showSkeletons: boolean;
  setShowRules: (v:boolean)=>void;
};

import { todayKey, toLocalKey as toLocalKeyDublin, HOUSEHOLD_TZ } from "../../lib/dates";

function timingLabel(c: ChoreV2, nowMs:number){
  try{
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
  }catch{ return (c.frequency||"ONCE").toUpperCase(); }
}

export function ChoreDeck(props: Props) {
  const { deck, currentCard, deckCount, dragX, dragging, startX, setDragX, setDragging, onSwipe, flippedId, pointsPops, nowMs, onTapCard, combo, filter, setFilter, showSkeletons, setShowRules } = props;



  const ChoreCardMega = ({c, large=false, onTap}:{c:ChoreV2; large?:boolean; onTap?:()=>void})=>{
    const isFlipped=flippedId===c.id;
    const dueMs=getDueMsChore(c as any);
    const overdue=dueMs < nowMs && c.status!=="done";
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
            background: "linear-gradient(180deg,var(--wash-top, #FFE8D6) 0%,var(--card-bg) 38%,var(--card-bg) 100%)",
            transformStyle:"preserve-3d" as any
          }}
          onClick={()=>{ try{ if(navigator.vibrate) navigator.vibrate(10);}catch{} }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.08] mix-blend-multiply" style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}} aria-hidden="true" />
          <div className="absolute -right-6 -top-10 h-[140px] w-[140px] rounded-full blur-[22px] opacity-[0.28] pointer-events-none" style={{ background: (iconId==='bins'||iconId==='trash'||iconId==='recycling') ? '#FEF3C7' : (iconId==='dishes'||iconId==='cooking'||iconId==='kitchen') ? '#FFEDD5' : (iconId==='laundry'||iconId==='ironing'||iconId==='fold') ? '#E0E7FF' : (iconId==='bathroom'||iconId==='sink'||iconId==='mop') ? '#CCFBF1' : (iconId==='garden'||iconId==='lawn'||iconId==='plant') ? '#DCFCE7' : '#F7EFE8' }} aria-hidden="true" />
          <div className="absolute right-4 top-4 grid h-[68px] w-[68px] place-items-center rounded-[18px] border bg-white text-[var(--text)] rotate-[2deg] shadow-[0_8px_22px_rgba(0,0,0,0.10)]" style={{borderColor:"var(--border)"}} aria-hidden="true">
            <ChoreIcon id={iconId as any} size={32} />
          </div>
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
          <button onClick={(e:any)=>{ e.stopPropagation(); const t=e.currentTarget as HTMLElement; const prev=t.style.transform; t.style.transform='scale(1.15)'; t.style.transition='transform 120ms cubic-bezier(0.34,1.56,0.64,1)'; try{ if((navigator as any).vibrate) (navigator as any).vibrate(10);}catch{} setTimeout(()=>{ t.style.transform=prev||'scale(1)'; setTimeout(()=>{ t.style.transform=''; },80); },140); onTap?.(); }} className="w-full text-left cursor-pointer relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[var(--muted)]">{timingLabel(c, nowMs)}</span>
              {c.status==="open" && (c as any).swipes?.aisling==="right" && (c as any).swipes?.ciaran==="right" && <span className="animate-pulse rounded-full bg-[var(--card-bg)] border border-[#FCA5A5] px-2.5 py-0.5 text-[10px] font-bold text-[#991B1B]">RACE • 1.15×</span>}
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
              <div>Due: {new Date(getDueMsChore(c as any)).toLocaleString("en-GB",{timeZone:HOUSEHOLD_TZ, weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"})} • {c.frequency} {c.frequencyDetail? `• ${c.frequencyDetail}`:""}</div>
              <div>Assigned: {c.assignedTo||"deck"} • Swipes {(c as any).swipes?.aisling||"–"} / {(c as any).swipes?.ciaran||"–"}</div>
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

  return (
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

      <div className="px-1 flex items-center gap-2">
        {combo>1 && <span className="inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] px-3 py-1 text-[11px] font-bold text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FACC15"><path d="M12 2a7 7 0 00-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 00-7-7z"/></svg> {combo}x combo</span>}
        {(deckCount===0) && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--chip-bg)] border px-3 py-1 text-[11px] font-semibold" style={{borderColor:"#C4B5FD"}}>Streak <svg width="10" height="12" viewBox="0 0 24 24" fill="#E07A5F"><path d="M12 2 C10 6 4 8 4 13 a6 6 0 0012 0 c0-5-6-7-4-11z"/></svg> {(()=>{ try{ return Number(localStorage.getItem("couple_v1_chore_streak")||0)}catch{return 0}})()}</span>}
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
            onPointerUp={(e:any)=>{ if(Math.abs(dragX)>80){ onSwipe(dragX>0?"right":"left"); } else setDragX(0); setDragging(false); startX.current=null; try{ (e.currentTarget as any).releasePointerCapture?.(e.pointerId); }catch{} }}
            onPointerCancel={(e:any)=>{ setDragX(0); setDragging(false); startX.current=null; }}
          >
            <ChoreCardMega c={currentCard} large onTap={()=> onTapCard(currentCard)} />
          </div>
          <div className="flex gap-3 px-1">
            <button onClick={()=> onSwipe("left")} className="flex-1 h-[56px] rounded-[16px] border bg-[var(--card-bg)] text-[14px] font-semibold tracking-wide active:scale-[0.96] shadow-sm flex items-center justify-center gap-1.5" style={{borderColor:"var(--border)", minHeight:56, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg> PASS</button>
            <button onClick={()=> onSwipe("right")} className="flex-1 h-[56px] rounded-[16px] bg-[#0A0A0A] text-white text-[14px] font-bold tracking-wide active:scale-[0.96] shadow-[0_6px_18px_rgba(0,0,0,0.25)] flex items-center justify-center gap-1.5" style={{minHeight:56, transition:"transform 180ms cubic-bezier(0.34,1.56,0.64,1)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="#E07A5F" stroke="white" strokeWidth="1.3"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg> I'LL DO IT</button>
          </div>
          <div className="px-1 flex items-center gap-2">
            <div className="flex-1 text-[11px] text-[var(--muted)] leading-[1.35]"><b>→</b> claim (Mine), <b>←</b> pass, <b>both →</b> Race 1.15×, tap card = details • <b>{currentCard.basePoints}</b>pts = pain {currentCard.pain}/10 ×10</div>
            <button onClick={()=> setShowRules(true)} className="h-[32px] w-[32px] grid place-items-center rounded-full border bg-[var(--card-bg)] text-[11px] font-bold shrink-0" style={{borderColor:"var(--border)", minHeight:32, minWidth:32}}>?</button>
          </div>
          {deck.length>1 && <div className="px-1 text-[11px] text-[var(--muted)]/60">Next up: {deck[1].title} • {deck[1].basePoints}pts</div>}
        </div>
      ) : (
        <div className="rounded-[28px] border bg-[var(--card-bg)] px-6 py-10 text-center relative overflow-hidden" style={{borderColor:"var(--border)", background:"linear-gradient(180deg,var(--wash-mid) 0%,var(--card-bg) 38%,var(--card-bg) 100%)", boxShadow:"0 16px 40px rgba(0,0,0,0.12)"}}>
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--card-bg)] border shadow-sm" style={{borderColor:"var(--border)"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#E07A5F" aria-hidden="true"><path d="M12 19l-1.4-1.3C5.4 13 2 10.2 2 6.8 2 4 4.1 2 6.8 2c1.5 0 3 1 3.9 2.2C11.6 3 13.1 2 14.6 2 17.3 2 19.4 4 19.4 6.8c0 3.4-3.4 6.2-8.6 10.9L12 19z"/></svg>
          </div>
          <div className="font-display text-[18px] font-semibold" style={{fontFamily:"Fraunces"}}>Deck clear • new drops tomorrow</div>
          <div className="text-[13px] text-[var(--muted)] mt-1">You crushed it. Moon, confetti, warm wash.</div>
        </div>
      )}
    </>
  );
}

export default ChoreDeck;
