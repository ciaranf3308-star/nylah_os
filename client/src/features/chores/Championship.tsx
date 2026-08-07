// Championship.tsx — Beirt v5 — lighter, airy, theme-aware
// - Fixes kept: pct 50/50 when 0-0, totalDone=a+c, duplicate RESETS strip, streak, reducedMotion
// - Theme: var(--card-bg), var(--border), var(--text), wash-top gradient, no hardcoded #121214 black shell
// - Boutique-hotel: airy hero, 3 soft chips, thin tracks, minimal timer & belts
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
  const totalDone = a + c;
  const hasPoints = totalDone > 0;

  const pct = hasPoints ? Math.round((a / totalDone) * 100) : 50;
  const pctC = 100 - pct;

  const aName = (PERSONS as any)?.["aisling"]?.name || "Aisling";
  const cName = (PERSONS as any)?.["ciaran"]?.name || "Ciaran";
  const aInit = (PERSONS as any)?.["aisling"]?.initial || aName.slice(0,1).toUpperCase();
  const cInit = (PERSONS as any)?.["ciaran"]?.initial || cName.slice(0,1).toUpperCase();

  const aWinning = hasPoints && a > c;
  const cWinning = hasPoints && c > a;
  const tied = hasPoints && a === c;
  const diff = Math.abs(a - c);

  const streak = React.useMemo(() => {
    if (!metaHistory?.length) return { count: 0, who: null as PersonKey | null, whoName: null as string | null };
    let who = metaHistory[0]?.winner ?? null;
    if (!who) return { count: 0, who: null, whoName: null };
    let cnt = 0;
    for (const h of metaHistory) {
      if (h.winner === who) cnt++; else break;
    }
    const whoName = who === "aisling" ? aName : who === "ciaran" ? cName : null;
    return { count: cnt, who, whoName };
  }, [metaHistory, aName, cName]);

  // timer label — avoid "Resets Resets"
  const rawLabel = (countdown?.label || "").trim();
  const cleanLabel = rawLabel.replace(/^resets\s+/i, "").replace(/^reset\s+/i, "").trim();
  const timerLabel = rawLabel.toLowerCase().startsWith("resets") ? rawLabel : rawLabel ? `Resets ${cleanLabel}` : `Resets ${monthKey ? "end" : "1st"} 00:00`;

  const cap = 600;
  const combinedPct = Math.min(100, (totalDone / cap) * 100);
  const toGo = Math.max(0, cap - totalDone);

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border bg-[var(--card-bg)]"
      style={{
        borderColor: "var(--border)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.06), 0 1px 0 rgba(0,0,0,0.02)",
        background:
          "linear-gradient(180deg, var(--wash-top, #FFF1E6) 0%, var(--card-bg, #FFFEFB) 42%, var(--card-bg) 100%)",
      }}
    >
      <style>{`@keyframes beirt-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:0.85}}`}</style>

      {/* Top: season + LIVE */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="inline-flex items-center rounded-full bg-[var(--chip-bg)] border px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-[var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
            Season • {monthKey || "This month"}
          </span>
          <span className="inline-flex items-center rounded-full bg-[var(--card-bg)] border px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>
            {cap} pts cap
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>
          <span className="relative grid h-1.5 w-1.5 place-items-center">
            <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animation: reducedMotion ? "none" : "beirt-pulse 1.8s ease-in-out infinite" }} />
          </span>
          LIVE
        </span>
      </div>

      {/* Hero scoreboard — airy, centered */}
      <div className="px-4 pb-3">
        {!hasPoints && (
          <div className="mb-3 text-center text-[11px] font-medium text-[var(--muted)]">
            No points yet — first to claim leads
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1">
          {/* Aisling */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {aWinning && (
                <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 select-none text-[12px]">👑</span>
              )}
              <div
                className="grid h-12 w-12 place-items-center rounded-full border text-[13.5px] font-bold"
                style={{
                  background: aWinning ? "#F7EFE8" : "var(--chip-bg)",
                  color: "var(--text)",
                  borderColor: aWinning ? "#E9DDD0" : "var(--border)",
                  boxShadow: aWinning ? "0 2px 10px rgba(247,239,232,0.6)" : "none",
                }}
              >
                {aInit}
              </div>
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold tracking-wide text-[var(--muted)] uppercase">{aName}</div>
            <div className="mt-0.5 font-display text-[30px] font-bold leading-none tabular-nums text-[var(--text)]" style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}>
              {a}
            </div>
            <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-[var(--muted)]">pts</div>
          </div>

          {/* Center */}
          <div className="flex min-w-[74px] flex-col items-center pb-2">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-full border bg-[var(--chip-bg)] text-[12px]" style={{ borderColor: "var(--border)" }}>
              🏆
            </div>
            <div
              className="mt-2 inline-flex min-h-[18px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
              style={{ borderColor: "var(--border)", background: "var(--card-bg)", color: "var(--text-secondary)" }}
            >
              {tied ? "TIED" : !hasPoints ? "0–0" : aWinning ? `${aInit} leads` : `${cInit} leads`}
            </div>
            <div className="mt-1 text-[10px] font-medium tabular-nums text-[var(--muted)]">
              {pct}%–{pctC}%
            </div>
          </div>

          {/* Ciaran */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {cWinning && (
                <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 select-none text-[12px]">👑</span>
              )}
              <div
                className="grid h-12 w-12 place-items-center rounded-full border text-[13.5px] font-bold"
                style={{
                  background: cWinning ? "#A8D5BA" : "var(--chip-bg)",
                  color: cWinning ? "#0B1A12" : "var(--text)",
                  borderColor: cWinning ? "#8FC9A5" : "var(--border)",
                  boxShadow: cWinning ? "0 2px 10px rgba(168,213,186,0.45)" : "none",
                }}
              >
                {cInit}
              </div>
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold tracking-wide text-[var(--muted)] uppercase">{cName}</div>
            <div className="mt-0.5 font-display text-[30px] font-bold leading-none tabular-nums text-[var(--text)]" style={{ fontFamily: "Fraunces, ui-serif, Georgia, serif" }}>
              {c}
            </div>
            <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-[var(--muted)]">pts</div>
          </div>
        </div>

        {/* Soft inline chips — not heavy boxes */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--chip-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] uppercase tracking-widest text-[var(--muted)] font-bold">Lead</span>
            <span className="tabular-nums">{tied ? "Even" : !hasPoints ? "—" : `+${diff} ${aWinning ? aName : cWinning ? cName : ""}`.trim()}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
            <span className="h-2 w-2 rounded-full bg-[#F7EFE8] ring-1 ring-black/5" aria-hidden />
            {pct}%<span className="text-[var(--muted)] text-[10px]">/</span>
            <span className="h-2 w-2 rounded-full bg-[#A8D5BA] ring-1 ring-black/5" aria-hidden />
            {pctC}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] uppercase tracking-widest text-[var(--muted)] font-bold">Streak</span>
            {streak.count >= 2 ? (
              <span>🔥 {streak.count}× <span className="text-[10px] text-[var(--muted)]">{streak.whoName}</span></span>
            ) : streak.count === 1 ? (
              <span className="text-[11px]">{streak.whoName} 1 win</span>
            ) : (
              <span className="text-[var(--muted)]">—</span>
            )}
          </span>
        </div>

        {/* Head-to-head — thin, airy */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#F7EFE8] ring-1 ring-black/5" /> {aName}</span>
            <span className="text-[10px] font-medium">Head-to-head</span>
            <span className="inline-flex items-center gap-1.5">{cName} <span className="h-1.5 w-1.5 rounded-full bg-[#A8D5BA] ring-1 ring-black/5" /></span>
          </div>
          <div className="relative flex h-[10px] w-full overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--border) 70%, transparent)", border: "1px solid var(--border)" } as any}>
            {hasPoints ? (
              <>
                <div className="h-full transition-all duration-600" style={{ width: `${pct}%`, background: "#F7EFE8" }} />
                <div className="h-full transition-all duration-600" style={{ width: `${pctC}%`, background: "#A8D5BA" }} />
              </>
            ) : (
              <>
                <div className="h-full w-1/2 opacity-60" style={{ background: "#F7EFE8" }} />
                <div className="h-full w-1/2 opacity-60" style={{ background: "#A8D5BA" }} />
              </>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--muted)]">
            <span>{a} pts • {pct}%</span>
            <span>{c} pts • {pctC}%</span>
          </div>
          <div className="mt-1 text-center text-[11px] text-[var(--muted)]">
            {hasPoints ? `${totalDone} completed • ${toGo} to ${cap}` : "First claim wins split"}
          </div>
        </div>

        {/* Race to 600 — minimal */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Race to {cap}</span>
            <span className="text-[10px] tabular-nums text-[var(--muted)]">{combinedPct.toFixed(1)}% • {totalDone}/{cap}</span>
          </div>
          <div className="relative h-[6px] w-full overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--border) 80%, transparent)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${combinedPct}%`, background: "linear-gradient(90deg,#F7EFE8,#A8D5BA)" }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-[var(--muted)]/70">
            <span>0</span><span>150</span><span>300</span><span>450</span><span>{cap}</span>
          </div>
        </div>
      </div>

      {/* Timer — light pill */}
      <div className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border bg-[var(--chip-bg)] px-3 py-2" style={{ borderColor: "var(--border)" }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
          <span className="grid h-4 w-4 place-items-center rounded-full border bg-[var(--card-bg)] text-[9px]" style={{ borderColor: "var(--border)" }}>◐</span>
          {timerLabel}
        </span>
        <span className="h-3 w-px bg-[var(--border)]" aria-hidden />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">
          {String(countdown.d).padStart(2,"0")}d {String(countdown.h).padStart(2,"0")}h {String(countdown.m).padStart(2,"0")}m {String(countdown.s).padStart(2,"0")}s
        </span>
        {isClear && <span className="ml-auto inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Deck clear • season live</span>}
      </div>

      {/* Hall — minimal */}
      {metaHistory?.length ? (
        <div className="border-t px-3 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--border) 60%, transparent)" }}>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Hall of Belts</div>
            <div className="text-[10px] text-[var(--muted)]">{metaHistory.length} seasons</div>
          </div>
          <div className="rounded-[10px] border bg-[var(--card-bg)]/60" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-[1fr_0.9fr_0.6fr_0.45fr] gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]/80">
              <span>Month</span><span>Winner</span><span>Score</span><span className="text-right">Marg</span>
            </div>
            <div className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" } as any}>
              {metaHistory.slice(0, 10).map((h:any)=>{
                const winA = h.winner === "aisling";
                const winC = h.winner === "ciaran";
                const winnerName = winA ? aName : winC ? cName : "Tie";
                const winPts = winA ? h.a : winC ? h.c : Math.max(h.a??0,h.c??0);
                const losePts = winA ? h.c : winC ? h.a : Math.min(h.a??0,h.c??0);
                const margin = winA||winC ? Math.abs((h.a??0)-(h.c??0)) : 0;
                const init = winA ? aInit : winC ? cInit : "=";
                return (
                  <div key={h.key} className="grid grid-cols-[1fr_0.9fr_0.6fr_0.45fr] items-center px-2.5 py-1.5 text-[11px]">
                    <span className="truncate tabular-nums text-[var(--muted)]">{h.key}</span>
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <span className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold" style={{ background: winA ? "#F7EFE8" : winC ? "#A8D5BA" : "var(--chip-bg)", color: winC ? "#0B1A12" : "var(--text)" }}>{init}</span>
                      <span className="truncate text-[11px] text-[var(--text-secondary)]">{winnerName}</span>
                    </span>
                    <span className="tabular-nums text-[var(--text-secondary)]">{winPts}<span className="text-[var(--muted)]">-{losePts}</span></span>
                    <span className="text-right tabular-nums text-[var(--muted)]">{winA||winC ? `+${margin}` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : <div className="h-2" />}
    </div>
  );
}

export default Championship;
