import React from "react";
import { EVENT_KINDS, getKindDef } from "../lib/eventTypes";

type Props = {
  kind?: string;
  title?: string; // for sports sub-variant + future niceties
  size?: number;
  variant?: "bubble"|"watermark"|"chip"|"inline";
  theme?: "light"|"dark"|"auto";
  className?: string;
  style?: React.CSSProperties;
};

// Boutique hotel curated — 1 by 1, Soho House + Cereal + Aesop
// No generic tech circles, each icon tells a tiny story

function IconDate({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.8 8.2c0-2.2 1.3-4.1 4.2-4.1 1.4 0 2.2.5 3 1.6.8-1.1 1.6-1.6 3-1.6 2.9 0 4.2 1.9 4.2 4.1 0 3.4-4.9 6.8-7.2 8.3-.2.1-.5.1-.7 0-2.3-1.5-7.2-4.9-7.2-8.3Z" fill={stroke} opacity="0.10"/>
      {/* envelope / letter */}
      <path d="M3.9 9.6l6.3 4.1c.5.3 1.1.3 1.6 0l6.3-4.1" stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      <rect x="3.2" y="6.8" width="17.6" height="11.8" rx="3" fill="white" stroke={stroke} strokeWidth="1.45" strokeLinejoin="round"/>
      {/* inner layered hearts */}
      <path d="M12 17.6C10.6 16.4 6.2 13.3 6.2 10.8c0-1.7 1.3-2.9 2.9-2.9 0.9 0 1.5.4 2.1 1.2.2.2.4.2.6 0 .6-.8 1.2-1.2 2.1-1.2 1.6 0 2.9 1.2 2.9 2.9 0 2.5-4.4 5.6-5.8 6.8-.2.2-.5.2-.8 0Z" fill={stroke} opacity="0.13" stroke={stroke} strokeWidth="1.15" strokeLinejoin="round"/>
      <path d="M12 15.3c-.7-.6-2.4-2-2.4-3.2 0-.6.4-1 .9-1 .3 0 .6.1.9.6.2.3.4.3.6 0 .3-.5.6-.6.9-.6.5 0 .9.4.9 1 0 1.2-1.7 2.6-2.4 3.2-.2.1-.4.1-.6 0Z" fill={stroke}/>
      <circle cx="18.6" cy="5.2" r="0.9" fill={stroke} opacity="0.7"/>
    </svg>
  );
}

function IconTravel({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* passport stamp wash */}
      <circle cx="15.6" cy="7.1" r="3.3" stroke={stroke} strokeWidth="0.9" strokeDasharray="0.8 2.2" opacity="0.42"/>
      <circle cx="15.6" cy="7.1" r="2.2" fill={stroke} opacity="0.08"/>
      {/* luggage tag */}
      <g transform="rotate(-7 11 13.4)">
        <rect x="3.4" y="8.8" width="14.2" height="10.2" rx="3.4" fill={stroke} opacity="0.10"/>
        <rect x="3.4" y="9.4" width="13.8" height="9.2" rx="2.8" fill="white" stroke={stroke} strokeWidth="1.45"/>
        <circle cx="10" cy="9.4" r="1" fill="white" stroke={stroke} strokeWidth="1.1"/>
        <path d="M9.1 6.2c-.6-.8-.5-1.7.2-2.2.7-.5 1.5-.4 2.1.4l1.2 1.7" stroke={stroke} strokeWidth="1.15" strokeLinecap="round"/>
        {/* flight line + mini plane */}
        <path d="M5.6 14.2c2.6-.9 5.3-1.1 8.4-.7" stroke={stroke} strokeWidth="1" strokeLinecap="round" strokeDasharray="0.5 2.4" opacity="0.6"/>
        <path d="M12.9 12.9l3.4-.9c.4-.1.7.3.4.6l-1.6 1.2 1.1 1.6c.2.3-.1.6-.4.4l-1.3-.8-.8.9c-.2.2-.5 0-.4-.2l.4-1.4-1.2-.6c-.3-.1-.2-.5.2-.6l.2-.2Z" fill={stroke}/>
      </g>
    </svg>
  );
}

