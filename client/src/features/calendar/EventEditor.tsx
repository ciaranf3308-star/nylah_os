import React, { useEffect, useState } from "react";
import type { PersonKey } from "../../types";
import { PERSONS } from "../../constants/themes";
import { todayKey, toLocalKey as toLocalKeyDublin, tzWallToUtc } from "../../lib/dates";
import { HOUSEHOLD_TZ } from "../../lib/buildMeta";
import { uid } from "../../shared/utils/helpers";

function timePartFromIsoDublin(iso?: string): string {
  if (!iso) return "10:00";
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: HOUSEHOLD_TZ, hour:"2-digit", minute:"2-digit", hour12:false });
    const parts = fmt.formatToParts(d);
    const h = parts.find(p=>p.type==="hour")?.value || "10";
    const m = parts.find(p=>p.type==="minute")?.value || "00";
    return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
  } catch { return "10:00"; }
}

function wallToIsoDublin(dateKey:string, timeStr:string, allDayFlag:boolean): string {
  try {
    const [y,m,d] = dateKey.split("-").map(Number);
    if (!y||!m||!d) return new Date().toISOString();
    if (allDayFlag) return tzWallToUtc(y,m,d,0,0,0,HOUSEHOLD_TZ).toISOString();
    const [hh,mm] = (timeStr||"09:00").split(":").map(n=> Number(n)||0);
    return tzWallToUtc(y,m,d,hh,mm,0,HOUSEHOLD_TZ).toISOString();
  } catch { return new Date().toISOString(); }
}

export type AddEventFormProps = {
  onAdd: (ev:any)=>void;
  currentUser: PersonKey;
  selectedDate?: string;
  initialEvent?: any;
};

