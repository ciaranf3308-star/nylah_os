import React from "react";
import { EVENT_KINDS, getKindDef } from "../lib/eventTypes";

type Props = {
  kind?: string;
  size?: number; // outer circle px, default 36
  variant?: "bubble"|"watermark"|"chip"|"inline";
  theme?: "light"|"dark"|"auto";
  className?: string;
  style?: React.CSSProperties;
};

// Boutique Studio Icons — Soho House + Cereal + Aesop
// Each icon is a tiny illustration with soft watercolor fill + hand-drawn stroke
// Warm, intimate, never tech-dashboard

function IconHeart({stroke}:{stroke:string}) {
  // date — layered hearts with sparkle, like a locket
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* watercolor wash */}
      <path d="M12 19.2c-2.3-1.9-7.2-5.2-7.2-8.2 0-2.4 1.9-4.3 4.3-4.3 1.3 0 2.2.6 2.9 1.3.7-.7 1.6-1.3 2.9-1.3 2.4 0 4.3 1.9 4.3 4.3 0 3-4.9 6.3-7.2 8.2Z" fill={stroke} opacity="0.12"/>
      {/* hand-drawn heart — slight wobble */}
      <path d="M12 18.8 C11.2 18.1 5 13.9 5 10.7 5 8.5 6.9 6.9 9 6.9 c1.1 0 1.9.5 3 1.8 1.1-1.3 1.9-1.8 3-1.8 2.1 0 4 1.6 4 3.8 0 3.2-6.2 7.4-7 8.1Z" 
        fill={stroke} opacity="0.08" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {/* inner heart blush */}
      <path d="M12 16.2c-1.1-.9-3.6-2.8-3.6-4.6 0-.9.7-1.6 1.5-1.6.6 0 1 .2 1.5.8.2.3.5.3.7 0 .4-.6.8-.8 1.4-.8.8 0 1.5.7 1.5 1.6 0 1.8-2.5 3.7-3.6 4.6-.2.2-.4.2-.7 0Z" fill={stroke} opacity="0.9"/>
      {/* sparkle */}
      <path d="M19.2 5.8l.5 1.1.9.2-.7.6.2 1-.9-.6-.9.6.2-1-.7-.6 1-.2.4-1.1Z" fill={stroke}/>
    </svg>
  );
}

function IconPlane({stroke}:{stroke:string}) {
  // travel — vintage luggage tag + flight path dots
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 13.5c2.8-1.4 6.8-2.2 11.2-1.8 1.2.1 2.3.1 3.1-.2.6-.2 1-.7.9-1.1-.1-.5-.7-.8-1.4-.8-1 0-2.2.3-3.4.5-3.9.6-7.2.1-10-.8" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="0.6 2.6" opacity="0.5"/>
      {/* soft cloud tag */}
      <rect x="2.8" y="8.2" width="14" height="9.8" rx="3.2" fill={stroke} opacity="0.10" transform="rotate(-6 9.8 13.1)"/>
      <rect x="2.8" y="8.8" width="13.6" height="9" rx="2.8" fill="white" stroke={stroke} strokeWidth="1.55" strokeLinecap="round" transform="rotate(-6 9.6 13.3)"/>
      {/* plane */}
      <g transform="rotate(-6 9.6 13.3)">
        <path d="M6.2 12.2l7.2-2.4c.6-.2.9.5.4.9l-3 2.1 2.1 3.1c.3.5-.3.9-.7.5L9 15l-1.3 1.6c-.3.4-.9.1-.7-.4l.7-2.5-2.2-1c-.4-.2-.3-.9.3-.9H6l.2-.6Z" fill={stroke} stroke={stroke} strokeWidth="0.9" strokeLinejoin="round"/>
      </g>
      <circle cx="18.6" cy="7.2" r="0.9" fill={stroke} opacity="0.7"/>
    </svg>
  );
}

