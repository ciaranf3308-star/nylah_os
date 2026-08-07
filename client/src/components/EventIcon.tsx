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

// minimalist premium line icons - 1.4 stroke rounded
function IconHeart(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.55} height={props.size*0.55} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"/>
    </svg>
  );
}
function IconPlane(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 19.5 21 12 2.5 4.5l2 6 6 1.5-6 1.5-2 6Z"/>
      <path d="M10.5 12.5 21 12"/>
    </svg>
  );
}
function IconFootball(props:{stroke:string; size:number}) {
  // boutique soccer ball outline with pentagon
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.2"/>
      <path d="M12 6.8 14.6 9.6 13.7 12.8H10.3L9.4 9.6Z"/>
      <path d="m5.2 10.8 2.2-1.2M18.8 10.8l-2.2-1.2M7.5 18.6l1.2-2.2M16.5 18.6l-1.2-2.2"/>
      <circle cx="12" cy="11.2" r="0.9" fill={props.stroke} stroke="none"/>
    </svg>
  );
}
function IconMusic(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.6} height={props.size*0.6} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17a2.5 2.5 0 1 1 0 1.8 2.5 2.5 0 0 1 0-1.8Z" />
      <path d="M9 12V6.2a1 1 0 0 1 .56-.9L20 0v14.2a2.5 2.5 0 1 1-2 0V5L9 9.5"/>
      <path d="M20 0 9 5" opacity={0.85}/>
    </svg>
  );
}
function IconAppointment(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="11" rx="2.2"/>
      <path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
      <path d="M8 12h8"/>
      <circle cx="12" cy="14.8" r="0.9" fill={props.stroke} stroke="none"/>
    </svg>
  );
}
function IconBirthday(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5"/>
      <path d="M5 12V16.5h14V12"/>
      <path d="M7 12V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/>
      <path d="M12 7V3.8"/>
      <path d="M12 3.2c0-0 .6-.7 1.2-.3.5.4 0 1.6-1.2 2.6-1.2-1-1.7-2.2-1.2-2.6.6-.4 1.2.3 1.2.3Z" opacity={0.95}/>
    </svg>
  );
}
function IconReminder(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9.2a6 6 0 0 1 12 0c0 5.8-3 7.8-6 10-3-2.2-6-4.2-6-10Z"/>
      <path d="M9.5 18.8a2.5 2.5 0 0 0 5 0"/>
    </svg>
  );
}
function IconFamily(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.6} height={props.size*0.6} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.32} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-3.5v-5.5H7.5V21H4a1 1 0 0 1-1-1V10.5Z"/>
      <circle cx="9.2" cy="9.2" r="1.3"/>
      <circle cx="14.8" cy="9.2" r="1.3"/>
    </svg>
  );
}
function IconFriends(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.6} height={props.size*0.6} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.2" cy="7.6" r="3"/>
      <path d="M2.4 20c.3-3.2 2.7-5.5 5.8-5.5S13.7 16.8 14 20"/>
      <circle cx="16.2" cy="9" r="2.4"/>
      <path d="M18.6 20c.2-2.1  -1.2-3.7 -3.2-4.2" opacity={0.85}/>
    </svg>
  );
}
function IconHome(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.58} height={props.size*0.58} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.8Z"/>
      <path d="M9 21v-5.5h6V21"/>
    </svg>
  );
}
function IconOther(props:{stroke:string; size:number}) {
  return (
    <svg width={props.size*0.52} height={props.size*0.52} viewBox="0 0 24 24" fill="none" stroke={props.stroke} strokeWidth={1.4} strokeLinecap="round">
      <circle cx="12" cy="12" r="3.8"/>
      <path d="M12 8.2v.1M12 11.2v3"/>
    </svg>
  );
}

const ICON_MAP: Record<string, (p:{stroke:string;size:number})=>React.ReactNode> = {
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
    const s = size || 120;
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <div className={className} style={{ width: s, height: s, display:"grid", placeItems:"center", opacity: 0.14, pointerEvents:"none", ...style }}>
        <div style={{ transform: `scale(${s/36})`, transformOrigin:"center" }}>
          {iconFn({ stroke: pal.fg, size: 36 })}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-grid place-items-center "+className} style={{width:size, height:size, color: pal.fg, ...style}}>
        {iconFn({stroke: pal.fg as string, size})}
      </span>
    );
  }

  if (variant === "chip") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium min-h-[26px] "+className}
        style={{ background: (pal as any).chipBg || pal.bg, color: pal.fg, borderColor: isDark ? "rgba(255,255,255,0.08)" : "var(--border)", ...style}}>
        {iconFn({stroke: pal.fg as string, size: 16})}
        <span style={{letterSpacing:"-0.01em"}}>{def.label}</span>
      </span>
    );
  }

  // bubble default
  const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
  const bubbleBg = pal.bg;
  const bubbleFg = pal.fg;
  return (
    <span className={"grid place-items-center rounded-full shrink-0 border shadow-sm "+className}
      style={{
        width: size,
        height: size,
        background: bubbleBg,
        color: bubbleFg,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        boxShadow: isDark ? "0 1px 8px rgba(0,0,0,0.22)" : "0 1px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        ...style
      }}>
      {iconFn({stroke: bubbleFg as string, size})}
    </span>
  );
}

export function EventKindIcon({kind, size, variant, theme}: {kind?: string; size?: number; variant?: Props["variant"]; theme?: Props["theme"]}) {
  return <EventIcon kind={kind} size={size} variant={variant} theme={theme} />;
}