function AddEventForm({ onAdd, currentUser, selectedDate, initialEvent }: AddEventFormProps){
  const initDateKey = (()=>{
    if (initialEvent?.dueAt) {
      const k = toLocalKeyDublin(initialEvent.dueAt, HOUSEHOLD_TZ);
      return k || selectedDate || todayKey(HOUSEHOLD_TZ);
    }
    if (initialEvent?.start) {
      const k = toLocalKeyDublin(initialEvent.start, HOUSEHOLD_TZ);
      return k || selectedDate || todayKey(HOUSEHOLD_TZ);
    }
    return selectedDate || todayKey(HOUSEHOLD_TZ);
  })();
  const initEndKey = (()=>{
    if (initialEvent?.endAt) {
      const k = toLocalKeyDublin(initialEvent.endAt, HOUSEHOLD_TZ);
      if (k) return k;
    }
    if (initialEvent?.end) {
      const k = toLocalKeyDublin(initialEvent.end, HOUSEHOLD_TZ);
      if (k) return k;
    }
    return initDateKey;
  })();
  const initAllDay = !!(initialEvent?.allDay);
  const initMulti = !!(initialEvent?.multiDay) || (()=>{
    if (!initialEvent) return false;
    const s = initialEvent.dueAt || initialEvent.start;
    const e = initialEvent.endAt || initialEvent.end;
    if (!s || !e) return false;
    const sk = toLocalKeyDublin(s, HOUSEHOLD_TZ);
    const ek = toLocalKeyDublin(e, HOUSEHOLD_TZ);
    return sk && ek && sk !== ek;
  })();

  const [title,setTitle]=useState(()=> initialEvent?.title || "");
  const [date,setDate]=useState(()=> initDateKey);
  const [startTime,setStartTime]=useState(()=> initialEvent?.dueAt ? timePartFromIsoDublin(initialEvent.dueAt || initialEvent.start) : initialEvent?.start ? timePartFromIsoDublin(initialEvent.start) : "10:00");
  const [endTime,setEndTime]=useState(()=> {
    if (!initialEvent) return "";
    const eIso = initialEvent.endAt || initialEvent.end;
    if (!eIso) return "";
    if (initAllDay) return "";
    return timePartFromIsoDublin(eIso);
  });
  const [showOptions,setShowOptions]=useState(()=> !!initialEvent);
  const [allDay,setAllDay]=useState(()=> initAllDay);
  const [multiDay,setMultiDay]=useState(()=> initMulti);
  const [endDate,setEndDate]=useState(()=> initEndKey);
  const [location,setLocation]=useState(()=> initialEvent?.location || "");
  const [notes,setNotes]=useState(()=> initialEvent?.notes || "");
  const [repeat,setRepeat]=useState<"once"|"daily"|"weekly"|"biweekly"|"monthly">(()=> {
    if (!initialEvent) return "once";
    return (initialEvent.frequency || initialEvent.repeat || "once") as any;
  });
  const [reminder,setReminder]=useState<number|undefined>(()=> initialEvent?.reminderMinutes);
  const [responseDeadline,setResponseDeadline]=useState(()=> {
    if (!initialEvent?.responseDeadline) return "";
    const k = toLocalKeyDublin(initialEvent.responseDeadline, HOUSEHOLD_TZ);
    return k || "";
  });
  const [attendees,setAttendees]=useState<PersonKey[]>(()=> {
    if (initialEvent?.attendees && Array.isArray(initialEvent.attendees) && initialEvent.attendees.length) return initialEvent.attendees;
    return ["aisling","ciaran"];
  });

  useEffect(()=>{
    if (multiDay && date && endDate===date) {
      try {
        const [y,m,d] = date.split("-").map(Number);
        const startUTC = tzWallToUtc(y,m,d,0,0,0,HOUSEHOLD_TZ);
        const wkLater = new Date(startUTC.getTime()+ 6*24*3600*1000);
        const key = toLocalKeyDublin(wkLater.toISOString(), HOUSEHOLD_TZ);
        if (key) setEndDate(key);
      } catch {}
    }
  }, [multiDay]);

  const isEndBeforeStart = multiDay && endDate && date && endDate < date;
  const isTimeInvalidSingle = !allDay && !multiDay && startTime && endTime && endTime <= startTime;
  const isRangeInvalid = !!(isEndBeforeStart || isTimeInvalidSingle);
  const invalidReason = isEndBeforeStart ? "End date must be on or after start" : isTimeInvalidSingle ? "End time must be after start time" : "";

  const fmtDeadlinePreview = responseDeadline ? (()=>{
    try { return new Date(responseDeadline+"T12:00:00").toLocaleDateString(undefined,{weekday:"short", month:"short", day:"numeric"}); } catch {return responseDeadline;}
  })() : "";

  return <div className="space-y-3">
    <div className="text-[11px] text-[var(--muted)]">Responding as {(PERSONS[currentUser]?.name||currentUser||'You')} • Europe/Dublin — {initialEvent ? "editing" : "new"}</div>
    <input id="cal-title" aria-label="Event title" value={title} onChange={e=> setTitle(e.target.value)} placeholder="Title — e.g. Dinner with Mia" className="w-full rounded-full border bg-[var(--card-bg)] px-4 h-[44px] text-[13px]" style={{ borderColor:"var(--border)" }} />
    <div className="flex gap-2">
      <div className="flex-1">
        <label htmlFor="cal-date" className="text-[11px] text-[var(--muted)]">Start date (Dublin)</label>
        <input id="cal-date" type="date" value={date} onChange={e=> setDate(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" style={{ borderColor: isEndBeforeStart ? "#B91C1C" : "var(--border)" }} />
      </div>
      {multiDay ? (
        <div className="flex-1">
          <label htmlFor="cal-enddate" className="text-[11px] text-[var(--muted)]">End date</label>
          <input id="cal-enddate" type="date" value={endDate} onChange={e=> setEndDate(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" style={{ borderColor: isEndBeforeStart ? "#B91C1C" : "var(--border)" }} />
        </div>
      ) : (
        <div className="w-[128px]">
          <label htmlFor="cal-start" className="text-[11px] text-[var(--muted)]">Start</label>
          <input id="cal-start" type="time" disabled={allDay} value={startTime} onChange={e=> setStartTime(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px] disabled:opacity-50" />
        </div>
      )}
    </div>

    {multiDay && (
      <div className="flex gap-2">
        <div className="w-[128px]">
          <label htmlFor="cal-start-multi" className="text-[11px] text-[var(--muted)]">Start time</label>
          <input id="cal-start-multi" type="time" disabled={allDay} value={startTime} onChange={e=> setStartTime(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px] disabled:opacity-50" />
        </div>
        <div className="w-[128px]">
          <label htmlFor="cal-end" className="text-[11px] text-[var(--muted)]">End time</label>
          <input id="cal-end" type="time" disabled={allDay} value={endTime} onChange={e=> setEndTime(e.target.value)} placeholder={allDay ? "23:59 for all-day" : "optional"} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px] disabled:opacity-50" style={{ borderColor: isTimeInvalidSingle ? "#B91C1C" : "var(--border)" }} />
        </div>
      </div>
    )}
    {!multiDay && (
      <div className="w-full">
        <label htmlFor="cal-end" className="text-[11px] text-[var(--muted)]">End time (optional)</label>
        <input id="cal-end" type="time" value={endTime} onChange={e=> setEndTime(e.target.value)} placeholder="optional" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" style={{ borderColor: isTimeInvalidSingle ? "#B91C1C" : "var(--border)" }} />
      </div>
    )}

    {isRangeInvalid && (
      <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l9 16H3L12 3z"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>️ {invalidReason}</div>
    )}

    <button onClick={()=> setShowOptions(v=> !v)} className="text-[11px] underline text-[var(--muted)]">Options {showOptions ? "↑" : "↓"} {multiDay ? "• multi-day" : ""} {allDay ? "• all-day" : ""}</button>
    {showOptions && (
      <div className="rounded-[14px] border bg-[var(--card-bg)] p-3 space-y-2" style={{ borderColor:"var(--border)" }}>
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allDay} onChange={e=> setAllDay(e.target.checked)} /> All-day</label>
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={multiDay} onChange={e=> setMultiDay(e.target.checked)} /> Multi-day — schedule for a week</label>
        {multiDay && <div className="text-[11px] text-[var(--muted)]">For a full week: check All-day, pick Start + End ~7 days apart.</div>}
        <input value={location} onChange={e=> setLocation(e.target.value)} placeholder="Location" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]" />
        <textarea value={notes} onChange={e=> setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-[12px] border bg-[var(--card-bg)] px-3 py-2 text-[11px] min-h-[60px]" />
        <select value={repeat} onChange={e=> setRepeat(e.target.value as any)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]">
          <option value="once">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Monthly (semantic — preserves day)</option>
        </select>
        <select value={reminder ?? ""} onChange={e=> setReminder(e.target.value ? Number(e.target.value) : undefined)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]">
          <option value="">No reminder</option>
          <option value="15">15 min before</option>
          <option value="60">1 hour before</option>
          <option value="1440">1 day before</option>
        </select>
        <label htmlFor="cal-deadline" className="text-[11px] text-[var(--muted)]">Response requested by</label>
        <input id="cal-deadline" type="date" value={responseDeadline} onChange={e=> setResponseDeadline(e.target.value)} placeholder="Response requested by" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]" />
        <div className="text-[11px] text-[var(--muted)]">Who needs to attend</div>
        <div className="flex gap-2">
          {(["aisling","ciaran"] as PersonKey[]).map(p=> (
            <label key={p} className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={attendees.includes(p)} onChange={e=> { if(e.target.checked) setAttendees(a=> [...a,p]); else setAttendees(a=> a.filter(x=> x!==p)); }} />{PERSONS[p].name}</label>
          ))}
        </div>
        {fmtDeadlinePreview && <div className="text-[11px] text-[var(--muted)]">Response requested by {fmtDeadlinePreview}</div>}
      </div>
    )}
    <button disabled={!title.trim() || isRangeInvalid} onClick={()=> {
      const startIso = wallToIsoDublin(date, startTime, allDay);
      let finalEnd: string | undefined;
      if (multiDay) {
        if (allDay) {
          try {
            const [y2,m2,d2] = endDate.split("-").map(Number);
            finalEnd = tzWallToUtc(y2,m2,d2,23,59,0,HOUSEHOLD_TZ).toISOString();
          } catch {
            finalEnd = new Date(`${endDate}T23:59:00`).toISOString();
          }
        } else {
          finalEnd = endDate ? wallToIsoDublin(endDate, endTime||"23:59", false) : undefined;
        }
      } else {
        finalEnd = endTime ? wallToIsoDublin(date, endTime, false) : undefined;
      }

      const attend = attendees.length ? attendees : ["aisling","ciaran"] as PersonKey[];
      const isSingleAttend = attend.length===1;
      const baseProposer = initialEvent?.proposer || currentUser;
      const awaiting: any = (()=>{
        if (isSingleAttend) return "agreed";
        if (initialEvent?.status) return initialEvent.status;
        return currentUser === "aisling" ? "awaiting_ciaran" : "awaiting_aisling";
      })();

      const ev:any = {
        ...(initialEvent ? {...initialEvent} : {}),
        id: initialEvent?.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        title:title.trim(),
        type: repeat === "once" ? "one-off" : "repeat",
        frequency: repeat,
        dueAt: startIso,
        endAt: finalEnd,
        start: startIso,
        end: finalEnd,
        proposer: baseProposer,
        status: awaiting,
        swipes: isSingleAttend ? { aisling: attend[0]==="aisling" ? "yes" : null, ciaran: attend[0]==="ciaran" ? "yes" : null } as any : (initialEvent?.swipes || {aisling: currentUser==="aisling" ? "yes" : null, ciaran: currentUser==="ciaran" ? "yes" : null}),
        responses: initialEvent?.responses || [{eventId:"", memberId:currentUser, response:"yes", respondedAt:new Date().toISOString()}],
        createdAt: initialEvent?.createdAt || new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        allDay,
        multiDay,
        endDate: multiDay ? endDate : undefined,
        location: location || undefined,
        notes: notes || undefined,
        reminderMinutes: reminder,
        responseDeadline: responseDeadline ? wallToIsoDublin(responseDeadline, "12:00", false) : undefined,
        attendees: attend,
        timezone: HOUSEHOLD_TZ,
        mutationId: (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()),
      };
      if (isSingleAttend) {
        const sole = attend[0] as PersonKey;
        ev.status = "agreed";
        ev.responses = [{eventId:ev.id, memberId:sole, response:"yes", respondedAt:new Date().toISOString()}];
        ev.swipes = { aisling: sole==="aisling" ? "yes" : null, ciaran: sole==="ciaran" ? "yes" : null } as any;
      } else if (!initialEvent) {
        ev.responses = [{eventId:ev.id, memberId:currentUser, response:"yes", respondedAt:new Date().toISOString()}];
      } else {
        ev.responses = ev.responses.map((r:any)=> ({...r, eventId: ev.id}));
        if (!ev.responses.find((r:any)=> r.memberId===currentUser)) {
          ev.responses.push({eventId:ev.id, memberId:currentUser, response:"yes", respondedAt:new Date().toISOString()});
        }
      }
      if (ev.responses?.[0]) ev.responses[0].eventId = ev.id;
      onAdd(ev);
    }} className="w-full rounded-full bg-[#0A0A0A] h-[44px] text-white text-[13px] disabled:opacity-40 disabled:cursor-not-allowed">{isRangeInvalid ? invalidReason : (attendees.length===1) ? "Save • Only you" : (initialEvent ? "Save" : "Propose")+" • "+(multiDay ? "week / multi" : "Needs a Nod")}</button>
  </div>;
}
function windowHoursForChore(c: ChoreV2): number {
  // FIX urgency window only — monthly recurrence is semantic, not 720h
  if (c.timeWindowHours) return c.timeWindowHours;
  if (c.type === "one-off" || c.frequency === "once") return 24;
  if (c.frequency === "daily") return 24;
  if (c.frequency === "twice-week") return 84;
  if (c.frequency === "weekly") return 168;
  if (c.frequency === "biweekly") return 336;
  if (c.frequency === "monthly") return 720; // window only, recurrence handled by computeNextDueDateChore semantic
  if (c.frequency === "custom") return 168;
  return 168;
}
function getDueMsChore(c: ChoreV2): number {
  if (c.dueAt) return new Date(c.dueAt).getTime();
  return new Date(c.createdAt).getTime() + windowHoursForChore(c) * 3600 * 1000;
}
function percentLeftChore(c: ChoreV2, nowMs?: number) {
  const now = nowMs ?? Date.now(); const due = getDueMsChore(c); const win = windowHoursForChore(c);
  const created = new Date(c.createdAt).getTime(); const start = c.dueAt ? due - win * 3600000 : created;
  const total = due - start; if (total <= 0) return 0; return (due - now) / total;
}
function isBonusChore(c: ChoreV2, atMs?: number) { const pct = percentLeftChore(c, atMs); return pct >= 0 && pct < 0.10; }
function effectivePoints(c: ChoreV2, bonus = false) { let pts = c.basePoints * c.multiplier; if (bonus) pts *= 1.15; // +15% urgency, capped 1.5× total
  pts = Math.min(pts, c.basePoints * 1.5);
  return Math.round(pts); }
function effortLabel(pain:number): string {
  if(pain<=2) return "Tiny";
  if(pain<=4) return "Quick";
  if(pain<=6) return "Moderate";
  if(pain<=8) return "Heavy";
  return "Brutal";
}
function freqBadgeChore(c: ChoreV2) { if (c.type === "one-off") return "ONCE"; if (c.frequency === "custom" && c.frequencyDetail) return c.frequencyDetail.toUpperCase(); if (c.frequency === "twice-week" && c.frequencyDetail) return c.frequencyDetail.toUpperCase(); return c.frequency.toUpperCase(); }

// --- twice-week fix utilities ---
const WEEKDAY_SHORT_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const; // index 0=Mo ... 6=Su
const WEEKDAY_LONG_TUEFRI = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DEFAULT_TWICE_WEEK_BOOL = [false, true, false, false, true, false, false] as const; // Tue + Fri

// keep referenced for legacy / debug — avoid unused-local TS error
function boolToJsWeekdays(weekdays: boolean[]): number[] {
  // converts Mo-Su bool to JS getDay numbers 0-6 Sun-Sat
  const js: number[] = [];
  weekdays.forEach((on, i) => {
    if (!on) return;
    // i:0 Mo->1,1 Tu->2,2 We->3,3 Th->4,4 Fr->5,5 Sa->6,6 Su->0
    const map = [1, 2, 3, 4, 5, 6, 0];
    js.push(map[i] as number);
  });
  return js;
}
const _keep_boolToJs = boolToJsWeekdays;
void _keep_boolToJs;
function parseFrequencyDetailToJsDays(detail?: string): number[] {
  if (!detail) return [];
  const tokens = detail.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const out: number[] = [];
  for (const t of tokens) {
    if (["mo", "mon", "monday"].includes(t)) out.push(1);
    else if (["tu", "tue", "tues", "tuesday"].includes(t)) out.push(2);
    else if (["we", "wed", "wednesday"].includes(t)) out.push(3);
    else if (["th", "thu", "thur", "thurs", "thursday"].includes(t)) out.push(4);
    else if (["fr", "fri", "friday"].includes(t)) out.push(5);
    else if (["sa", "sat", "saturday"].includes(t)) out.push(6);
    else if (["su", "sun", "sunday"].includes(t)) out.push(0);
  }
  return [...new Set(out)];
}
function weekdaysBoolToDetailString(weekdays: boolean[], fmt: "mo" | "tue" = "mo"): string {
  const labels = fmt === "tue" ? WEEKDAY_LONG_TUEFRI : WEEKDAY_SHORT_MON;
  const sel = (labels as readonly string[]).filter((_, i) => weekdays[i]);
  return sel.join(",");
}
// V30: dead code removed, weekdays helper direct
function nextDateMatchingWeekdays(from: Date, allowedJsDays: number[], hour: number, minute: number): Date {
  // finds next date >= from that matches allowedJsDays, preserving hour/minute
  // if from's day matches and time has not passed for today case, allow today
  const start = new Date(from);
  // search up to 14 days
  for (let offset = 0; offset < 14; offset++) {
    const cand = new Date(start);
    cand.setDate(start.getDate() + offset);
    cand.setHours(hour, minute, 0, 0);
    const jsDay = cand.getDay();
    if (allowedJsDays.includes(jsDay)) {
      if (offset === 0 && cand.getTime() < from.getTime()) continue;
      return cand;
    }
  }
  // fallback: return from
  return from;
}

function computeNextOccurrenceForDailyOrTwice(ev: CalendarEventV2, nowMs?: number): Date {
  const now = nowMs ? new Date(nowMs) : new Date();
  const base = new Date(ev.dueAt);
  const hour = base.getHours();
  const minute = base.getMinutes();
  const freq = ev.frequency;
  const detail = ev.frequencyDetail;
  if (!freq || freq === "once") return base;
  if (freq === "twice-week" || freq === "custom" || freq === "weekly" || freq === "biweekly" || freq === "monthly") {
    const jsDays = parseFrequencyDetailToJsDays(detail);
    if (jsDays.length > 0) {
      // if now is after base but base is future, we want next from now; else from base if base is future else now
      const reference = base.getTime() > now.getTime() ? base : now;
      const refTime = base; // keep hour/min from base
      return nextDateMatchingWeekdays(reference, jsDays, refTime.getHours(), refTime.getMinutes());
    }
  }
  if (freq === "daily") {
    // next daily at same time
    const ref = base.getTime() > now.getTime() ? base : now;
    const cand = new Date(ref);
    cand.setHours(hour, minute, 0, 0);
    if (cand.getTime() <= now.getTime()) cand.setDate(cand.getDate() + 1);
    return cand;
  }
  if (freq === "weekly" || freq === "biweekly" || freq === "monthly") {
    const ref = base.getTime() > now.getTime() ? base : now;
    let cand = new Date(ref);
    cand.setHours(hour, minute, 0, 0);
    if (freq === "monthly") {
      // V17 semantic monthly: preserve originalDom, Europe/Dublin, avoid Feb 29 drift
      const dom = (ev as any).originalDom ?? ev.dayOfMonth ?? base.getDate();
      const tzLocal = (ev as any).timezone || "Europe/Dublin";
      try {
        const fromPlus = new Date((ref.getTime() > base.getTime() ? ref.getTime() : base.getTime()) + 60*1000);
        let next = nextMonthlyFrom(fromPlus, dom, hour, minute, tzLocal);
        let guard = 0;
        while (next.getTime() <= now.getTime() && guard < 12) {
          next = nextMonthlyFrom(new Date(next.getTime()+ 3600*1000), dom, hour, minute, tzLocal);
          guard++;
        }
        return next;
      } catch {
        // fallback clamp using originalDom, not drifted base date
        let monthsAdd = 0;
        if (cand.getTime() <= now.getTime()) monthsAdd = 1;
        let next = new Date(Date.UTC(cand.getFullYear(), cand.getMonth(), 1, hour, minute, 0));
        next.setMonth(next.getMonth() + monthsAdd);
        const daysInMonth = new Date(next.getFullYear(), next.getMonth()+1, 0).getDate();
        next.setDate(Math.min(dom, daysInMonth));
        return next;
      }
    }
    const daysAdd = freq === "biweekly" ? 14 : 7;
    if (cand.getTime() <= now.getTime()) cand.setDate(cand.getDate() + daysAdd);
    return cand;
  }
  return base;
}

// --- new: proper weekdays recurring helpers for chores/calendar + biweekly parity ---

function computeNextDueFromWeekdays(from: Date, weekdaysBool: boolean[], intervalWeeks = 1): Date {
  if (!weekdaysBool.some(Boolean)) {
    const nxt = new Date(from);
    nxt.setDate(nxt.getDate()+1);
    nxt.setHours(9,0,0,0);
    return nxt;
  }
  const jsDays = boolToJsWeekdays(weekdaysBool);
  const hour = from.getHours();
  const minute = from.getMinutes();
  // FIX epoch anchor for intervalWeeks — use fixed Monday epoch, not from's Monday
  const epochWeekStart = weekNumberSinceEpoch(new Date(BIWEEKLY_EPOCH_MONDAY_UTC));
  const anchor = new Date(from);
  anchor.setHours(0,0,0,0);
  const dayIdx = (anchor.getDay()+6)%7;
  anchor.setDate(anchor.getDate()-dayIdx);
  const startWeekNum = intervalWeeks>1 ? epochWeekStart : weekNumberSinceEpoch(anchor);
  for (let offset=0; offset< 42; offset++) {
    const cand = new Date(from);
    cand.setDate(from.getDate()+offset);
    cand.setHours(hour, minute,0,0);
    const jsDay = cand.getDay();
    if (!jsDays.includes(jsDay)) continue;
    if (cand.getTime() < from.getTime() + 60000) continue;
    if (intervalWeeks>1) {
      const candMon = new Date(cand);
      candMon.setHours(0,0,0,0);
      const cDayIdx = (candMon.getDay()+6)%7;
      candMon.setDate(candMon.getDate()-cDayIdx);
      const candWeekNum = weekNumberSinceEpoch(candMon);
      if ((candWeekNum - startWeekNum) % intervalWeeks !== 0) continue;
    }
    return cand;
  }
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate()+ (intervalWeeks>1?14:7));
  fallback.setHours(hour, minute,0,0);
  return fallback;
}

function computeNextDueDateChore(chore: ChoreV2, fromMs?: number): Date {
  const from = fromMs ? new Date(fromMs) : new Date();
  const fromPlus = new Date(from.getTime()+ 60*1000); // +1m to avoid now == due edge
  if (chore.frequencyDetail) {
    const jsDays = parseFrequencyDetailToJsDays(chore.frequencyDetail);
    if (jsDays.length>0) {
      // map interval
      const interval = chore.frequency==="biweekly"?2:1;
      // need weekdaysBool from jsDays — reconstruct bool
      // but simpler: use nextDateMatchingWeekdays logic with interval if biweekly
      if (interval>1) {
        // convert jsDays back to bool
        const bool: boolean[] = [false,false,false,false,false,false,false];
        // jsDay 1=Mo->0, 2=Tu->1 etc
        const mapJsToIdx: Record<number,number> = {1:0,2:1,3:2,4:3,5:4,6:5,0:6};
        jsDays.forEach(j=>{ const i=mapJsToIdx[j]; if(i!==undefined) bool[i]=true; });
        return computeNextDueFromWeekdays(fromPlus, bool, interval);
      }
      const baseHour = chore.dueAt? new Date(chore.dueAt).getHours(): 9;
      const baseMin = chore.dueAt? new Date(chore.dueAt).getMinutes():0;
      return nextDateMatchingWeekdays(fromPlus, jsDays, baseHour, baseMin);
    }
  }
  // fallback based on windowHours – monthly special
  if (chore.frequency === "monthly") {
    const base = chore.dueAt ? new Date(chore.dueAt) : new Date(chore.createdAt);
    const dom = (chore as any).originalDom ?? (chore as any).dayOfMonth ?? base.getDate();
    const hour = base.getHours(); const min = base.getMinutes();
    // FIX semantic monthly via nextMonthlyFrom Europe/Dublin preserving DOM each month Jan31->Feb28->Mar31
    const preservedDom = (chore as any).originalDom ?? dom;
    try {
      const cand = nextMonthlyFrom(fromPlus, preservedDom, hour, min, HOUSEHOLD_TZ);
      // ensure > fromPlus, loop months until future — but cand from nextMonthlyFrom already > fromPlus
      let next = cand;
      let guard = 0;
      while (next.getTime() <= fromPlus.getTime() && guard<12) {
        // use nextMonthlyFrom semantic advance, not naive +30d
        next = nextMonthlyFrom(new Date(next.getTime()+ 3600*1000), preservedDom, hour, min, HOUSEHOLD_TZ);
        guard++;
      }
      return next;
    } catch {
      // fallback: clamp with preservedDom, not drifting
      let cand = new Date(fromPlus); cand.setHours(hour, min, 0, 0);
      if (cand.getTime() <= fromPlus.getTime()) {
        cand.setMonth(cand.getMonth()+1);
        cand.setDate(1);
      }
      const dimFirst = clampDayOfMonth(cand.getFullYear(), cand.getMonth()+1, preservedDom);
      cand.setDate(dimFirst);
      while (cand.getTime() <= fromPlus.getTime()) {
        cand.setMonth(cand.getMonth()+1);
        const dim = clampDayOfMonth(cand.getFullYear(), cand.getMonth()+1, preservedDom);
        cand.setDate(dim);
      }
      return cand;
    }
  }
  const winH = windowHoursForChore(chore);
  const nxt = new Date(from.getTime()+ winH*3600*1000);
  return nxt;
}

// --- Shopping helpers ---
function freqToHours(freq: ShoppingFrequency): number | null {
  switch(freq){
    case "daily": return 24;
    case "every-2d": return 48;
    case "weekly": return 168;
    case "biweekly": return 336;
    case "monthly": return 720; // FIX window only — recurrence semantic in computeShoppingNextDue
    default: return null; // as-needed
  }
}
function computeShoppingNextDue(item: ShoppingItemV2, nowMs?: number): Date | null {
  const now = nowMs? new Date(nowMs): new Date();
  const baseRef = item.lastDoneAt ? new Date(item.lastDoneAt) : new Date(item.createdAt);
  const freq = item.frequency || "as-needed";
  if (freq==="as-needed") return null;
  // if weekly/biweekly with needDays, use weekdays logic
  if ((freq==="weekly" || freq==="biweekly") && item.needDays) {
    const jsDays = parseFrequencyDetailToJsDays(item.needDays);
    if (jsDays.length>0) {
      const interval = freq==="biweekly"?2:1;
      // Use generic next matching after now-ish (use now as reference for display)
      const ref = baseRef.getTime()>now.getTime()? baseRef: now;
      const refDate = new Date(ref.getTime()+ 10*60*1000);
      const hour = refDate.getHours();
      const minute = refDate.getMinutes();
      if (interval>1) {
        const bool: boolean[]=[false,false,false,false,false,false,false];
        const mapJsToIdx: Record<number,number> = {1:0,2:1,3:2,4:3,5:4,6:5,0:6};
        jsDays.forEach(j=>{ const i=mapJsToIdx[j]; if(i!==undefined) bool[i]=true; });
        return computeNextDueFromWeekdays(refDate, bool, interval);
      }
      return nextDateMatchingWeekdays(refDate, jsDays, hour, minute);
    }
  }
  if (freq === "monthly") {
    // V17 semantic monthly Jan31->Feb28->Mar31 preserving original DOM, not 720h drift
    const baseHour = baseRef.getHours(); const baseMin = baseRef.getMinutes();
    const preservedDom = (item as any).originalDom ?? baseRef.getDate(); // shopping now preserves originalDom
    try {
      let cand = nextMonthlyFrom(new Date(baseRef.getTime()+ 60*1000), preservedDom, baseHour, baseMin, HOUSEHOLD_TZ);
      // advance until > now
      let guard=0;
      while (cand.getTime() <= now.getTime() && guard<24) {
        cand = nextMonthlyFrom(new Date(cand.getTime()+ 3600*1000), preservedDom, baseHour, baseMin, HOUSEHOLD_TZ);
        guard++;
      }
      return cand;
    } catch {
      // fallback old 720h but bounded using preservedDom via clamp
      const y = baseRef.getFullYear(); const m = baseRef.getMonth();
      const clamped = clampDayOfMonth(y, m+1, preservedDom);
      const h=720; const nxt=new Date(baseRef.getTime()+h*3600*1000);
      void clamped;
      if(nxt.getTime()<now.getTime()){
        const diffH=(now.getTime()-nxt.getTime())/3600000; const steps=Math.floor(diffH/h)+1; nxt.setTime(nxt.getTime()+steps*h*3600000);
      }
      return nxt;
    }
  }
  const h = freqToHours(freq);
  if (!h) return null;
  const nxt = new Date(baseRef.getTime()+ h*3600*1000);
  // if nxt is in past relative to now, advance by multiples
  if (nxt.getTime()<now.getTime()) {
    const diffH = (now.getTime()-nxt.getTime())/3600000;
    const steps = Math.floor(diffH / h)+1;
    nxt.setTime(nxt.getTime()+ steps*h*3600000);
  }
  return nxt;
}

function shoppingFrequencyBadge(it: ShoppingItemV2): string {
  const freq = it.frequency || "as-needed";
  if (freq==="as-needed") return "AS NEEDED";
  if (freq==="daily") return "DAILY";
  if (freq==="every-2d") return "EVERY 2D";
  if (freq==="weekly") {
    return it.needDays? "WEEKLY • "+ it.needDays.toUpperCase() : "WEEKLY";
  }
  if (freq==="biweekly") {
    return it.needDays? "2WK • "+ it.needDays.toUpperCase() : "EVERY 2 WKS";
  }
  if (freq==="monthly") return "MONTHLY";
  return (freq as string).toUpperCase();
}
function shoppingDueLabel(it: ShoppingItemV2, nowMs?: number): { label:string; overdue:boolean; dueSoon:boolean; next:Date|null } {
  const nxt = computeShoppingNextDue(it, nowMs);
  if (!nxt) return { label: it.lastDoneAt? "bought "+ relTime(it.lastDoneAt, nowMs||Date.now()) : "new", overdue:false, dueSoon:false, next:null };
  const diff = nxt.getTime() - (nowMs||Date.now());
  const hours = diff/3600000;
  const overdue = hours <0;
  if (overdue) return { label: "overdue by "+ Math.ceil(-hours/24)+"d", overdue:true, dueSoon:false, next:nxt };
  if (hours <24) return { label: "due today • "+ nxt.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}), overdue:false, dueSoon:true, next:nxt };
  if (hours <48) return { label: "due tomorrow", overdue:false, dueSoon:true, next:nxt };
  if (hours <168) return { label: "due "+ nxt.toLocaleDateString(undefined,{weekday:"short"}), overdue:false, dueSoon:false, next:nxt };
  return { label: "next "+ nxt.toLocaleDateString(undefined,{month:"short",day:"numeric"}), overdue:false, dueSoon:false, next:nxt };
}

