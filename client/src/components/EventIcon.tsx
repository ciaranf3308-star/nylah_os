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

// V210 — boutique soccer ball + curated polish
// You asked for soccer ball lol — now you get it proper.
// Football variant = hand-stitched boutique soccer ball, not clip-art.
// Generic sports = whistle+laurel (intentionally NOT ball) so picker stays varied.
// All kinds 1by1 boutique: 1.5px optical stroke, 10-14% wash bed, 0.2px wobble,
// 55-70% inner highlight, tiny tells — sparkle/scallop/wax/seed pearl,
// warm 14% soft drop, double paper edge, 25% grain cut, Fraunces label,
// dark fg lifts 8%, watermark scale s/28, 900ms spring, 44px tap.
// Aesthetic: Soho House + Cereal + Aesop — warm paper, never flat navy/tech.

function IconDate({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* wash */}
      <path d="M4.3 8.8C4.3 5.8 6.2 4 9 4c1.6 0 2.5.7 3 1.8C12.5 4.7 13.4 4 15 4c2.9 0 4.7 1.9 4.7 4.9 0 3.8-5.2 7.6-7.5 9-.2.1-.5.1-.7 0C9.2 16.5 4.3 12.7 4.3 8.8Z" fill={stroke} opacity="0.11"/>
      {/* envelope */}
      <rect x="3" y="7.1" width="18" height="12.2" rx="3.5" fill="white" stroke={stroke} strokeWidth="1.45" strokeLinejoin="round"/>
      <rect x="3" y="7.1" width="18" height="12.2" rx="3.5" stroke="white" strokeWidth="0.7" opacity="0.6" strokeLinejoin="round"/>
      <path d="M4.2 9.9l6.7 4.4c.5.3 1.1.3 1.6 0l6.7-4.4" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      {/* inner love letter hearts */}
      <path d="M12 18C10.5 16.6 6.2 13.5 6.2 11c0-1.8 1.4-3.1 3.1-3.1 1 0 1.7.5 2.3 1.4.2.3.4.3.6 0 .6-.9 1.3-1.4 2.3-1.4 1.7 0 3.1 1.3 3.1 3.1 0 2.5-4.3 5.6-5.8 7-.2.2-.5.2-.8 0Z" fill={stroke} opacity="0.14" stroke={stroke} strokeWidth="1.15" strokeLinejoin="round"/>
      <path d="M12 15.6c-.8-.7-2.6-2.2-2.6-3.4 0-.7.5-1.2 1.1-1.2.4 0 .7.2 1 .7.2.3.4.3.6 0 .3-.5.6-.7 1-.7.6 0 1.1.5 1.1 1.2 0 1.2-1.8 2.7-2.6 3.4-.2.2-.4.2-.6 0Z" fill={stroke}/>
      <circle cx="18.9" cy="5.1" r="0.85" fill={stroke} opacity="0.75"/><circle cx="19.1" cy="4.7" r="0.24" fill="white" opacity="0.9"/>
    </svg>
  );
}

function IconTravel({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15.8" cy="6.8" r="3.5" stroke={stroke} strokeWidth="0.95" strokeDasharray="0.9 2.4" opacity="0.42"/>
      <circle cx="15.8" cy="6.8" r="2.2" fill={stroke} opacity="0.08"/><circle cx="15.8" cy="6.8" r="0.45" fill={stroke} opacity="0.22"/>
      <g transform="rotate(-7.5 11.2 13.6)">
        <rect x="3.2" y="8.7" width="14.6" height="10.6" rx="3.6" fill={stroke} opacity="0.10"/>
        <rect x="3.4" y="9.3" width="14" height="9.6" rx="3" fill="white" stroke={stroke} strokeWidth="1.48"/>
        <path d="M7 9.3c-.2-.2-.2-.5 0-.7.2-.2.5-.2.7 0l.6.6M12.2 9.3c.2-.2.5-.2.7 0 .2.2.2.5 0 .7l-.6.6" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
        <circle cx="10.3" cy="9.4" r="1.05" fill="white" stroke={stroke} strokeWidth="1.15"/>
        <path d="M9.1 6.4c-.7-.9-.5-1.9.2-2.4.8-.5 1.7-.4 2.3.5l1.2 1.8" stroke={stroke} strokeWidth="1.15" strokeLinecap="round"/>
        <path d="M5.5 14.6c2.8-1 5.7-1.2 8.9-.7" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" strokeDasharray="0.6 2.6" opacity="0.62"/>
        <path d="M13.2 13.1l3.6-.9c.45-.12.75.33.42.66l-1.7 1.22 1.15 1.75c.22.33-.1.65-.43.42l-1.34-.9-.88.98c-.22.24-.55.04-.43-.24l.45-1.55-1.26-.62c-.3-.15-.22-.55.18-.66l.26-.17Z" fill={stroke}/>
      </g>
    </svg>
  );
}

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