function IconFootball({stroke}:{stroke:string}) {
  // sports — tennis meets calcio, laurel-wrapped ball, very Soho House courtside
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* warm court wash */}
      <circle cx="12" cy="12.4" r="7.8" fill={stroke} opacity="0.10"/>
      <circle cx="12" cy="12.3" r="7.1" fill="white" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      {/* hand-drawn ball seams — tennis x football hybrid */}
      <path d="M12 5.2c-1.6 1.4-2.7 3.5-2.7 5.9s1.1 4.5 2.7 5.9M12 5.2c1.6 1.4 2.7 3.5 2.7 5.9s-1.1 4.5-2.7 5.9M5.5 9.6c1.9.7 4.1 1.1 6.5 1.1s4.6-.4 6.5-1.1M5.5 14.9c1.9-.7 4.1-1.1 6.5-1.1s4.6.4 6.5 1.1" stroke={stroke} strokeWidth="1.15" strokeLinecap="round" opacity="0.85"/>
      {/* soft center */}
      <circle cx="12" cy="11.8" r="1.3" fill={stroke} opacity="0.18"/>
      <circle cx="12" cy="11.8" r="0.5" fill={stroke}/>
    </svg>
  );
}

function IconMusic({stroke}:{stroke:string}) {
  // music — vinyl with warm label + tiny note lift
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10.6" cy="12.2" r="6.9" fill={stroke} opacity="0.11"/>
      <circle cx="10.6" cy="12.2" r="6.4" fill="#FEFEFE" stroke={stroke} strokeWidth="1.45"/>
      {/* grooves */}
      <circle cx="10.6" cy="12.2" r="4.7" stroke={stroke} strokeWidth="0.55" opacity="0.28"/>
      <circle cx="10.6" cy="12.2" r="3.2" stroke={stroke} strokeWidth="0.45" opacity="0.22"/>
      {/* label */}
      <circle cx="10.6" cy="12.2" r="1.9" fill={stroke} opacity="0.9"/>
      <circle cx="10.6" cy="12.2" r="0.55" fill="white"/>
      {/* floating note */}
      <g transform="translate(14.2 4.8)">
        <path d="M2.2 6.2V1.1c0-.4.3-.7.7-.5L5.3 2c.3.2.4.5.2.8L4 5" stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none"/>
        <circle cx="1.3" cy="6.4" r="1.1" fill={stroke} />
      </g>
    </svg>
  );
}

function IconAppointment({stroke}:{stroke:string}) {
  // appointment — letterpress card, serif dot
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.8 13.2c0-3 .8-6.2 3.8-7.4 1.6-.6 4.2-.6 5.8 0 3 1.2 3.8 4.4 3.8 7.4 0 1.8-1.1 3.6-2.8 3.2-.7-.2-1.2-.6-2.3-1.1-.6-.3-1.5-.3-2.1 0-1.1.5-1.6.9-2.3 1.1-1.7.4-2.9-1.4-2.9-3.2Z" fill={stroke} opacity="0.10"/>
      <rect x="4" y="5.6" width="16" height="12.8" rx="3.2" fill="white" stroke={stroke} strokeWidth="1.5"/>
      <path d="M7.2 5.6V4.2c0-.6.5-1.1 1.1-1.1h1.1M16.8 5.6V4.2c0-.6-.5-1.1-1.1-1.1h-1.1" stroke={stroke} strokeWidth="1.3" strokeLinecap="round"/>
      {/* lines like appointment */}
      <path d="M7.2 9.8h3M7.2 12.2h7.6M7.2 14.6h4.2" stroke={stroke} strokeWidth="1.15" strokeLinecap="round" opacity="0.75"/>
      <circle cx="14.6" cy="14.7" r="1.3" fill={stroke}/>
    </svg>
  );
}