function shoppingRestockText(it: ShoppingItemV2, nowMs?: number): { text:string; tone:"ok"|"soon"|"overdue"; due: Date|null } {
  const info = shoppingDueLabel(it, nowMs);
  const nxt = info.next;
  if (!nxt) {
    // as-needed fallback
    return { text: info.label, tone: "ok", due: null };
  }
  const diff = nxt.getTime() - (nowMs || Date.now());
  const days = Math.ceil(diff / 86400000);
  const hours = diff / 3600000;
  if (info.overdue) return { text: "Overdue • Restock now", tone: "overdue", due: nxt };
  if (hours <= 0) return { text: "Restock today", tone: "soon", due: nxt };
  if (hours < 24) return { text: "Restock today • " + nxt.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}), tone: "soon", due: nxt };
  if (hours < 48) return { text: "Restock tomorrow", tone: "soon", due: nxt };
  if (days === 1) return { text: "Restock tomorrow", tone: "soon", due: nxt };
  if (days <= 3) return { text: "Restock in " + days + " days", tone: "soon", due: nxt };
  if (days <= 6) return { text: "Restock in " + days + " days", tone: "ok", due: nxt };
  if (days <= 13) return { text: "Restock in " + Math.round(days) + "d • " + nxt.toLocaleDateString(undefined,{weekday:"short"}), tone: "ok", due: nxt };
  return { text: info.label, tone: info.dueSoon ? "soon" : "ok", due: nxt };
}

