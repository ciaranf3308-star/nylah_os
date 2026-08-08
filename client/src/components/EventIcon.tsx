import React from "react";
import { EVENT_KINDS, getKindDef } from "../lib/eventTypes";

type Props = {
  kind?: string;
  title?: string;
  size?: number;
  variant?: "bubble"|"watermark"|"chip"|"inline";
  theme?: "light"|"dark"|"auto";
  className?: string;
  style?: React.CSSProperties;
};

// Full SVG pack — Phosphor MIT regular — curated for boutique planner
// Downloaded from phosphor-icons/core (MIT) — no attribution required
// Using 256 viewBox, fill currentColor, scales clean to 22px and 118px watermark

function PIcon({d, size=26, stroke}:{d:string; size?:number; stroke:string}) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" style={{color: stroke}} xmlns="http://www.w3.org/2000/svg">
      <path d={d}/>
    </svg>
  );
}

// phosphor path data — regular weight
const D = {
  heart: "M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z",
  airplane: "M235.58,128.84,160,91.06V48a32,32,0,0,0-64,0V91.06L20.42,128.84A8,8,0,0,0,16,136v32a8,8,0,0,0,9.57,7.84L96,161.76v18.93L82.34,194.34A8,8,0,0,0,80,200v32a8,8,0,0,0,11,7.43l37-14.81,37,14.81A8,8,0,0,0,176,232V200a8,8,0,0,0-2.34-5.66L160,180.69V161.76l70.43,14.08A8,8,0,0,0,240,168V136A8,8,0,0,0,235.58,128.84ZM224,158.24l-70.43-14.08A8,8,0,0,0,144,152v32a8,8,0,0,0,2.34,5.66L160,203.31v16.87l-29-11.61a8,8,0,0,0-5.94,0L96,220.18V203.31l13.66-13.65A8,8,0,0,0,112,184V152a8,8,0,0,0-9.57-7.84L32,158.24v-17.3l75.58-37.78A8,8,0,0,0,112,96V48a16,16,0,0,1,32,0V96a8,8,0,0,0,4.42,7.16L224,140.94Z",
  soccerBall: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm76.52,147.42H170.9l-9.26-12.76,12.63-36.78,15-4.89,26.24,20.13A87.38,87.38,0,0,1,204.52,171.42Zm-164-34.3L66.71,117l15,4.89,12.63,36.78L85.1,171.42H51.48A87.38,87.38,0,0,1,40.47,137.12Zm10-50.64,5.51,18.6L40.71,116.77A87.33,87.33,0,0,1,50.43,86.48ZM109,152,97.54,118.65,128,97.71l30.46,20.94L147,152Zm91.07-46.92,5.51-18.6a87.33,87.33,0,0,1,9.72,30.29Zm-6.2-35.38-9.51,32.08-15.07,4.89L136,83.79V68.21l29.09-20A88.58,88.58,0,0,1,193.86,69.7ZM146.07,41.87,128,54.29,109.93,41.87a88.24,88.24,0,0,1,36.14,0ZM90.91,48.21l29.09,20V83.79L86.72,106.67l-15.07-4.89L62.14,69.7A88.58,88.58,0,0,1,90.91,48.21ZM63.15,187.42H83.52l7.17,20.27A88.4,88.4,0,0,1,63.15,187.42ZM110,214.13,98.12,180.71,107.35,168h41.3l9.23,12.71-11.83,33.42a88,88,0,0,1-36.1,0Zm55.36-6.44,7.17-20.27h20.37A88.4,88.4,0,0,1,165.31,207.69Z",
  golf: "M176,100a12,12,0,1,1-12-12A12,12,0,0,1,176,100Zm-44,20a12,12,0,1,0,12,12A12,12,0,0,0,132,120Zm84-24A88,88,0,1,1,128,8,88.1,88.1,0,0,1,216,96Zm-16,0a72,72,0,1,0-72,72A72.08,72.08,0,0,0,200,96Zm-34.86,96.53C152,197.56,139.85,200,128,200s-24-2.44-37.14-7.47a8,8,0,1,0-5.72,14.94A125.91,125.91,0,0,0,120,215.68V248a8,8,0,0,0,16,0V215.68a125.91,125.91,0,0,0,34.86-8.21,8,8,0,1,0-5.72-14.94Z",
  barbell: "M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z",
  run: "M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z",
  flag: "M42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V56A8,8,0,0,0,218.76,50c-28,24.23-51.72,12.49-79.21-1.12C111.07,34.76,78.78,18.79,42.76,50ZM216,172.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V59.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z",
  football: "M229.06,53.89a32.92,32.92,0,0,0-26.95-26.95c-32.37-5.49-93.39-8-138.27,36.9s-42.39,105.9-36.9,138.27a32.92,32.92,0,0,0,27,26.95A206.58,206.58,0,0,0,88.27,232c32.09,0,72.05-8,103.89-39.84C237.05,147.28,234.55,86.26,229.06,53.89Zm-61.61-14a192,192,0,0,1,32,2.8A16.94,16.94,0,0,1,213.3,56.56,188.59,188.59,0,0,1,216,92.78L163.21,40C164.61,39.92,166,39.9,167.45,39.9ZM56.56,213.3A16.94,16.94,0,0,1,42.7,199.44,188.59,188.59,0,0,1,40,163.22L92.78,216A187.79,187.79,0,0,1,56.56,213.3Zm124.3-32.44c-11.61,11.6-33.27,27.73-67.37,33.27L41.87,142.51c5.54-34.1,21.67-55.76,33.27-67.37S108.4,47.4,142.5,41.86l71.63,71.63C208.59,147.59,192.46,169.25,180.86,180.86Zm-15.22-90.5a8,8,0,0,1,0,11.31L151.3,116l6.34,6.34a8,8,0,1,1-11.31,11.3L140,127.31,127.31,140l6.34,6.34a8,8,0,1,1-11.3,11.31L116,151.3l-14.34,14.34a8,8,0,1,1-11.31-11.31L104.7,140l-6.34-6.34a8,8,0,0,1,11.31-11.3l6.34,6.34L128.69,116l-6.34-6.34a8,8,0,0,1,11.3-11.31L140,104.7l14.34-14.34A8,8,0,0,1,165.64,90.36Z",
  musicNotes: "M212.92,17.69a8,8,0,0,0-6.86-1.45l-128,32A8,8,0,0,0,72,56V166.08A36,36,0,1,0,88,196V110.25l112-28v51.83A36,36,0,1,0,216,164V24A8,8,0,0,0,212.92,17.69ZM52,216a20,20,0,1,1,20-20A20,20,0,0,1,52,216ZM88,93.75V62.25l112-28v31.5ZM180,184a20,20,0,1,1,20-20A20,20,0,0,1,180,184Z",
  calendarCheck: "M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z",
  cake: "M232,112a24,24,0,0,0-24-24H136V79a32.06,32.06,0,0,0,24-31c0-28-26.44-45.91-27.56-46.66a8,8,0,0,0-8.88,0C122.44,2.09,96,20,96,48a32.06,32.06,0,0,0,24,31v9H48a24,24,0,0,0-24,24v23.33a40.84,40.84,0,0,0,8,24.24V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V159.57a40.84,40.84,0,0,0,8-24.24ZM112,48c0-13.57,10-24.46,16-29.79C134,23.54,144,34.43,144,48a16,16,0,0,1-32,0ZM40,112a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v23.33c0,13.25-10.46,24.31-23.32,24.66A24,24,0,0,1,168,136a8,8,0,0,0-16,0,24,24,0,0,1-48,0,8,8,0,0,0-16,0,24,24,0,0,1-24.68,24C50.46,159.64,40,148.58,40,135.33Zm160,96H56a8,8,0,0,1-8-8V172.56A38.77,38.77,0,0,0,62.88,176,39.69,39.69,0,0,0,92,164.69A40.36,40.36,0,0,0,96,160a40,40,0,0,0,64,0A40.36,40.36,0,0,0,164.13,164.67,39.67,39.67,0,0,0,192,176c.38,0,.76,0,1.14,0A38.77,38.77,0,0,0,208,172.56V200A8,8,0,0,1,200,208Z",
  bell: "M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z",
  houseLine: "M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z",
  users: "M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z",
  house: "M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z",
  star: "M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z",
};