function IconBirthday({stroke}:{stroke:string}) {
  // birthday — 2 tier boutique cake, candle with heart flame
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="18.4" rx="7.2" ry="1.6" fill={stroke} opacity="0.10"/>
      <path d="M6 15.2c0-.8.6-1.4 1.4-1.4h9.2c.8 0 1.4.6 1.4 1.4v1.3c0 .8-.6 1.5-1.4 1.5H7.4c-.8 0-1.4-.7-1.4-1.5v-1.3Z" fill="white" stroke={stroke} strokeWidth="1.45" strokeLinejoin="round"/>
      <path d="M7.8 13.8V11.6c0-.7.6-1.3 1.3-1.3h5.8c.7 0 1.3.6 1.3 1.3v2.2" fill="white" stroke={stroke} strokeWidth="1.3"/>
      {/* frosting drip — hand drawn */}
      <path d="M8.2 12.8c.3.7.6 1.2 1.1 1.2.6 0 .8-.9 1.5-.9.6 0 .8.8 1.4.8.6 0 .9-.8 1.5-.8.6 0 .8.7 1.2.9M15.8 11.2H8.2" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.65"/>
      {/* candle */}
      <rect x="11.1" y="6.2" width="1.8" height="4.1" rx="0.7" fill={stroke} opacity="0.9"/>
      <path d="M12 3.6c0-.8.6-1.1 1-1 .5.1.2 1.1-.1 2-.2.5-.5.8-.9.8-.4 0-.7-.3-.9-.8-.3-.9-.6-1.9-.1-2 .4-.1 1 .2 1 1Z" fill={stroke}/>
      {/* confetti */}
      <circle cx="5.2" cy="7.2" r="0.6" fill={stroke} opacity="0.5"/>
      <circle cx="19" cy="8.6" r="0.5" fill={stroke} opacity="0.45"/>
    </svg>
  );
}

function IconReminder({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="19.8" rx="5.2" ry="0.9" fill={stroke} opacity="0.10"/>
      <path d="M7.2 10.1C7.2 6.8 9.2 4 12 4s4.8 2.8 4.8 6.1c0 2.9-1.6 4.6-2.8 6.1-.4.5-1 .8-1.6.8h-1.8c-.6 0-1.2-.3-1.6-.8-1.2-1.5-2.8-3.2-2.8-6.1Z" fill="white" stroke={stroke} strokeWidth="1.5"/>
      <path d="M8.2 10.1c.2-2.8 1.9-4.9 3.8-5.8M12 16.8c1.1 0 2.1.2 3 .6" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.55"/>
      <circle cx="12" cy="10.1" r="1.3" fill={stroke} opacity="0.15"/>
      <circle cx="12" cy="10.1" r="0.55" fill={stroke}/>
      {/* ribbon tail — boutique hotel key tag */}
      <path d="M9.8 19c0 1 .4 1.6 1 1.6h.4M12.2 19c0 .9.3 1.5.8 1.7l1.2.5c.3.1.3.5-.1.5H12" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
    </svg>
  );
}