function parseNeedDaysToBool(s?: string): boolean[] {
  const out = [false,false,false,false,false,false,false];
  if (!s) return out;
  const toks = s.split(",").map(t=> t.trim().toLowerCase()).filter(Boolean);
  const map: Record<string,number> = {mo:0,mon:0,monday:0,tu:1,tue:1,tues:1,tuesday:1,we:2,wed:2,wednesday:2,th:3,thu:3,thur:3,thurs:3,thursday:3,fr:4,fri:4,friday:4,sa:5,sat:5,saturday:5,su:6,sun:6,sunday:6};
  for (const tk of toks) { const idx = (map as any)[tk]; if (idx!==undefined) out[idx]=true; }
  return out as any;
}
function boolToNeedDaysString(b: boolean[]): string | undefined {
  const labels=["Mo","Tu","We","Th","Fr","Sa","Su"];
  const sel = labels.filter((_,i)=> b[i]);
  return sel.length ? sel.join(",") : undefined;
}

function shoppingNeedDaysLabel(it: ShoppingItemV2): string {
  if (!it.needDays) return "";
  return it.needDays;
}


function getDueMsCal(ev: CalendarEventV2) {
  // Calendar is not a chore — no points / urgency
  // If repeat with weekdays, use next occurrence for display / due calc
  if (ev.frequency === "twice-week" || ev.frequency === "custom") {
    if (ev.frequencyDetail) {
      const nxt = computeNextOccurrenceForDailyOrTwice(ev, Date.now());
      return nxt.getTime();
    }
  }
  if (ev.start) return new Date(ev.start).getTime();
  return new Date(ev.dueAt).getTime();
}
function percentLeftCal(ev: CalendarEventV2, nowMs?: number) {
  void nowMs;
  // removed urgency multiplier for events
  return 1;
}
function isBonusCal(ev: CalendarEventV2, nowMs?: number) {
  void ev; void nowMs;
  return false;
}
function DoodleSun({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#292624" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3.6" /><path d="M12 2.8v2.2M12 18.9V21M2.9 12H5.2M18.8 12H21M5 5l1.8 1.8M17.2 17.2l1.8 1.8M19 5l-1.8 1.8M6.8 17.2l-1.8 1.8" /></svg>;
}
function DoodleSparkle({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#292624" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.8L13.4 8.2L19 10L13.4 11.8L12 17.2L10.6 11.8L5 10L10.6 8.2L12 2.8Z" /><path d="M18.4 12.6L19 14.6L20.9 15.2L19 15.9L18.4 18L17.7 15.9L15.8 15.2L17.7 14.6L18.4 12.6Z" /><path d="M6 14.2L6.6 15.6L8 16.2L6.6 16.9L6 18.4L5.3 16.9L3.9 16.2L5.3 15.6L6 14.2Z" /></svg>;
}
void DoodleSparkle;
function DoodleLeaf({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#292624" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 2.2C6.2 2.9 3.8 5.2 3.8 8.3c0 2.3 1.6 4.1 4.7 4.1 0.8-0.9 1.4-2.3 1.4-3.8 0-2.8-1.7-5-1.4-6.4Z" /><path d="M8.2 6.2c0 0-1.1 1.3-1 3.0 0.1 1.1 0.7 2.0 1.3 2.7" /></svg>;
}
function DoodleJar({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#292624" strokeWidth="1.5" strokeLinecap="round"><path d="M5.2 3.2h5.6M4.2 5.2h7.6v7.2c0 0.8-0.6 1.4-1.4 1.4H5.6c-0.8 0-1.4-0.6-1.4-1.4V5.2Z" /><path d="M6 7.2h4M6 9.2h4" /></svg>;
}
void DoodleJar;
function DoodleBroom({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#292624" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.8 2.2L3.2 10.8" /><path d="M10.2 11.2l-2.0 2.0 1.2 1.2 2.0-2.0" /><path d="M7.2 11.8l-2.5 1.0 1.0-2.5" /></svg>;
}
void DoodleBroom;
function IconHeart({ className = "h-4 w-4", filled = false }: { className?: string; filled?: boolean }) {
  return <svg viewBox="0 0 16 16" className={className} fill={filled ? "#E07A5F" : "none"} stroke="#292624" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13.2 4.9 10.3A3.8 3.8 0 0 1 4 7.6a2.9 2.9 0 0 1 5-2 2.9 2.9 0 0 1 5 2c0 1-.4 1.95-1.9 3.7L8 13.2Z" /></svg>;
}
function IconX({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#5A5655" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4l8 8M12 4L4 12" /></svg>;
}
function IconCheck({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <svg viewBox="0 0 12 12" className={className} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6L5 8.5L9.5 3.5" /></svg>;
}
void IconCheck;
function IconChevronDown({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#5A5655" strokeWidth="1.4" strokeLinecap="round"><path d="M3 6l5 4 5-4" /></svg>;
}
function IconChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 3L5.5 8L10.5 13" /></svg>;
}
function GhostNum({ children }: { children: React.ReactNode }) {
  return <span className="font-display text-[38px] leading-none tracking-tight text-[var(--text)] opacity-[0.12] select-none">{children}</span>;
}
function MicroLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={"text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] " + className}>{children}</span>;
}
function EmptyState({ icon, title, subtitle, ctaLabel, onCta, borderColor }: { icon?: React.ReactNode; title: string; subtitle?: string; ctaLabel?: string; onCta?: ()=>void; borderColor?: string }) {
  return (
    <div className="rounded-[20px] border border-dashed bg-[var(--card-bg)] px-6 py-8 text-center" style={{ borderColor: borderColor || "var(--border)" }}>
      <div className="mx-auto mb-3 grid h-[96px] w-[96px] place-items-center rounded-full bg-[var(--chip-bg)] border" style={{ borderColor: borderColor || "var(--border)" }}>
        {icon || <DoodleSun className="h-[48px] w-[48px] opacity-80" />}
      </div>
      <div className="font-display text-[14px] font-medium text-[var(--text)]">{title}</div>
      {subtitle && <div className="mt-1 text-[11px] text-[var(--muted)] max-w-[240px] mx-auto">{subtitle}</div>}
      {ctaLabel && onCta && <button onClick={onCta} className="mt-3 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-[11px] font-medium text-white active:scale-[0.97] min-h-[44px]">{ctaLabel}</button>}
    </div>
  );
}

function useIsDebug(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("debug") || url.searchParams.get("debug") === "1") return true;
  } catch {}
  try {
    if (localStorage.getItem("couple_v1_debug") === "1") return true;
  } catch {}
  try {
    if ((window as any).__NYLAH_DEBUG__) return true;
  } catch {}
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) return true;
  return false;
}

function BottomSheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  // keep latest onClose without re-triggering effect (parent re-renders every sync tick otherwise close flickers)
  useEffect(()=>{ onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = (document.documentElement as any).style?.overscrollBehavior;
    document.body.style.overflow = "hidden";
    try { (document.documentElement as any).style.overscrollBehavior = "none"; } catch {}
    requestAnimationFrame(() => {
      if (sheetRef.current) {
        const auto = sheetRef.current.querySelector<HTMLElement>('[autofocus]');
        if (auto) auto.focus();
        else {
          const first = sheetRef.current.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
          first?.focus();
        }
      }
    });
    // NOTE: history push/pop removed — it was the source of polling/nowMs re-renders closing sheets instantly.
    // Escape + backdrop click handled via onCloseRef. Back button simply does browser back; sheet will unmount via parent.
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
      try { (document.documentElement as any).style.overscrollBehavior = prevOverscroll || ""; } catch {}
      try { prevFocusRef.current?.focus(); } catch {}
    };
  }, [open]);
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))] pointer-events-auto">
      <button aria-label="Close sheet" onClick={onClose} className="absolute inset-0 bg-[#292624]/20 backdrop-blur-[3px] min-h-[44px]" />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={title ? "sheet-title" : undefined} className="relative w-full max-w-[420px] animate-[sheetIn_0.24s_ease] rounded-[16px] bg-[var(--card-bg)] border shadow-[0_-16px_48px_rgba(0,0,0,0.18)] max-h-[72dvh] flex flex-col focus:outline-none" style={{ borderColor: "var(--border)" }} tabIndex={-1}>
        <div className="flex items-center justify-center pt-3 pb-2 shrink-0" aria-hidden="true"><span className="rounded-full bg-[var(--border)]" style={{ width: "36px", height: "5px", display: "block" }} /></div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0 gap-2">
          {title ? <div id="sheet-title" className="font-display text-[16px] font-medium text-[var(--text)]">{title}</div> : <div className="flex-1" />}
          <button onClick={onClose} aria-label="Close" className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[var(--card-bg)] border hover:bg-[var(--chip-bg)] shrink-0" style={{ borderColor: "var(--border)" }}>
            <span aria-hidden="true" className="text-[14px]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></span>
          </button>
        </div>
        <div className="px-4 pb-6 overflow-auto no-scrollbar overscroll-contain">{children}</div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
