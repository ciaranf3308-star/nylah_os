// Championship.tsx — V211 Arena HUD — compact, game-first, still boutique hotel
// Before: large editorial receipt with many ink tracks. After: tight duel bar sticky,
// single live dot, 2 large numbers, share headband, 600-cap superthin rail, past seasons
// collapsible. Mobile-first 44px safe. Preserves monthScores, countdown, metaHistory.
import React from "react";
import { PERSONS } from "../../constants/themes";
import type { PersonKey } from "./choreTypes";

type MonthScores = { a: number; c: number; total: number; pct: number };
type Countdown = { d: number; h: number; m: number; s: number; label: string };
type MetaHist = { key: string; a: number; c: number; winner: PersonKey | null };

export function Championship({
  monthScores,
  countdown,
  metaHistory,
  monthKey,
  isClear,
}: {
  monthScores: MonthScores;
  countdown: Countdown;
  metaHistory: MetaHist[];
  monthKey: string;
  isClear?: boolean;
}) {
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [showHall, setShowHall] = React.useState(false);
  React.useEffect(()=>{
    try{
      const mql=window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const fn=(e:any)=> setReducedMotion(e.matches);
      mql.addEventListener?.("change",fn);
      return ()=> mql.removeEventListener?.("change",fn);
    }catch{}
  },[]);

  const a = monthScores?.a ?? 0;
  const c = monthScores?.c ?? 0;
  const totalDone = a + c;
  const hasPoints = totalDone>0;
  const pct = hasPoints ? Math.round((a / totalDone)*100) : 50;
  const pctC = 100 - pct;
  const aName = (PERSONS as any)?.["aisling"]?.name || "Aisling";
  const cName = (PERSONS as any)?.["ciaran"]?.name || "Ciaran";
  const aInit = (PERSONS as any)?.["aisling"]?.initial || aName.slice(0,1).toUpperCase();
  const cInit = (PERSONS as any)?.["ciaran"]?.initial || cName.slice(0,1).toUpperCase();
  const aWinning = hasPoints && a>c;
  const cWinning = hasPoints && c>a;
  const tied = hasPoints && a===c;
  const diff = Math.abs(a-c);
  const cap=600;
  const combinedPct = Math.min(100, (totalDone/cap)*100);
  const toGo = Math.max(0, cap-totalDone);

  const streak = React.useMemo(()=>{
    if(!metaHistory?.length) return {count:0, who:null as PersonKey|null};
    let who = metaHistory[0]?.winner ?? null;
    if(!who) return {count:0, who:null};
    let cnt=0; for(const h of metaHistory){ if(h.winner===who) cnt++; else break; }
    return {count:cnt, who};
  },[metaHistory]);

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[var(--card-bg)]" style={{border:"1px solid color-mix(in srgb, var(--border) 78%, transparent)", boxShadow:"0 8px 28px rgba(18,18,20,0.06), 0 1px 0 rgba(0,0,0,0.03)"}}>
      <style>{`@keyframes beirt-dot{0%,100%{transform:scale(1)}50%{transform:scale(1.28)}} @keyframes pulseRace{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}`}</style>

      {/* top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,#F7EFE8_22%,#A8D5BA_76%,transparent)] opacity-80" aria-hidden />

      {/* compact mast + duel */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--chip-bg)] border px-2 py-0.5 text-[10px] font-[650] tracking-[0.06em]" style={{borderColor:"var(--border)", color:"var(--text-secondary)"}}>
            <span className="h-[5px] w-[5px] rounded-full bg-[#121214]" style={{animation: reducedMotion ? "none" : "beirt-dot 2.0s ease-in-out infinite"}} /> LIVE
          </span>
          <span className="font-['Fraunces'] text-[12px] font-[650] tracking-[-0.01em] text-[var(--text)]">{monthKey ? <>{monthKey.split("-")[1]} Championship</> : "Championship"}</span>
          <span className="text-[10.5px] tabular-nums" style={{color:"var(--muted)"}}>• {totalDone}/{cap}</span>
        </div>
        <button onClick={()=> setShowHall(v=>!v)} className="h-[28px] rounded-full border bg-white px-2.5 text-[10.5px] font-[600] text-[var(--muted)] hover:text-[var(--text)]" style={{borderColor:"var(--border)"}}>{showHall? "Hide" : `${metaHistory?.length||0} seasons`} ▾</button>
      </div>

      <div className="px-3 pb-2 grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
        {/* A */}
        <div className="flex flex-col items-center py-1">
          <div className="relative">
            <div className="grid h-[38px] w-[38px] place-items-center rounded-full text-[12px] font-[700] tracking-[0.02em]" style={{background: aWinning ? "#FFFEFB" : "color-mix(in srgb, var(--chip-bg) 92%, transparent)", color:"var(--text)", border:`1px solid ${aWinning? "#EFE1D2" : "var(--border)"}`, boxShadow: aWinning ? "0 2px 10px rgba(247,239,232,0.55)" : "none"}}>{aInit}</div>
            {aWinning && <span className="pointer-events-none absolute -top-[6px] left-1/2 -translate-x-1/2 text-[12px] font-[800] text-[#C9A98A]">·</span>}
          </div>
          <div className="mt-1 text-[10px] font-[600] tracking-[0.07em] uppercase" style={{color:"var(--muted)"}}>{aName}</div>
          <div className="font-['Fraunces'] mt-[1px] text-[24px] font-[730] leading-none tabular-nums tracking-[-0.02em]" style={{color:"var(--text)"}}>{a}</div>
        </div>

        <div className="flex min-w-[64px] flex-col items-center justify-end pb-[8px]">
          <span className="font-['Pinyon_Script'] text-[18px] leading-none opacity-80" style={{color:"var(--muted)"}}>vs</span>
          <span className="mt-1 font-['Fraunces'] text-[10.5px] font-[600]" style={{color:"var(--text-secondary)"}}>{tied ? "tied" : !hasPoints ? "—" : aWinning? `${aInit} ahead` : `${cInit} ahead`}</span>
          <span className="mt-0.5 text-[10px] tabular-nums" style={{color:"var(--muted)"}}>{pct}–{pctC}{diff>0?` • ${diff}`:""}</span>
          <span className="mt-1 inline-flex items-center rounded-full bg-[#121214] px-2 py-0.5 text-[9.5px] font-[650] text-white">{countdown.d}d {countdown.h}h {String(countdown.m).padStart(2,"0")}m</span>
        </div>

        <div className="flex flex-col items-center py-1">
          <div className="relative">
            <div className="grid h-[38px] w-[38px] place-items-center rounded-full text-[12px] font-[700]" style={{background: cWinning ? "#FBFFFE" : "color-mix(in srgb, var(--chip-bg) 92%, transparent)", color:"var(--text)", border:`1px solid ${cWinning? "#C3DECA" : "var(--border)"}`, boxShadow: cWinning? "0 2px 10px rgba(168,213,186,0.35)":"none"}}>{cInit}</div>
            {cWinning && <span className="pointer-events-none absolute -top-[6px] left-1/2 -translate-x-1/2 text-[12px] font-[800] text-[#7FB89A]">·</span>}
          </div>
          <div className="mt-1 text-[10px] font-[600] tracking-[0.07em] uppercase" style={{color:"var(--muted)"}}>{cName}</div>
          <div className="font-['Fraunces'] mt-[1px] text-[24px] font-[730] leading-none tabular-nums tracking-[-0.02em]" style={{color:"var(--text)"}}>{c}</div>
        </div>
      </div>

      {/* single-line summary + tracks — 14px total height savers */}
      <div className="px-3.5 pb-2 text-center font-['Fraunces'] text-[11.5px] font-[480] leading-[1.35]" style={{color:"var(--text-secondary)"}}>
        {!hasPoints ? <span className="italic" style={{color:"var(--muted)"}}>No claims yet — first swipe opens board.</span> : tied ? <span>Dead tied at {a}. Next claim decides.</span> : <span><span className="font-[650]" style={{color:"var(--text)"}}>{aWinning? aName : cName}</span> leads by {diff}<span className="mx-1" style={{color:"var(--muted)"}}>·</span>{pct}% share{streak.count>=2 && <><span className="mx-1" style={{color:"var(--muted)"}}>·</span><span className="italic">{streak.count} in a row</span></>}</span>}
      </div>

      <div className="px-3 pb-2.5 space-y-[9px]">
        <div className="h-px w-full relative bg-[var(--border)]">
          <div className="absolute left-0 top-1/2 h-[2.5px] -translate-y-1/2 rounded-full transition-all" style={{width: hasPoints? `${pct}%`:"50%", background:"#F2E2CC"}} />
          <div className="absolute right-0 top-1/2 h-[2.5px] -translate-y-1/2 rounded-full transition-all" style={{width: hasPoints? `${pctC}%`:"50%", background:"#A8D5BA", opacity: hasPoints?1:0.62}} />
          <div className="absolute top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[var(--card-bg)]" style={{left: hasPoints? `${pct}%`:"50%", borderColor:"var(--border)"}} />
        </div>
        <div className="relative h-px w-full bg-[var(--border)]">
          <div className="absolute inset-y-0 left-0 h-px w-full bg-[repeating-linear-gradient(90deg,transparent_0_16px,var(--border)_16px_17px)] opacity-55" aria-hidden />
          <div className="absolute left-0 top-1/2 h-[2.5px] -translate-y-1/2 rounded-full" style={{width:`${combinedPct}%`, background:"#121214", opacity:0.84}} />
        </div>
        <div className="flex justify-between font-['Fraunces'] text-[9px] tabular-nums" style={{color:"var(--muted)"}}><span>0</span><span>300</span><span className="flex items-center gap-1">{toGo===0?"capped":`${toGo} left`}{isClear && <span className="ml-1 inline-flex h-1 w-1 rounded-full bg-[#7FB89A] animate-pulse" />}</span></div>
      </div>

      {showHall && metaHistory?.length ? (
        <div className="border-t px-3 py-2" style={{borderColor:"color-mix(in srgb, var(--border) 62%, transparent)"}}>
          <div className="space-y-0">
            {metaHistory.slice(0,6).map((h:any)=>{
              const winA=h.winner==="aisling", winC=h.winner==="ciaran", tiedRow=!winA&&!winC;
              const name=winA?aName:winC?cName:"Tie";
              return (
                <div key={h.key} className="flex items-baseline justify-between border-b py-[6px] last:border-0 text-[11.5px]" style={{borderColor:"color-mix(in srgb, var(--border) 46%, transparent)"}}>
                  <span className="font-['Fraunces'] tabular-nums" style={{color:"var(--muted)"}}>{h.key}</span>
                  <span className="mx-2 flex-1 border-b border-dotted opacity-40" style={{borderColor:"var(--border)"}} aria-hidden />
                  <span className="font-['Fraunces'] tabular-nums"><span className={tiedRow?"text-[var(--muted)] italic":"text-[var(--text-secondary)]"}>{name}</span><span className="ml-1.5 text-[10.5px]" style={{color:"var(--muted)"}}>{h.a}–{h.c}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Championship;
