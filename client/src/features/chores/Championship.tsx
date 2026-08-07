// Championship.tsx — Beirt Championship Arena v2 - Black Spotlight Edition
// Base: #121214 black arena matching new Beirt logo, warm beige/mint spotlights
// Gamified: dual podiums with crown, tug-of-war race track, digital scoreboard, belt history
// Preserves: Europe/Dublin TZ labels handled upstream, monthScores, countdown, metaHistory, monthKey, isClear, 600pts cap, Fraunces typography
// A11y: reduced-motion respected, 44px touch targets, Fraunces for display
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
  const total = monthScores?.total ?? 1;
  const pct = monthScores?.pct ?? 50;
  const aName = (PERSONS as any)?.["aisling"]?.name || "Aisling";
  const cName = (PERSONS as any)?.["ciaran"]?.name || "Ciaran";
  const aInit = (PERSONS as any)?.["aisling"]?.initial || aName.slice(0, 1).toUpperCase();
  const cInit = (PERSONS as any)?.["ciaran"]?.initial || cName.slice(0, 1).toUpperCase();
  const aWinning = a >= c;
  const leaderName = aWinning ? aName : cName;
  const leaderInit = aWinning ? aInit : cInit;
  const trailerInit = aWinning ? cInit : aInit;
  const diff = Math.abs(a - c);
  const knotPct = total > 0 ? Math.max(8, Math.min(92, (a / total) * 100)) : 50;

  // streak calc: last N same winner
  const streak = React.useMemo(() => {
    if (!metaHistory?.length) return { count: 0, who: null as PersonKey | null };
    let cnt = 0;
    let who = metaHistory[0]?.winner ?? null;
    if (!who) return { count: 0, who: null };
    for (const h of metaHistory) {
      if (h.winner === who) cnt++;
      else break;
    }
    return { count: cnt, who };
  }, [metaHistory]);

  const showFire = streak.count >= 2;

  return (
    <div className="beirt-arena relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121214] px-0 py-0 shadow-[0_18px_60px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <style>{`
        .beirt-arena * { font-variant-ligatures: common-ligatures; }
        @keyframes beirt-pulse-live { 0%,100% { transform: scale(1); opacity:1 } 50% { transform: scale(1.18); opacity:0.85 } }
        @keyframes beirt-float-crown { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-3px) rotate(2deg) } }
        @keyframes beirt-glow-lead { 0%,100% { box-shadow: 0 0 22px rgba(247,239,232,0.18), 0 8px 24px rgba(0,0,0,0.32) } 50% { box-shadow: 0 0 34px rgba(247,239,232,0.32), 0 12px 34px rgba(0,0,0,0.44) } }
        @keyframes beirt-spot-drift { 0% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(6px,-8px,0) scale(1.06) } 100% { transform: translate3d(0,0,0) scale(1) } }
        @keyframes beirt-trophy-shine { 0% { transform: translateX(-120%) } 100% { transform: translateX(220%) } }
        @keyframes beirt-rope-knot { 0%,100% { transform: translate(-50%,-50%) } 50% { transform: translate(-50%,-52%) } }
      `}</style>

      {/* BG layers */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.52] mix-blend-screen"
        style={{
          backgroundImage: `url('./arena-bg.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(0.2px) saturate(0.9)',
        }}
        aria-hidden="true"
      />
      {/* warm spotlights - beige left, mint right */}
      <div className="pointer-events-none absolute -left-[80px] -top-[72px] h-[280px] w-[280px] rounded-full blur-[44px] opacity-[0.22]" style={{ background: 'radial-gradient(90% 90% at 50% 50%, #F7EFE8 0%, #E8DCC8 22%, transparent 68%)', animation: reducedMotion ? 'none' : 'beirt-spot-drift 7s ease-in-out infinite' }} />
      <div className="pointer-events-none absolute -right-[90px] -top-[60px] h-[320px] w-[320px] rounded-full blur-[46px] opacity-[0.18]" style={{ background: 'radial-gradient(90% 90% at 50% 50%, #A8D5BA 0%, #86C9A0 18%, transparent 70%)', animation: reducedMotion ? 'none' : 'beirt-spot-drift 8.5s ease-in-out infinite reverse' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.34]" style={{ background: 'radial-gradient(120% 80% at 50% -20%, rgba(247,239,232,0.10) 0%, transparent 46%), radial-gradient(110% 74% at 50% 120%, rgba(0,0,0,0.82) 12%, transparent 54%)' }} />

      {/* subtle fabric grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.038] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#F7EFE8] text-[10px] font-bold text-[#121214] shadow-[0_2px_10px_rgba(247,239,232,0.28)]">B</span>
          <div className="flex flex-col leading-none">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/72" style={{ fontFamily: 'Fraunces, Georgia, serif', letterSpacing: '0.18em' }}>Championship Arena</span>
            <span className="mt-[2px] text-[11px] font-medium text-white/42">Month {monthKey} • 600 pts</span>
          </div>
        </div>
        <span className="inline-flex min-h-[28px] items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-[11px] font-bold tracking-wide text-white/86 backdrop-blur-[8px]">
          <span className="relative inline-grid h-[9px] w-[9px] place-items-center">
            <span className="absolute h-[9px] w-[9px] rounded-full bg-[#A8D5BA] opacity-70" style={{ animation: reducedMotion ? 'none' : 'beirt-pulse-live 1.8s ease-in-out infinite' }} />
            <span className="relative h-[6px] w-[6px] rounded-full bg-[#CDEBD8] shadow-[0_0_8px_#A8D5BA]" />
          </span>
          LIVE
          {showFire && streak.count >= 2 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] px-2 py-[2px] text-[10px] font-bold text-[#F7EFE8]"><span aria-hidden>🔥</span>{streak.count}× {streak.who === 'aisling' ? aInit : cInit}</span>
          )}
        </span>
      </div>

      {/* VS / Trophy strip */}
      <div className="relative z-10 mt-3 flex flex-col items-center px-5">
        <div className="relative flex items-center gap-3">
          <div className="h-px w-[38px] bg-gradient-to-r from-transparent to-white/18" />
          <div className="relative grid h-[36px] w-[46px] place-items-center rounded-full border border-[#F7EFE8]/18 bg-[#1C1C1E] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_18px_rgba(0,0,0,0.36)] overflow-hidden">
            <img src="./trophy-icon.webp" alt="" className="h-[18px] w-[18px] object-contain opacity-[0.92] mix-blend-lighten" draggable={false} />
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.55) 38%, transparent 62%)', transform: 'translateX(-120%)', animation: reducedMotion ? 'none' : 'beirt-trophy-shine 3.2s ease-in-out infinite 1s' }} />
          </div>
          <div className="h-px w-[38px] bg-gradient-to-l from-transparent to-white/18" />
        </div>
        <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38" style={{ fontFamily: 'Fraunces, serif' }}>Centre Court</div>
      </div>

      {/* PODIUMS */}
      <div className="relative z-10 mt-4 flex items-end justify-center gap-3 px-5 pb-1">
        {/* Trailer / 2nd */}
        <div className="flex w-[98px] flex-col items-center">
          <div className="relative">
            <div className="grid h-[46px] w-[46px] place-items-center rounded-full border border-white/[0.10] bg-[#1E1E20] text-[12.5px] font-bold text-white/86 shadow-[0_6px_18px_rgba(0,0,0,0.32)]">{trailerInit}</div>
            <div className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-white/[0.03] blur-[10px]" />
          </div>
          <div className="mt-2 flex h-[42px] w-[92px] flex-col items-center justify-center rounded-t-[14px] border border-white/[0.07] bg-[#1A1A1C] text-[11px] font-semibold tracking-wide text-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">2nd</span>
            <span className="font-display text-[11px] opacity-80">{aWinning ? cName : aName}</span>
          </div>
          <div className="mt-1.5 text-[13px] font-semibold tabular-nums text-white/62" style={{ fontFamily: 'Fraunces, serif' }}>{aWinning ? c : a}</div>
        </div>

        {/* Leader / 1st - elevated */}
        <div className="relative flex w-[126px] flex-col items-center">
          {/* crown */}
          <span className="absolute -top-[18px] left-1/2 -translate-x-1/2 select-none" aria-hidden style={{ animation: reducedMotion ? 'none' : 'beirt-float-crown 2.8s ease-in-out infinite', transformOrigin: '50% 80%' }}>
            <svg width="24" height="16" viewBox="0 0 28 18" fill="none" className="drop-shadow-[0_2px_8px_rgba(247,239,232,0.5)]">
              <path d="M2 12 L8 2 L14 10 L20 1 L26 12 L14 15 Z" fill="#F7EFE8" />
              <circle cx="8" cy="2.2" r="1.6" fill="#F7EFE8" />
              <circle cx="20" cy="1.2" r="1.7" fill="#F7EFE8" />
              <circle cx="14" cy="10.2" r="1.2" fill="#121214" />
            </svg>
          </span>
          <div className="relative">
            <div
              className="grid h-[62px] w-[62px] place-items-center rounded-full border-[2px] bg-[#F7EFE8] text-[15px] font-extrabold text-[#121214]"
              style={{
                borderColor: '#F7EFE8',
                animation: reducedMotion ? 'none' : 'beirt-glow-lead 2.6s ease-in-out infinite',
              }}
            >
              {leaderInit}
            </div>
            <span className="absolute -right-[10px] -top-[6px] rounded-full border border-[#A8D5BA]/50 bg-[#121214] px-[7px] py-[2px] text-[8.5px] font-black uppercase tracking-[0.10em] text-[#A8D5BA] shadow-[0_2px_10px_rgba(0,0,0,0.6)]">Leading</span>
          </div>
          <div
            className="relative mt-2 flex h-[74px] w-[112px] flex-col items-center justify-center rounded-t-[18px] border border-[#F7EFE8]/12 bg-[#F7EFE8] text-[#121214] shadow-[0_16px_36px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.9)]"
            style={{
              background: 'linear-gradient(180deg,#FFF8F2 0%,#F7EFE8 32%,#E9DED1 100%)',
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/80" />
            <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              <span className="text-[#8A7866]">✦</span> 1st
            </span>
            <span className="mt-[1px] text-[10px] font-semibold uppercase tracking-[0.10em] text-[#6B5D52]/80">{leaderName}</span>
            {/* light sweep */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[18px] opacity-[0.55]" aria-hidden>
              <div className="absolute -inset-y-1 w-[42%] rotate-[12deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animation: reducedMotion ? 'none' : 'beirt-trophy-shine 3.8s ease-in-out infinite 0.4s' }} />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[16px] font-bold tabular-nums text-white" style={{ fontFamily: 'Fraunces, serif' }}>{aWinning ? a : c}</span>
            {diff > 0 && <span className="rounded-full bg-white/[0.08] px-1.5 py-[1px] text-[10px] font-bold text-white/64">+{diff}</span>}
          </div>
        </div>
      </div>

      {/* TUG OF WAR / RACE TRACK */}
      <div className="relative z-10 mx-4 mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-3 backdrop-blur-[10px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F7EFE8]/70">{aName}</span>
          <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-2 py-[2px] text-[10px] font-bold text-white/72">{pct}% to win</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A8D5BA]/80">{cName}</span>
        </div>
        {/* track */}
        <div className="relative h-[30px] w-full rounded-full bg-[#0D0D0F] ring-1 ring-white/[0.06] overflow-hidden">
          {/* center line & 600 pts dashes */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-px -translate-x-1/2 -translate-y-1/2 bg-white/[0.10]" />
          <div className="absolute inset-[5px] flex items-center justify-between px-2 opacity-60" aria-hidden>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06] mr-2" />
            <div className="h-[10px] w-[2px] rounded-full bg-white/[0.10]" />
            <div className="h-px flex-1 bg-white/[0.05] mx-2" />
            <div className="h-[10px] w-[2px] rounded-full bg-white/[0.10]" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06] ml-2" />
          </div>
          {/* progress fill beige->mint */}
          <div className="absolute left-[4px] top-[4px] bottom-[4px] rounded-full transition-all duration-700" style={{ width: `calc(${knotPct}% - 4px)`, background: 'linear-gradient(90deg,#F7EFE8 0%,#E8DCC8 42%,#A8D5BA 100%)', filter: reducedMotion ? 'none' : 'saturate(0.98)' }} />
          {/* knot / trophy puck */}
          <div className="absolute top-1/2 h-[26px] w-[26px] -translate-y-1/2 rounded-full border border-white/20 bg-[#121214] shadow-[0_3px_14px_rgba(0,0,0,0.66),0_0_0_2px_rgba(247,239,232,0.16)] grid place-items-center" style={{ left: `${knotPct}%`, animation: reducedMotion ? 'none' : 'beirt-rope-knot 2.2s ease-in-out infinite' }}>
            <span className="text-[11px]">{aWinning ? '◐' : '◑'}</span>
          </div>
          {/* avatars on track edges */}
          <div className="pointer-events-none absolute left-[6px] top-1/2 grid h-[20px] w-[20px] -translate-y-1/2 place-items-center rounded-full bg-[#F7EFE8] text-[10px] font-bold text-[#121214] shadow-[0_1px_6px_rgba(0,0,0,0.5)]">{aInit}</div>
          <div className="pointer-events-none absolute right-[6px] top-1/2 grid h-[20px] w-[20px] -translate-y-1/2 place-items-center rounded-full bg-[#121214] text-[10px] font-bold text-[#A8D5BA] border border-[#A8D5BA]/60 shadow-[0_1px_8px_rgba(0,0,0,0.6)]">{cInit}</div>
        </div>

        {/* scores row - Fraunces huge */}
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5"><span className="text-[22px] font-bold tabular-nums text-[#F7EFE8]" style={{ fontFamily: 'Fraunces, serif' }}>{a}</span><span className="text-[11px] font-medium text-white/42">pts</span></div>
          <div className="h-px w-[26px] bg-white/10" />
          <div className="flex items-baseline gap-1.5"><span className="text-[11px] font-medium text-white/42">pts</span><span className="text-[22px] font-bold tabular-nums text-white" style={{ fontFamily: 'Fraunces, serif' }}>{c}</span></div>
        </div>
      </div>

      {/* DIGITAL SCOREBOARD COUNTDOWN */}
      <div className="relative z-10 mx-4 mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#F7EFE8]/14 bg-[#0A0A0A] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.38)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A8D5BA]" style={{ animation: reducedMotion ? 'none' : 'beirt-pulse-live 1.6s ease-in-out infinite' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/54">Resets 1st 00:00</span>
          <span className="mx-0.5 h-[14px] w-px bg-white/12" />
          <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold tabular-nums">
            <span className="rounded-[6px] bg-white/[0.06] px-1.5 py-[1px] text-[#F7EFE8]">{String(countdown.d).padStart(2, '0')}d</span>
            <span className="text-white/26">:</span>
            <span className="rounded-[6px] bg-white/[0.06] px-1.5 py-[1px] text-[#F7EFE8]">{String(countdown.h).padStart(2, '0')}h</span>
            <span className="text-white/26">:</span>
            <span className="rounded-[6px] bg-[#A8D5BA]/18 px-1.5 py-[1px] text-[#A8D5BA] ring-1 ring-[#A8D5BA]/20">{String(countdown.m).padStart(2, '0')}m</span>
            <span className="text-white/26">:</span>
            <span className="rounded-[6px] bg-white/[0.06] px-1.5 py-[1px] text-white/80">{String(countdown.s).padStart(2, '0')}s</span>
          </span>
        </div>
        <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-white/72 backdrop-blur">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#F7EFE8] text-[10px] font-bold text-[#121214]">£</span>
          600 pts cap
        </span>
        {isClear && <span className="inline-flex min-h-[32px] items-center rounded-full border border-[#A8D5BA]/20 bg-[#A8D5BA]/10 px-3 py-1 text-[11px] font-medium text-[#A8D5BA]">Deck clear — championship still live</span>}
      </div>

      {/* BELT HISTORY */}
      {metaHistory?.length ? (
        <div className="relative z-10 mt-3 px-4 pb-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Hall of Belts</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {metaHistory.map((h: any) => {
              const winA = h.winner === 'aisling';
              const winC = h.winner === 'ciaran';
              return (
                <span
                  key={h.key}
                  className="group inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur transition active:scale-[0.98]"
                  style={{
                    borderColor: winA ? 'rgba(247,239,232,0.18)' : winC ? 'rgba(168,213,186,0.22)' : 'rgba(255,255,255,0.08)',
                    background: winA
                      ? 'linear-gradient(180deg, rgba(247,239,232,0.14) 0%, rgba(247,239,232,0.06) 100%)'
                      : winC
                      ? 'linear-gradient(180deg, rgba(168,213,186,0.14) 0%, rgba(18,18,20,0.76) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    color: winA ? '#F7EFE8' : winC ? '#C9EBD6' : 'rgba(255,255,255,0.46)',
                  }}
                >
                  <span className={"grid h-[14px] w-[14px] place-items-center rounded-full text-[9px] font-bold " + (winA ? 'bg-[#F7EFE8] text-[#121214]' : winC ? 'bg-[#A8D5BA] text-[#0D1A13]' : 'bg-white/10 text-white/40')}>{winA ? aInit : winC ? cInit : '='}</span>
                  <span className="tabular-nums">{h.key}</span>
                  <span className="opacity-70">{winA ? `${aInit} win` : winC ? `${cInit} win` : 'tie'}</span>
                  {winA || winC ? <span className="ml-0.5 text-[10px] opacity-60">• {winA ? h.a : h.c}pts</span> : null}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative z-10 h-[14px]" />
      )}

      {/* bottom spot vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72px] bg-gradient-to-t from-black/52 to-transparent" />
    </div>
  );
}

export default Championship;