// PIN_MAP removed — now hashed in lib/pins.ts (interim device-local only, see SECURITY.md)


export type SyncKind = 'saving' | 'saved' | 'offline-queued' | 'failed' | 'updated-elsewhere';
export type SyncStatus = {
  kind: SyncKind;
  queueCount?: number;
  lastSavedAt?: string; // ISO
  error?: string;
  updatedElsewhere?: boolean;
};

/**
 * SyncStatusIsolated — now a pure presentational component.
 * It does NOT own online/offline listeners or interval timers.
 * Parent (V1AppShell) owns one sync engine, one visibility listener,
 * one focus listener, and passes truthful status as prop.
 * This fixes the leak where each render mounted new listeners + 1s tick.
 */
function SyncStatusIsolated({ syncStatus, onRetry }: { syncStatus: SyncStatus; onRetry?: ()=>void }) {
  const kind = syncStatus.kind;
  if (kind === 'saving') {
    return <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />Saving…</span>;
  }
  if (kind === 'failed') {
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-[11px] text-[#B91C1C] hover:text-[#991B1B] transition min-h-[20px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />Failed — Retry{syncStatus.error ? ` • ${syncStatus.error.slice(0,24)}` : ''}
      </button>
    );
  }
  if (kind === 'offline-queued') {
    const n = syncStatus.queueCount ?? 1;
    return <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />Offline — {n} queued</span>;
  }
  if (kind === 'updated-elsewhere') {
    return <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7C5CFC]"><span className="h-1.5 w-1.5 rounded-full bg-[#A89FDA] animate-pulse" />Updated elsewhere</span>;
  }
  // saved — truthful: only shown after server ack. No timer that re-renders every second.
  // Show absolute time via title, not "Xs ago" that required 1s interval.
  const last = syncStatus.lastSavedAt ? new Date(syncStatus.lastSavedAt).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' }) : null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]" title={syncStatus.lastSavedAt || undefined}>
      <span className="rounded-full bg-[#8DA08E]" style={{ width:"6px", height:"6px", display:"inline-block" }} />
      {last ? `Saved ${last}` : 'Saved'}
    </span>
  );
}