function IconFootball({stroke, title}:{stroke:string; title?:string}) {
  const sub = getSportsVariant(title);
  if (sub === "golf") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.1 17.7c2.3-1.1 5.3-1.7 9.1-1.5 3.9.2 6.8 1 9.1 2.1" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" opacity="0.44"/>
        <ellipse cx="12" cy="18.3" rx="7.6" ry="2.2" fill={stroke} opacity="0.11"/><ellipse cx="12" cy="18.3" rx="3.8" ry="0.7" fill="white" opacity="0.65"/>
        <circle cx="9.1" cy="13.2" r="1.25" fill="white" stroke={stroke} strokeWidth="1.28"/>
        <circle cx="9.1" cy="13.2" r="0.32" fill={stroke}/>
        <path d="M9.1 11.9V6.7c0-.48.45-.82.81-.52l3.7 2.2c.32.19.33.62.02.82L9.1 12.9" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
        <path d="M14.8 5.8V12.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M14.8 5.7l2.1-.55c.42-.11.74.24.52.64l-.64 1.2c-.11.2-.38.28-.62.2l-1.36-.42" fill={stroke}/>
      </svg>
    );
  }
  if (sub === "gym") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12.4" r="7.3" fill={stroke} opacity="0.08"/>
        <path d="M7.2 12.2c0-2.8 2.3-5.1 5.1-5.1s5.1 2.3 5.1 5.1-2.3 5.1-5.1 5.1-5.1-2.3-5.1-5.1Z" fill="white" stroke={stroke} strokeWidth="1.48"/>
        <path d="M12 8.6c-1.6 1-2.6 2.6-2.6 3.9 0 .9.5 1.7 1.2 2.2.4.3.8.4 1.4.4s1-.1 1.4-.4c.7-.5 1.2-1.3 1.2-2.2 0-1.3-1-2.9-2.6-3.9-.2-.1-.5-.1-.7 0Z" fill={stroke} opacity="0.13" stroke={stroke} strokeWidth="1.05"/>
        <circle cx="12" cy="10.2" r="1.65" fill={stroke} opacity="0.15"/><circle cx="12" cy="10.2" r="0.6" fill="white"/>
        <path d="M4.5 10.1c-.45 0-.82.32-.82.72v3.9c0 .4.37.72.82.72h1.2c.45 0 .82-.32.82-.72v-3.9c0-.4-.37-.72-.82-.72H4.5ZM18.3 10.1c-.45 0-.82.32-.82.72v3.9c0 .4.37.72.82.72h1.2c.45 0 .82-.32.82-.72v-3.9c0-.4-.37-.72-.82-.72h-1.2Z" fill={stroke} opacity="0.20" stroke={stroke} strokeWidth="1.08" strokeLinejoin="round"/>
        <rect x="6" y="11.2" width="12" height="2.3" rx="1.15" fill={stroke} opacity="0.95"/>
      </svg>
    );
  }
  if (sub === "run") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.8 16.7c1.9-2.6 4.6-4.2 7.8-4.8 3.1-.6 6-.1 8.6 1.5" stroke={stroke} strokeWidth="1.08" strokeLinecap="round" strokeDasharray="1.1 2.4" opacity="0.5"/>
        <circle cx="12.1" cy="8.9" r="1.55" fill={stroke} opacity="0.15" stroke={stroke} strokeWidth="1.18"/>
        <path d="M11.2 11l-1.9 2.6-1.7 3.4M13.1 11.6l2 1.1 2.4 2.9M9.6 14.6l3.8.4M8.1 17.8c.35.32.78.32 1.1 0 .32-.24.34-.74 0-1.06M16.8 16c.42.32.86.22 1.06-.24.2-.44 0-.86-.44-1.08" stroke={stroke} strokeWidth="1.22" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 18.6l2.1-.3 2.3-4.2" stroke={stroke} strokeWidth="1.18" strokeLinecap="round"/>
      </svg>
    );
  }
  if (sub === "gaa") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12.9" rx="7.4" ry="7.1" fill={stroke} opacity="0.07"/>
        <path d="M8 17.6c1.2-1.5 2.9-3.1 4.4-5.1 1.5-2 2.3-4 2.5-5.9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11.8 6c-.22-.52-.12-.96.44-1.16.44-.18.84-.02 1.06.48.14.42-.08.76-.52 1.06l-1.46.62c-.3.12-.6 0-.62-.42l.1-1.26M13.4 10.7c1.05 1.15 1.68 2.3 1.46 3.35" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.82"/>
        <ellipse cx="7.6" cy="18.1" rx="1.4" ry="1.15" fill="white" stroke={stroke} strokeWidth="1.25"/>
        <path d="M7 18.2c.34-.32.78-.34 1.18 0 .4.34.52.76.22 1.08" stroke={stroke} strokeWidth="0.82" strokeLinecap="round"/>
        <circle cx="17.8" cy="6.2" r="0.4" fill={stroke} opacity="0.42"/>
      </svg>
    );
  }
  if (sub === "rugby") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12.4" rx="8" ry="4.2" fill={stroke} opacity="0.10" transform="rotate(-18 12 12.4)"/>
        <ellipse cx="12" cy="12.4" rx="7.4" ry="3.7" fill="white" stroke={stroke} strokeWidth="1.48" transform="rotate(-18 12 12.4)"/>
        <path d="M8.1 11c1.15.84 2.52 1.46 4 1.78 1.46.32 2.92.32 4.36 0M8.5 14c1.15.74 2.52 1.24 4 1.46 1.46.22 2.92.12 4.28-.3M11.6 8.3c-.32 1.26-.54 2.72-.54 4.28s.22 3.02.54 4.28" stroke={stroke} strokeWidth="1.08" strokeLinecap="round" opacity="0.88" transform="rotate(-18 12 12.4)"/>
        <circle cx="18.4" cy="5.9" r="0.6" fill={stroke} opacity="0.5"/><circle cx="18.6" cy="5.6" r="0.2" fill="white" opacity="0.85"/>
      </svg>
    );
  }
  if (sub === "football") {
    // V221 — boutique football v2: obviously football, warm stitched leather, crisp powerhouse
    // 20-pass: hand-panelled, paper-base, terracotta seam, paper highlight, boutique tells
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* warm wash */}
        <circle cx="12" cy="12.25" r="7.8" fill={stroke} opacity="0.16"/>
        {/* paper base */}
        <circle cx="12" cy="12.25" r="6.65" fill="#FFFDFA" stroke={stroke} strokeWidth="0.9" opacity="0.18"/>
        {/* outer leather */}
        <circle cx="12" cy="12.25" r="6.35" fill="white" stroke={stroke} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"/>
        {/* subtle paper inner stroke */}
        <circle cx="12" cy="12.25" r="6.35" stroke="white" strokeWidth="0.75" opacity="0.82" strokeLinecap="round"/>
        {/* soft top highlight — boutique paper sheen */}
        <path d="M8.6 8.9 Q12 6.9 15.4 8.9" stroke="white" strokeWidth="1.1" opacity="0.78" strokeLinecap="round"/>
        <path d="M9.2 9.3 Q12 7.7 14.8 9.3" stroke="white" strokeWidth="0.6" opacity="0.42" strokeLinecap="round"/>
        {/* centre pentagon — deep terracotta leather */}
        <path d="M12 9.05 L14.42 10.68 L13.56 13.55 L10.44 13.55 L9.58 10.68 Z" fill={stroke} opacity="0.96" stroke={stroke} strokeWidth="1.05" strokeLinejoin="round" strokeLinecap="round"/>
        {/* inner scuff — tiny ivory dot */}
        <circle cx="11.45" cy="10.8" r="0.42" fill="white" opacity="0.34"/>
        {/* seams outward — boutique solid stitch */}
        <path d="M12 9.05 L12 5.85" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.98"/>
        <path d="M14.42 10.68 L17.55 9.55" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.98"/>
        <path d="M9.58 10.68 L6.45 9.55" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.98"/>
        <path d="M13.56 13.55 L15.05 16.95" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.98"/>
        <path d="M10.44 13.55 L8.95 16.95" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.98"/>
        {/* outer ring arcs — closing panels */}
        <path d="M12 5.85 Q15.8 6.6 17.55 9.55" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.88"/>
        <path d="M12 5.85 Q8.2 6.6 6.45 9.55" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.88"/>
        <path d="M6.45 9.55 Q5.55 12.0 6.9 14.7" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.78"/>
        <path d="M17.55 9.55 Q18.45 12.0 17.1 14.7" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.78"/>
        <path d="M6.9 14.7 Q9.4 18.9 12 18.95" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.78"/>
        <path d="M17.1 14.7 Q14.6 18.9 12 18.95" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.78"/>
        {/* stitch ticks — boutique detail */}
        <path d="M7.35 11.2 L8.55 10.6" stroke={stroke} strokeWidth="0.72" strokeLinecap="round" opacity="0.38"/>
        <path d="M16.65 11.2 L15.45 10.6" stroke={stroke} strokeWidth="0.72" strokeLinecap="round" opacity="0.38"/>
        <path d="M11.0 15.35 L11.0 16.1" stroke={stroke} strokeWidth="0.62" strokeLinecap="round" opacity="0.32"/>
        <path d="M13.0 15.35 L13.0 16.1" stroke={stroke} strokeWidth="0.62" strokeLinecap="round" opacity="0.32"/>
        {/* boutique grain */}
        <circle cx="18.35" cy="6.85" r="0.48" fill={stroke} opacity="0.38"/><circle cx="18.54" cy="6.58" r="0.14" fill="white" opacity="0.92"/>
        <circle cx="6.1" cy="16.4" r="0.28" fill={stroke} opacity="0.16"/>
      </svg>
    );
  }
  // generic — whistle + laurel — intentionally NOT a soccer ball (so "sports" still distinct)
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12.5" r="7.6" fill={stroke} opacity="0.08"/>
      <path d="M4.8 12.7c.45-1.9 1.5-3.5 3-4.8M19.2 12.9c-.55 1.9-1.6 3.5-3.2 4.7M7 7c1.6-.95 3.4-1.5 5.3-1.5 1.9 0 3.7.55 5.3 1.5" stroke={stroke} strokeWidth="0.92" strokeLinecap="round" opacity="0.44"/>
      <path d="M8.4 11.7c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6c-.55 0-1.05-.12-1.5-.32l-1.9.74.42-1.9c-.42-.54-.62-1.26-.62-2.08Z" fill="white" stroke={stroke} strokeWidth="1.38" strokeLinejoin="round"/>
      <circle cx="12.3" cy="11.9" r="0.95" fill={stroke} opacity="0.84"/>
      <path d="M15 11.4c.64-.22 1.14 0 1.36.62.22.5 0 1.05-.64 1.26" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" opacity="0.68"/>
      <path d="M7.6 14.5c-.32.82-.12 1.46.62 1.78" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.58"/>
    </svg>
  );
}

