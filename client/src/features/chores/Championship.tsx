// Championship.tsx — Beirt Championship Arena v3 — Clear Game Edition
// Goal: instantly readable at a glance, boutique-hotel warm, gamified not noisy
// Keeps: monthScores {a,c,total,pct}, countdown, metaHistory, monthKey, isClear, Europe/Dublin labels upstream
// Fixes from screenshots: removed house ghost bg, removed overlapping podiums, clarified hierarchy, single score source

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
  React.useEffect(() => {
    try {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const fn = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener?.("change", fn);
      return () => mql.removeEventListener?.("change", fn);
    } catch {}
  }, []);

  const a = monthScores?.a ?? 0;
  const c = monthScores?.c ?? 0;
  const total = monthScores?.total ?? 0;
  // pct is a/total*100 from upstream, fallback 50 when no points
  const pctRaw = total > 0 ? (a / total) * 100 : 50;
  const pct = Math.round(total > 0 ? pctRaw : 50);
  const knotPct = Math.max(10, Math.min(90, pct));

  const aName = (PERSONS as any)?.["aisling"]?.name || "Aisling";
  const cName = (PERSONS as any)?.["ciaran"]?.name || "Ciaran";
  const aInit = (PERSONS as any)?.["aisling"]?.initial || aName.slice(0, 1).toUpperCase();
  const cInit = (PERSONS as any)?.["ciaran"]?.initial || cName.slice(0, 1).toUpperCase();

  const aWinning = a > c;
  const cWinning = c > a;
  const tied = a === c && total > 0;
  const noPoints = total === 0;

  // streak
  const streak = React.useMemo(() => {
    if (!metaHistory?.length) return { count: 0, who: null as PersonKey | null };
    let who = metaHistory[0]?.winner ?? null;
    if (!who) return { count: 0, who: null };
    let cnt = 0;
    for (const h of metaHistory) {
      if (h.winner === who) cnt++;
      else break;
    }
    return { count: cnt, who };
  }, [metaHistory]);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#121214] px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <style>{`
        @keyframes beirt-pulse-live { 0%,100% { transform: scale(1); opacity:1 } 50% { transform: scale(1.15); opacity:0.85 } }
        @keyframes beirt-float-crown { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-2px) rotate(2deg) } }
        @keyframes beirt-glow-lead { 0%,100% { box-shadow: 0 0 18px rgba(247,239,232,0.14), 0 6px 18px rgba(0,0,0,0.32) } 50% { box-shadow: 0 0 28px rgba(247,239,232,0.24), 0 10px 28px rgba(0,0,0,0.42) } }
      `}</style>

      {/* subtle beige/mint spotlights — very low, no motion */}
      <div className="pointer-events-none absolute -left-[70px] -top-[60px] h-[220px] w-[220px] rounded-full blur-[36px] opacity-[0.10]" style={{ background: "radial-gradient(90% 90% at 50% 50%, #F7EFE8 0%, transparent 68%)" }} />
      <div className="pointer-events-none absolute -right-[70px] -top-[50px] h-[220px] w-[220px] rounded-full blur-[36px] opacity-[0.08]" style={{ background: "radial-gradient(90% 90% at 50% 50%, #A8D5BA 0%, transparent 68%)" }} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[24px] w-[24px] place-items-center rounded-full bg-[#F7EFE8] text-[10px] font-bold text-[#121214]">B</span>
          <div className="leading-none">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/70" style={{ fontFamily: "Fraunces, serif" }}>Championship</div>
            <div className="mt-[2px] text-[11px] text-white/44">{monthKey} • 600 pts • Race</div>
          </div>
        </div>
        <span className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white/80">
          <span className="relative grid h-[7px] w-[7px] place-items-center">
            <span className="absolute h-[7px] w-[7px] rounded-full bg-[#A8D5BA]" style={{ animation: reducedMotion ? "none" : "beirt-pulse-live 1.8s ease-in-out infinite" }} />
            <span className="relative h-[4px] w-[4px] rounded-full bg-[#D6EEE1]" />
          </span>
          LIVE
        </span>
      </div>

      {/* MAIN DUEL */}
      <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        {/* Aisling */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {aWinning && !noPoints && (
              <span className="absolute -top-[14px] left-1/2 -translate-x-1/2" style={{ animation: reducedMotion ? "none" : "beirt-float-crown 2.6s ease-in-out infinite" }} aria-hidden>
                <svg width="20" height="13" viewBox="0 0 28 18" fill="none"><path d="M2 12 L8 2 L14 10 L20 1 L26 12 L14 15 Z" fill="#F7EFE8" /></svg>
              </span>
            )}
            <div
              className={`grid place-items-center rounded-full border-2 font-extrabold ${aWinning && !noPoints ? "h-[64px] w-[64px] text-[16px] bg-[#F7EFE8] text-[#121214] border-[#F7EFE8]" : "h-[52px] w-[52px] text-[13px] bg-[#1E1E20] text-white/80 border-white/[0.12]"}`}
              style={{ animation: aWinning && !noPoints && !reducedMotion ? "beirt-glow-lead 2.6s ease-in-out infinite" : "none" }}
            >
              {aInit}
            </div>
            {aWinning && !noPoints && <span className="absolute -right-2 -top-1 rounded-full bg-[#121214] px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[#A8D5BA] border border-[#A8D5BA]/40">LEAD</span>}
          </div>
          <div className="mt-2 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#F7EFE8]/70">{aName}</div>
            <div className="mt-0.5 flex items-baseline justify-center gap-1">
              <span className="text-[22px] font-bold tabular-nums text-white" style={{ fontFamily: "Fraunces, serif" }}>{a}</span>
              <span className="text-[10px] text-white/40">pts</span>
            </div>
          </div>
          {aWinning && !noPoints ? (
            <div className="mt-1 rounded-full bg-[#F7EFE8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#F7EFE8]">+{a - c} ahead</div>
          ) : tied ? (
            <div className="mt-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">tied</div>
          ) : null}
        </div>

        {/* VS Trophy */}
        <div className="flex flex-col items-center pb-6">
          <div className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[#1C1C1E] border border-white/10 text-[12px]">🏆</div>
          <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-white/28">vs</div>
          <div className="mt-1 text-[10px] font-semibold text-white/36">{noPoints ? "No points yet" : tied ? "Tied" : `${pct}% — ${100 - pct}%`}</div>
        </div>

        {/* Ciaran */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {cWinning && !noPoints && (
              <span className="absolute -top-[14px] left-1/2 -translate-x-1/2" style={{ animation: reducedMotion ? "none" : "beirt-float-crown 2.6s ease-in-out infinite" }} aria-hidden>
                <svg width="20" height="13" viewBox="0 0 28 18" fill="none"><path d="M2 12 L8 2 L14 10 L20 1 L26 12 L14 15 Z" fill="#A8D5BA" /></svg>
              </span>
            )}
            <div
              className={`grid place-items-center rounded-full border-2 font-extrabold ${cWinning && !noPoints ? "h-[64px] w-[64px] text-[16px] bg-[#A8D5BA] text-[#0B1A12] border-[#A8D5BA]" : "h-[52px] w-[52px] text-[13px] bg-[#1A1A1C] text-white/70 border-white/[0.10]"}`}
              style={{ animation: cWinning && !noPoints && !reducedMotion ? "beirt-glow-lead 2.6s ease-in-out infinite" : "none" }}
            >
              {cInit}
            </div>
            {cWinning && !noPoints && <span className="absolute -right-2 -top-1 rounded-full bg-[#121214] px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[#A8D5BA] border border-[#A8D5BA]/40">LEAD</span>}
          </div>
          <div className="mt-2 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#A8D5BA]/70">{cName}</div>
            <div className="mt-0.5 flex items-baseline justify-center gap-1">
              <span className="text-[22px] font-bold tabular-nums text-white" style={{ fontFamily: "Fraunces, serif" }}>{c}</span>
              <span className="text-[10px] text-white/40">pts</span>
            </div>
          </div>
          {cWinning && !noPoints && (
            <div className="mt-1 rounded-full bg-[#A8D5BA]/12 px-2 py-0.5 text-[10px] font-semibold text-[#A8D5BA]">+{c - a} ahead</div>
          )}
        </div>
      </div>

      {/* TRACK */}
      <div className="relative z-10 mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/40">
          <span>{aName} {noPoints ? "" : `${pct}%`}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] normal-case tracking-normal text-white/50">Race to 600 • {total}/600</span>
          <span>{cName} {noPoints ? "" : `${100 - pct}%`}</span>
        </div>
        <div className="relative h-[26px] w-full overflow-hidden rounded-full bg-[#0D0D0F] ring-1 ring-white/[0.06]">
          {/* center tick */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[14px] w-px -translate-x-1/2 -translate-y-1/2 bg-white/[0.12]" />
          {/* fill */}
          <div
            className="absolute left-1 top-1 bottom-1 rounded-full transition-all duration-700"
            style={{
              width: `${knotPct}%`,
              background: aWinning || noPoints || tied ? "linear-gradient(90deg,#F7EFE8 0%,#E8DCC8 55%,#E9DED1 100%)" : "linear-gradient(90deg,#E9DED1 0%,#A8D5BA 100%)",
              opacity: noPoints ? 0.22 : 0.95,
            }}
          />
          {/* opponent fill from right when C leading */}
          {cWinning && !noPoints && (
            <div className="absolute right-1 top-1 bottom-1 rounded-full transition-all duration-700" style={{ width: `${100 - knotPct}%`, background: "linear-gradient(90deg,#8FCFA8 0%,#A8D5BA 100%)", opacity: 0.92 }} />
          )}
          {/* knot */}
          <div className="absolute top-1/2 grid h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#121214] text-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.6)]" style={{ left: `${knotPct}%` }}>
            {noPoints ? "•" : knotPct > 50 ? "→" : knotPct < 50 ? "←" : "•"}
          </div>
        </div>
      </div>

      {/* TIMER */}
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A8D5BA]" style={{ animation: reducedMotion ? "none" : "beirt-pulse-live 1.6s ease-in-out infinite" }} />
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">Resets {countdown.label || "1st 00:00"}</span>
          <span className="mx-1 h-[12px] w-px bg-white/10" />
          <span className="font-mono text-[11px] font-bold text-white/80 tabular-nums">
            {String(countdown.d).padStart(2, "0")}d : {String(countdown.h).padStart(2, "0")}h : {String(countdown.m).padStart(2, "0")}m : {String(countdown.s).padStart(2, "0")}s
          </span>
        </div>
        <span className="inline-flex min-h-[30px] items-center rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60 border border-white/10">600 pts cap{streak.count >= 2 ? ` • 🔥 ${streak.count}× streak` : ""}</span>
        {isClear && <span className="inline-flex min-h-[30px] items-center rounded-full bg-[#A8D5BA]/12 px-2.5 py-1 text-[11px] text-[#A8D5BA] border border-[#A8D5BA]/20">Deck clear — still live</span>}
      </div>

      {/* BELTS */}
      {metaHistory?.length ? (
        <div className="relative z-10 mt-3 border-t border-white/[0.06] pt-3">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-white/30">
            <span>Hall of Belts</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
            <span className="font-normal normal-case tracking-normal text-white/30">{metaHistory.length} months</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metaHistory.map((h: any) => {
              const winA = h.winner === "aisling";
              const winC = h.winner === "ciaran";
              return (
                <span
                  key={h.key}
                  className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium"
                  style={{
                    borderColor: winA ? "rgba(247,239,232,0.14)" : winC ? "rgba(168,213,186,0.18)" : "rgba(255,255,255,0.08)",
                    background: winA ? "rgba(247,239,232,0.10)" : winC ? "rgba(168,213,186,0.10)" : "rgba(255,255,255,0.04)",
                    color: winA ? "#F7EFE8" : winC ? "#BFE2CC" : "rgba(255,255,255,0.45)",
                  }}
                >
                  <span className={`grid h-[14px] w-[14px] place-items-center rounded-full text-[9px] font-bold ${winA ? "bg-[#F7EFE8] text-[#121214]" : winC ? "bg-[#A8D5BA] text-[#0B1A12]" : "bg-white/10 text-white/50"}`}>{winA ? aInit : winC ? cInit : "="}</span>
                  {h.key} <span className="opacity-60">{winA ? `• ${aInit}` : winC ? `• ${cInit}` : "• tie"}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-1" />
      )}
    </div>
  );
}

export default Championship;