// --- ONBOARDING: open Nylah to other couples (friends beta) ---
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(6);
  try { crypto.getRandomValues(arr); } catch { for(let i=0;i<6;i++) arr[i]=Math.floor(Math.random()*chars.length); }
  let code = "";
  for (let i=0;i<6;i++) code += chars[arr[i]%chars.length];
  return code;
}
async function hashPinHex(pin: string): Promise<string> {
  const trimmed = pin.trim();
  try {
    const buf = new TextEncoder().encode(trimmed);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const arr = new Uint8Array(digest);
    let hex = '';
    for (let i=0;i<arr.length;i++) hex += arr[i].toString(16).padStart(2,'0');
    return hex;
  } catch { return trimmed; }
}
function getStoredHouseholdId(): string | null {
  try { return localStorage.getItem("couple_v1_household_id"); } catch { return null; }
}
function hasAnyLegacyData(): boolean {
  try {
    for (let i=0;i<localStorage.length;i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("couple_v1_")) return true;
    }
  } catch {}
  return false;
}
function shouldShowOnboarding(): boolean {
  try {
    try{ if(localStorage.getItem("couple_v1_force_onboard")==="1") return true; }catch{}

    const hid = getStoredHouseholdId();
    if (hid && hid.length>=3) return false;
    if (hasAnyLegacyData()) return false;
    try {
      const sp = new URLSearchParams(location.search);
      if (sp.get("onboard")==="0") return false;
      if (sp.get("onboard")==="1") return true;
    } catch {}
    return true;
  } catch { return true; }
}