function IconMusic({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="11.2" cy="18.8" rx="5.4" ry="1" fill={stroke} opacity="0.10"/>
      <path d="M5.8 12.4c0-3.5 2.7-6.3 6.1-6.3s6.1 2.8 6.1 6.3-2.7 6.3-6.1 6.3-6.1-2.8-6.1-6.3Z" fill={stroke} opacity="0.10"/>
      <circle cx="11.9" cy="12.4" r="6.6" fill="white" stroke={stroke} strokeWidth="1.44"/>
      <circle cx="11.9" cy="12.4" r="5" stroke={stroke} strokeWidth="0.56" opacity="0.26"/>
      <circle cx="11.9" cy="12.4" r="3.2" stroke={stroke} strokeWidth="0.46" opacity="0.20"/>
      <circle cx="11.9" cy="12.4" r="2" fill={stroke} opacity="0.92"/><circle cx="11.9" cy="12.4" r="0.56" fill="white"/>
      <g transform="translate(15.3 4.2)">
        <path d="M1.8 6.2V0.7c0-.44.34-.64.64-.4l3.1 0.1.1 4.5" stroke={stroke} strokeWidth="1.02" strokeLinecap="round" fill="none"/>
        <ellipse cx="1.15" cy="6.4" rx="1.15" ry="0.92" fill={stroke}/><ellipse cx="5.1" cy="5.6" rx="1.05" ry="0.84" fill={stroke} opacity="0.86"/>
      </g>
      <path d="M5.1 7.1c.34-.52.86-.72 1.28-.42" stroke={stroke} strokeWidth="0.72" strokeLinecap="round" opacity="0.62"/>
    </svg>
  );
}