function getSportsVariant(title?: string): "football"|"golf"|"gym"|"run"|"gaa"|"rugby"|"generic" {
  if (!title) return "generic";
  const t = title.toLowerCase();
  if (/golf|putt|fairway|tee|hole-in/.test(t)) return "golf";
  if (/gym|weights?|lift|workout|crossfit|pilates|yoga|pt |personal train/.test(t)) return "gym";
  if (/run|running|5k|10k|marathon|jog|parkrun|sprint/.test(t)) return "run";
  if (/gaa|hurling|hurl|camogie|shinty|sliotar|hurley/.test(t)) return "gaa";
  if (/rugby|six nations|leinster|munster/.test(t)) return "rugby";
  if (/united|city|arsenal|liverpool|chelsea|spurs|football|soccer|premier|prem |uefa|fa cup|league|match|fixture|cup final|champions/.test(t)) return "football";
  return "generic";
}

function IconFootball({stroke, title}:{stroke:string; title?:string}) {
  const sub = getSportsVariant(title);
  if (sub === "golf") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.2 17.4c2.2-1 5-1.6 8.8-1.4 3.8.2 6.6.9 8.8 1.9" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.45"/>
        <ellipse cx="12" cy="18.1" rx="7.4" ry="2.1" fill={stroke} opacity="0.10"/>
        <circle cx="9.2" cy="13.2" r="1.2" fill="white" stroke={stroke} strokeWidth="1.25"/>
        <circle cx="9.2" cy="13.2" r="0.35" fill={stroke} opacity="0.8"/>
        <path d="M9.2 12V7.2c0-.5.4-.8.7-.5l3.6 2c.3.2.3.6 0 .8L10 13.2" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
        <path d="M14.7 6.2V12.6" stroke={stroke} strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M14.7 6.2l2-.5c.4-.1.7.2.5.6l-.6 1.2c-.1.2-.4.3-.6.2l-1.3-.4" fill={stroke}/>
      </svg>
    );
  }
  if (sub === "gym") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12.2" r="7.2" fill={stroke} opacity="0.08"/>
        <path d="M7 12c0-2.7 2.2-5 5-5s5 2.3 5 5-2.2 5-5 5-5-2.3-5-5Z" fill="white" stroke={stroke} strokeWidth="1.45"/>
        <path d="M4.6 10.2c-.4 0-.8.3-.8.7v3.8c0 .4.4.7.8.7h1.2c.4 0 .8-.3.8-.7v-3.8c0-.4-.4-.7-.8-.7H4.6ZM18.2 10.2c-.4 0-.8.3-.8.7v3.8c0 .4.4.7.8.7h1.2c.4 0 .8-.3.8-.7v-3.8c0-.4-.4-.7-.8-.7h-1.2Z" fill={stroke} opacity="0.18" stroke={stroke} strokeWidth="1.1" strokeLinejoin="round"/>
        <rect x="6" y="11.1" width="12" height="2.2" rx="1" fill={stroke} opacity="0.9"/>
        <circle cx="7.2" cy="7.8" r="0.6" fill={stroke} opacity="0.5"/><circle cx="16.8" cy="16.4" r="0.5" fill={stroke} opacity="0.45"/>
      </svg>
    );
  }
  if (sub === "run") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 16.2c1.8-2.4 4.3-4 7.3-4.6 3-.6 5.8-.1 8.3 1.4" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" strokeDasharray="1 2.2" opacity="0.5"/>
        <circle cx="12" cy="8.6" r="1.5" fill={stroke} opacity="0.16" stroke={stroke} strokeWidth="1.15"/>
        <path d="M11.2 10.6l-1.8 2.4-1.6 3.2M13 11.2l1.9 1 2.3 2.8M9.6 14.2l3.6.4M8.2 17.3c.3.3.7.3 1 0 .3-.2.3-.7 0-1M16.6 15.6c.4.3.8.2 1-.2.2-.4 0-.8-.4-1" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 18.3l2-.3 2.2-4" stroke={stroke} strokeWidth="1.15" strokeLinecap="round"/>
      </svg>
    );
  }
  if (sub === "gaa") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12.6" rx="7.2" ry="7" fill={stroke} opacity="0.07"/>
        <path d="M8.2 17.2c1.2-1.4 2.8-2.9 4.2-4.8 1.4-1.9 2.2-3.8 2.4-5.6" stroke={stroke} strokeWidth="1.45" strokeLinecap="round"/>
        <path d="M11.6 6.4c-.2-.5-.1-.9.4-1.1.4-.2.8 0 1 .5.1.4-.1.7-.5 1l-1.4.6c-.3.1-.6 0-.6-.4l.1-1.2M13.2 10.4c1 1.1 1.6 2.2 1.4 3.2" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
        <ellipse cx="7.8" cy="17.8" rx="1.3" ry="1.1" fill="white" stroke={stroke} strokeWidth="1.2"/>
        <path d="M7.2 17.9c.3-.3.7-.3 1.1 0 .4.3.5.7.2 1" stroke={stroke} strokeWidth="0.8" strokeLinecap="round"/>
      </svg>
    );
  }
  if (sub === "rugby") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12.2" rx="7.8" ry="4" fill={stroke} opacity="0.10" transform="rotate(-18 12 12.2)"/>
        <ellipse cx="12" cy="12.2" rx="7.2" ry="3.6" fill="white" stroke={stroke} strokeWidth="1.45" transform="rotate(-18 12 12.2)"/>
        <path d="M8.2 10.8c1.1.8 2.4 1.4 3.8 1.7 1.4.3 2.8.3 4.2 0M8.6 13.6c1.1.7 2.4 1.2 3.8 1.4 1.4.2 2.8.1 4.1-.3M11.6 8.2c-.3 1.2-.5 2.6-.5 4.1s.2 2.9.5 4.1" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" opacity="0.85" transform="rotate(-18 12 12.2)"/>
        <circle cx="18.2" cy="6" r="0.6" fill={stroke} opacity="0.5"/>
      </svg>
    );
  }
  if (sub === "football") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* boutique crest */}
        <path d="M12 18.8l-5.6-2.1c-.5-.2-.9-.8-.9-1.4V7.6c0-.6.4-1.1.9-1.3L12 4.1l5.6 2.2c.5.2.9.7.9 1.3v7.7c0 .6-.4 1.2-.9 1.4L12 18.8Z" fill={stroke} opacity="0.10" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M12 18.2L6.8 16.2c-.4-.2-.7-.6-.7-1V7.9c0-.4.2-.8.6-1L12 4.8l5.3 2.1c.4.2.6.6.6 1v7.3c0 .4-.3.8-.7 1L12 18.2Z" fill="white" stroke={stroke} strokeWidth="1.15" strokeLinejoin="round"/>
        {/* ball - hidden line warm */}
        <circle cx="12" cy="11.4" r="2.8" fill={stroke} opacity="0.10" stroke={stroke} strokeWidth="1.1"/>
        <path d="M12 9.1v1.6l-1.4.8M12 10.7l1.4.8M10.6 12.8l1.4-.5 1.4.5-.5 1.5h-1.8l-.5-1.5Z" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        <path d="M8 6.4l1 .6M16 6.9l-1 .6" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>
      </svg>
    );
  }
  // generic — whistle + laurel — intentionally NOT a soccer ball
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12.2" r="7.4" fill={stroke} opacity="0.08"/>
      <path d="M5 12.4c.4-1.8 1.4-3.3 2.8-4.6M19 12.6c-.5 1.8-1.5 3.3-3 4.5M7.2 7.2c1.5-.9 3.2-1.4 5-1.4 1.8 0 3.5.5 5 1.4" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.45"/>
      {/* whistle */}
      <path d="M8.6 11.6c0-1.9 1.5-3.4 3.4-3.4s3.4 1.5 3.4 3.4-1.5 3.4-3.4 3.4c-.5 0-1-.1-1.4-.3l-1.8.7.4-1.8c-.4-.5-.6-1.2-.6-2Z" fill="white" stroke={stroke} strokeWidth="1.35" strokeLinejoin="round"/>
      <circle cx="12.2" cy="11.8" r="0.9" fill={stroke} opacity="0.85"/>
      <path d="M14.9 11.3c.6-.2 1.1 0 1.3.6.2.5 0 1-.6 1.2" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <path d="M7.8 14.2c-.3.8-.1 1.4.6 1.7" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function IconMusic({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.2 12.2c0-3.3 2.5-6 5.8-6s5.8 2.7 5.8 6-2.5 6-5.8 6-5.8-2.7-5.8-6Z" fill={stroke} opacity="0.10"/>
      <circle cx="11.8" cy="12.2" r="6.4" fill="#FEFEFE" stroke={stroke} strokeWidth="1.4"/>
      <circle cx="11.8" cy="12.2" r="4.8" stroke={stroke} strokeWidth="0.55" opacity="0.28"/>
      <circle cx="11.8" cy="12.2" r="3.1" stroke={stroke} strokeWidth="0.45" opacity="0.22"/>
      {/* label warm listening */}
      <circle cx="11.8" cy="12.2" r="1.9" fill={stroke} opacity="0.9"/>
      <circle cx="11.8" cy="12.2" r="0.55" fill="white"/>
      <g transform="translate(15.2 4.6)">
        <path d="M1.8 5.8V0.9c0-.4.3-.6.6-.4l3 .1.1 4.2" stroke={stroke} strokeWidth="1" strokeLinecap="round" fill="none"/>
        <ellipse cx="1.2" cy="6" rx="1.1" ry="0.9" fill={stroke}/>
        <ellipse cx="5" cy="5.3" rx="1" ry="0.8" fill={stroke} opacity="0.85"/>
      </g>
      <path d="M5.2 7.2c.3-.5.8-.7 1.2-.4" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function IconAppointment({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.6" y="5.8" width="16.8" height="12.8" rx="4" fill={stroke} opacity="0.09"/>
      <rect x="3.6" y="6.4" width="16.3" height="11.6" rx="3.2" fill="white" stroke={stroke} strokeWidth="1.45"/>
      {/* binder */}
      <path d="M7.2 6.4V4.8c0-.6.5-1.1 1-1.1h1.2M15.8 6.4V4.8c0-.6-.5-1.1-1-1.1h-1.2" stroke={stroke} strokeWidth="1.25" strokeLinecap="round"/>
      {/* time blocks */}
      <rect x="6.2" y="9.2" width="5.2" height="2" rx="1" fill={stroke} opacity="0.14"/>
      <path d="M6.6 12.6h6.8M6.6 15h4.6" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.75"/>
      {/* clock seal */}
      <circle cx="15.2" cy="13.2" r="2.4" fill="white" stroke={stroke} strokeWidth="1.15"/>
      <path d="M15.2 12.1v1.2l.8.6" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
      <circle cx="15.2" cy="13.2" r="0.3" fill={stroke}/>
    </svg>
  );
}

function IconBirthday({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="18.6" rx="7.2" ry="1.5" fill={stroke} opacity="0.10"/>
      <path d="M5.8 15.6c0-.8.6-1.4 1.4-1.4h9.6c.8 0 1.4.6 1.4 1.4v1c0 .8-.6 1.4-1.4 1.4H7.2c-.8 0-1.4-.6-1.4-1.4v-1Z" fill="white" stroke={stroke} strokeWidth="1.35" strokeLinejoin="round"/>
      <path d="M7.6 14.2V11.8c0-.7.6-1.3 1.3-1.3h6.2c.7 0 1.3.6 1.3 1.3v2.4" fill="white" stroke={stroke} strokeWidth="1.25"/>
      <path d="M8 12.5c.2.5.5.9.9.9.5 0 .7-.6 1.3-.6.5 0 .7.6 1.3.6.5 0 .8-.6 1.3-.6.5 0 .7.5 1.1.7" stroke={stroke} strokeWidth="0.95" strokeLinecap="round" opacity="0.7"/>
      <rect x="11.1" y="6.2" width="1.8" height="4.2" rx="0.7" fill={stroke} opacity="0.9"/>
      <path d="M12 3.4c0-.7.6-1.1.9-.9.4.1.2 1-.1 1.9-.2.5-.5.8-.8.8-.4 0-.6-.3-.8-.8-.3-.9-.5-1.8-.1-1.9.3-.2.9.2.9.9Z" fill={stroke} opacity="0.9"/>
      <circle cx="5.4" cy="7.2" r="0.6" fill={stroke} opacity="0.5"/><circle cx="18.8" cy="8.4" r="0.45" fill={stroke} opacity="0.45"/>
    </svg>
  );
}

function IconReminder({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="19.6" rx="5.2" ry="0.9" fill={stroke} opacity="0.10"/>
      <path d="M7 10.1C7 6.8 9 4.1 12 4.1s5 2.7 5 6c0 2.9-1.5 4.6-2.7 6.1-.4.5-1 .8-1.6.8h-1.8c-.6 0-1.2-.3-1.6-.8-1.2-1.5-2.7-3.2-2.7-6.1Z" fill="white" stroke={stroke} strokeWidth="1.45"/>
      <path d="M8 9.8c.2-2.2 1.6-4.1 3.4-5" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.55"/>
      <circle cx="12" cy="10" r="1.25" fill={stroke} opacity="0.14"/><circle cx="12" cy="10" r="0.55" fill={stroke}/>
      {/* tag tail boutique */}
      <path d="M10 18.6c0 .9.3 1.5.8 1.7l1 .5c.3.1.3.5-.1.5H11" stroke={stroke} strokeWidth="1.05" strokeLinecap="round" opacity="0.75"/>
      <circle cx="9.2" cy="17.2" r="0.7" fill={stroke} opacity="0.18"/>
    </svg>
  );
}

function IconFamily({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.6 11.2L12 5.2l7.4 6v7.2c0 .7-.5 1.2-1.2 1.2H5.8c-.7 0-1.2-.5-1.2-1.2v-7.2Z" fill={stroke} opacity="0.09"/>
      <path d="M4.8 11.2L12 5.2l7.2 6v7.2c0 .6-.5 1.1-1.1 1.1H5.9c-.6 0-1.1-.5-1.1-1.1v-7.2Z" fill="white" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9 18.6v-2.7c0-.8.6-1.4 1.4-1.4h1.2c.8 0 1.4.6 1.4 1.4v2.7" fill={stroke} opacity="0.10" stroke={stroke} strokeWidth="1.05"/>
      <rect x="7" y="9.1" width="2.8" height="2.6" rx="0.7" fill={stroke} opacity="0.17" stroke={stroke} strokeWidth="1"/>
      <rect x="14.2" y="9.1" width="2.8" height="2.6" rx="0.7" fill={stroke} opacity="0.17" stroke={stroke} strokeWidth="1"/>
      <circle cx="12" cy="7.8" r="0.55" fill={stroke} opacity="0.9"/>
      <path d="M7.8 11.4l1.2-.1M15 11.4l1.1-.1" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}

function IconFriends({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="16.9" rx="6.8" ry="2.1" fill={stroke} opacity="0.09"/>
      <path d="M5.6 15.2c1.9.8 4 1.2 6.4 1.2s4.5-.4 6.4-1.2" stroke={stroke} strokeWidth="0.9" strokeLinecap="round" opacity="0.55"/>
      <g>
        <path d="M6.8 13.2c0-1.3 1-2.4 2.3-2.4h1.3c1.2 0 2.2 1.1 2.2 2.4v.6H6.8v-.6Z" fill="white" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M12.7 10.4c-.3 0-.5-.2-.5-.5s.2-.5.5-.5" stroke={stroke} strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
      </g>
      <g>
        <path d="M11.2 11.7c0-1.3 1-2.4 2.3-2.4h1.3c1.2 0 2.2 1.1 2.2 2.4v.6h-5.8v-.6Z" fill={stroke} opacity="0.14" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round"/>
      </g>
      <path d="M9.4 8.4c.2-.3.2-.7.1-1-.1-.2 0-.6.3-.8M11 7.8c.2-.3.2-.6.1-.9-.1-.2 0-.5.3-.6" stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.55"/>
      <circle cx="10" cy="6.9" r="0.32" fill={stroke} opacity="0.6"/>
    </svg>
  );
}

function IconHome({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 11.2c1.5-1.4 4-4 7-6.3 1-.8 1.6-.8 2.6 0 3 2.3 5.5 4.9 7 6.3.6.6.3 1.7-.6 1.7H4.1c-.9 0-1.5-1.1-.9-1.7Z" fill={stroke} opacity="0.10"/>
      <path d="M5 10.8L12 5l7 5.8v6.6c0 .8-.6 1.4-1.4 1.4H6.4c-.8 0-1.4-.6-1.4-1.4v-6.6Z" fill="white" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10.2 18.8v-2.5c0-.8.6-1.5 1.4-1.5h.8c.8 0 1.4.7 1.4 1.5v2.5" fill={stroke} opacity="0.12" stroke={stroke} strokeWidth="1.05"/>
      <circle cx="13.1" cy="16.6" r="0.35" fill={stroke}/>
      <rect x="14.6" y="6.5" width="2" height="2.7" rx="0.6" fill={stroke} opacity="0.85"/>
      <path d="M16.1 5c-.3-.5-.5-1-.3-1.4.2-.3.6-.4.8-.1.2.3 0 .7-.2 1.1-.2.4-.5.7-1 .7-.2 0-.4-.2-.5-.5-.1-.5.3-.9.9-1.1" stroke={stroke} strokeWidth="0.68" strokeLinecap="round" opacity="0.52"/>
    </svg>
  );
}

function IconOther({stroke}:{stroke:string}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4.2c.3 1.9.8 3.4 1.9 4.5 1.1 1.1 2.6 1.6 4.6 1.9-2 0-3.5.8-4.6 1.9-1.1 1.1-1.6 2.6-1.9 4.6-.3-2-.8-3.5-1.9-4.6-1.1-1.1-2.6-1.6-4.6-1.9 2-.3 3.5-.8 4.6-1.9 1.1-1.1 1.6-2.6 1.9-4.5Z" fill={stroke} opacity="0.14" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="12" cy="11.7" r="1.2" fill={stroke}/><circle cx="12" cy="11.7" r="0.33" fill="white"/>
      <circle cx="5.1" cy="6.1" r="0.5" fill={stroke} opacity="0.5"/><circle cx="18.7" cy="17.2" r="0.4" fill={stroke} opacity="0.4"/>
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
    return (
      <div className={className} style={{ width: s, height: s, display:"grid", placeItems:"center", opacity: isDark ? 0.18 : 0.16, pointerEvents:"none", ...style }}>
        <div style={{ transform: `scale(${s/28})`, transformOrigin:"center", filter: isDark ? "drop-shadow(0 1px 8px rgba(0,0,0,0.25))" : "drop-shadow(0 1px 4px rgba(0,0,0,0.04))" }}>
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
          : "0 2px 10px rgba(60,30,10,0.09), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04)",
        ...style
      }}>
      <span style={{ transform: `scale(${Math.max(0.85, size/32)})`, transformOrigin:"center", display:"grid", filter:"drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.08))" }}>
        {iconFn({stroke: pal.fg as string, title})}
      </span>
    </span>
  );
}

export function EventKindIcon({kind, size, variant, theme, title}: {kind?: string; size?: number; variant?: Props["variant"]; theme?: Props["theme"]; title?: string}) {
  return <EventIcon kind={kind} size={size} variant={variant} theme={theme} title={title} />;
}