function OnboardingFlow({ onComplete }: { onComplete: (hid: string)=>void }) {
  const [step, setStep] = useState<"welcome"|"create_names"|"create_pins"|"creating"|"share"|"join_code"|"join_pick"|"joining">("welcome");
  const [youName, setYouName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [youPin, setYouPin] = useState("");
  const [partnerPin, setPartnerPin] = useState("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMeta, setJoinMeta] = useState<any>(null);
  const [joinPersons, setJoinPersons] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  // auto-fill invite code from shared link ?code=XXXX
  useEffect(()=>{
    try {
      const sp = new URLSearchParams(location.search);
      const c = sp.get("code");
      if (c && c.length>=4) {
        const clean = c.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
        setJoinCode(clean);
        // if welcome screen still, nudge to join_code to reduce friction
        setStep(s => s==="welcome" ? "join_code" : s);
      }
    } catch {}
  }, []);

  const canContinueNames = youName.trim().length>=1 && partnerName.trim().length>=1;
  const canContinuePins = /^\d{4}$/.test(youPin) && /^\d{4}$/.test(partnerPin) && youPin!==partnerPin;

  const startCreate = () => {
    setError("");
    if (!canContinueNames) { setError("Add both names"); return; }
    setStep("create_pins");
  };
  const doCreate = async () => {
    setError("");
    if (!canContinuePins) { setError("Both PINs must be 4 digits and different"); return; }
    setCreating(true); setStep("creating");
    try {
      const code = generateInviteCode();
      const hid = `nylah-${code.toLowerCase()}`;
      setInviteCode(code); setHouseholdId(hid);
      const hashA = await hashPinHex(youPin);
      const hashB = await hashPinHex(partnerPin);
      const pinMapHashed: Record<string,string> = {};
      pinMapHashed[hashA] = "aisling";
      pinMapHashed[hashB] = "ciaran";
      const plainMap: Record<string,string> = {};
      plainMap[youPin] = "aisling";
      plainMap[partnerPin] = "ciaran";
      const persons = [
        { key:"aisling", name: youName.trim(), initial: youName.trim().slice(0,1).toUpperCase() },
        { key:"ciaran", name: partnerName.trim(), initial: partnerName.trim().slice(0,1).toUpperCase() },
      ];
      try {
        localStorage.setItem("couple_v1_household_id", hid);
        localStorage.setItem("couple_v1_household_code", code);
        localStorage.setItem("couple_v1_household_name", `${youName.trim()} & ${partnerName.trim()}`);
        localStorage.setItem(`couple_v1_household_persons_${hid}`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_pins_${hid}`, JSON.stringify(pinMapHashed));
        localStorage.setItem(`couple_v1_household_pins_plain_${hid}`, JSON.stringify(plainMap));
        try { (window as any).__HOUSEHOLD_PINS__ = pinMapHashed; } catch {}
      } catch {}
      try {
        const sb = getSupabase();
        if (sb) {
          const meta = {
            householdName: `${youName.trim()} & ${partnerName.trim()}`,
            householdId: hid,
            inviteCode: code,
            persons,
            pinHashes: pinMapHashed,
            createdAt: new Date().toISOString(),
            onboardedAt: new Date().toISOString(),
            tz: "Europe/Dublin",
          };
          const row = {
            id: hid,
            chores: [],
            calendar: [],
            shopping: [],
            notes: [],
            meta,
            updated_at: new Date().toISOString(),
            revision: 1,
          };
          const { error: insErr } = await (sb as any).from(SB_TABLE).upsert(row, { onConflict: 'id' });
          if (insErr) console.warn("[onboard] supabase upsert error", insErr.message);
        }
      } catch (e:any) { console.warn("[onboard] sb err", e?.message); }
      setCreating(false);
      setStep("share");
      try { applyCustomPersonNames(); } catch {}
    } catch (e:any) {
      setCreating(false);
      setError("Couldn't create — try again: "+String(e?.message||e).slice(0,80));
      setStep("create_pins");
    }
  };
  const doCopyCode = async () => {
    try { await navigator.clipboard.writeText(inviteCode); setError("Copied!"); setTimeout(()=>setError(""), 1200); } catch { setError(inviteCode); }
  };
  const doShare = async () => {
    const url = `${location.origin}${location.pathname}?code=${inviteCode}`;
    const text = `Join our Nylah — our private space for two. Code: ${inviteCode} — ${url}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "Join us on Nylah", text, url });
      } else {
        await navigator.clipboard.writeText(text);
        setError("Link copied!");
        setTimeout(()=>setError(""), 1200);
      }
    } catch {}
  };
  const startJoin = () => { setError(""); setJoinCode(""); setStep("join_code"); };
  const doJoinLookup = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
    if (code.length<4) { setError("Enter the 6-letter code"); return; }
    setJoining(true);
    try {
      const hid = `nylah-${code.toLowerCase()}`;
      const sb = getSupabase();
      if (!sb) { setError("No connection — check internet"); setJoining(false); return; }
      let data: any = null;
      const res1 = await (sb as any).from(SB_TABLE).select('*').eq('id', hid).maybeSingle();
      data = res1.data;
      if (!data) {
        const res2 = await (sb as any).from(SB_TABLE).select('*').eq('id', code.toLowerCase()).maybeSingle();
        if (res2.data) data = res2.data;
      }
      if (!data) {
        setError("No couple found with that code — check letters");
        setJoining(false);
        return;
      }
      const meta = (data as any).meta;
      setJoinMeta(meta);
      const persons = meta?.persons || [{key:"aisling", name:"Partner 1"}, {key:"ciaran", name:"Partner 2"}];
      setJoinPersons(persons);
      setInviteCode(code);
      setHouseholdId(hid);
      setJoining(false);
      setStep("join_pick");
    } catch (e:any) {
      setJoining(false);
      setError("Couldn't find — try again: "+String(e?.message||e).slice(0,60));
    }
  };
  const doJoinAs = async (personKey: string) => {
    setError(""); setJoining(true);
    try {
      const persons = joinPersons;
      const meta = joinMeta;
      const pinHashes = meta?.pinHashes || {};
      try {
        localStorage.setItem("couple_v1_household_id", householdId);
        localStorage.setItem("couple_v1_household_code", inviteCode);
        localStorage.setItem("couple_v1_household_name", meta?.householdName || "You & Partner");
        localStorage.setItem(`couple_v1_household_persons_${householdId}`, JSON.stringify(persons));
        localStorage.setItem(`couple_v1_household_persons`, JSON.stringify(persons));
        if (pinHashes && typeof pinHashes === 'object' && Object.keys(pinHashes).length>0) {
          localStorage.setItem(`couple_v1_household_pins_${householdId}`, JSON.stringify(pinHashes));
          try { (window as any).__HOUSEHOLD_PINS__ = pinHashes; } catch {}
        }
      } catch {}
      try { applyCustomPersonNames(); } catch {}
      setJoining(false);
      onComplete(householdId);
    } catch (e:any) {
      setJoining(false);
      setError("Join failed: "+String(e?.message||e).slice(0,60));
    }
  };

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[var(--bg)] px-6 overflow-auto" style={{ background: "linear-gradient(180deg,var(--chip-bg) 0%,var(--card-bg) 60%,var(--wash-top) 100%)" }}>
      <div className="w-full max-w-[360px] rounded-[28px] border bg-[var(--card-bg)] shadow-[0_18px_50px_rgba(0,0,0,0.10)] px-6 py-7 flex flex-col items-center" style={{ borderColor:"var(--border)" }}>
        {step==="welcome" && (
          <>
            <div className="h-12 w-12 rounded-full grid place-items-center bg-[#0A0A0A] text-white text-[20px] font-display">♥</div>
            <div className="mt-3 font-display text-[26px] font-semibold tracking-tight text-[#0A0A0A] text-center">Nylah</div>
            <div className="mt-1 text-[13px] text-[#6B5242] text-center leading-[1.4]">A private space for two. Shared calendar, chores, shopping, notes. No ads. Just you two.</div>
            <div className="mt-5 w-full space-y-2.5">
              <button onClick={()=> setStep("create_names")} className="w-full h-[52px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98] shadow-sm">Create our space</button>
              <button onClick={startJoin} className="w-full h-[48px] rounded-full bg-white border border-[var(--border)] text-[#2D2118] text-[13px] font-medium active:scale-[0.98]">I have a code</button>
            </div>
            <div className="mt-4 text-[11px] text-[#8B7357] text-center">For friends beta — invite only. Your data stays in your own household.</div>
            {hasAnyLegacyData() && <button onClick={()=> onComplete(getStoredHouseholdId()||"ash-ciaran-2026")} className="mt-2 text-[11px] underline text-[#6B5242]">I’m Aisling & Ciaran — keep our space</button>}
          </>
        )}
        {step==="create_names" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">What should we call you two?</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">These show up everywhere — on chips, calendar dots, notes.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">You</label>
                <input value={youName} onChange={e=> setYouName(e.target.value)} placeholder="e.g. Maya" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">Your partner</label>
                <input value={partnerName} onChange={e=> setPartnerName(e.target.value)} placeholder="e.g. Jon" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-[14px] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinueNames} onClick={startCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinueNames?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>Continue</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">You can change names later in Settings</div>
          </>
        )}
        {step==="create_pins" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("create_names")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Set your 4-digit PINs</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Each of you gets your own. This is your lock screen — fingerprint will be a quick tap on top of it.</div>
            </div>
            <div className="mt-4 w-full space-y-3">
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{youName||"You"}’s PIN</label>
                <input value={youPin} onChange={e=> setYouPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div>
                <label className="text-[11px] text-[#6B5242] font-medium">{partnerName||"Partner"}’s PIN</label>
                <input value={partnerPin} onChange={e=> setPartnerPin(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" placeholder="••••" className="mt-1 w-full rounded-[14px] border bg-white px-3 py-3 text-center text-[18px] tracking-[0.3em] outline-none" style={{borderColor:"var(--border)"}} />
              </div>
              <div className="text-[10px] text-[#8B7357]">Must be different. You can also set up fingerprint after — in Settings → Fingerprint.</div>
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B] w-full">{error}</div>}
            <button disabled={!canContinuePins} onClick={doCreate} className={"mt-5 w-full h-[48px] rounded-full text-[14px] font-semibold active:scale-[0.98] "+(canContinuePins?"bg-[#0A0A0A] text-white shadow-sm":"bg-[var(--chip-bg)] text-[#8B7357]")}>{creating?"Creating…":"Create our couple space"}</button>
          </>
        )}
        {step==="creating" && (
          <div className="py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] animate-pulse mx-auto grid place-items-center">♥</div>
            <div className="mt-3 text-[14px] font-medium text-[#2D2118]">Creating your private space…</div>
            <div className="mt-1 text-[11px] text-[#6B5242]">Generating invite code, saving your household</div>
          </div>
        )}
        {step==="share" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[#0A0A0A] text-white grid place-items-center">✓</div>
            <div className="mt-3 font-display text-[20px] font-semibold text-[#0A0A0A] text-center">You’re set!</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">Share this code with {partnerName||"your partner"} so they can join your space.</div>
            <div className="mt-4 w-full rounded-[20px] border bg-[var(--chip-bg)] px-4 py-4 text-center" style={{borderColor:"var(--border)"}}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#8B7357]">Invite code</div>
              <div className="mt-1 font-mono text-[28px] font-bold tracking-[0.18em] text-[#0A0A0A]">{inviteCode}</div>
              <div className="mt-1 text-[11px] text-[#6B5242]">nylah-{inviteCode?.toLowerCase()} • private to you two</div>
              <div className="mt-3 flex gap-2 justify-center">
                <button onClick={doCopyCode} className="h-[36px] rounded-full bg-white border border-[var(--border)] px-4 text-[11px] font-semibold">Copy code</button>
                <button onClick={doShare} className="h-[36px] rounded-full bg-[#0A0A0A] text-white px-4 text-[11px] font-semibold">Share link</button>
              </div>
            </div>
            {error && <div className="mt-2 text-[11px] text-[#6B5242]">{error}</div>}
            <button onClick={()=> onComplete(householdId)} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold active:scale-[0.98]">Continue to our space →</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Your partner can join anytime from their phone with the code. Until they join, you can use it solo.</div>
          </>
        )}
        {step==="join_code" && (
          <>
            <div className="w-full text-left">
              <button onClick={()=> setStep("welcome")} className="text-[11px] text-[#8B7357]">← Back</button>
              <div className="mt-2 font-display text-[20px] font-semibold text-[#0A0A0A]">Enter your invite code</div>
              <div className="mt-1 text-[12px] text-[#6B5242]">Your partner should have sent you a 6-letter code like ABC123.</div>
            </div>
            <input value={joinCode} onChange={e=> setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} placeholder="ABC123" className="mt-4 w-full rounded-[16px] border bg-white px-4 py-4 text-center font-mono text-[20px] tracking-[0.22em] outline-none" style={{borderColor:"var(--border)"}} autoFocus />
            {error && <div className="mt-2 text-[11px] text-[#991B1B] w-full text-center">{error}</div>}
            <button onClick={doJoinLookup} disabled={joining} className="mt-4 w-full h-[48px] rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold disabled:opacity-60 active:scale-[0.98]">{joining?"Looking up…":"Join our space"}</button>
            <div className="mt-2 text-[10px] text-[#8B7357] text-center">Codes are single-household private. If it’s expired, ask your partner to go to Settings → Share invite code and send a new one.</div>
          </>
        )}
        {step==="join_pick" && (
          <>
            <div className="h-10 w-10 rounded-full bg-[var(--chip-bg)] grid place-items-center text-[16px]">♥</div>
            <div className="mt-3 font-display text-[18px] font-semibold text-[#0A0A0A] text-center">Which one are you?</div>
            <div className="mt-1 text-[12px] text-[#6B5242] text-center">{joinMeta?.householdName||"You two"} — pick your name to link your phone.</div>
            <div className="mt-4 w-full space-y-2">
              {joinPersons.map((p:any)=> (
                <button key={p.key} onClick={()=> doJoinAs(p.key)} disabled={joining} className="w-full flex items-center gap-3 rounded-[16px] border bg-white px-4 py-3 text-left active:scale-[0.98]" style={{borderColor:"var(--border)"}}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--chip-bg)] text-[12px] font-bold">{p.initial||p.name?.slice(0,1).toUpperCase()}</span>
                  <span className="flex-1"><div className="text-[14px] font-medium">{p.name}</div><div className="text-[11px] text-[#6B5242]">Tap to join as {p.name}</div></span>
                  <span className="text-[11px] text-[#8B7357]">→</span>
                </button>
              ))}
            </div>
            {error && <div className="mt-3 text-[11px] text-[#991B1B]">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}


export function EventEditor(props: AddEventFormProps){
  // wrapper preserving exact classNames — This vs This and Future vs Entire series handled in parent CalendarScreen via edit series ask
  return <AddEventForm {...props} />;
}
export default EventEditor;