// sports variant matcher — same as before
function getSportsVariant(title?: string): "football"|"golf"|"gym"|"run"|"gaa"|"rugby"|"generic" {
  if (!title) return "generic";
  const t = title.toLowerCase();
  if (/golf|putt|fairway|green|tee|hole-in|links|pitch & putt|stackstown/.test(t)) return "golf";
  if (/gym|weights?|lift|workout|crossfit|pilates|yoga|pt |personal train|barbell|deadlift|leg day/.test(t)) return "gym";
  if (/run|running|5k|10k|marathon|jog|parkrun|sprint|trail|strava/.test(t)) return "run";
  if (/gaa|hurling|hurl|camogie|shinty|sliotar|hurley|gaelic/.test(t)) return "gaa";
  if (/rugby|six nations|leinster|munster|scrum|lineout/.test(t)) return "rugby";
  if (/united|city|arsenal|liverpool|chelsea|spurs|football|soccer|premier|prem |uefa|fa cup|league|match|fixture|cup final|champions|galway united|cork city|shels|rovers|fai/.test(t)) return "football";
  return "generic";
}

type IconFn = (p:{stroke:string, title?: string})=>React.ReactNode;

function wrap(d:string): IconFn {
  return ({stroke}) => <PIcon d={d} stroke={stroke} size={26}/>;
}