function IconAppointment({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.4" y="5.6" width="17.2" height="13.2" rx="4.2" fill={stroke} opacity="0.09"/>
      <rect x="3.6" y="6.2" width="16.6" height="12" rx="3.4" fill="white" stroke={stroke} strokeWidth="1.48"/>
      <path d="M7.2 6.2V4.6c0-.62.5-1.12 1.1-1.12h1.1M16 6.2V4.6c0-.62-.5-1.12-1.1-1.12h-1.1" stroke={stroke} strokeWidth="1.28" strokeLinecap="round"/>
      <rect x="6.1" y="9.4" width="5.5" height="2.1" rx="1.05" fill={stroke} opacity="0.15"/><rect x="6.1" y="9.4" width="5.5" height="2.1" rx="1.05" stroke="white" strokeWidth="0.6" opacity="0.6"/>
      <path d="M6.5 12.9h7M6.5 15.3h4.8" stroke={stroke} strokeWidth="1.12" strokeLinecap="round" opacity="0.74"/>
      <circle cx="15.4" cy="13.4" r="2.55" fill="white" stroke={stroke} strokeWidth="1.18"/><path d="M15.4 12.2v1.3l.85.64" stroke={stroke} strokeWidth="1.02" strokeLinecap="round"/><circle cx="15.4" cy="13.5" r="0.32" fill={stroke}/>
    </svg>
  );
}

