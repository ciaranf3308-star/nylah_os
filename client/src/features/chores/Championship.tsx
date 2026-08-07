// Championship.tsx — Beirt Championship Arena v4 — Proper Scoreboard Edition
// - Clear hierarchy: season header, central scoreboard, stats grid, race track, timer, belts table
// - Fixed bugs: pct 50-50 when 0-0, no duplicate RESETS, no house ghost, no bokeh noise, single source scores
// - Boutique-hotel warm: charcoal #121214, beige #F7EFE8, mint #A8D5BA, Fraunces display, polished not flashy
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
  const rawTotal = monthScores?.total ?? a + c;
  const totalDone = a + c; // actual pts claimed this month
  const hasPoints = totalDone > 0;

  // pct: 50-50 when no points, else a / totalDone
  const pct = hasPoints ? Math.round((a / totalDone) * 100) : 50;
  const pctC = 100 - pct;
  const knotPct = hasPoints ? Math.max(12, Math.min(88, pct)) : 50;

  const aName = (PERSONS as any)?.["aisling"]?.name || "Aisling";
  const cName = (PERSONS as any)?.["ciaran"]?.name || "Ciaran";
  const aInit = (PERSONS as any)?.["aisling"]?.initial || aName.slice(0, 1).toUpperCase();
  const cInit = (PERSONS as any)?.["ciaran"]?.initial || cName.slice(0, 1).toUpperCase();

  const aWinning = hasPoints && a > c;
  const cWinning = hasPoints && c > a;
  const tied = hasPoints && a === c;
  const diff = Math.abs(a - c);

  // streak
  const streak = React.useMemo(() => {
    if (!metaHistory?.length) return { count: 0, who: null as PersonKey | null, whoName: null as string | null };
    let who = metaHistory[0]?.winner ?? null;
    if (!who) return { count: 0, who: null, whoName: null };
    let cnt = 0;
    for (const h of metaHistory) {
      if (h.winner === who) cnt++;
      else break;
    }
    const whoName = who === "aisling" ? aName : who === "ciaran" ? cName : null;
    return { count: cnt, who, whoName };
  }, [metaHistory, aName, cName]);

  // countdown label fix — avoid "RESETS RESETS"
  const rawLabel = (countdown?.label || "").trim();
  const cleanLabel = rawLabel.replace(/^resets\s+/i, "").replace(/^reset\s+/i, "").trim();
  const timerLabel = rawLabel.toLowerCase().startsWith("resets") ? rawLabel : rawLabel ? `Resets ${cleanLabel}` : `Resets ${monthKey ? `end` : `1st`} 00:00`;
  // final display: cleanLabel + maybe "00:00" kept, timerLabel is full

  const cap = 600;
  const combinedPct = Math.min(100, (totalDone / cap) * 100);
  const toGo = Math.max(0, cap - totalDone);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#121214] shadow-[0_14px_40px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <style>{`
        @keyframes beirt-pulse { 0%,100% { transform: scale(1); opacity:1 } 50% { transform: scale(1.12); opacity:0.9 } }
        @keyframes beirt-float { 0%,100% { transform: translateY(0) rotate(-4deg)} 50% { transform: translateY(-2px) rotate(2deg)} }
      `}</style>

      {/* Season header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-[22px] w-[22px] shrink-0 place-items-center justify-center rounded-full bg-[#F7EFE8] text-[10px] font-bold text-[#121214]">B</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/80">Season • {monthKey || "This month"}</span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-[10.5px] font-medium text-white/60">{cap} pts cap</span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#A8D5BA]/20 bg-[#A8D5BA]/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#A8D5BA]">
          <span className="relative h-[6px] w-[6px]">
            <span className="absolute inset-0 rounded-full bg-[#A8D5BA]" style={{ animation: reducedMotion ? "none" : "beirt-pulse 1.8s ease-in-out infinite" }} />
          </span>
          LIVE
        </span>
      </div>

      {/* Central Scoreboard */}
      <div className="px-4 pt-4 pb-3">
        {/* No points callout */}
        {!hasPoints && (
          <div className="mb-3 rounded-[12px] border border-dashed border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] font-medium text-white/50">
            No points yet — first to claim a chore leads
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {/* Aisling */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {aWinning && (
                <span className="absolute -top-[12px] left-1/2 z-10 -translate-x-1/2 select-none" style={{ animation: reducedMotion ? "none" : "beirt-float 2.6s ease-in-out infinite" }} aria-hidden>
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#F7EFE8] text-[10px] shadow">👑</span>
                </span>
              )}
              <div className={`grid h-14 w-14 place-items-center rounded-full border-2 text-[15px] font-extrabold shadow-[0_4px_16px_rgba(0,0,0,0.28)] ${aWinning ? "bg-[#F7EFE8] text-[#121214] border-[#F7EFE8]" : "bg-[#1E1E20] text-[#F7EFE8] border-white/[0.12]"}`}>{aInit}</div>
              {aWinning && <span className="absolute -right-1 -top-0.5 rounded-full border border-[#A8D5BA]/40 bg-[#121214] px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[#A8D5BA]">LEAD</span>}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#F7EFE8]/70">{aName}</div>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-display text-[34px] font-bold leading-none tabular-nums text-white" style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}>{a}</span>
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">pts</div>
          </div>

          {/* Center trophy / tied */}
          <div className="flex min-w-[86px] flex-col items-center px-1 pt-1">
            <div className="grid h-[40px] w-[40px] place-items-center rounded-full border border-white/10 bg-[#1A1A1E] text-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">🏆</div>
            <div className="mt-2 inline-flex min-h-[22px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-white/70">
              {tied ? "TIED" : !hasPoints ? "0 – 0" : `${aWinning ? aInit : cInit} leads`}
            </div>
            <div className="mt-1.5 text-center text-[10px] font-medium text-white/36">{hasPoints ? `${pct}% – ${pctC}%` : "50 – 50"}</div>
          </div>

          {/* Ciaran */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {cWinning && (
                <span className="absolute -top-[12px] left-1/2 z-10 -translate-x-1/2 select-none" style={{ animation: reducedMotion ? "none" : "beirt-float 2.6s ease-in-out infinite" }} aria-hidden>
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#A8D5BA] text-[10px] shadow">👑</span>
                </span>
              )}
              <div className={`grid h-14 w-14 place-items-center rounded-full border-2 text-[15px] font-extrabold shadow-[0_4px_16px_rgba(0,0,0,0.28)] ${cWinning ? "bg-[#A8D5BA] text-[#0B1A12] border-[#A8D5BA]" : "bg-[#1E1E20] text-[#BFE9CF] border-white/[0.10]"}`}>{cInit}</div>
              {cWinning && <span className="absolute -right-1 -top-0.5 rounded-full border border-[#A8D5BA]/40 bg-[#121214] px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[#A8D5BA]">LEAD</span>}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#A8D5BA]/80">{cName}</div>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-display text-[34px] font-bold leading-none tabular-nums text-white" style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}>{c}</span>
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">pts</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-white/40">Lead</div>
            <div className="mt-1 text-[13px] font-semibold text-white">
              {tied ? "Even" : !hasPoints ? "—" : `+${diff}`}{" "}
              <span className="font-normal text-white/50 text-[11px]">{tied || !hasPoints ? "" : aWinning ? aName : cName}</span>
            </div>
          </div>
          <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-white/40">Share</div>
            <div className="mt-1 flex items-baseline gap-1 text-[13px] font-semibold tabular-nums text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-[#F7EFE8]" aria-hidden />
              {pct}% <span className="mx-0.5 text-white/20">/</span> <span className="inline-block h-2 w-2 rounded-full bg-[#A8D5BA]" aria-hidden /> {pctC}%
            </div>
          </div>
          <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-white/40">Streak</div>
            <div className="mt-1 text-[13px] font-semibold text-white">
              {streak.count >= 2 ? (
                <span className="inline-flex items-center gap-1">🔥 {streak.count}× <span className="text-[11px] font-medium text-white/60">{streak.whoName}</span></span>
              ) : streak.count === 1 ? (
                <span className="text-white/60 text-[11px]">1 win • {streak.whoName}</span>
              ) : (
                <span className="text-white/45 text-[11px]">—</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] border border-white/[0.06] bg-[#0A0A0A] px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-white/50">Total done</span>
            <span className="text-[11px] font-semibold tabular-nums text-white/80">{totalDone} chores • {a + c} pts</span>
          </div>
          <div className="rounded-[12px] border border-white/[0.06] bg-[#0A0A0A] px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-white/50">To 600 cap</span>
            <span className="text-[11px] font-semibold tabular-nums text-white/80">{toGo} left</span>
          </div>
        </div>

        {/* Head-to-head split bar (clear, no knob confusion) */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-white/45">
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#F7EFE8]" /> {aName}</span>
            <span className="text-[10px] font-medium text-white/35">Head-to-head</span>
            <span className="inline-flex items-center gap-1">{cName} <span className="h-1.5 w-1.5 rounded-full bg-[#A8D5BA]" /></span>
          </div>
          <div className="relative h-[18px] w-full overflow-hidden rounded-full bg-[#0D0D0F] ring-1 ring-white/[0.07] flex">
            {/* centered divider */}
            <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.12] -translate-x-1/2" />
            {hasPoints ? (
              <>
                <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: "#F7EFE8" }} />
                <div className="h-full transition-all duration-700" style={{ width: `${pctC}%`, background: "#A8D5BA" }} />
              </>
            ) : (
              <div className="h-full w-full flex">
                <div className="h-full w-1/2 bg-[#F7EFE8]/30" />
                <div className="h-full w-1/2 bg-[#A8D5BA]/30" />
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/35">
            <span>{a} pts ({pct}%)</span>
            <span>{c} pts ({pctC}%)</span>
          </div>
          <div className="mt-2 text-center text-[10.5px] text-white/45">
            {hasPoints ? `${totalDone} completed • ${toGo} to cap` : "First claim wins the split"}
          </div>
        </div>

        {/* Race to 600 progress (combined) */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/35">
            <span>Race to 600</span>
            <span className="normal-case tracking-normal rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">{combinedPct.toFixed(1)}% • {totalDone}/600</span>
          </div>
          <div className="relative">
            <div className="relative h-[10px] w-full overflow-hidden rounded-full bg-[#0D0D0F] ring-1 ring-white/[0.06]">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${combinedPct}%`, background: "linear-gradient(90deg,#F7EFE8 0%,#E8DCC8 60%,#A8D5BA 100%)" }} />
            </div>
            {/* markers */}
            <div className="mt-1 flex justify-between text-[9px] tabular-nums text-white/28">
              <span>0</span><span>150</span><span>300</span><span>450</span><span>600</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timer row */}
      <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-white/10 bg-[#0A0A0A] px-3 py-2">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/70">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white/[0.06] text-[10px]">🕒</span>
          <span className="font-medium">{timerLabel}</span>
        </span>
        <span className="h-[10px] w-px bg-white/10" aria-hidden />
        <span className="font-mono text-[11px] font-bold tabular-nums text-white/80">
          {String(countdown.d).padStart(2, "0")}d {String(countdown.h).padStart(2, "0")}h {String(countdown.m).padStart(2, "0")}m {String(countdown.s).padStart(2, "0")}s
        </span>
        {isClear && <span className="ml-auto inline-flex rounded-full bg-[#A8D5BA]/15 px-2 py-0.5 text-[10px] font-medium text-[#A8D5BA] border border-[#A8D5BA]/20">Deck clear — season still live</span>}
      </div>

      {/* Hall of Belts - table */}
      {metaHistory?.length ? (
        <div className="mt-3 border-t border-white/[0.06] px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10.5px] font-bold uppercase tracking-widest text-white/35">Hall of Belts</div>
            <div className="text-[10px] text-white/30">{metaHistory.length} seasons</div>
          </div>
          <div className="overflow-hidden rounded-[12px] border border-white/[0.06]">
            <div className="grid grid-cols-[1.1fr_0.9fr_0.6fr_0.5fr] gap-1 bg-white/[0.04] px-2.5 py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-white/35">
              <span>Month</span><span>Winner</span><span>Score</span><span className="text-right">Margin</span>
            </div>
            <div className="divide-y divide-white/[0.04] bg-[#0E0E10]">
              {metaHistory.slice(0, 12).map((h: any) => {
                const winA = h.winner === "aisling";
                const winC = h.winner === "ciaran";
                const winnerName = winA ? aName : winC ? cName : "Tie";
                const winnerInit = winA ? aInit : winC ? cInit : "=";
                const winPts = winA ? h.a : winC ? h.c : Math.max(h.a ?? 0, h.c ?? 0);
                const losePts = winA ? h.c : winC ? h.a : Math.min(h.a ?? 0, h.c ?? 0);
                const margin = winA || winC ? Math.abs((h.a ?? 0) - (h.c ?? 0)) : 0;
                return (
                  <div key={h.key} className="grid grid-cols-[1.1fr_0.9fr_0.6fr_0.5fr] items-center gap-1 px-2.5 py-2 text-[11px]">
                    <span className="truncate tabular-nums text-white/70">{h.key}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold ${winA ? "bg-[#F7EFE8] text-[#121214]" : winC ? "bg-[#A8D5BA] text-[#0B1A12]" : "bg-white/10 text-white/50"}`}>{winnerInit}</span>
                      <span className={`truncate text-[11px] ${winA ? "text-[#F7EFE8]" : winC ? "text-[#BFE9CF]" : "text-white/40"}`}>{winnerName}</span>
                    </span>
                    <span className="tabular-nums text-white/70">{winPts}<span className="text-white/30">–{losePts}</span></span>
                    <span className="text-right tabular-nums text-white/45">{winA || winC ? `+${margin}` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  );
}

export default Championship;
