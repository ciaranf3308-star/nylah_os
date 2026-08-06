// Championship.tsx — monthly leaderboard, streak
// Preserve: Europe/Dublin TZ, weekNumberSinceEpoch, BIWEEKLY_EPOCH_MONDAY_UTC, 1.15× bonus, capped 1.5×, 600 pts label, Fraunces/Inter styles
import React from "react";
import type { PersonKey } from "./choreTypes";
import { PERSONS } from "../../constants/themes";

type MonthScores = { a:number; c:number; total:number; pct:number };
type Countdown = { d:number; h:number; m:number; s:number; label:string };
type MetaHist = { key:string; a:number; c:number; winner: PersonKey|null };

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
  return (
    <div className="nylah-arena nylah-arena rounded-[28px] px-5 py-5 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-[160px] w-[160px] rounded-full blur-[24px] pointer-events-none" style={{background:'radial-gradient(100% 100% at 50% 50%, var(--accent) 0%, transparent 72%)', opacity:0.16}} aria-hidden="true" />
      <div className="flex items-center justify-between relative">
        <span className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{fontFamily:'Fraunces, serif', color:'var(--muted)'}}>Championship Arena</span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide" style={{background:'var(--chip-bg)', border:'1px solid var(--border)', color:'var(--text)'}}> <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> LIVE</span>
      </div>

      <div className="mt-5 flex items-end justify-center gap-5 relative">
        {monthScores.a >= monthScores.c ? (
          <>
            <div className="flex flex-col items-center">
              <div className="grid h-11 w-11 place-items-center rounded-full border bg-[var(--card-bg)] text-[12px] font-bold shadow-sm" style={{borderColor:'var(--border)', color:'var(--text)'}}>{PERSONS["ciaran"].initial}</div>
              <div className="mt-1.5 h-[38px] w-[68px] rounded-t-[14px] grid place-items-center text-[11px] font-medium border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}>2nd</div>
              <div className="text-[13px] font-semibold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.c}</div>
            </div>
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
            <div className="flex flex-col items-center">
              <div className="grid h-11 w-11 place-items-center rounded-full border bg-[var(--card-bg)] text-[12px] font-bold shadow-sm" style={{borderColor:'var(--border)', color:'var(--text)'}}>{PERSONS["aisling"].initial}</div>
              <div className="mt-1.5 h-[38px] w-[68px] rounded-t-[14px] grid place-items-center text-[11px] font-medium border" style={{background:'var(--chip-bg)', borderColor:'var(--border)', color:'var(--muted)'}}>2nd</div>
              <div className="text-[13px] font-semibold mt-1" style={{fontFamily:'Fraunces, serif', color:'var(--text)'}}>{monthScores.a}</div>
            </div>
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
  );
}

export default Championship;