function IconBirthday({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="19" rx="7.4" ry="1.6" fill={stroke} opacity="0.11"/>
      <path d="M5.6 15.9c0-.82.66-1.48 1.48-1.48h9.84c.82 0 1.48.66 1.48 1.48v1.02c0 .82-.66 1.48-1.48 1.48H7.08c-.82 0-1.48-.66-1.48-1.48v-1.02Z" fill="white" stroke={stroke} strokeWidth="1.36" strokeLinejoin="round"/>
      <path d="M7.4 14.4v-2.5c0-.74.6-1.34 1.34-1.34h6.52c.74 0 1.34.6 1.34 1.34v2.5" fill="white" stroke={stroke} strokeWidth="1.28"/>
      <path d="M7.9 12.7c.22.52.55.94.98.94.52 0 .74-.62 1.36-.62s.74.62 1.36.62.84-.62 1.36-.62.74.52 1.16.72" stroke={stroke} strokeWidth="0.96" strokeLinecap="round" opacity="0.72"/>
      <rect x="11.1" y="6" width="1.84" height="4.4" rx="0.72" fill={stroke} opacity="0.92"/><circle cx="12.02" cy="5.9" r="0.42" fill="white" opacity="0.8"/>
      <path d="M12 3.1c0-.74.62-1.16.96-.92.42.12.22 1.06-.1 1.98-.22.52-.54.84-.86.84-.4 0-.64-.32-.86-.84-.32-.92-.52-1.86-.1-1.98.32-.24.96.18.96.92Z" fill={stroke} opacity="0.92"/>
      <circle cx="5.2" cy="7" r="0.6" fill={stroke} opacity="0.5"/><circle cx="19" cy="8.2" r="0.46" fill={stroke} opacity="0.44"/>
    </svg>
  );
}