function IconFamily({stroke}:{stroke:string}) {
  // boutique row house with warm window light
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12.2" r="7.6" fill={stroke} opacity="0.08"/>
      <path d="M4.8 11.2L12 5.2l7.2 6v7.4c0 .7-.6 1.2-1.2 1.2H6c-.7 0-1.2-.5-1.2-1.2v-7.4Z" fill="white" stroke={stroke} strokeWidth="1.45" strokeLinejoin="round"/>
      <path d="M9.2 18.8v-3c0-.9.7-1.6 1.6-1.6h2.4c.9 0 1.6.7 1.6 1.6v3" fill={stroke} opacity="0.10" stroke={stroke} strokeWidth="1.1"/>
      {/* window with warm light */}
      <rect x="7.1" y="9.3" width="2.7" height="2.5" rx="0.7" fill={stroke} opacity="0.18" stroke={stroke} strokeWidth="1"/>
      <rect x="14.2" y="9.3" width="2.7" height="2.5" rx="0.7" fill={stroke} opacity="0.18" stroke={stroke} strokeWidth="1"/>
      <circle cx="12" cy="9.9" r="0.6" fill={stroke}/>
      <path d="M8.5 10.5H9M15.5 10.5h.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function IconFriends({stroke}:{stroke:string}) {
  // two at a bistro table — Soho House brunch
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="17.2" rx="6.8" ry="2.2" fill={stroke} opacity="0.08"/>
      {/* table */}
      <path d="M5.8 15.8c2 .8 4.1 1.2 6.2 1.2s4.2-.4 6.2-1.2" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* two cups overlapping */}
      <g>
        <path d="M7 13.6c0-1.4 1-2.5 2.3-2.5h1.4c1.3 0 2.3 1.1 2.3 2.5v.6H7v-.6Z" fill="white" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M13 10.6c-.3 0-.5-.2-.5-.5s.2-.5.5-.5M12.8 10.1c.2-1.2.7-2 1.2-2" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/>
      </g>
      <g>
        <path d="M11.2 11.9c0-1.4 1-2.5 2.3-2.5h1.4c1.3 0 2.3 1.1 2.3 2.5v.6h-6v-.6Z" fill={stroke} opacity="0.14" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round"/>
      </g>
      {/* steam hearts */}
      <path d="M9.6 8.4c.2-.4.2-.9 0-1.1-.2-.3-.2-.8.2-1 .2 0 .4.3.3.7-.1.3-.3.6-.5 1.4M11.2 7.8c.2-.4.2-.7 0-1-.2-.2-.1-.6.2-.8.2 0 .3.2.2.6-.1.3-.2.5-.4 1.2" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.6"/>
      <circle cx="10.2" cy="7.1" r="0.35" fill={stroke} opacity="0.6"/>
    </svg>
  );
}

function IconHome({stroke}:{stroke:string}) {
  // cottage with heart smoke — intimate warm
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 11.2c1.5-1.5 4-4.2 7-6.5 1-.8 1.7-.8 2.6 0 3 2.3 5.5 5 7 6.5.6.6.3 1.7-.6 1.7H4.1c-.9 0-1.5-1.1-.9-1.7Z" fill={stroke} opacity="0.10"/>
      <path d="M5 10.8 12 5l7 5.8v6.8c0 .8-.6 1.4-1.4 1.4H6.4c-.8 0-1.4-.6-1.4-1.4v-6.8Z" fill="white" stroke={stroke} strokeWidth="1.45" strokeLinejoin="round"/>
      {/* door */}
      <path d="M10.2 18.9v-2.6c0-.9.7-1.6 1.5-1.6h.6c.8 0 1.5.7 1.5 1.6v2.6" fill={stroke} opacity="0.12" stroke={stroke} strokeWidth="1.1"/>
      <circle cx="13.2" cy="16.6" r="0.35" fill={stroke}/>
      {/* chimney smoke as soft dots */}
      <rect x="14.6" y="6.6" width="2.1" height="2.8" rx="0.6" fill={stroke} opacity="0.85"/>
      <path d="M16.2 5.1c-.4-.6-.6-1.2-.3-1.6.2-.4.7-.5.9-.2.2.4.1.8-.2 1.3-.3.5-.6.8-1.1.8-.3 0-.5-.2-.6-.5-.2-.6.2-1 .9-1.2M17.8 3.6c-.2-.3-.2-.6 0-.8.2-.2.5-.2.6 0 .1.2 0 .5-.2.8" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function IconOther({stroke}:{stroke:string}) {
  // Aesop apothecary star — hand drawn 8-point
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4.2c.3 2 .8 3.5 1.9 4.6 1.1 1.1 2.6 1.6 4.6 1.9-2 0-3.5.8-4.6 1.9-1.1 1.1-1.6 2.6-1.9 4.6-.3-2-.8-3.5-1.9-4.6-1.1-1.1-2.6-1.6-4.6-1.9 2-.3 3.5-.8 4.6-1.9 1.1-1.1 1.6-2.6 1.9-4.6Z" fill={stroke} opacity="0.14" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round"/>
      <circle cx="12" cy="11.7" r="1.25" fill={stroke}/>
      <circle cx="12" cy="11.7" r="0.35" fill="white"/>
      <circle cx="5.2" cy="6.2" r="0.55" fill={stroke} opacity="0.5"/>
      <circle cx="18.8" cy="17.4" r="0.45" fill={stroke} opacity="0.4"/>
    </svg>
  );
}