const ICON_MAP: Record<string, IconFn> = {
  date: wrap(D.heart),
  travel: wrap(D.airplane),
  sports: ({stroke, title}) => {
    const sub = getSportsVariant(title);
    if (sub === "golf") return <PIcon d={D.golf} stroke={stroke}/>;
    if (sub === "gym") return <PIcon d={D.barbell} stroke={stroke}/>;
    if (sub === "run") return <PIcon d={D.run} stroke={stroke}/>;
    if (sub === "gaa") return <PIcon d={D.flag} stroke={stroke}/>;
    if (sub === "rugby") return <PIcon d={D.football} stroke={stroke}/>;
    if (sub === "football") return <PIcon d={D.soccerBall} stroke={stroke}/>;
    return <PIcon d={D.soccerBall} stroke={stroke}/>;
  },
  music: wrap(D.musicNotes),
  appointment: wrap(D.calendarCheck),
  birthday: wrap(D.cake),
  reminder: wrap(D.bell),
  family: wrap(D.houseLine),
  friends: wrap(D.users),
  home: wrap(D.house),
  other: wrap(D.star),
};

export default function EventIcon({kind="other", title, size=52, variant="bubble", theme="light", className="", style}: Props) {
  const def = getKindDef(kind);
  const isDark = theme === "dark" || (theme === "auto" && typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")==="ink");
  const pal = isDark ? def.dark : def.light;

  if (variant === "watermark") {
    const s = size || 164;
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    const isFootball = def.id === "sports" && getSportsVariant(title) === "football";
    return (
      <div className={className} style={{ width: s, height: s, display:"grid", placeItems:"center", opacity: isFootball ? 0.86 : isDark ? 0.42 : 0.34, pointerEvents:"none", ...style }}>
        <div style={{ transform: `scale(${s/38})`, transformOrigin:"center", filter: isDark ? "drop-shadow(0 8px 22px rgba(0,0,0,0.36))" : "drop-shadow(0 14px 26px rgba(80,45,18,0.16))" }}>
          {iconFn({ stroke: pal.fg, title })}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-grid place-items-center "+className} style={{width:size, height:size, color: pal.fg, ...style}}>
        <span style={{ transform: `scale(${size/22})`, transformOrigin:"center", display:"grid" }}>{iconFn({stroke: pal.fg as string, title})}</span>
      </span>
    );
  }

  if (variant === "chip") {
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    return (
      <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium min-h-[26px] "+className}
        style={{ background: (pal as any).chipBg || pal.bg, color: pal.fg, borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", boxShadow: isDark ? "0 1px 6px rgba(0,0,0,0.16)" : "0 1px 4px rgba(0,0,0,0.04)", ...style}}>
        <span style={{ transform:"scale(0.82)", transformOrigin:"center", display:"grid" }}>{iconFn({stroke: pal.fg as string, title})}</span>
        <span style={{letterSpacing:"-0.01em", fontFamily:"Fraunces, serif"}}>{def.label}</span>
      </span>
    );
  }

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
          : "0 2px 12px rgba(60,30,10,0.10), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04)",
        ...style
      }}>
      <span style={{ transform: `scale(${Math.max(0.86, size/36)})`, transformOrigin:"center", display:"grid", filter:"drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.08))" }}>
        {iconFn({stroke: pal.fg as string, title})}
      </span>
    </span>
  );
}

export function EventKindIcon({kind, size, variant, theme, title}: {kind?: string; size?: number; variant?: Props["variant"]; theme?: Props["theme"]; title?: string}) {
  return <EventIcon kind={kind} size={size} variant={variant} theme={theme} title={title} />;
}

export { getSportsVariant };