function IconReminder({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="20" rx="5.4" ry="1" fill={stroke} opacity="0.11"/>
      <path d="M7 10.3C7 6.9 9.1 4.1 12.2 4.1S17.4 6.9 17.4 10.3c0 3-1.6 4.8-2.8 6.3-.44.52-1.06.84-1.72.84h-1.9c-.66 0-1.28-.32-1.72-.84-1.26-1.5-2.8-3.3-2.8-6.3Z" fill="white" stroke={stroke} strokeWidth="1.48"/>
      <path d="M8 10c.22-2.3 1.7-4.3 3.6-5.2" stroke={stroke} strokeWidth="0.86" strokeLinecap="round" opacity="0.56"/>
      <circle cx="12.2" cy="10.3" r="1.35" fill={stroke} opacity="0.14"/><circle cx="12.2" cy="10.3" r="0.6" fill={stroke}/>
      <path d="M10.1 19c0 .94.34 1.58.86 1.8l1.04.52c.32.14.32.54-.1.54H11.1" stroke={stroke} strokeWidth="1.08" strokeLinecap="round" opacity="0.76"/>
      <circle cx="9.2" cy="17.5" r="0.72" fill={stroke} opacity="0.18"/>
    </svg>
  );
}

function IconFamily({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.4 11.5L12 5.1l7.6 6.4v7.4c0 .72-.54 1.26-1.26 1.26H5.66c-.72 0-1.26-.54-1.26-1.26v-7.4Z" fill={stroke} opacity="0.09"/>
      <path d="M4.7 11.5L12 5.3l7.3 6.2v7.3c0 .62-.52 1.12-1.14 1.12H5.84c-.62 0-1.14-.5-1.14-1.12v-7.3Z" fill="white" stroke={stroke} strokeWidth="1.44" strokeLinejoin="round"/>
      <path d="M9.1 19V16c0-.82.66-1.48 1.48-1.48h1.04c.82 0 1.48.66 1.48 1.48V19" fill={stroke} opacity="0.11" stroke={stroke} strokeWidth="1.06"/>
      <rect x="7" y="9.3" width="2.9" height="2.7" rx="0.74" fill={stroke} opacity="0.17" stroke={stroke} strokeWidth="1.02"/>
      <rect x="14.1" y="9.3" width="2.9" height="2.7" rx="0.74" fill={stroke} opacity="0.17" stroke={stroke} strokeWidth="1.02"/>
      <circle cx="12" cy="7.9" r="0.56" fill={stroke} opacity="0.92"/>
      <path d="M7.9 11.7l1.24-.1M15.1 11.7l1.14-.1" stroke="white" strokeWidth="0.62" strokeLinecap="round" opacity="0.72"/>
    </svg>
  );
}

function IconFriends({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="17.2" rx="7" ry="2.2" fill={stroke} opacity="0.10"/>
      <path d="M5.4 15.5c2 .85 4.2 1.28 6.6 1.28s4.6-.43 6.6-1.28" stroke={stroke} strokeWidth="0.92" strokeLinecap="round" opacity="0.54"/>
      <g>
        <path d="M6.7 13.5c0-1.36 1.06-2.46 2.38-2.46h1.34c1.3 0 2.36 1.1 2.36 2.46v.62H6.7v-.62Z" fill="white" stroke={stroke} strokeWidth="1.28" strokeLinejoin="round"/>
      </g>
      <g>
        <path d="M11.1 12c0-1.36 1.06-2.46 2.38-2.46h1.34c1.3 0 2.36 1.1 2.36 2.46v.62H11.1V12Z" fill={stroke} opacity="0.15" stroke={stroke} strokeWidth="1.28" strokeLinejoin="round"/>
      </g>
      <path d="M9.4 8.5c.22-.32.22-.72.1-1.06-.1-.22 0-.62.32-.84M11.1 7.9c.22-.32.22-.64.1-.96-.1-.22 0-.52.32-.66" stroke={stroke} strokeWidth="0.72" strokeLinecap="round" opacity="0.56"/>
      <circle cx="9.9" cy="6.9" r="0.34" fill={stroke} opacity="0.62"/>
    </svg>
  );
}