const ICON_MAP: Record<string, (p:{stroke:string})=>React.ReactNode> = {
  date: (p)=> <IconHeart {...p}/>,
  travel: (p)=> <IconPlane {...p}/>,
  sports: (p)=> <IconFootball {...p}/>,
  music: (p)=> <IconMusic {...p}/>,
  appointment: (p)=> <IconAppointment {...p}/>,
  birthday: (p)=> <IconBirthday {...p}/>,
  reminder: (p)=> <IconReminder {...p}/>,
  family: (p)=> <IconFamily {...p}/>,
  friends: (p)=> <IconFriends {...p}/>,
  home: (p)=> <IconHome {...p}/>,
  other: (p)=> <IconOther {...p}/>,
};

export default function EventIcon({kind="other", size=36, variant="bubble", theme="light", className="", style}: Props) {
  const def = getKindDef(kind);
  const isDark = theme === "dark" || (theme === "auto" && typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")==="ink");
  const pal = isDark ? def.dark : def.light;

  if (variant === "watermark") {
    const s = size || 96;
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <div className={className} style={{ width: s, height: s, display:"grid", placeItems:"center", opacity: isDark ? 0.18 : 0.16, pointerEvents:"none", ...style }}>
        <div style={{ transform: `scale(${s/28})`, transformOrigin:"center", filter: isDark ? "drop-shadow(0 1px 8px rgba(0,0,0,0.25))" : "drop-shadow(0 1px 4px rgba(0,0,0,0.04))" }}>
          {iconFn({ stroke: pal.fg })}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-grid place-items-center "+className} style={{width:size, height:size, color: pal.fg, ...style}}>
        <span style={{ transform: `scale(${size/22})`, transformOrigin:"center", display:"grid" }}>{iconFn({stroke: pal.fg as string})}</span>
      </span>
    );
  }

  if (variant === "chip") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium min-h-[26px] "+className}
        style={{ background: (pal as any).chipBg || pal.bg, color: pal.fg, borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", boxShadow: isDark ? "0 1px 6px rgba(0,0,0,0.16)" : "0 1px 4px rgba(0,0,0,0.04)", ...style}}>
        <span style={{ transform:"scale(0.82)", transformOrigin:"center", display:"grid" }}>{iconFn({stroke: pal.fg as string})}</span>
        <span style={{letterSpacing:"-0.01em", fontFamily:"Fraunces, serif"}}>{def.label}</span>
      </span>
    );
  }

  // bubble default — boutique hotel card, soft inset highlight
  const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
  return (
    <span className={"grid place-items-center rounded-full shrink-0 border "+className}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 90% at 30% 22%, white 0%, ${pal.bg} 42%)`,
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
        boxShadow: isDark 
          ? "0 2px 10px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)" 
          : "0 2px 10px rgba(60,30,10,0.09), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04)",
        ...style
      }}>
      <span style={{ transform: `scale(${Math.max(0.85, size/32)})`, transformOrigin:"center", display:"grid", filter:"drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.08))" }}>
        {iconFn({stroke: pal.fg as string})}
      </span>
    </span>
  );
}

export function EventKindIcon({kind, size, variant, theme}: {kind?: string; size?: number; variant?: Props["variant"]; theme?: Props["theme"]}) {
  return <EventIcon kind={kind} size={size} variant={variant} theme={theme} />;
}