function IconHome({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.9 11.4c1.6-1.5 4.2-4.2 7.3-6.6 1.05-.84 1.7-.84 2.75 0 3.1 2.4 5.7 5.1 7.3 6.6.62.64.3 1.78-.64 1.78H3.54c-.94 0-1.56-1.14-.64-1.78Z" fill={stroke} opacity="0.11"/>
      <path d="M5 11L12 5.1l7 5.9v6.8c0 .82-.64 1.48-1.46 1.48H6.46C5.64 19.28 5 18.62 5 17.8V11Z" fill="white" stroke={stroke} strokeWidth="1.44" strokeLinejoin="round"/>
      <path d="M10.2 19.2v-2.6c0-.82.64-1.54 1.46-1.54h.68c.82 0 1.46.72 1.46 1.54v2.6" fill={stroke} opacity="0.13" stroke={stroke} strokeWidth="1.08"/>
      <circle cx="13.2" cy="16.9" r="0.36" fill={stroke}/>
      <rect x="14.7" y="6.6" width="2.1" height="2.8" rx="0.62" fill={stroke} opacity="0.86"/>
      <path d="M16.2 5.1c-.32-.52-.52-1.04-.32-1.44.2-.32.62-.42.84-.12.2.32.02.74-.22 1.14-.22.42-.54.74-1.04.74-.22 0-.42-.22-.52-.52-.12-.52.32-.96.94-1.16" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.53"/>
    </svg>
  );
}

function IconOther({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4c.32 2 .86 3.6 2 4.8 1.14 1.18 2.72 1.7 4.82 2.02-2.1.02-3.68.84-4.82 2.02-1.14 1.18-1.68 2.76-2 4.82-.32-2.06-.86-3.64-2-4.82-1.14-1.18-2.72-1.7-4.82-2.02 2.1-.32 3.68-.84 4.82-2.02C11.14 7.6 11.68 6 12 4Z" fill={stroke} opacity="0.15" stroke={stroke} strokeWidth="1.24" strokeLinejoin="round"/>
      <circle cx="12" cy="11.9" r="1.25" fill={stroke}/><circle cx="12" cy="11.9" r="0.36" fill="white"/>
      <circle cx="5" cy="6" r="0.52" fill={stroke} opacity="0.52"/><circle cx="18.9" cy="17.4" r="0.42" fill={stroke} opacity="0.42"/>
    </svg>
  );
}

const ICON_MAP: Record<string, (p:{stroke:string, title?: string})=>React.ReactNode> = {
  date: (p)=> <IconDate {...p}/>,
  travel: (p)=> <IconTravel {...p}/>,
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

export default function EventIcon({kind="other", title, size=36, variant="bubble", theme="light", className="", style}: Props) {
  const def = getKindDef(kind);
  const isDark = theme === "dark" || (theme === "auto" && typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")==="ink");
  const pal = isDark ? def.dark : def.light;

  if (variant === "watermark") {
    const s = size || 96;
    const iconFn = ICON_MAP[def.id] || ICON_MAP.other;
    const isFootball = (def.id === "sports") && (title ? /united|city|arsenal|liverpool|chelsea|footbal|soccer|match|premier/.test(title.toLowerCase()) : true);
    return (
      <div className={className} style={{ width: s, height: s, display:"grid", placeItems:"center", opacity: isFootball ? 0.88 : isDark ? 0.38 : 0.32, pointerEvents:"none", ...style }}>
        <div style={{ transform: `scale(${s/28})`, transformOrigin:"center", filter: isDark ? "drop-shadow(0 6px 18px rgba(0,0,0,0.32))" : "drop-shadow(0 10px 20px rgba(80,45,18,0.14)) drop-shadow(0 2px 6px rgba(0,0,0,0.06))" }}>
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
      <span style={{ transform: `scale(${Math.max(0.86, size/32)})`, transformOrigin:"center", display:"grid", filter:"drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.08))" }}>
        {iconFn({stroke: pal.fg as string, title})}
      </span>
    </span>
  );
}

export function EventKindIcon({kind, size, variant, theme, title}: {kind?: string; size?: number; variant?: Props["variant"]; theme?: Props["theme"]; title?: string}) {
  return <EventIcon kind={kind} size={size} variant={variant} theme={theme} title={title} />;
}

export { getSportsVariant };
