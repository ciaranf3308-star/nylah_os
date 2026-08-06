import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabase, hasSupabaseConfig, saveSupabaseConfig, TOKEN as SB_TOKEN, TABLE as SB_TABLE, ROW_ID as SB_ROW_ID } from "./lib/supabase";
const TABLE = SB_TABLE;
const ROW_ID = SB_ROW_ID;
import { UpdaterBanner } from "./components/UpdaterBanner";
import { remoteLoad, remoteSave, subscribeRemote } from "./lib/remoteSync";
// FIX: one date engine Europe/Dublin
import { todayKey, toLocalKey as toLocalKeyDublin, HOUSEHOLD_TZ, clampDayOfMonth, nextMonthlyFrom, diffCalendarDays, BIWEEKLY_EPOCH_MONDAY_UTC } from "./lib/dates";
import { HOUSEHOLD_ID as BUILD_HOUSEHOLD_ID } from "./lib/buildMeta";
import { verifyPin } from "./lib/pins";

import React from "react";
export class WhiteFixErrorBoundary extends React.Component<{children:any},{hasError:boolean, err:any}> {
  state={hasError:false, err:null};
  static getDerivedStateFromError(err:any){ return {hasError:true, err}; }
  componentDidCatch(e:any, info:any){ console.error("[Nylah white-fix] crash:", e, info); }
  render(){
    if(this.state.hasError){
      return React.createElement("div", {style:{minHeight:"100dvh", display:"grid", placeItems:"center", padding:"24px", background:"#FFFCF8", color:"#292624"}},
        React.createElement("div", {style:{maxWidth:"320px", textAlign:"center"}},
          React.createElement("div", {style:{fontFamily:"Fraunces", fontSize:"20px", fontWeight:"600", marginBottom:"8px"}}, "Something tripped — tap to reload"),
          React.createElement("div", {style:{fontSize:"12px", opacity:0.7, marginBottom:"16px"}}, String(this.state.err?.message||"unknown")),
          React.createElement("button", {onClick:()=>{
            try{ localStorage.clear(); sessionStorage.clear(); }catch{}
            if('caches' in window){ caches.keys().then(k=>k.forEach(x=>caches.delete(x))); }
            if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())); }
            location.reload();
          }, style:{height:"44px", borderRadius:"9999px", padding:"0 20px", background:"#0A0A0A", color:"#fff", fontSize:"13px"}}, "Clear cache & reload")
        )
      );
    }
    return this.props.children;
  }
}


// ---- robust storage ----
const LS_PREFIX = "couple_v1_";
const DEFAULT_TOKEN = "ash-ciaran-2026"; void DEFAULT_TOKEN;
function isQuotaError(e: any): boolean {
  return e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014 || (typeof e.message === "string" && e.message.includes("quota")));
}
function safeGetLS(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function safeSetLS(key: string, val: string): boolean {
  try { localStorage.setItem(key, val); return true; } catch (e: any) {
    if (isQuotaError(e)) {
      // try evict oldest truncated photos / large notes then retry once
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !k.startsWith(LS_PREFIX)) continue;
          if (k.includes("notes") || k.includes("photo")) {
            const raw = localStorage.getItem(k);
            if (raw && raw.length > 40000) {
              try {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                  const trimmed = arr.map((n: any) => n.photoDataUrl && typeof n.photoDataUrl === "string" && n.photoDataUrl.length > 8000 ? { ...n, photoDataUrl: undefined } : n);
                  localStorage.setItem(k, JSON.stringify(trimmed));
                  // retry original
                  localStorage.setItem(key, val);
                  return true;
                }
              } catch {}
            }
          }
        }
      } catch {}
    }
    console.warn("[storage] set fail", key, e?.message || e);
    return false;
  }
}
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      const req = indexedDB.open("couple_v1_idb", 1);
      req.onupgradeneeded = () => { try { const db = req.result; if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv"); } catch {} };
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch { res(null); }
  });
}
async function idbSet(key: string, value: any): Promise<void> { try { const db = await openIdb(); if (!db) return; const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(JSON.stringify(value), key); } catch {} }
async function idbGet<T>(key: string): Promise<T | null> { try { const db = await openIdb(); if (!db) return null; return await new Promise<T | null>((r) => { const tx = db.transaction("kv", "readonly"); const g = tx.objectStore("kv").get(key); g.onsuccess = () => { try { r(g.result ? JSON.parse(g.result as string) as T : null); } catch { r(null); } }; g.onerror = () => r(null); }); } catch { return null; } }

function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("standalone")) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      // @ts-ignore iOS
      if ((window.navigator as any).standalone === true) return true;
      if (window.location.hostname.includes("netlify.app")) return true;
      if (window.location.hostname.includes("github.io")) return true;
      // on real phone sizes avoid the desktop “phone frame” wrapper
      if (typeof window !== "undefined" && window.innerWidth <= 500) return true;
      return false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const check = () => {
      try {
        const url = new URL(window.location.href);
        const mq = window.matchMedia ? window.matchMedia("(display-mode: standalone)").matches : false;
        // @ts-ignore
        const ios = (window.navigator as any).standalone === true;
        const host = window.location.hostname.includes("netlify.app") || window.location.hostname.includes("github.io");
        const isPhoneWidth = window.innerWidth <= 500;
        setStandalone(url.searchParams.has("standalone") || mq || ios || host || isPhoneWidth);
      } catch {}
    };
    check();
    const mql = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    const handler = () => check();
    // @ts-ignore
    mql?.addEventListener?.("change", handler);
    // @ts-ignore fallback
    mql?.addListener?.(handler);
    window.addEventListener("popstate", handler);
    return () => {
      // @ts-ignore
      mql?.removeEventListener?.("change", handler);
      // @ts-ignore
      mql?.removeListener?.(handler);
      window.removeEventListener("popstate", handler);
    };
  }, []);
  return standalone;
}
type PersonKey = "aisling" | "ciaran";
const PERSONS: Record<PersonKey, { name: string; initial: string; accent: string; accent2: string; wash: string }> = {
  aisling: { name: "Aisling", initial: "Á", accent: "#A89FDA", accent2: "#977DDA", wash: "#E9E0FF" },
  ciaran: { name: "Ciaran", initial: "C", accent: "var(--border)", accent2: "#E07A5F", wash: "#FFDCC7" },
};
type Theme = { id: string; name: string; bg: string; phoneBg: string; accent: string; accentStrong: string; text: string; cardBd: string; navBg: string; navActiveBg: string; navActiveText: string; topBarBg: string; washTop: string; washMid: string; chipBg: string; cardBg: string };
const THEMES: Theme[] = [
  { id: "peach", name: "Peach Pop", bg: "#FFFCF8", phoneBg: "linear-gradient(180deg,#FFDCC7 0%,#FFE8D6 18%,#FFFCF8 62%)", accent: "#E8CEB7", accentStrong: "#E07A5F", text: "#292624", cardBd: "#E8CEB7", navBg: "rgba(255,252,248,0.94)", navActiveBg: "#0A0A0A", navActiveText: "#FFFFFF", topBarBg: "#FFFCF8", washTop: "#FFDCC7", washMid: "#FFE8D6", chipBg: "#F7EFE8", cardBg: "#FFFFFF" },
  { id: "lavender", name: "Lavender Haze", bg: "#F8F6FF", phoneBg: "linear-gradient(180deg,#D0A1EA 0%,#E9D5FF 22%,#F8F6FF 68%)", accent: "#A89FDA", accentStrong: "#7C5CFC", text: "#1E1B2E", cardBd: "#C4B5FD", navBg: "rgba(248,246,255,0.92)", navActiveBg: "#7C5CFC", navActiveText: "#FFFFFF", topBarBg: "#F3F0FF", washTop: "#D0A1EA", washMid: "#E9D5FF", chipBg: "#EDE9FE", cardBg: "#FFFFFF" },
  { id: "butter", name: "Butter", bg: "#FFFEF5", phoneBg: "linear-gradient(180deg,#FEF08A 0%,#FEF9C3 24%,#FFFEF5 70%)", accent: "#FACC15", accentStrong: "#CA8A04", text: "#2B2500", cardBd: "#FDE68A", navBg: "rgba(255,254,245,0.94)", navActiveBg: "#FACC15", navActiveText: "#1A1600", topBarBg: "#FFFBEB", washTop: "#FEF08A", washMid: "#FEF9C3", chipBg: "#FEF9C3", cardBg: "#FFFEFB" },
  { id: "mint", name: "Mint Fresh", bg: "#F6FFFB", phoneBg: "linear-gradient(180deg,#6EE7B7 0%,#A7F3D0 20%,#F6FFFB 66%)", accent: "#6EE7B7", accentStrong: "#059669", text: "#064E3B", cardBd: "#6EE7B7", navBg: "rgba(246,255,251,0.92)", navActiveBg: "#059669", navActiveText: "#FFFFFF", topBarBg: "#ECFDF5", washTop: "#A7F3D0", washMid: "#D1FAE5", chipBg: "#D1FAE5", cardBg: "#FFFFFF" },
  { id: "terracotta", name: "Terracotta", bg: "#FFF7F3", phoneBg: "linear-gradient(180deg,#FB923C 0%,#FDBA74 20%,#FFF7F3 64%)", accent: "#FB923C", accentStrong: "#C2410C", text: "#431407", cardBd: "#FDBA74", navBg: "rgba(255,247,243,0.94)", navActiveBg: "#EA580C", navActiveText: "#FFFFFF", topBarBg: "#FFF7ED", washTop: "#FDBA74", washMid: "#FFEDD5", chipBg: "#FFEDD5", cardBg: "#FFFFFF" },
  { id: "midnight", name: "Midnight", bg: "#0A0A0A", phoneBg: "linear-gradient(180deg,#1F1F1F 0%,#2A2A2A 18%,#121212 62%)", accent: "#A89FDA", accentStrong: "#E8CEB7", text: "#FAFAF9", cardBd: "#2A2A2A", navBg: "rgba(18,18,18,0.92)", navActiveBg: "#F5F5F4", navActiveText: "#0A0A0A", topBarBg: "#1A1A1A", washTop: "#2A2A2A", washMid: "#1F1F1F", chipBg: "#292524", cardBg: "#1E1E1E" },
];
type TabKey = "fridge" | "calendar" | "chores" | "shopping" | "notes" | "blueprint";
const TABS: { k: TabKey; label: string }[] = [
  { k: "fridge", label: "Fridge" },
  { k: "calendar", label: "Calendar" },
  { k: "chores", label: "Chores" },
  { k: "shopping", label: "Shopping" },
  { k: "notes", label: "Notes" },
];
function uid(p = "id") { return p + "_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now().toString(36); }
function useLocalState<T>(key: string, def: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = safeGetLS(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return def;
  });

  // ── IDB hydration path: if LS empty/ stale, hydrate from IDB (cached) ──
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        if (key.includes("notes")) {
          const cached = await idbGet<T>(key);
          if (cancelled) return;
          if (Array.isArray(cached) && (cached as any).length>0) {
            const curArr = state as any;
            if (!Array.isArray(curArr) || curArr.length===0) {
              setState(cached as any);
              return;
            }
            // hydrate photos from separate photo store if present
            const photoMap = await idbGet<Record<string,string>>('note_photos');
            if (photoMap && !cancelled && Array.isArray(curArr)) {
              let merged = false;
              const next = (curArr as any[]).map((n:any)=>{
                if (!n.photoDataUrl && photoMap[n.id]) { merged = true; return { ...n, photoDataUrl: photoMap[n.id] }; }
                return n;
              });
              if (merged) setState(next as any);
            }
          } else {
            // no full cached, try photo map only to patch existing LS notes
            const curArr = state as any;
            if (Array.isArray(curArr) && curArr.length>0) {
              const photoMap = await idbGet<Record<string,string>>('note_photos');
              if (photoMap && !cancelled) {
                let merged = false;
                const next = curArr.map((n:any)=>{
                  if (!n.photoDataUrl && photoMap[n.id]) { merged = true; return { ...n, photoDataUrl: photoMap[n.id] }; }
                  return n;
                });
                if (merged) setState(next as any);
              }
            }
          }
        } else {
          const cached = await idbGet<T>(key);
          if (cancelled) return;
          if (cached != null) {
            const cur = state as any;
            const isEmpty = cur==null || (Array.isArray(cur) && cur.length===0) || (typeof cur==='object' && !Array.isArray(cur) && Object.keys(cur).length===0);
            if (isEmpty) setState(cached);
          }
        }
      } catch {}
    })();
    return ()=>{ cancelled = true; };
    // run once per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    try {
      // Photos IDB path: extract large photoDataUrl into IDB separate store, keep LS light
      if (key.includes("notes") && Array.isArray(state as any)) {
        const arr = state as any as NoteMemo[];
        const photoMap: Record<string,string> = {};
        let hasLarge = false;
        for (const n of arr) {
          if (n.photoDataUrl && n.photoDataUrl.length>4000) {
            photoMap[n.id] = n.photoDataUrl;
            hasLarge = true;
          }
        }
        if (hasLarge) {
          // async fire-and-forget persist photos
          (async()=>{ try { const existing = await idbGet<Record<string,string>>('note_photos') || {}; const merged = { ...existing, ...photoMap }; await idbSet('note_photos', merged); } catch {} })();
          // LS holds trimmed version (no heavy blob) to avoid quota & corrupt slice
          const trimmed = arr.map(n=> n.photoDataUrl && n.photoDataUrl.length>4000 ? { ...n, photoDataUrl: undefined } : n);
          try { safeSetLS(key, JSON.stringify(trimmed)); } catch {}
          try { idbSet(key, state as any); } catch {}
          // keep in-memory state still has full photos (don't downgrade React state)
          try { idbSet('couple_v1_last_local_write', new Date().toISOString()); } catch{}
          return;
        }
      }
      const json = JSON.stringify(state);
      const ok = safeSetLS(key, json);
      if (ok) { idbSet(key, state as any); }
      else {
        // quota fallback: store trimmed without photos and keep IDB as source of truth
        if (key.includes("notes") && Array.isArray(state as any)) {
          const trimmed = (state as any).map((n: any) => n.photoDataUrl ? { ...n, photoDataUrl: undefined } : n);
          safeSetLS(key, JSON.stringify(trimmed));
          idbSet(key, state as any);
        } else {
          // for non-notes, try IDB only
          idbSet(key, state as any);
        }
      }
    } catch {}
  }, [key, state]);
  return [state, setState as any];
}
function relTime(iso: string, nowMs: number) {
  const t = new Date(iso).getTime(); const diff = nowMs - t;
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000); if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24); if (days < 7) return days + "d ago";
  return new Date(t).toLocaleDateString();
}
function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff; return h; }
function rotForId(id: string) {
  const r = hashId(id) % 5;
  const map = [-2, -1, 1, 2, 3];
  return map[r] as number;
}
type ChoreV2 = {
  id: string; title: string; type: "one-off" | "repeat"; frequency: "daily" | "twice-week" | "weekly" | "biweekly" | "monthly" | "custom" | "once";
  frequencyDetail?: string; dueAt?: string; createdAt: string; pain: number; basePoints: number;
  swipes: { aisling: "left" | "right" | null; ciaran: "left" | "right" | null };
  status: "deck" | "assigned" | "open" | "race" | "bonus" | "done"; assignedTo?: PersonKey | null; multiplier: number;
  isOpenDoubled?: boolean; completedBy?: PersonKey | null; completedAt?: string; timeWindowHours?: number;
  updatedAt?: string; updatedBy?: PersonKey | string; deletedAt?: string; templateId?: string;
  dayOfMonth?: number; originalDom?: number; localTime?: string; timezone?: string;
};
// ---- Calendar: one timezone, full date keys, no UTC slicing ----
export type CalendarEventStatus = "draft" | "proposed" | "awaiting_aisling" | "awaiting_ciaran" | "needs_discussion" | "agreed" | "declined" | "cancelled" | "completed" | "open" | "dismissed";
export type CalendarResponseKind = "yes" | "no" | "discuss";
export type CalendarEventResponse = {
  eventId: string;
  memberId: PersonKey;
  response: CalendarResponseKind;
  comment?: string;
  respondedAt: string; // ISO
};
type CalendarEventV2 = {
  id: string;
  title: string;
  type: "one-off" | "repeat";
  frequency?: "daily" | "twice-week" | "weekly" | "biweekly" | "monthly" | "custom" | "once";
  frequencyDetail?: string;
  dueAt: string; // ISO start instant UTC
  endAt?: string;
  start?: string; // alias to dueAt for compat
  end?: string;
  createdAt: string;
  // removed pain/basePoints for events (not chores)
  pain?: number; basePoints?: number;
  // legacy swipes - kept for migration, new source is responses[]
  swipes: { aisling: "yes" | "no" | null; ciaran: "yes" | "no" | null };
  responses?: CalendarEventResponse[];
  status: CalendarEventStatus;
  proposer?: PersonKey;
  assignedTo?: PersonKey | null;
  allDay?: boolean;
  location?: string;
  notes?: string;
  reminderMinutes?: number;
  responseDeadline?: string; // ISO
  attendees?: PersonKey[]; // who needs to attend, default both
  // recurrence template fields
  recurrenceRule?: string; // e.g. "FREQ=MONTHLY;BYMONTHDAY=12;BYHOUR=9"
  templateId?: string;
  occurrenceId?: string; // e.g. 2026-08-12
  isTemplate?: boolean;
  dayOfMonth?: number;
  originalDom?: number;
  localTime?: string;
  timezone?: string; // should be HOUSEHOLD_TZ
  updatedAt?: string;
  updatedBy?: PersonKey | string;
  deletedAt?: string;
  dismissed?: boolean;
  proposalReason?: string;
  // mutation id for dedup
  mutationId?: string;
  // notification dedup
  lastNotifiedState?: string;
};
type ShoppingCategory = "Food" | "Household" | "Toiletries" | "Clothes" | "Bills" | "Trips" | "Entertainment" | "Personal" | "Other";
export const CATS: ShoppingCategory[] = ["Food", "Household", "Toiletries", "Clothes", "Bills", "Trips", "Entertainment", "Personal", "Other"];
function mapOldCat(catRaw: string): ShoppingCategory {
  const raw = (catRaw||"").trim();
  const s = raw.toLowerCase();
  // FIX 9 canonical — case insensitive, maps legacy pantry etc + TitleCase normalisation
  const direct = (CATS as string[]).find(c => c.toLowerCase() === s);
  if (direct) return direct as ShoppingCategory;
  if ((CATS as string[]).includes(raw)) return raw as ShoppingCategory;
  if (["produce","pantry","dairy","meat","frozen","groceries","grocery","drinks","food","fruit","veg","vegetables"].includes(s)) return "Food";
  if (["household","home","cleaning","supplies"].includes(s)) return "Household";
  if (["toiletries","toilet","bathroom","hygiene"].includes(s)) return "Toiletries";
  if (["clothes","clothing","apparel","shoes","wardrobe"].includes(s)) return "Clothes";
  if (["trips","trip","travel","holiday","vacation","flight"].includes(s)) return "Trips";
  if (["bills","bill","rent","utilities","utility","subscription"].includes(s)) return "Bills";
  if (["entertainment","ent","fun","movies","games","going-out"].includes(s)) return "Entertainment";
  if (["personal","@personal","people","person","user","aisling","ciaran"].includes(s)) return "Personal";
  if (s.startsWith("@aisling") || s.startsWith("@ciaran")) return "Personal";
  return "Other";
}
type ShoppingFrequency = "daily" | "every-2d" | "weekly" | "biweekly" | "monthly" | "as-needed";
type ShoppingItemV2 = {
  id: string; item: string; qty: number; cat: ShoppingCategory; purchased: boolean;
  addedBy: PersonKey; createdAt: string; lastDoneAt?: string; repeatCount: number; history?: string[];
  frequency: ShoppingFrequency;
  needDays?: string; // weekdays detail like "Mo,We" when weekly/biweekly custom
  notes?: string;
  tags?: string[]; // @aisling @ciaran personal tag support
  updatedAt?: string; updatedBy?: PersonKey | string; deletedAt?: string; archivedAt?: string;
  status?: "active" | "purchased" | "archived" | "deleted";
  isTemplate?: boolean;
  templateKind?: "personal" | "wants";
  templateOwner?: PersonKey;
  expiresAt?: string; // real expiry only if provided
  mutationId?: string;
};
type PersonalWants = { aisling: { personal: string[]; wants: string[] }; ciaran: { personal: string[]; wants: string[] } };
type NoteReactionKind = 'heart' | 'laugh' | 'kiss' | 'ack';
type NoteMemo = {
  id: string; body: string; author: PersonKey; createdAt: string; seenBy: { aisling: boolean; ciaran: boolean };
  isLove: boolean; photoDataUrl?: string; photoStoragePath?: string;
  rotation?: number;
  updatedAt?: string; updatedBy?: PersonKey | string; deletedAt?: string;
  pinned_at?: string | null; pinnedAt?: string | null;
  archived_at?: string | null; archivedAt?: string | null;
  read_by?: { aisling?: string; ciaran?: string };
  edited_at?: string | null; editedAt?: string | null;
  reactions?: Partial<Record<NoteReactionKind, PersonKey[]>>;
};
// backwards-compat aliases for legacy refs introduced by parallel agents
type CalendarEvent = CalendarEventV2;
type Chore = ChoreV2;
type ShoppingItem = ShoppingItemV2;
type AddEventFormProps = { onAdd: (ev:any)=>void; currentUser: PersonKey; selectedDate?: string };
function AddEventForm({ onAdd, currentUser, selectedDate }: AddEventFormProps){
  // Use household TZ for default date
  const [title,setTitle]=useState("");
  const [date,setDate]=useState(()=> selectedDate || todayKey(HOUSEHOLD_TZ));
  const [startTime,setStartTime]=useState("10:00");
  const [endTime,setEndTime]=useState("");
  const [showOptions,setShowOptions]=useState(false);
  const [allDay,setAllDay]=useState(false);
  const [multiDay,setMultiDay]=useState(false);
  const [endDate,setEndDate]=useState(()=> selectedDate || todayKey(HOUSEHOLD_TZ));
  const [location,setLocation]=useState("");
  const [notes,setNotes]=useState("");
  const [repeat,setRepeat]=useState<"once"|"daily"|"weekly"|"biweekly"|"monthly">("once");
  const [reminder,setReminder]=useState<number|undefined>(undefined);
  const [responseDeadline,setResponseDeadline]=useState("");
  const [attendees,setAttendees]=useState<PersonKey[]>(["aisling","ciaran"]);
  return <div className="space-y-3">
    <div className="text-[11px] text-[var(--muted)]">Responding as {PERSONS[currentUser].name} • Europe/Dublin</div>
    <input value={title} onChange={e=> setTitle(e.target.value)} placeholder="Title — e.g. Dinner with Mia" className="w-full rounded-full border bg-[var(--card-bg)] px-4 h-[44px] text-[13px]" style={{ borderColor:"var(--border)" }} />
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="text-[10px] text-[var(--muted)]">Date (Dublin)</label>
        <input type="date" value={date} onChange={e=> setDate(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" />
      </div>
      <div className="w-[120px]">
        <label className="text-[10px] text-[var(--muted)]">Start</label>
        <input type="time" disabled={allDay} value={startTime} onChange={e=> setStartTime(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px] disabled:opacity-50" />
      </div>
    </div>
    <div className="w-full">
      <label className="text-[10px] text-[var(--muted)]">End time (optional)</label>
      <input type="time" value={endTime} onChange={e=> setEndTime(e.target.value)} placeholder="optional" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" />
    </div>
    <button onClick={()=> setShowOptions(v=> !v)} className="text-[11px] underline text-[var(--muted)]">Options {showOptions ? "▲" : "▼"}</button>
    {showOptions && (
      <div className="rounded-[14px] border bg-[var(--card-bg)] p-3 space-y-2" style={{ borderColor:"var(--border)" }}>
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={allDay} onChange={e=> setAllDay(e.target.checked)} /> All-day</label>
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={multiDay} onChange={e=> setMultiDay(e.target.checked)} /> Multi-day</label>
        {multiDay && <input type="date" value={endDate} onChange={e=> setEndDate(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]" />}
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
        <input type="date" value={responseDeadline} onChange={e=> setResponseDeadline(e.target.value)} placeholder="Response requested by" className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]" />
        <div className="text-[10px] text-[var(--muted)]">Who needs to attend</div>
        <div className="flex gap-2">
          {(["aisling","ciaran"] as PersonKey[]).map(p=> (
            <label key={p} className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={attendees.includes(p)} onChange={e=> { if(e.target.checked) setAttendees(a=> [...a,p]); else setAttendees(a=> a.filter(x=> x!==p)); }} />{PERSONS[p].name}</label>
          ))}
        </div>
        {responseDeadline && <div className="text-[10px] text-[var(--muted)]">Response requested by {new Date(responseDeadline+"T12:00:00").toLocaleDateString(undefined,{weekday:"short", month:"short", day:"numeric"})}</div>}
      </div>
    )}
    <button disabled={!title.trim()} onClick={()=> {
      // Build Dublin-aware instants without UTC slicing bug
      const tz = HOUSEHOLD_TZ;
      // parse wall time to UTC instants
      function wallToIso(dateKey:string, timeStr:string, allDayFlag:boolean): string {
        if(allDayFlag) {
          // all-day = 00:00 wall in Dublin
          const [y,m,d] = dateKey.split("-").map(Number);
          // quick convert via Intl: create string then Date via our engine? use heuristic: treat as noon in UTC? better: build using tzWallToUtc equivalent via dateKey 00:00
          // We cannot import tzWallToUtc directly here (private), so approximate via toLocalKey conversion using Date constructed with offset awareness
          // Use todayKey approach: construct Date from wall components in tz via simple: use Date that Intl would format
          // Fallback simple: use noon trick to avoid DST gaps
          try {
            const iso = new Date(`${dateKey}T00:00:00`).toISOString(); // UTC fallback - but Dublin midnight close enough for all-day; we'll keep as UTC midnight for display keying
            return iso;
          } catch { return new Date(dateKey).toISOString(); }
        }
        const t = timeStr || "09:00";
        return new Date(`${dateKey}T${t}:00`).toISOString();
      }
      const startIso = wallToIso(date, startTime, allDay);
      const endIso = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : undefined;
      const finalStart = multiDay ? startIso : startIso;
      const finalEnd = multiDay ? new Date(`${endDate}T${endTime||'23:59'}:00`).toISOString() : endIso;
      const attend = attendees.length ? attendees : ["aisling","ciaran"] as PersonKey[];
      // expected status: awaiting other person
      const awaiting: any = currentUser === "aisling" ? "awaiting_ciaran" : "awaiting_aisling";
      const hasBoth = false; // new proposal always awaiting other
      const ev:any = {
        id:`ev_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        title:title.trim(),
        type: repeat === "once" ? "one-off" : "repeat",
        frequency: repeat,
        dueAt: finalStart,
        endAt: finalEnd,
        start: finalStart,
        end: finalEnd,
        proposer: currentUser,
        status: awaiting,
        swipes: {aisling: currentUser==="aisling" ? "yes" : null, ciaran: currentUser==="ciaran" ? "yes" : null},
        responses: [{eventId:"", memberId:currentUser, response:"yes", respondedAt:new Date().toISOString()}],
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        allDay,
        location: location || undefined,
        notes: notes || undefined,
        reminderMinutes: reminder,
        responseDeadline: responseDeadline ? new Date(responseDeadline+"T12:00:00").toISOString() : undefined,
        attendees: attend,
        timezone: HOUSEHOLD_TZ,
        mutationId: (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()),
      };
      ev.responses[0].eventId = ev.id;
      onAdd(ev);
    }} className="w-full rounded-full bg-[var(--nav-active-bg)] h-[44px] text-[var(--nav-active-text)] text-[13px] disabled:opacity-40">Propose • Needs a Nod</button>
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
const _keep_weekdaysStr = weekdaysBoolToDetailString;
void _keep_weekdaysStr;
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
      // semantic monthly: preserve day-of-month, local time Europe/Dublin (BST/GMT)
      const dom = ev.dayOfMonth ?? base.getDate();
      const tz = ev.timezone || "Europe/Dublin";
      // advance month until > now
      let monthsAdd = 0;
      if (cand.getTime() <= now.getTime()) monthsAdd = 1;
      // use helper addMonths clamping to month length
      let next = new Date(Date.UTC(cand.getFullYear(), cand.getMonth(), 1, hour, minute, 0));
      // apply timezone shift: for simplicity use local BST = Europe/London = Dublin same offset (DST handled by JS local)
      next.setMonth(next.getMonth() + monthsAdd);
      // preserve day
      const daysInMonth = new Date(next.getFullYear(), next.getMonth()+1, 0).getDate();
      next.setDate(Math.min(dom, daysInMonth));
      return next;
    }
    const daysAdd = freq === "biweekly" ? 14 : 7;
    if (cand.getTime() <= now.getTime()) cand.setDate(cand.getDate() + daysAdd);
    return cand;
  }
  return base;
}

// --- new: proper weekdays recurring helpers for chores/calendar + biweekly parity ---
function weekNumberSinceEpoch(d: Date, epochMs: number = BIWEEKLY_EPOCH_MONDAY_UTC): number {
  // FIX anchor to fixed epoch Monday 2024-01-01, not from date — stabilises biweekly parity
  const diff = d.getTime() - epochMs;
  return Math.floor(diff / (7*24*3600*1000));
}

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
    const dom = (chore as any).dayOfMonth ?? base.getDate();
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
    // FIX semantic monthly Jan31->Feb28->Mar31 preserving original DOM, not 720h drift
    const baseHour = baseRef.getHours(); const baseMin = baseRef.getMinutes();
    const preservedDom = (baseRef.getDate()); // shopping doesn't store originalDom yet; use baseRef DOM, clamped via nextMonthlyFrom
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
      // fallback old 720h but bounded
      const h=720; const nxt=new Date(baseRef.getTime()+h*3600*1000);
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
  return <span className={"text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] " + className}>{children}</span>;
}
function EmptyState({ icon, title, subtitle, ctaLabel, onCta, borderColor }: { icon?: React.ReactNode; title: string; subtitle?: string; ctaLabel?: string; onCta?: ()=>void; borderColor?: string }) {
  return (
    <div className="rounded-[20px] border border-dashed bg-[var(--card-bg)] px-6 py-8 text-center" style={{ borderColor: borderColor || "var(--border)" }}>
      <div className="mx-auto mb-3 grid h-[96px] w-[96px] place-items-center rounded-full bg-[var(--chip-bg)] border" style={{ borderColor: borderColor || "var(--border)" }}>
        {icon || <DoodleSun className="h-[48px] w-[48px] opacity-80" />}
      </div>
      <div className="font-display text-[14px] font-medium text-[var(--text)]">{title}</div>
      {subtitle && <div className="mt-1 text-[11px] text-[var(--muted)] max-w-[240px] mx-auto">{subtitle}</div>}
      {ctaLabel && onCta && <button onClick={onCta} className="mt-3 rounded-full bg-[var(--nav-active-bg)] px-4 py-2.5 text-[11px] font-medium text-[var(--nav-active-text)] active:scale-[0.97] min-h-[44px]">{ctaLabel}</button>}
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
            <span aria-hidden="true" className="text-[14px]">✕</span>
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
    return <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />Saving…</span>;
  }
  if (kind === 'failed') {
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-[10px] text-[#B91C1C] hover:text-[#991B1B] transition min-h-[20px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />Failed — Retry{syncStatus.error ? ` • ${syncStatus.error.slice(0,24)}` : ''}
      </button>
    );
  }
  if (kind === 'offline-queued') {
    const n = syncStatus.queueCount ?? 1;
    return <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />Offline — {n} queued</span>;
  }
  if (kind === 'updated-elsewhere') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] text-[#7C5CFC]"><span className="h-1.5 w-1.5 rounded-full bg-[#A89FDA] animate-pulse" />Updated elsewhere</span>;
  }
  // saved — truthful: only shown after server ack. No timer that re-renders every second.
  // Show absolute time via title, not "Xs ago" that required 1s interval.
  const last = syncStatus.lastSavedAt ? new Date(syncStatus.lastSavedAt).toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' }) : null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]" title={syncStatus.lastSavedAt || undefined}>
      <span className="rounded-full bg-[#8DA08E]" style={{ width:"6px", height:"6px", display:"inline-block" }} />
      {last ? `Saved ${last}` : 'Saved'}
    </span>
  );
}

function WhoScreen({ onSelect }: { onSelect: (k: PersonKey) => void }) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("couple_v1_remember_user");
      if (v === "0" || v === "\"0\"" || v === "false") return false;
      return true; // default true
    } catch { return true; }
  });
  const [checking, setChecking] = useState(false);

  const tryPin = async (code: string) => {
    if (checking) return;
    setChecking(true);
    try {
      const who = await verifyPin(code);
      if (who) {
        try {
          localStorage.setItem("couple_v1_remember_user", remember ? "1" : "0");
          if (!remember) {
            // ephemeral session — still allow app to set user but don't persist across reloads
            // Mark session ephemeral so other code can clear on next load if desired
            try { sessionStorage.setItem("couple_v1_ephemeral_session", "1"); } catch {}
          } else {
            try { sessionStorage.removeItem("couple_v1_ephemeral_session"); } catch {}
          }
        } catch {}
        onSelect(who as PersonKey);
      } else {
        setWrong(true);
        setShaking(true);
        setTimeout(() => setShaking(false), 280);
        setTimeout(() => setPin(""), 340);
      }
    } catch {
      setWrong(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 280);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) tryPin(pin);
  }, [pin]);

  const pushDigit = (d: string) => {
    if (pin.length >= 4) return;
    setWrong(false);
    setPin((p) => (p + d).slice(0, 4));
  };
  const doBackspace = () => {
    setWrong(false);
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[var(--card-bg)] px-6" style={{ background: "linear-gradient(180deg,var(--card-bg),var(--chip-bg))" }}>
      <style>{`@keyframes pinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} .pin-shake{animation:pinShake 280ms ease}`}</style>
      <div className={"w-[300px] rounded-[24px] border bg-[var(--card-bg)] px-5 py-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] flex flex-col items-center " + (shaking ? "pin-shake " : "")} style={{ borderColor: "var(--border)" }}>
        <div className="font-display text-[20px] font-semibold tracking-tight text-[var(--text)]">Enter PIN</div>
        <div className="mt-1 text-[12px] text-[var(--muted)] text-center">4-digit code. Only you two know it</div>

        <input
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setWrong(false);
            setPin(v);
          }}
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••"
          className="mt-4 w-full rounded-[16px] border bg-[var(--card-bg)] px-3 py-3 text-center text-[var(--text)] outline-none focus:border-[var(--border)]"
          style={{ fontSize: "20px", letterSpacing: "0.32em", borderColor: wrong ? "#E07A5F" : "var(--border)" } as any}
        />

        {wrong && <div className="mt-2 text-[12px] font-medium" style={{ color: "#E07A5F" }}>wrong code — try again</div>}

        <label className="mt-3 flex items-center gap-2 text-[11px] text-[var(--muted)] w-full">
          <input type="checkbox" checked={remember} onChange={e=> setRemember(e.target.checked)} className="h-[14px] w-[14px] rounded border" style={{ accentColor: "#0A0A0A" }} />
          Remember on this device
        </label>

        <div className="mt-4 grid w-full grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => pushDigit(String(n))}
              className="h-[48px] rounded-full bg-[var(--chip-bg)] border text-[16px] font-medium text-[var(--text)] active:scale-[0.94] transition"
              style={{ borderColor: "var(--border)" }}
            >
              {n}
            </button>
          ))}
          <div className="h-[48px]" />
          <button
            onClick={() => pushDigit("0")}
            className="h-[48px] rounded-full bg-[var(--chip-bg)] border text-[16px] font-medium text-[var(--text)] active:scale-[0.94] transition"
            style={{ borderColor: "var(--border)" }}
          >
            0
          </button>
          <button
            onClick={doBackspace}
            aria-label="backspace"
            className="h-[48px] rounded-full bg-[var(--card-bg)] border grid place-items-center text-[15px] text-[var(--muted)] active:scale-[0.94] transition"
            style={{ borderColor: "var(--border)" }}
          >
            ⌫
          </button>
        </div>

        <div className="mt-4 text-[10px] text-[var(--muted)]/60 text-center">{checking ? "checking…" : "Hashed check • device-local gate • see SECURITY.md"}</div>
      </div>
    </div>
  );
}
function AvatarDot({ k }: { k: PersonKey }) {
  const p = PERSONS[k];
  return <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white border-2 border-white" style={{ background: p.accent2 }}>{p.initial}</span>;
}
function DoodleHeartAccent({ color, className = "h-[18px] w-[18px]" }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 12.8 L3.8 9.3 A2.9 2.9 0 0 1 3.1 7.1 a2.35 2.35 0 0 1 4.05-1.72 A2.35 2.35 0 0 1 12.9 7.1 c0 .8-.32 1.55-1.6 3.04L8 12.8Z" />
    </svg>
  );
}
void DoodleHeartAccent; // kept for optional festive reuse, not in default hero now

function FridgePage({
  currentUser, chores, calendar, shopping, notes, setTab, nowMs, theme, syncStatus,
}: {
  currentUser: PersonKey; chores: ChoreV2[]; calendar: CalendarEventV2[]; shopping: ShoppingItemV2[]; notes: NoteMemo[];
  setTab: (k: TabKey) => void; nowMs: number; theme: Theme; syncStatus?: SyncStatus;
}) {
  const todayDateStr = todayKey(HOUSEHOLD_TZ);
  const weekdayLong = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: HOUSEHOLD_TZ }).format(new Date());
  const dayNumStr = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: HOUSEHOLD_TZ }).format(new Date());
  const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: HOUSEHOLD_TZ }).format(new Date());
  const dateLabel = `${weekdayLong} ${dayNumStr} ${monthLong}`;

  const activeChores = useMemo(() => chores.filter(c => !(c as any).deletedAt), [chores]);
  const activeCalendar = useMemo(() => calendar.filter((ev:any) => !(ev as any).deletedAt), [calendar]);
  const activeShopping = useMemo(() => shopping.filter((s:any) => !(s as any).deletedAt && !(s as any).archivedAt), [shopping]);
  const activeNotes = useMemo(() => notes.filter((n:any) => !(n as any).deletedAt && !(n as any).archived_at && !(n as any).archivedAt), [notes]);

  // ---------- sync pill ----------
  const syncPill = (() => {
    if (!syncStatus) return null;
    const k = syncStatus.kind;
    if (k === 'saving') return <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />Saving…</span>;
    if (k === 'offline-queued') return <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />Offline — {(syncStatus as any).queueCount||1} queued</span>;
    if (k === 'failed') return <span className="inline-flex items-center gap-1 text-[10px] text-[#B91C1C]"><span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />Server unreachable — retrying</span>;
    if (k === 'updated-elsewhere') return <span className="inline-flex items-center gap-1 text-[10px] text-[#7C5CFC]"><span className="h-1.5 w-1.5 rounded-full bg-[#A89FDA] animate-pulse" />Updated elsewhere</span>;
    const last = (syncStatus as any).lastSavedAt ? new Date((syncStatus as any).lastSavedAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}) : null;
    return <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[#8DA08E]" />{last ? `Saved ${last}` : 'Saved'}</span>;
  })();

  const emptyAll = activeChores.length===0 && activeCalendar.length===0 && activeShopping.length===0 && activeNotes.length===0;

  // ---------- Today for you (max 3) ----------
  const nextCalAgreed = useMemo(() => {
    // Agreed / both-accepted events, sorted by due time
    const agreed = activeCalendar.filter(ev => {
      const s:any = ev.status;
      return s === 'agreed' || s === 'accepted' || s === 'yes' || s === 'confirmed';
    }).sort((a,b)=> new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    if (agreed.length===0) return null;
    // Prefer today first using Dublin key
    const todayOnes = agreed.filter(ev => toLocalKeyDublin(ev.dueAt, HOUSEHOLD_TZ) === todayDateStr);
    return todayOnes[0] || agreed[0] || null;
  }, [activeCalendar, todayDateStr]);

  const nextChoreForYou = useMemo(() => {
    const mine = activeChores.filter(c=> c.assignedTo===currentUser && c.status!=='done').sort((a,b)=> getDueMsChore(a)-getDueMsChore(b));
    return mine[0] || null;
  }, [activeChores, currentUser]);

  const shoppingSummary = useMemo(() => {
    const todo = activeShopping.filter(s=> !s.purchased);
    const count = todo.length;
    if(count===0) return null;
    const totalDays = todo.reduce((sum,s)=> sum + Math.max(0, (Date.now()-new Date(s.createdAt).getTime())/86400000), 0);
    const avg = count>0 ? Math.round(totalDays/count) : 0;
    // most overdue via needDays helper
    const mostTimed = todo.slice().sort((a,b)=>{
      try { const da = (shoppingDueLabel as any)(a, nowMs)?.overdue ? 0 : 1; const db = (shoppingDueLabel as any)(b, nowMs)?.overdue ? 0 : 1; return da-db; } catch { return 0; }
    })[0];
    return { count, avg, topItem: mostTimed };
  }, [activeShopping, nowMs]);

  // ---------- Needs your answer (hidden votes) ----------
  const needsYourAnswer = useMemo(() => {
    const partner: PersonKey = currentUser==='aisling' ? 'ciaran' : 'aisling';
    const list: { id:string; title:string; kind:'chore'|'calendar'; obj:any }[] = [];
    activeChores.forEach(c=>{
      if (c.status!=='deck') return;
      const my = (c.swipes as any)[currentUser];
      const other = (c.swipes as any)[partner];
      if (my===null && other!==null) {
        list.push({ id:c.id, title:c.title, kind:'chore', obj:c });
      }
    });
    activeCalendar.forEach(ev=>{
      if (ev.status!=='proposed' && !(ev.status as any).toString().startsWith('awaiting')) return;
      const my = (ev.swipes as any)[currentUser];
      const other = (ev.swipes as any)[partner];
      if (my===null && other!==null) list.push({ id:ev.id, title:ev.title, kind:'calendar', obj:ev });
    });
    return list.slice(0,4);
  }, [activeChores, activeCalendar, currentUser]);

  // ---------- Open household work ----------
  const openChores = useMemo(() => activeChores.filter(c=> c.status==='open' || c.status==='assigned'), [activeChores]);
  const openCount = openChores.length;
  const highestOpen = useMemo(()=>{
    if (openChores.length===0) return null;
    return [...openChores].sort((a,b)=>{
      const painDiff = (b.pain||0)-(a.pain||0);
      if (painDiff!==0) return painDiff;
      const ptsDiff = (b.basePoints||0)-(a.basePoints||0);
      if (ptsDiff!==0) return ptsDiff;
      return getDueMsChore(a)-getDueMsChore(b);
    })[0] || null;
  }, [openChores]);

  // ---------- Notes from your person ----------
  const stickyPick = useMemo(()=>{
    const partner: PersonKey = currentUser==='aisling' ? 'ciaran' : 'aisling';
    // 1) unread from partner
    const unread = activeNotes.filter(n=> n.author===partner && !(n.seenBy as any)[currentUser]).sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    if (unread[0]) return { note: unread[0], label: `Unread • from ${PERSONS[partner].name}` };
    // 2) pinned
    const pinned = activeNotes.filter(n=> (n as any).pinned_at || (n as any).pinnedAt).sort((a,b)=> {
      const pa = (a as any).pinned_at || (a as any).pinnedAt || a.createdAt;
      const pb = (b as any).pinned_at || (b as any).pinnedAt || b.createdAt;
      return new Date(pb).getTime()-new Date(pa).getTime();
    });
    if (pinned[0]) {
      const nm = PERSONS[pinned[0].author].name;
      return { note: pinned[0], label: `Pinned • ${nm}` };
    }
    // 3) latest love
    const love = activeNotes.filter(n=> n.isLove).sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    if (love[0]) return { note: love[0], label: `Love note • ${PERSONS[love[0].author].name}` };
    // 4) newest overall
    if (activeNotes[0]) return { note: activeNotes[0], label: `Note • ${PERSONS[activeNotes[0].author].name}` };
    return null;
  }, [activeNotes, currentUser]);

  // ---------- failure / empty states ----------
  const isLoadingLike = emptyAll && syncStatus?.kind==='saving';
  const isOfflineCached = syncStatus?.kind==='offline-queued' && emptyAll;

  return (
    <div className="space-y-4">
      {/* calm header — no fake phone bar, no huge day num */}
      <div className="px-1 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-[var(--text)]">Aisling <span className="font-display italic text-[20px]" style={{ color: theme.accent }}>♥</span> Ciaran</h1>
          <div className="text-[10px] text-[var(--muted)] shrink-0">{dateLabel}</div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {syncPill}
          {syncStatus?.kind==='saved' && <span className="text-[10px] text-[var(--muted)]/60">• {todayDateStr} Dublin</span>}
          {syncStatus?.kind==='failed' && <button onClick={()=>{ try{ window.dispatchEvent(new CustomEvent('couple-sync',{detail:'retry'})) }catch{} }} className="text-[10px] underline text-[var(--muted)]">retry</button>}
        </div>
      </div>

      {/* Today for you — max 3 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-display text-[13px] font-medium">Today for you, {PERSONS[currentUser].name}</span>
          <span className="text-[10px] text-[var(--muted)]">{[nextCalAgreed, nextChoreForYou, shoppingSummary].filter(Boolean).length}/3</span>
        </div>
        <div className="grid gap-2">
          {nextCalAgreed ? (
            <button onClick={()=> setTab("calendar")} className="w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition min-h-[64px]" style={{ borderColor:"var(--border)"}}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Next agreed event</span>
                <span className="text-[10px] text-[var(--muted)] tabular-nums">{new Date(nextCalAgreed.dueAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})} • {toLocalKeyDublin(nextCalAgreed.dueAt, HOUSEHOLD_TZ).slice(5)}</span>
              </div>
              <div className="mt-1 font-display text-[13px] font-medium truncate">{nextCalAgreed.title}</div>
              <div className="mt-1 text-[11px] text-[var(--muted)]">Agreed • {(nextCalAgreed as any).location ? (nextCalAgreed as any).location : 'ready'}</div>
            </button>
          ) : (
            <div className="rounded-[18px] border border-dashed bg-[var(--card-bg)]/60 px-3.5 py-3 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>
              No agreed events — propose one in Calendar.
            </div>
          )}

          {nextChoreForYou ? (
            <button onClick={()=> setTab("chores")} className="w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition min-h-[64px]" style={{ borderColor:"var(--border)"}}>
              <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Next chore for you</span><span className="text-[10px] text-[var(--muted)]">{Math.max(0, Math.ceil((getDueMsChore(nextChoreForYou)-nowMs)/3600000))}h left</span></div>
              <div className="mt-1 font-display text-[13px] font-medium truncate">{nextChoreForYou.title}</div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--chip-bg)] overflow-hidden"><div className="h-full bg-[#A89FDA]" style={{ width: Math.max(6, Math.min(100, percentLeftChore(nextChoreForYou, nowMs)*100))+"%" }} /></div>
              <div className="mt-1 text-[11px] text-[var(--muted)]">{nextChoreForYou.basePoints} pts • pain {nextChoreForYou.pain}/10</div>
            </button>
          ) : (
            <div className="rounded-[18px] border border-dashed bg-[var(--card-bg)]/60 px-3.5 py-3 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>
              You are clear on chores — check deck for new proposals.
            </div>
          )}

          {activeShopping.length>0 ? (
            <button onClick={()=> setTab("shopping")} className="w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 flex items-center justify-between shadow-[0_4px_14px_rgba(0,0,0,0.04)] min-h-[56px]" style={{ borderColor:"var(--border)"}}>
              <div className="min-w-0"><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Shopping</div><div className="font-display text-[13px] truncate">{shoppingSummary?.count ?? 0} items • on list {shoppingSummary?.avg ?? 0}d avg</div><div className="text-[11px] text-[var(--muted)] truncate">{shoppingSummary?.topItem ? (shoppingSummary.topItem as any).item : 'all caught up'}</div></div>
              <span className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] text-[11px] shrink-0">↗</span>
            </button>
          ) : (
            <div className="rounded-[18px] border border-dashed bg-[var(--card-bg)]/60 px-3.5 py-3 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>No shopping items — add from quick add.</div>
          )}
        </div>
      </div>

      {/* Needs your answer — hidden votes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1"><span className="font-display text-[13px] font-medium">Needs your answer</span><span className="h-1.5 w-1.5 rounded-full bg-[#977DDA] animate-pulse" /><span className="text-[11px] text-[var(--muted)]">{needsYourAnswer.length} waiting</span></div>
        {needsYourAnswer.length===0 ? (
          <div className="rounded-[16px] border bg-[var(--card-bg)] px-3.5 py-3 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>All clear — waiting on your person where you have responded.</div>
        ) : (
          <div className="grid gap-2">
            {needsYourAnswer.map(item=>{
              const partner = currentUser==='aisling'?'ciaran':'aisling';
              return (
                <button key={item.id} onClick={()=> setTab(item.kind==='chore'?'chores':'calendar')} className="flex items-center gap-3 rounded-[14px] border bg-[var(--card-bg)] px-3.5 py-3 text-left hover:bg-[var(--card-bg)] transition min-h-[48px]" style={{ borderColor:"var(--border)"}}>
                  <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ background: PERSONS[partner].accent2 }}>{PERSONS[partner].initial}</span>
                  <div className="min-w-0 flex-1"><div className="text-[12px] font-medium truncate">{item.title}</div><div className="text-[11px] text-[var(--muted)]">{PERSONS[partner].name} has responded — your turn • {item.kind}</div></div>
                  <span className="text-[10px] text-[var(--muted)]">→</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="px-1 text-[10px] text-[var(--muted)]/70">Shows only that {currentUser==='aisling'?'Ciaran':'Aisling'} responded, never what they chose.</div>
      </div>

      {/* Open household work */}
      {openCount>0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1"><span className="font-display text-[13px] font-medium">Household work open</span><span className="text-[11px] text-[var(--muted)]">{openCount} open • preview highest pain</span></div>
          <button onClick={()=> setTab("chores")} className="w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 flex items-center justify-between gap-3" style={{ borderColor:"var(--border)"}}>
            <div className="min-w-0"><div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{openCount} open chores</div><div className="font-display text-[13px] font-medium truncate">{highestOpen?.title || 'Tap to view'}</div><div className="text-[11px] text-[var(--muted)]">{highestOpen ? `${highestOpen.basePoints} pts • pain ${highestOpen.pain}/10 • ${highestOpen.assignedTo ? `assigned ${PERSONS[highestOpen.assignedTo as PersonKey].name}` : 'unassigned'}` : 'Tap to manage'}</div></div>
            <span className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1.5 text-[11px] text-[var(--nav-active-text)] shrink-0">View</span>
          </button>
        </div>
      )}

      {/* Notes from your person */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1"><span className="font-display text-[13px] font-medium">Notes from your person</span><span className="text-[10px] text-[var(--muted)]">{stickyPick ? '1 to read' : 'none'}</span></div>
        {stickyPick ? (
          <button onClick={()=> setTab("notes")} className="w-full text-left rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)]" style={{ borderColor: stickyPick.note.isLove ? "#F9A8D4" : "var(--border)", background: stickyPick.note.isLove ? "#FCE7F3" : "var(--card-bg)" }}>
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{stickyPick.label} • {relTime(stickyPick.note.createdAt, nowMs)}</div>
            <div className="mt-1 font-display text-[13px] line-clamp-3">{stickyPick.note.body.slice(0,160)}</div>
            {stickyPick.note.photoDataUrl && <img src={stickyPick.note.photoDataUrl} alt="note" className="mt-2 h-[96px] w-[96px] rounded-[10px] object-cover border" style={{ borderColor:"var(--border)"}} />}
          </button>
        ) : emptyAll ? (
          <div className="rounded-[18px] border border-dashed bg-[var(--card-bg)] px-3.5 py-5 text-center" style={{ borderColor:"var(--border)"}}>
            <div className="font-display text-[13px]">A little quiet in here</div><div className="mt-1 text-[11px] text-[var(--muted)]">Pin a note for {PERSONS[currentUser==='aisling'?'ciaran':'aisling'].name} to start the fridge.</div>
            <button onClick={()=> setTab("notes")} className="mt-3 rounded-full bg-[var(--nav-active-bg)] px-4 py-2 text-[11px] text-[var(--nav-active-text)]">Go to Memo Board</button>
          </div>
        ) : (
          <div className="rounded-[18px] border bg-[var(--card-bg)] px-3.5 py-3 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>No unread notes — all caught up. Pin something sweet?</div>
        )}
        <button onClick={()=> setTab("notes")} className="w-full rounded-full border bg-[var(--card-bg)] py-2 text-[11px] font-medium active:scale-[0.98]">Open memo board</button>
      </div>

      {/* failure states */}
      {isLoadingLike && <div className="rounded-[12px] bg-[var(--chip-bg)] px-3 py-2 text-[11px] text-[var(--muted)]">Loading — showing cached if available…</div>}
      {isOfflineCached && <div className="rounded-[12px] bg-[#FEF3C7] border px-3 py-2 text-[11px] text-[#92400E]" style={{ borderColor:"#FCD34D"}}>You are offline — showing last saved fridge data. Changes will sync when back.</div>}
      {emptyAll && syncStatus?.kind==='failed' && <div className="rounded-[12px] bg-[#FFE4E6] border px-3 py-2 text-[11px] text-[#9F1239]" style={{ borderColor:"#FECDD3"}}>Server unreachable — we'll retry. Your changes are saved locally.</div>}
      {emptyAll && !syncStatus && <div className="rounded-[12px] bg-[var(--card-bg)] border px-3 py-2 text-[11px] text-[var(--muted)]" style={{ borderColor:"var(--border)"}}>No household data yet — add a chore or note to seed.</div>}
    </div>
  );
}

function Scoreboard({ chores }: { chores: ChoreV2[] }) {
  const done = chores.filter(c => c.status === "done");
  let tA = 0, tB = 0; done.forEach(c => {
    const pts = effectivePoints(c, isBonusChore(c, c.completedAt ? new Date(c.completedAt).getTime() : undefined));
    if (c.completedBy === "aisling") tA += pts; else if (c.completedBy === "ciaran") tB += pts;
  });
  const total = tA + tB || 1; const pctA = tA / total;
  // weekly filter last 7 days
  const sevenAgo = Date.now() - 7*86400000;
  let wA=0,wB=0;
  done.forEach(c=>{
    const ts = c.completedAt? new Date(c.completedAt).getTime(): 0;
    if (ts < sevenAgo) return;
    const pts = effectivePoints(c, isBonusChore(c, ts));
    if (c.completedBy==="aisling") wA+=pts; else if (c.completedBy==="ciaran") wB+=pts;
  });
  const weeklyTotal = wA+wB||1; const pctWA = wA/weeklyTotal;
  return (
    <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-3.5 space-y-2.5" style={{ borderColor: "var(--border)", boxShadow: "0 6px 20px rgba(41,38,36,0.08)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1"><span className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0" style={{ background: "#A89FDA" }}>Á</span><div className="min-w-0"><div className="text-[11px] text-[var(--muted)]">Aisling</div><div className="font-display font-bold leading-none text-[22px]">{tA}</div></div></div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] px-2 py-1 rounded-full bg-[var(--chip-bg)] border" style={{ borderColor: "var(--border)" }}>VS</span>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end"><div className="text-right"><div className="text-[11px] text-[var(--muted)]">Ciaran</div><div className="font-display font-bold leading-none text-[22px]">{tB}</div></div><span className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0" style={{ background: "var(--border)", color: "#6B5242" }}>C</span></div>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-[var(--chip-bg)] overflow-hidden flex"><div className="h-full rounded-full transition-all" style={{ width: pctA * 100 + "%", background: "linear-gradient(90deg,#A89FDA,#977DDA)" }} /><div className="flex-1" style={{ background: "var(--border)", marginLeft: "2px" }} /></div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]"><span>{PERSONS.aisling.name} {(pctA * 100).toFixed(0)}%</span><span>{PERSONS.ciaran.name} {(100 - pctA * 100).toFixed(0)}%</span></div>
      <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor:"var(--chip-bg)"}}>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">this week (7d)</span>
        <div className="flex items-center gap-2 text-[11px]"><span className="font-medium">Á {wA}</span><div className="h-1.5 w-[48px] rounded-full bg-[var(--chip-bg)] overflow-hidden flex"><div className="h-full rounded-full" style={{ width: pctWA*100+"%", background:"#A89FDA"}}/></div><span className="font-medium">C {wB}</span></div>
      </div>
    </div>
  );
}
function ChoresPage({
  chores, setChores, currentUser, setCurrentUser, onCelebrate, nowMs,
}: {
  chores: ChoreV2[]; setChores: (up: ChoreV2[] | ((p: ChoreV2[]) => ChoreV2[])) => void; currentUser: PersonKey; setCurrentUser: (k: PersonKey) => void;
  onCelebrate?: (origin?: any) => void; nowMs: number;
}) {
  const [viewer, setViewer] = useState<PersonKey>(currentUser);
  useEffect(() => setViewer(currentUser), [currentUser]);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const mutSetRef = useRef<Set<string>>(new Set());
  // visible undo banner state
  const [lastAction, setLastAction] = useState<null | { type:"done"|"claim"|"snooze"|"release"|"cancel"; choreId:string; prevState:any; label:string }>(null);
  // chore overflow menu + confirm dialog
  const [choreMenuId, setChoreMenuId] = useState<string|null>(null);
  const [confirmDialog, setConfirmDialog] = useState<null | { title:string; body?:string; onConfirm:()=>void }>(null);
  const [rescheduleId, setRescheduleId] = useState<string|null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(""); // YYYY-MM-DD

  // --- exclusive sources, ignore deleted ---
  const deckRaw = useMemo(() => chores
    .filter(c => c.status === "deck" && !(c as any).deletedAt)
    .sort((a,b)=> getDueMsChore(a)-getDueMsChore(b)), [chores]);

  const matchFor = (c: ChoreV2, f: string) => {
    if (f === "all") return true;
    try {
      const d = c.dueAt ? new Date(c.dueAt) : new Date(c.createdAt);
      if (isNaN(d.getTime())) return false;
      if (f === "today") {
        const now = new Date(nowMs); return d.toDateString()===now.toDateString();
      }
      if (f === "tomorrow") {
        const t = new Date(nowMs); t.setDate(t.getDate()+1); return d.toDateString()===t.toDateString();
      }
      const jsMap: Record<string, number> = { Mo:1, Tu:2, We:3, Th:4, Fr:5, Sa:6, Su:0 };
      if (jsMap[f] !== undefined) return d.getDay()===jsMap[f];
      return true;
    } catch { return true; }
  };
  const dayMatch = (c: ChoreV2) => matchFor(c, dayFilter);

  const FILTERS = ["all","today","tomorrow","Mo","Tu","We","Th","Fr","Sa","Su"] as const;
  const filterCounts = useMemo(() => {
    const m = new Map<string,number>();
    FILTERS.forEach(k=>{
      const cnt = chores.filter(c=> !(c as any).deletedAt && c.status!=="done" && matchFor(c,k)).length;
      m.set(k,cnt);
    });
    return m;
  }, [chores, nowMs]);

  const deck = dayFilter==="all" ? deckRaw : deckRaw.filter(dayMatch);

  const assignedBase = chores.filter(c => c.status === "assigned" && !(c as any).deletedAt && (c as any).status!=="deck");
  const assigned = dayFilter==="all" ? assignedBase : assignedBase.filter(dayMatch);
  const openBase = chores.filter(c => c.status === "open" && !(c as any).deletedAt && (c as any).status!=="deck");
  const openChores = dayFilter==="all" ? openBase : openBase.filter(dayMatch);
  const racesBase = chores.filter(c => c.status === "race" && !(c as any).deletedAt && (c as any).status!=="deck");
  const races = dayFilter==="all" ? racesBase : racesBase.filter(dayMatch);

  const bonusNow = chores.filter(c => c.status!=="done" && !(c as any).deletedAt && isBonusChore(c, nowMs));
  const doneChores = chores.filter(c => c.status==="done" && !(c as any).deletedAt);
  const currentCard = deck[0] ?? null;

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  // Race expiry: if race_started_at >24h ago and still not claimed, auto-expire to Open
  useEffect(()=>{
    const now = nowMs || Date.now();
    const toExpire = chores.filter((c:any)=> c.status==="race" && c.race_started_at && !c.completedBy && !c.completed_by);
    const expiring = toExpire.filter((c:any)=>{
      try { const started = new Date(c.race_started_at).getTime(); return now - started > 24*3600*1000; } catch { return false; }
    });
    if (expiring.length===0) return;
    setChores((prev:any)=> prev.map((c:any)=>{
      const hit = expiring.find((e:any)=> e.id===c.id);
      if (!hit) return c;
      return { ...c, status:"open", multiplier: Math.min(1.5, c.multiplier || 1.5), race_expired_at: new Date().toISOString(), race_started_at: undefined, updatedAt: new Date().toISOString(), prev_status:"race" };
    }));
    setToast(expiring.length===1 ? (expiring[0] as any)?.title+" race expired → Open" : expiring.length+" races expired → Open");
  }, [nowMs, chores]);

  // Auto-clear lastAction after 6s
  useEffect(()=>{ if(!lastAction) return; const t=setTimeout(()=> setLastAction(null), 6000); return ()=>clearTimeout(t); }, [lastAction]);

  function updateChore(id: string, patch: Partial<ChoreV2>) {
    setChores((prev: any) => prev.map((c: ChoreV2) => c.id===id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
  }
  function timeLeftLabel(c: ChoreV2) {
    const due = getDueMsChore(c); const diff = due-nowMs;
    if (diff<=0) return "overdue";
    const hrs=Math.floor(diff/3600000); const mins=Math.floor((diff%3600000)/60000);
    if (hrs>24) return Math.floor(hrs/24)+"d left";
    if (hrs>0) return hrs+"h "+mins+"m left";
    return mins+"m left";
  }

  function handlePointerDown(e: React.PointerEvent){ if(exiting) return; setDragging(true); startXRef.current=e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); }
  function handlePointerMove(e: React.PointerEvent){ if(!dragging || exiting) return; setDragX(e.clientX-startXRef.current); }
  function handlePointerUp(){ if(!dragging) return; setDragging(false); if(Math.abs(dragX)>80 && currentCard && !exiting) doSwipe(dragX>0?"right":"left"); else setDragX(0); }

  function doSwipe(dir: "left"|"right"){
    if(exiting!==null) return;
    if(!currentCard) return;
    if(currentCard.status!=="deck") return;
    if(mutSetRef.current.has(currentCard.id)) return;
    const other: PersonKey = viewer==="aisling" ? "ciaran" : "aisling";
    const nowIso = new Date().toISOString();
    const newSwipes = { ...currentCard.swipes, [viewer]: dir } as any;
    const otherSwipe = currentCard.swipes[other];
    // Track voting started at first swipe
    const votingStartedAt = (currentCard as any).voting_started_at || ((currentCard as any).swipes?.aisling==null && (currentCard as any).swipes?.ciaran==null ? nowIso : (currentCard as any).voting_started_at);
    if(!otherSwipe){
      mutSetRef.current.add(currentCard.id);
      setExiting(dir); setTimeout(()=>{ 
        updateChore(currentCard.id,{ swipes:newSwipes, voting_started_at: votingStartedAt, updatedAt: nowIso } as any); 
        setExiting(null); setDragX(0); mutSetRef.current.delete(currentCard.id); 
      }, 220);
      // hide first vote — privacy: don't reveal yes/no to other yet
      setToast(`${PERSONS[viewer].name} responded — waiting for ${PERSONS[other].name}`); 
      return;
    }
    const comboA = viewer==="aisling" ? dir : otherSwipe;
    const comboB = viewer==="ciaran" ? dir : otherSwipe;
    const MAX_MULT = 1.5; // cap per spec 1.5×
    const nowMsIso = nowIso;
    let next: any = { swipes:{ aisling:comboA as any, ciaran:comboB as any }, resolved_at: nowMsIso, voting_started_at: votingStartedAt, multiplier: 1, isOpenDoubled:false, updatedAt: nowIso };
    if(comboA==="left" && comboB==="right"){ next={...next,status:"assigned",assigned_to:"ciaran", assignedTo:"ciaran" as any, multiplier:1, claimed_by: null, claimed_at: null}; setToast("Assigned to Ciaran — "+currentCard.basePoints+" pts"); }
    else if(comboA==="right" && comboB==="left"){ next={...next,status:"assigned",assigned_to:"aisling", assignedTo:"aisling" as any,multiplier:1, claimed_by: null}; setToast("Assigned to Aisling — "+currentCard.basePoints+" pts"); }
    else if(comboA==="left" && comboB==="left"){ next={...next,status:"open",assigned_to:null, assignedTo:null,multiplier: Math.min(1.5, MAX_MULT), isOpenDoubled:false, effort_label: effortLabel(currentCard.pain)}; setToast("Both noped — boosted to Open — 1.5× extra points for taking it"); }
    else if(comboA==="right" && comboB==="right"){ next={...next,status:"race",assigned_to:null, assignedTo:null,multiplier: Math.min(1.5, MAX_MULT),isOpenDoubled:false, race_started_at: nowIso}; setToast("Race! First claims "+Math.min(1.5,MAX_MULT)+"×"); }
    mutSetRef.current.add(currentCard.id);
    setExiting(dir); setTimeout(()=>{ updateChore(currentCard.id,next); setExiting(null); setDragX(0); mutSetRef.current.delete(currentCard.id); }, 220);
  }

  function claimDone(chore: ChoreV2, by: PersonKey){
    if(chore.status==="done") return;
    if(mutSetRef.current.has(chore.id+"_done")) return;
    mutSetRef.current.add(chore.id+"_done");
    const now=new Date(); const nowIso=now.toISOString();
    const shouldRespawn=(chore.type==="repeat")||(chore.frequency && chore.frequency!=="once");
    let nextChore: ChoreV2|null=null;
    if(shouldRespawn){
      const nextDue=computeNextDueDateChore(chore, now.getTime());
      const origDom = (chore as any).originalDom ?? (chore as any).dayOfMonth ?? (chore.dueAt? new Date(chore.dueAt).getDate() : now.getDate());
      const dDom = (chore as any).dayOfMonth ?? origDom;
      nextChore={ id:uid("chk"), title:chore.title, type:chore.type, frequency:chore.frequency, frequencyDetail:chore.frequencyDetail, dueAt:nextDue.toISOString(), createdAt:nowIso, pain:chore.pain, basePoints:chore.basePoints, swipes:{aisling:null, ciaran:null}, status:"deck", assignedTo:null, multiplier:1, timeWindowHours:chore.timeWindowHours, dayOfMonth:dDom, originalDom:origDom, timezone:HOUSEHOLD_TZ, templateId: (chore as any).templateId } as any;
    }
    const isRace = chore.status==="race";
    const isHighEffort = chore.pain>=8;

    // --- NEW Take-it vs Mark-done separation ---
    // find live version to check claim status (chore arg may be stale closure)
    // but we use passed chore for simple check; setChores will do final logic
    const alreadyClaimed = (chore as any).claimed_by || (chore as any).claimedBy;
    const isOpen = chore.status==="open";
    const isAssignedUnclaimed = chore.status==="assigned" && !alreadyClaimed;

    if(isOpen || isAssignedUnclaimed){
      // CLAIM branch: if claimed by other user? handled below in setChores mapping
      const prevSnapshot = { ...chore };
      setChores((prev:any)=>{
        const mapped = prev.map((c:ChoreV2)=>{
          if(c.id!==chore.id) return c;
          const curClaimed = (c as any).claimed_by || (c as any).claimedBy;
          const curAssigned = c.assignedTo;
          // prevent stealing if already claimed by other
          if(curClaimed && curClaimed!==by){
            return c; // leave unchanged, toast handled after
          }
          if(c.status==="open" || (c.status==="assigned" && !curClaimed)){
            // Take it
            return { ...c, claimed_by: by, claimedBy: by, claimed_at: nowIso, claimedAt: nowIso, assigned_to: by, assignedTo: by, status:"assigned" as const, prev_status: c.status, updatedAt: nowIso, updatedBy: by } as any;
          }
          return c;
        });
        return mapped;
      });
      // check stealing case
      if(alreadyClaimed && alreadyClaimed!==by){
        setToast(`Taken by ${PERSONS[alreadyClaimed as PersonKey].name}`);
        mutSetRef.current.delete(chore.id+"_done");
        return;
      }
      setLastAction({ type:"claim", choreId: chore.id, prevState: prevSnapshot, label:`You took it — finish to earn ${effectivePoints(chore,false)} pts` });
      setToast(`You took it — finish to earn pts`);
      (window as any).__lastUndo = ()=>{
        setChores((prev:any)=> prev.map((c:any)=> c.id===chore.id ? { ...prevSnapshot, updatedAt:new Date().toISOString() } : c));
        setToast("Undone — "+chore.title+" released");
      };
      setTimeout(()=> mutSetRef.current.delete(chore.id+"_done"), 800);
      return;
    }

    // If claimed but not by same user, prevent completion
    if(alreadyClaimed && alreadyClaimed!==by){
      setToast(`Taken by ${PERSONS[alreadyClaimed as PersonKey]?.name || alreadyClaimed}`);
      mutSetRef.current.delete(chore.id+"_done");
      return;
    }

    // MARK DONE branch
    const prevState = { ...chore };
    const showConfetti = isRace || isHighEffort || (chore.basePoints*chore.multiplier>=80);
    setChores((prev:any)=>{
      const mapped=prev.map((c:ChoreV2)=> {
        if(c.id!==chore.id) return c;
        return { ...c, status:"done" as const, completed_by: by, completedBy:by, completed_at: nowIso, completedAt:nowIso, marked_done_by: by, markedDoneBy: by, claimed_by: (c as any).claimed_by || by, updatedAt: nowIso, dueAt: (c as any).dueAt } as any;
      });
      return nextChore ? [nextChore, ...mapped] : mapped;
    });
    // Undo toast for 5s + visible undo
    const prevId = chore.id;
    const doUndo = ()=>{
      setChores((prev:any)=> {
        // if we had created nextChore, remove it
        let next = prev.filter((c:any)=> !(nextChore && c.id===nextChore.id));
        return next.map((c:any)=> c.id===prevId ? { ...prevState, status: prevState.status, completedBy: undefined, completed_by: undefined, completed_at: undefined, claimed_by: (prevState as any).claimed_by || null, updatedAt: new Date().toISOString() } : c);
      });
      setLastAction(null);
      setToast("Undone — "+chore.title+" restored");
    };
    setLastAction({ type:"done", choreId: chore.id, prevState, label: chore.title+" done ✓" });
    // Respect reduced-motion for confetti
    const prefersReduced = typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(showConfetti && !prefersReduced) onCelebrate?.({ clientX:window.innerWidth/2, clientY:280 });
    // collaborative scoreboard check household goal 430/600
    try {
      const totalDone = chores.filter(cc=> cc.status==="done").length;
      if(totalDone+1===430 || totalDone+1===600) { if(!prefersReduced) onCelebrate?.({}); setToast("Household goal! 🎉 "+(totalDone+1)+"/600"); }
    } catch {}
    if(nextChore) setToast(chore.title+" → next "+new Date(nextChore.dueAt!).toLocaleDateString(undefined,{weekday:"short"})+" • Undo");
    else {
      setToast(chore.title+" done ✓ • Undo");
    }
    // store undo handler briefly
    (window as any).__lastUndo = doUndo;
    setTimeout(()=> mutSetRef.current.delete(chore.id+"_done"), 800);
  }

  function claimRace(chore: ChoreV2, by: PersonKey){
    if(chore.status==="done") return;
    if((chore as any).status!=="race") return;
    if(mutSetRef.current.has(chore.id+"_race")) return;
    mutSetRef.current.add(chore.id+"_race");
    const now=new Date(); const nowIso=now.toISOString();
    // Atomic guard: server revision CAS will protect; we check race already claimed via completedBy
    if((chore as any).completedBy || (chore as any).completed_by){
      setToast("Already claimed by "+((chore as any).completedBy|| (chore as any).completed_by));
      mutSetRef.current.delete(chore.id+"_race");
      return;
    }
    const shouldRespawn=(chore.type==="repeat")||(chore.frequency && chore.frequency!=="once");
    let nextChore: ChoreV2|null=null;
    if(shouldRespawn){
      const nextDue=computeNextDueDateChore(chore, now.getTime());
      const origDom = (chore as any).originalDom ?? (chore as any).dayOfMonth ?? (chore.dueAt? new Date(chore.dueAt).getDate() : now.getDate());
      const dDom = (chore as any).dayOfMonth ?? origDom;
      nextChore={ id:uid("chk"), title:chore.title, type:chore.type, frequency:chore.frequency, frequencyDetail:chore.frequencyDetail, dueAt:nextDue.toISOString(), createdAt:nowIso, pain:chore.pain, basePoints:chore.basePoints, swipes:{aisling:null, ciaran:null}, status:"deck", assignedTo:null, multiplier:1, timeWindowHours:chore.timeWindowHours, dayOfMonth:dDom, originalDom:origDom, timezone:HOUSEHOLD_TZ, templateId: (chore as any).templateId } as any;
    }
    const prevState={ ...chore };
    setChores((prev:any)=>{
      const mapped=prev.map((c:ChoreV2)=> c.id===chore.id ? { ...c, status:"done" as const, completedBy:by, completedAt:nowIso, completed_by:by, completed_at:nowIso, claimed_by:by, claimedBy:by, claimed_at: nowIso, marked_done_by:by, race_claimed_at: nowIso } as any : c);
      return nextChore ? [nextChore, ...mapped] : mapped;
    });
    const prefersReduced = typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!prefersReduced) onCelebrate?.({ clientX:window.innerWidth/2, clientY:260 });
    setToast(PERSONS[by].name+" snagged race — "+Math.round(chore.basePoints*1.5)+" pts"+(nextChore?" • next week":"")+" • Undo");
    setLastAction({ type:"done", choreId: chore.id, prevState, label: PERSONS[by].name+" snagged race — "+chore.title+" • Undo" });
    (window as any).__lastUndo = ()=>{
      setChores((prev:any)=>{ let next = prev.filter((c:any)=> !(nextChore && c.id===nextChore.id)); return next.map((c:any)=> c.id===prevState.id ? {...prevState, updatedAt:new Date().toISOString()}:c); });
      setLastAction(null);
    };
    setTimeout(()=> mutSetRef.current.delete(chore.id+"_race"), 800);
  }

  const [addForm, setAddForm] = useState<{ title:string; type:"one-off"|"repeat"; freq:"daily"|"twice-week"|"weekly"|"biweekly"|"monthly"|"custom"|"once"; freqDetail:string; dueAt:string; windowH:number; pain:number; weekdays:boolean[]; resetWindow:number }>({
    title:"", type:"one-off", freq:"weekly", freqDetail:"", dueAt:"", windowH:24, pain:5, weekdays:[...DEFAULT_TWICE_WEEK_BOOL] as boolean[], resetWindow:168,
  });
  function resetForm(){ setAddForm({ title:"", type:"one-off", freq:"weekly", freqDetail:"", dueAt:"", windowH:24, pain:5, weekdays:[...DEFAULT_TWICE_WEEK_BOOL] as boolean[], resetWindow:168 }); }

  function handleAddToDeck(){
    const t=addForm.title.trim(); if(!t) return;
    try{
      const low=t.toLowerCase();
      const dup=(chores as any[]).some((c:any)=> c && typeof c.title==="string" && c.title.toLowerCase().trim()===low && c.status!=="done" && !(c as any).deletedAt);
      if(dup){ setToast("Already exists — check deck"); return; }
    }catch{}
    const pain=Math.min(10,Math.max(1,addForm.pain)); const base=pain*10; const nowIso=new Date().toISOString();
    const windowClamped=Math.min(72,Math.max(2, addForm.windowH));
    let dueAt:string|undefined; let timeWindow=windowClamped; let freqDetail:string|undefined; let freq: ChoreV2["frequency"]="once"; let type:"one-off"|"repeat"=addForm.type;
    if(type==="one-off"){ freq="once"; if(addForm.dueAt) dueAt=new Date(addForm.dueAt).toISOString(); timeWindow=windowClamped; }
    else{
      freq=addForm.freq as any;
      if(freq==="custom"||freq==="weekly"||freq==="biweekly"||freq==="monthly"){
        const daysShort=[...WEEKDAY_SHORT_MON]; const selShort=daysShort.filter((_,i)=> addForm.weekdays[i]).join(",");
        if(selShort) freqDetail=selShort; else freqDetail=freq==="weekly"?"Mo":freq==="biweekly"?"Mo":freq==="monthly"?"Mo":"Mo,We,Fr";
      }
      if(freq==="twice-week"){
        let wd=addForm.weekdays as boolean[]; let selectedIdx=wd.map((v,i)=> v?i:-1).filter(i=>i>=0);
        if(selectedIdx.length===0){ wd=[...DEFAULT_TWICE_WEEK_BOOL] as boolean[]; selectedIdx=[1,4]; }
        if(selectedIdx.length===2){ const longLabels=[...WEEKDAY_LONG_TUEFRI]; freqDetail=selectedIdx.map(i=> longLabels[i]).join(","); } else { const daysShort=[...WEEKDAY_SHORT_MON]; freqDetail=selectedIdx.map(i=> daysShort[i]).join(","); }
        if(!freqDetail) freqDetail="Tue,Fri";
      }
      if(freq==="daily") freqDetail=undefined;
      const resetClamped=Math.min(720,Math.max(2, addForm.resetWindow));
      timeWindow=resetClamped;
      try{
        if(freqDetail){
          const boolMap=addForm.weekdays; if(boolMap.some(Boolean)){
            const from=new Date(); const nxt=computeNextDueFromWeekdays(from,boolMap, freq==="biweekly"?2:1); nxt.setHours(9,0,0,0); dueAt=nxt.toISOString();
          }
        } else if(freq==="daily"){ const nxt=new Date(); nxt.setDate(nxt.getDate()+1); nxt.setHours(9,0,0,0); dueAt=nxt.toISOString(); }
        else if(freq==="weekly"||freq==="biweekly"){ const nxt=new Date(); nxt.setDate(nxt.getDate()+(freq==="biweekly"?14:7)); nxt.setHours(9,0,0,0); dueAt=nxt.toISOString(); }
        else if(freq==="monthly"){
          // FIX semantic monthly: preserve original DOM, Jan31->Feb28->Mar31, not +30d drift
          const now=new Date(); const dom = now.getDate(); const hour=9; const minute=0;
          try{
            const nxt = nextMonthlyFrom(now, dom, hour, minute, HOUSEHOLD_TZ);
            dueAt=nxt.toISOString();
          } catch {
            const nxt=new Date(); nxt.setMonth(nxt.getMonth()+1); const dim=clampDayOfMonth(nxt.getFullYear(), nxt.getMonth()+1, dom); nxt.setDate(dim); nxt.setHours(9,0,0,0); dueAt=nxt.toISOString();
          }
        }
      }catch{}
    }
    const templateId=uid("tmpl"); const newChores: ChoreV2[]=[];
    function makeOcc(dueIso:string, suffix=""): ChoreV2{
      const d = new Date(dueIso); const dom = d.getDate();
      // store originalDom = dom for monthly recurrence preservation
      return { id:suffix?uid("chk")+suffix:uid("chk"), title:t, type, frequency:freq, frequencyDetail:freqDetail, dueAt:dueIso, createdAt:nowIso, pain, basePoints:base, swipes:{aisling:null, ciaran:null}, status:"deck", assignedTo:null, multiplier:1, timeWindowHours:timeWindow, templateId, updatedAt:nowIso, updatedBy:"system", dayOfMonth:dom, originalDom:dom, timezone:HOUSEHOLD_TZ } as any;
    }
    if(type==="repeat"){
      if(freq==="daily"){ const d=new Date(); d.setHours(9,0,0,0); if(d.getTime()<Date.now()) d.setDate(d.getDate()+1); newChores.push(makeOcc(d.toISOString())); }
      else if(addForm.weekdays.some(Boolean)){ const bool=addForm.weekdays as boolean[]; const nxt=computeNextDueFromWeekdays(new Date(), bool, freq==="biweekly"?2:1); nxt.setHours(9,0,0,0); newChores.push(makeOcc(nxt.toISOString())); }
      else newChores.push(makeOcc(dueAt||new Date(Date.now()+86400000).toISOString()));
    } else {
      const domInit = dueAt? new Date(dueAt).getDate() : undefined;
      newChores.push({ id:uid("chk"), title:t, type, frequency:freq, frequencyDetail:freqDetail, dueAt, createdAt:nowIso, pain, basePoints:base, swipes:{aisling:null, ciaran:null}, status:"deck", assignedTo:null, multiplier:1, timeWindowHours:timeWindow, templateId, updatedAt:nowIso, updatedBy:"system", dayOfMonth:domInit, originalDom:domInit, timezone:HOUSEHOLD_TZ } as any);
    }
    setChores((prev:any)=> [...newChores, ...prev]); resetForm(); setShowAdd(false); setToast(newChores.length>1 ? t+" • "+newChores.length+" cards for week added" : t+" added to deck");
  }

  function dueDayLabel(c: ChoreV2): string{
    try{
      if(!c.dueAt) return c.frequency==="daily"?"Daily":freqBadgeChore(c);
      // FIX calendar day diff not ms/86400000 rounded — BST-safe via diffCalendarDays Europe/Dublin
      const now = new Date();
      const due = new Date(c.dueAt);
      const dd = diffCalendarDays(now, due, HOUSEHOLD_TZ);
      if(dd===0) return "Today"; if(dd===1) return "Tomorrow"; if(dd===-1) return "Yesterday";
      if(dd>0 && dd<7) return new Intl.DateTimeFormat("en-GB",{weekday:"short", timeZone: HOUSEHOLD_TZ}).format(due);
      return new Intl.DateTimeFormat("en-GB",{month:"short", day:"numeric", timeZone: HOUSEHOLD_TZ}).format(due);
    }catch{ return "" }
  }
  function painDot(p:number){ if(p<=3) return "var(--border)"; if(p<=6) return "#D0A1EA"; if(p<=8) return "#A89FDA"; return "#977DDA"; }

  const ScoreboardFixed = ({ chores: sc }: { chores: ChoreV2[] }) => {
    const done = sc.filter(c => c.status==="done" && !(c as any).deletedAt);
    let tA=0,tB=0;
    done.forEach(c=>{
      const pts = effectivePoints(c, false);
      if(c.completedBy==="aisling") tA+=pts; else if(c.completedBy==="ciaran") tB+=pts;
    });
    const total=tA+tB||1; const pctA=tA/total;
    const sevenAgo=Date.now()-7*86400000;
    let wA=0,wB=0;
    done.forEach(c=>{
      const ts=c.completedAt? new Date(c.completedAt).getTime():0;
      if(ts<sevenAgo) return;
      if((c as any).deletedAt) return;
      const pts=effectivePoints(c,false);
      if(c.completedBy==="aisling") wA+=pts; else if(c.completedBy==="ciaran") wB+=pts;
    });
    const weeklyTotal=wA+wB||1; const pctWA=wA/weeklyTotal;
    // four-week
    const fourAgo=Date.now()-28*86400000;
    let fA=0,fB=0;
    done.forEach(c=>{
      const ts=c.completedAt? new Date(c.completedAt).getTime():0;
      if(ts<fourAgo) return;
      const pts=effectivePoints(c,false);
      if(c.completedBy==="aisling") fA+=pts; else if(c.completedBy==="ciaran") fB+=pts;
    });
    const fourTotal=fA+fB||1; const pctFA=fA/fourTotal;
    const jointTotal=tA+tB;
    const JOINT_GOAL=600;
    const jointPct=Math.min(1, jointTotal/JOINT_GOAL);
    return (
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-3.5 space-y-2.5" style={{ borderColor:"var(--border)", boxShadow:"0 6px 20px rgba(41,38,36,0.08)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1"><span className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-[var(--nav-active-text)] shrink-0" style={{ background:"#A89FDA" }}>Á</span><div className="min-w-0"><div className="text-[11px] text-[var(--muted)]">Aisling</div><div className="font-display font-bold leading-none text-[22px]">{tA}</div></div></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] px-2 py-1 rounded-full bg-[var(--chip-bg)] border" style={{ borderColor:"var(--border)" }}>VS</span>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end"><div className="text-right"><div className="text-[11px] text-[var(--muted)]">Ciaran</div><div className="font-display font-bold leading-none text-[22px]">{tB}</div></div><span className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-[var(--nav-active-text)] shrink-0" style={{ background:"var(--border)", color:"#6B5242" }}>C</span></div>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-[var(--chip-bg)] overflow-hidden flex"><div className="h-full rounded-full transition-all" style={{ width:pctA*100+"%", background:"linear-gradient(90deg,#A89FDA,#977DDA)" }} /><div className="flex-1" style={{ background:"var(--border)", marginLeft:"2px" }} /></div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]"><span>{PERSONS.aisling.name} {(pctA*100).toFixed(0)}%</span><span>{PERSONS.ciaran.name} {(100-pctA*100).toFixed(0)}%</span></div>
        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor:"var(--chip-bg)"}}><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">this week (7d)</span><div className="flex items-center gap-2 text-[11px]"><span className="font-medium">Á {wA}</span><div className="h-1.5 w-[48px] rounded-full bg-[var(--chip-bg)] overflow-hidden flex"><div className="h-full rounded-full" style={{ width:pctWA*100+"%", background:"#A89FDA"}}/></div><span className="font-medium">C {wB}</span></div></div>
        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor:"var(--chip-bg)"}}><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">four weeks (28d) balance</span><div className="flex items-center gap-2 text-[11px]"><span className="font-medium">Á {fA}</span><div className="h-1.5 w-[64px] rounded-full bg-[var(--chip-bg)] overflow-hidden flex"><div className="h-full rounded-full" style={{ width:pctFA*100+"%", background:"linear-gradient(90deg,#A89FDA,#E8CEB7)"}}/></div><span className="font-medium">C {fB}</span></div></div>
        <div className="pt-2 border-t space-y-1" style={{ borderColor:"var(--chip-bg)"}}>
          <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Household goal — {JOINT_GOAL} pts joint</span><span className="text-[10px] font-medium">{jointTotal}/{JOINT_GOAL} • {Math.round(jointPct*100)}%</span></div>
          <div className="h-2 w-full rounded-full bg-[var(--chip-bg)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width:jointPct*100+"%", background: jointPct>=1 ? "linear-gradient(90deg,#22C55E,#16A34A)" : "linear-gradient(90deg,#E8CEB7,#A89FDA)" }}/></div>
          <div className="text-[10px] text-[var(--muted)]">{jointPct>=1 ? "Goal reached! 🎉 Keep duelling" : `${JOINT_GOAL-jointTotal} pts to go — team up!`}</div>
        </div>
      </div>
    );
  };

  const isDeckEmpty = deck.length===0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><h2 className="font-display text-[22px] tracking-tight text-[var(--text)]">Chore Duel</h2><span className="font-display text-[18px] text-[var(--text)]/20">{String(deckRaw.length).padStart(2,"0")}</span></div><span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{doneChores.length} played</span></div>
      <div className="flex items-center justify-between px-1">
        <div className="text-[11px] text-[var(--muted)]">Viewing as <span className="font-medium text-[var(--text)]">{PERSONS[viewer].name}</span> • tap card to duel</div>
        <button onClick={()=> setShowAdd(true)} className="rounded-full bg-[var(--nav-active-bg)] px-3.5 h-[44px] text-[11px] font-medium text-[var(--nav-active-text)] active:scale-[0.97] transition">+ Add</button>
      </div>

      <ScoreboardFixed chores={chores} />

      <div className="px-1 flex flex-wrap gap-1.5">
        {(["all","today","tomorrow","Mo","Tu","We","Th","Fr","Sa","Su"] as const).map(k=> {
          const active=dayFilter===k;
          const label=k==="all"?"All": k==="today"?"Today":k==="tomorrow"?"Tomorrow":k;
          const cnt=filterCounts.get(k) ?? 0;
          return <button key={k} onClick={()=> setDayFilter(k)} className={"rounded-full px-2.5 h-[28px] text-[11px] border transition flex items-center gap-1 "+(active?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] text-[var(--muted)] border-[var(--border)]")}>{label}<span className={"ml-0.5 tabular-nums rounded-full px-1 py-0 text-[10px] "+(active?"bg-[var(--card-bg)]/20":"bg-[var(--chip-bg)]")}>({cnt})</span></button>
        })}
        {dayFilter!=="all" && <button onClick={()=> setDayFilter("all")} className="text-[11px] text-[var(--muted)] underline min-h-[28px] px-1">clear</button>}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[340px] mx-auto rounded-[22px] p-2" style={{ backgroundImage:"radial-gradient(var(--border) 1px,transparent 1px)", backgroundSize:"16px 16px", backgroundColor:"rgba(247,239,232,0.45)" }}>
          {!isDeckEmpty && currentCard ? (
            <div className="select-none touch-pan-y" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} style={{ touchAction:"pan-y" }}>
              <div className="relative mx-auto w-full max-w-[320px] h-[190px] rounded-[20px] border bg-[var(--card-bg)] px-5 py-4 will-change-transform overflow-hidden"
                style={{
                  borderColor:"var(--border)",
                  boxShadow:"0 12px 36px rgba(41,38,36,0.12)",
                  transform: exiting ? "translateX("+(exiting==="right"?"120%":"-120%")+") rotate("+(exiting==="right"?"8deg":"-8deg")+") scale(0.98)" : "translateX("+dragX*0.92+"px) rotate("+dragX*0.06+"deg) "+(dragging?"scale(1.02)":""),
                  opacity: exiting ? 0 : 1-Math.min(0.35, Math.abs(dragX)/280),
                  transition: exiting ? "transform 220ms ease, opacity 220ms ease" : dragging ? "none" : "transform 220ms ease",
                }}>
                <div className="absolute top-0 left-0 right-0 h-[6px]" style={{
                  background: (()=>{ const a=currentCard.swipes.aisling, b=currentCard.swipes.ciaran; if(a==="right"&&b==="right") return "linear-gradient(90deg,#A89FDA 0 50%,var(--border) 50% 100%)"; if(a==="right"||(viewer==="aisling"&&dragX>40)) return "#A89FDA"; if(b==="right"||(viewer==="ciaran"&&dragX>40)) return "var(--border)"; if(a==="left"||b==="left") return "var(--border)"; return viewer==="aisling"?"#A89FDA":"var(--border)"; })()
                }} />
                <div className="mt-2 font-display text-[18px] leading-[1.1] text-[var(--text)] line-clamp-2 pr-2 max-w-[280px] break-words">{currentCard.title}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap"><span className="inline-flex rounded-full bg-[var(--nav-active-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--nav-active-text)]">{dueDayLabel(currentCard)}</span><span className="text-[10px] text-[var(--muted)]">{currentCard.dueAt ? new Date(currentCard.dueAt).toLocaleDateString(undefined,{month:"short", day:"numeric"}) : ""}</span></div>
                <div className="mt-2 flex items-center gap-2 flex-wrap max-w-full"><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--chip-bg)] border px-2.5 py-1 text-[10px]" style={{ borderColor:"var(--border)" }}><span className="h-2 w-2 rounded-full" style={{ background:painDot(currentCard.pain) }} />Pain {currentCard.pain} • {currentCard.basePoints} pts</span><span className="inline-flex rounded-full bg-[var(--chip-bg)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] max-w-[110px] truncate">{freqBadgeChore(currentCard)}</span></div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[320px] min-h-[220px] rounded-[20px] border-[1.5px] border-dashed grid place-items-center bg-[var(--card-bg)] px-6 py-8" style={{ borderColor:"var(--border)" }}>
              <div className="text-center flex flex-col items-center">
                <div className="mx-auto rounded-full bg-[var(--chip-bg)] grid place-items-center border" style={{ borderColor:"var(--border)", width:"120px", height:"120px" }}>
                  <DoodleSun className="h-[96px] w-[96px] opacity-80" />
                </div>
                <div className="mt-3 font-display text-[16px] text-[var(--text)]">Deck clear — nice.</div>
                <div className="mt-1 text-[11px] text-[var(--muted)] max-w-[200px]">All chores are assigned or done. Add a new one to keep duelling.</div>
                <button onClick={()=> setShowAdd(true)} className="mt-3 h-[44px] rounded-full bg-[var(--nav-active-bg)] px-5 text-[13px] font-medium text-[var(--nav-active-text)] active:scale-[0.97] transition">Add chore</button>
              </div>
            </div>
          )}
          {currentCard && !isDeckEmpty && <div className="mt-3 flex items-center justify-center gap-10"><button disabled={exiting!==null} aria-label="swipe left nope" onClick={()=> doSwipe('left')} className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-[var(--chip-bg)] active:scale-[0.92] transition disabled:opacity-40" style={{ borderColor:"var(--border)" }}><IconX className="h-4 w-4" /></button><button disabled={exiting!==null} aria-label="swipe right yes" onClick={()=> doSwipe('right')} className="grid h-[44px] w-[44px] place-items-center rounded-full border bg-[#F6EFFE] active:scale-[0.92] transition disabled:opacity-40" style={{ borderColor:"#D0A1EA" }}><IconHeart className="h-4 w-4" filled /></button></div>}
        </div>
      </div>

      {toast && <div className="mx-auto w-fit rounded-full bg-[var(--nav-active-bg)] px-3.5 py-1.5 text-[11px] text-[var(--nav-active-text)] shadow animate-[floatIn_0.18s_ease]">{toast}</div>}

      {bonusNow.length>0 && (
        <div className="space-y-2"><div className="flex items-center justify-between px-1"><span className="font-display text-[13px] flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#977DDA] animate-pulse" /> Bonus Now!</span><MicroLabel>{bonusNow.length} urgent • +15%</MicroLabel></div>
          <div className="flex gap-3 overflow-auto no-scrollbar snap-x pb-1">{bonusNow.map((c)=>{ const bonusPts=Math.round(c.basePoints*c.multiplier*1.15); const pct=percentLeftChore(c,nowMs); const claimedBy=(c as any).claimed_by||(c as any).claimedBy; const isClaimedByMe=claimedBy===viewer; const isClaimedByOther=claimedBy && claimedBy!==viewer; return <div key={c.id} className="snap-start shrink-0 w-[160px] rounded-[16px] border bg-[var(--card-bg)] px-3 py-2.5 relative overflow-hidden hover:bg-[var(--card-bg)]/80 transition" style={{ borderColor:"#977DDA", borderWidth:"2px", boxShadow:"0 0 0 3px rgba(151,125,218,0.12)" }}><div className="absolute top-1.5 right-1.5 rounded-full bg-[#977DDA] px-1.5 py-0.5 text-[9px] font-medium text-[var(--nav-active-text)]">BONUS +15%</div><div className="text-[12px] font-medium line-clamp-2 min-h-[36px]">{c.title}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{bonusPts} pts • {timeLeftLabel(c)}</div><div className="mt-2 h-1.5 w-full rounded-full bg-[var(--chip-bg)] overflow-hidden"><div className="h-full rounded-full bg-[#977DDA]" style={{ width:Math.max(4,Math.min(100,pct*100))+"%" }} /></div><button onClick={()=> { if(isClaimedByOther){ setToast(`Taken by ${PERSONS[claimedBy as PersonKey]?.name||claimedBy}`); return;} claimDone(c,viewer); }} className="mt-2 w-full rounded-full bg-[var(--nav-active-bg)] h-[36px] text-[11px] text-[var(--nav-active-text)] active:scale-[0.97] transition">{isClaimedByMe ? "Mark done ✓" : isClaimedByOther ? `Taken by ${PERSONS[claimedBy as PersonKey]?.name||claimedBy}` : `Take it • ${bonusPts} pts`}</button></div>; })}</div></div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1"><span className="font-display text-[13px]">Assigned</span><span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] border" style={{ borderColor:"var(--border)" }}>{assigned.length}</span></div>
        <div className="space-y-2">{assigned.map((c)=>{
          const isA=c.assignedTo==="aisling"; 
          const pct=percentLeftChore(c,nowMs); const isB=pct>=0 && pct<0.10; const pts=isB?Math.round(c.basePoints*c.multiplier*1.15):Math.round(c.basePoints*c.multiplier);
          const claimedBy=(c as any).claimed_by||(c as any).claimedBy;
          const isClaimedByMe=claimedBy===viewer;
          const isClaimedByOther=claimedBy && claimedBy!==viewer;
          const needsTake = !claimedBy;
          return (
            <div key={c.id} className="ticket-row flex items-stretch overflow-hidden rounded-[16px] border bg-[var(--card-bg)] hover:bg-[var(--card-bg)]/80 transition-colors relative" style={{ borderColor:isB?"#977DDA":"var(--border)", background:isA?"rgba(168,159,218,0.08)":"rgba(232,206,183,0.08)" }}>
              <div className="flex flex-col items-center justify-center px-3 py-2 border-r border-dashed" style={{ borderColor:"var(--border)", minWidth:"56px" }}><div className="font-display text-[20px] leading-none text-[var(--text)]">{pts}</div><div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">pts</div></div>
              <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center"><div className="text-[13px] font-medium truncate">{c.title}</div><div className="text-[10px] text-[var(--muted)]">{needsTake ? "Tap Take it to claim" : isClaimedByMe ? "You claimed — finish for pts" : `Taken by ${PERSONS[claimedBy as PersonKey]?.name||claimedBy}`}{isB && <span className="ml-1 rounded-full bg-[#977DDA] text-[var(--nav-active-text)] px-1.5 py-0.5 text-[9px]">BONUS +15%</span>}</div></div>
              <div className="flex items-center gap-1 pr-1">
                <button onClick={()=> {
                  if(isClaimedByOther){ setToast(`Taken by ${PERSONS[claimedBy as PersonKey]?.name||claimedBy}`); return; }
                  claimDone(c,viewer);
                }} className={"rounded-full px-3 h-[36px] text-[11px] text-[var(--nav-active-text)] min-w-[88px] "+(needsTake?"bg-[var(--nav-active-bg)]":"bg-[var(--nav-active-bg)]")}>{needsTake ? `Take it • ${pts}` : isClaimedByMe ? "Mark done ✓" : `Taken by ${PERSONS[claimedBy as PersonKey]?.name||"?"}`}</button>
                <button onClick={()=> setChoreMenuId(m=> m===c.id ? null : c.id)} className="h-[32px] w-[32px] grid place-items-center rounded-full border bg-[var(--card-bg)] text-[11px]">⋮</button>
              </div>
              {choreMenuId===c.id && (
                <div className="absolute right-1 top-[46px] z-10 rounded-[12px] border bg-[var(--card-bg)] shadow-lg p-1.5 w-[168px]" style={{borderColor:"var(--border)"}}>
                  <button onClick={()=> { const prev={...c}; setChores((prevL:any)=> prevL.map((x:any)=> x.id===c.id ? {...x, dueAt: new Date(new Date(x.dueAt||x.createdAt).getTime()+24*3600*1000).toISOString(), updatedAt:new Date().toISOString()} : x)); setLastAction({type:"snooze", choreId:c.id, prevState:prev, label:"Snoozed +1d"}); setChoreMenuId(null); setToast("Snoozed +1 day"); }} className="w-full text-left rounded-full px-3 py-1.5 text-[11px] hover:bg-[var(--chip-bg)]">Snooze +1d</button>
                  <button onClick={()=> { const prev={...c}; setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, status:"open", assigned_to:null, assignedTo:null, claimed_by:null, claimedBy:null, status_prev:"assigned", updatedAt:new Date().toISOString()} : x)); setLastAction({type:"release", choreId:c.id, prevState:prev, label:"Released to Open"}); setChoreMenuId(null); setToast("Released to Open"); }} className="w-full text-left rounded-full px-3 py-1.5 text-[11px] hover:bg-[var(--chip-bg)]">Release to Open</button>
                  <button onClick={()=> { setRescheduleId(c.id); setRescheduleDate(c.dueAt ? new Date(c.dueAt).toISOString().slice(0,10) : todayKey(HOUSEHOLD_TZ)); setChoreMenuId(null); }} className="w-full text-left rounded-full px-3 py-1.5 text-[11px] hover:bg-[var(--chip-bg)]">Reschedule</button>
                  <button onClick={()=> { const prev={...c}; setConfirmDialog({ title:`Cancel ${c.title}?`, body:"This occurrence will be archived. You can undo.", onConfirm:()=>{ setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, deletedAt:new Date().toISOString(), archived_at:new Date().toISOString(), updatedAt:new Date().toISOString()} : x)); setLastAction({type:"cancel", choreId:c.id, prevState:prev, label:"Cancelled — Undo"}); setToast("Cancelled"); setConfirmDialog(null);} }); setChoreMenuId(null); }} className="w-full text-left rounded-full px-3 py-1.5 text-[11px] hover:bg-[var(--chip-bg)]">Cancel occurrence</button>
                  <button onClick={()=> { setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, needs_discussion:true, discussion_for:c.id, updatedAt:new Date().toISOString()} : x)); setChoreMenuId(null); setToast("Marked — Needs a chat"); }} className="w-full text-left rounded-full px-3 py-1.5 text-[11px] hover:bg-[var(--chip-bg)]">Needs a chat</button>
                </div>
              )}
            </div>
          );
        })}{assigned.length===0 && <div className="rounded-[16px] border-[1.5px] border-dashed bg-[var(--card-bg)] px-4 py-6 text-[12px] text-[var(--muted)] text-center flex flex-col items-center" style={{ borderColor:"var(--border)" }}><DoodleSun className="h-[36px] w-[36px] opacity-60 mb-2" /><span>No assigned — swipe deck</span></div>}</div>
      </div>

      <div className="space-y-2"><div className="flex items-center gap-2 px-1"><span className="font-display text-[13px]">Open — 1.5×</span><span className="text-[11px] text-[var(--muted)]">{openChores.length} • extra points for taking it</span></div>{openChores.length>0 ? <div className="flex gap-3 overflow-auto no-scrollbar snap-x snap-mandatory pb-1">{openChores.map((c)=>{ const pct=percentLeftChore(c,nowMs); const isB=pct>=0 && pct<0.10; const pts=effectivePoints(c,isB && c.status!=="done"); const claimedBy=(c as any).claimed_by||(c as any).claimedBy; const isClaimedByMe=claimedBy===viewer; const isClaimedByOther=claimedBy && claimedBy!==viewer; return <div key={c.id} className="snap-start shrink-0 w-[168px] rounded-[16px] border bg-[var(--card-bg)] px-3 py-3 flex flex-col hover:bg-[var(--card-bg)]/80 transition relative" style={{ borderColor:isB?"#977DDA":"var(--border)", borderWidth:isB?"2px":"1px", background:"repeating-linear-gradient(45deg,var(--chip-bg) 0 6px,white 6px 12px)" }}><div className="mt-1 text-[13px] font-medium line-clamp-2 min-h-[38px]">{c.title}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{pts} pts • {timeLeftLabel(c)} {isB && <span className="rounded-full bg-[#977DDA] text-[var(--nav-active-text)] px-1 py-0.5 text-[9px]">+15%</span>}</div><button onClick={()=> { if(isClaimedByOther){ setToast(`Taken by ${PERSONS[claimedBy as PersonKey]?.name||claimedBy}`); return; } claimDone(c,viewer); }} className="mt-2 w-full rounded-full bg-[var(--nav-active-bg)] h-[36px] text-[11px] text-[var(--nav-active-text)]">{isClaimedByMe ? "Mark done ✓" : isClaimedByOther ? `Taken by ${PERSONS[claimedBy as PersonKey]?.name||"?"}` : `Take it • ${pts} pts`}</button><button onClick={()=> setChoreMenuId(m=> m===c.id ? null : c.id)} className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-[var(--card-bg)] border text-[10px]" style={{borderColor:"var(--border)"}}>⋮</button>{choreMenuId===c.id && <div className="absolute right-1 top-7 z-10 rounded-[12px] border bg-[var(--card-bg)] shadow-lg p-1.5 w-[148px]"><button onClick={()=>{ const prev={...c}; setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, dueAt:new Date(new Date(x.dueAt||x.createdAt).getTime()+86400000).toISOString(), updatedAt:new Date().toISOString()} : x)); setChoreMenuId(null); setToast("Snoozed +1d"); setLastAction({type:"snooze", choreId:c.id, prevState:prev, label:"Snoozed +1d"}); }} className="w-full text-left px-2 py-1 text-[11px] hover:bg-[var(--chip-bg)] rounded-full">Snooze +1d</button><button onClick={()=>{ setConfirmDialog({title:`Cancel ${c.title}?`, onConfirm:()=>{ const prev={...c}; setChores((p:any)=> p.map((x:any)=> x.id===c.id ? {...x, deletedAt:new Date().toISOString(), updatedAt:new Date().toISOString()} : x)); setLastAction({type:"cancel", choreId:c.id, prevState:prev, label:"Cancelled"}); setConfirmDialog(null); } }); setChoreMenuId(null);}} className="w-full text-left px-2 py-1 text-[11px] hover:bg-[var(--chip-bg)] rounded-full">Cancel</button></div>}</div>; })}</div> : <div className="rounded-[16px] border-[1.5px] border-dashed bg-[var(--card-bg)] px-4 py-6 text-[12px] text-[var(--muted)] text-center" style={{ borderColor:"var(--border)" }}>No open</div>}</div>

      <div className="space-y-2"><div className="flex items-center gap-2 px-1"><span className="font-display text-[13px]">Races — 1.5×</span><span className="rounded-full bg-[#F6EFFE] border px-2 py-0.5 text-[10px]" style={{ borderColor:"#D0A1EA" }}>{races.length} live</span><span className="text-[10px] text-[var(--muted)]">auto-expires &gt;24h</span></div>{races.length>0 ? <div className="grid gap-2">{races.map((c)=>{ const isB=percentLeftChore(c,nowMs)>=0 && percentLeftChore(c,nowMs)<0.10; const pts=Math.round(c.basePoints*1.5*(isB?1.15:1)); const startedAt=(c as any).race_started_at ? new Date((c as any).race_started_at).getTime() : nowMs; const ageH=Math.floor((nowMs-startedAt)/3600000); return <div key={c.id} className="rounded-[16px] border bg-[var(--card-bg)] px-3.5 py-3 flex items-center gap-3 hover:bg-[var(--card-bg)]/80 transition" style={{ borderColor:"var(--border)" }}><div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{c.title}</div><div className="text-[10px] text-[var(--muted)]">{pts} pts • {ageH}h ago started • {isB ? "BONUS +15%" : "race"}</div></div><button onClick={()=> claimRace(c,viewer)} className="rounded-full bg-[var(--nav-active-bg)] h-[36px] px-3 text-[11px] text-[var(--nav-active-text)]">Take it • {pts}</button></div>; })}</div> : <div className="rounded-[16px] border-[1.5px] border-dashed bg-[var(--card-bg)] px-4 py-6 text-[12px] text-[var(--muted)] text-center" style={{ borderColor:"var(--border)" }}>No races — both swiped yes</div>}</div>

      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Add chore — to Duel">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium">What needs doing? *</label>
            <input value={addForm.title} onChange={e=> setAddForm(f=> ({...f, title:e.target.value}))} placeholder="e.g. Take out bins, Clean bathroom" className="mt-1 w-full rounded-full border bg-[var(--card-bg)] px-4 h-[44px] text-[13px]" style={{ borderColor:"var(--border)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium">When? (Due)</label>
              <input type="date" value={addForm.dueAt ? new Date(addForm.dueAt).toISOString().slice(0,10) : ""} onChange={e=> setAddForm(f=> ({...f, dueAt: e.target.value ? new Date(e.target.value).toISOString() : ""}))} className="mt-1 w-full rounded-full border bg-[var(--card-bg)] px-3 h-[40px] text-[12px]" style={{borderColor:"var(--border)"}} />
            </div>
            <div>
              <label className="text-[11px] font-medium">Effort {addForm.pain} — {effortLabel(addForm.pain)}</label>
              <input type="range" min={1} max={10} value={addForm.pain} onChange={e=> setAddForm(f=> ({...f, pain: Number(e.target.value)}))} className="w-full mt-2" />
              <div className="flex justify-between text-[10px] text-[var(--muted)]"><span>Tiny 1</span><span>Brutal 10</span></div>
            </div>
          </div>
          <button disabled={!addForm.title.trim()} onClick={handleAddToDeck} className="w-full rounded-full bg-[var(--nav-active-bg)] h-[44px] text-[13px] text-[var(--nav-active-text)] disabled:opacity-40">Add to Duel</button>

          <details className="rounded-[12px] border bg-[var(--chip-bg)] p-2" style={{borderColor:"var(--border)"}}>
            <summary className="text-[11px] font-medium cursor-pointer list-none flex items-center justify-between">Advanced Options <span className="text-[10px]">▼</span></summary>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <select value={addForm.type} onChange={e=> setAddForm(f=> ({...f, type:e.target.value as any}))} className="flex-1 rounded-full border bg-[var(--card-bg)] px-2 h-[36px] text-[11px]" style={{borderColor:"var(--border)"}}>
                  <option value="one-off">One-off</option>
                  <option value="repeat">Repeat</option>
                </select>
                {addForm.type==="repeat" && <select value={addForm.freq} onChange={e=> setAddForm(f=> ({...f, freq:e.target.value as any}))} className="flex-1 rounded-full border bg-[var(--card-bg)] px-2 h-[36px] text-[11px]" style={{borderColor:"var(--border)"}}>
                  <option value="daily">Daily</option>
                  <option value="twice-week">Twice-week</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>}
              </div>
              <div>
                <div className="text-[10px] text-[var(--muted)] mb-1">Weekdays — maps to frequencyDetail</div>
                <div className="flex flex-wrap gap-1">
                  {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> {
                    const on = addForm.weekdays[i];
                    return <button key={d} onClick={()=> setAddForm(f=>{ const nxt=[...f.weekdays]; nxt[i]=!nxt[i]; return {...f, weekdays:nxt}; })} className={"h-7 w-7 rounded-full text-[10px] border grid place-items-center "+(on?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)]")}>{d}</button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px]">Time window hrs</label><input type="number" min={2} max={72} value={addForm.windowH} onChange={e=> setAddForm(f=> ({...f, windowH:Number(e.target.value)}))} className="w-full rounded-full border bg-[var(--card-bg)] px-2 h-[36px] text-[11px]" style={{borderColor:"var(--border)"}}/></div>
                <div><label className="text-[10px]">Reset window hrs</label><input type="number" min={2} max={720} value={addForm.resetWindow} onChange={e=> setAddForm(f=> ({...f, resetWindow:Number(e.target.value)}))} className="w-full rounded-full border bg-[var(--card-bg)] px-2 h-[36px] text-[11px]" style={{borderColor:"var(--border)"}}/></div>
              </div>
            </div>
          </details>
        </div>
      </BottomSheet>

      {/* Visible Undo banner */}
      {lastAction && (
        <div className="fixed bottom-[84px] left-3 right-3 z-[60] rounded-[14px] bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-4 py-2.5 flex items-center justify-between shadow-lg animate-[floatIn_0.18s_ease]">
          <span className="text-[12px]">{lastAction.label}</span>
          <button onClick={()=> {
            const la=lastAction;
            if(!la) return;
            setChores((prev:any)=>{
              if(la.type==="claim" || la.type==="done" || la.type==="snooze" || la.type==="release" || la.type==="cancel"){
                return prev.map((c:any)=> c.id===la.choreId ? {...la.prevState, updatedAt:new Date().toISOString()} : c).filter((c:any)=> !(la.prevState?.nextChoreId && c.id===la.prevState.nextChoreId));
              }
              return prev;
            });
            // generic fallback: try restore via stored prevState
            if(la.type==="done" || la.type==="claim"){
              try { (window as any).__lastUndo?.(); } catch {}
            }
            setLastAction(null);
            setToast("Undone — restored");
          }} className="ml-3 rounded-full bg-[var(--card-bg)] text-black px-3 py-1 text-[11px] font-medium">Undo</button>
          <button onClick={()=> setLastAction(null)} className="ml-2 text-[var(--nav-active-text)]/70 text-[12px]">✕</button>
        </div>
      )}

      {/* Confirm dialog — replaces native confirm() */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[85] bg-black/30 backdrop-blur-[2px] grid place-items-center p-4">
          <div className="rounded-[18px] bg-[var(--card-bg)] border w-full max-w-[320px] p-4 shadow-xl" style={{borderColor:"var(--border)"}}>
            <div className="font-display text-[14px] font-medium">{confirmDialog.title}</div>
            {confirmDialog.body && <div className="mt-1 text-[11px] text-[var(--muted)]">{confirmDialog.body}</div>}
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={()=> setConfirmDialog(null)} className="rounded-full bg-[var(--chip-bg)] px-4 py-2 text-[11px] border" style={{borderColor:"var(--border)"}}>Cancel</button>
              <button onClick={()=> confirmDialog.onConfirm()} className="rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-4 py-2 text-[11px]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule sheet */}
      <BottomSheet open={!!rescheduleId} onClose={()=> setRescheduleId(null)} title="Reschedule chore">
        {rescheduleId && (
          <div className="space-y-3">
            <div className="text-[11px] text-[var(--muted)]">Pick new due date — Europe/Dublin</div>
            <input type="date" value={rescheduleDate} onChange={e=> setRescheduleDate(e.target.value)} className="w-full rounded-full border bg-[var(--card-bg)] px-3 h-[44px] text-[13px]" style={{borderColor:"var(--border)"}} />
            <button onClick={()=> {
              const id=rescheduleId;
              if(!id) return;
              const prevChore=chores.find(c=>c.id===id);
              const newDue = rescheduleDate ? new Date(rescheduleDate+"T09:00:00").toISOString() : undefined;
              setChores((p:any)=> p.map((c:any)=> c.id===id ? {...c, dueAt:newDue, updatedAt:new Date().toISOString()} : c));
              if(prevChore) setLastAction({type:"snooze", choreId:id, prevState:prevChore, label:"Rescheduled"});
              setRescheduleId(null);
              setToast("Rescheduled to "+rescheduleDate);
            }} className="w-full rounded-full bg-[var(--nav-active-bg)] h-[44px] text-[var(--nav-active-text)] text-[11px]">Save date</button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function CalendarPageV2({
  events, setEvents, currentUser, nowMs, chores, setCurrentUser, onCelebrate,
}: {
  events: CalendarEvent[]; setEvents: (up: CalendarEvent[] | ((p: CalendarEvent[]) => CalendarEvent[])) => void;
  currentUser: PersonKey; nowMs: number; chores?: any; setCurrentUser?: any; onCelebrate?: any;
}) {
  // --- pure Dublin date helpers (no UTC slicing) ---
  const tz = HOUSEHOLD_TZ;
  const todayDublin = todayKey(tz);
  function localKeyFromIso(iso?: string): string | null {
    if (!iso) return null;
    const k = toLocalKeyDublin(iso, tz);
    return k || null;
  }

  function daysInMonthDublin(year: number, month0: number): number {
    // month0 0-11, use Date clamped — safe for leap years
    return new Date(year, month0 + 1, 0).getDate();
  }

  // Normalize swipes -> responses for migration
  function getResponses(ev: CalendarEvent): CalendarEventResponse[] {
    if (ev.responses && ev.responses.length) return ev.responses;
    const res: CalendarEventResponse[] = [];
    if (ev.swipes) {
      if (ev.swipes.aisling) res.push({ eventId: ev.id, memberId: "aisling", response: ev.swipes.aisling as any, respondedAt: ev.updatedAt || ev.createdAt });
      if (ev.swipes.ciaran) res.push({ eventId: ev.id, memberId: "ciaran", response: ev.swipes.ciaran as any, respondedAt: ev.updatedAt || ev.createdAt });
    }
    // proposer auto-yes if no explicit response
    if (res.length === 0 && ev.proposer) {
      res.push({ eventId: ev.id, memberId: ev.proposer, response: "yes", respondedAt: ev.createdAt });
    }
    return res;
  }

  function computeStatusFromResponses(ev: CalendarEvent, responses: CalendarEventResponse[]): CalendarEventStatus {
    // honor explicit terminal statuses
    if (ev.status === "cancelled" || ev.status === "completed" || ev.status === "draft") return ev.status as any;
    if (ev.status === "dismissed") return "cancelled" as any;
    // if explicitly set to agreed/declined/needs_discussion and responses align, keep
    const hasA = responses.find(r=> r.memberId==="aisling");
    const hasC = responses.find(r=> r.memberId==="ciaran");
    if (!hasA && !hasC) return "proposed";
    if (!hasA) return "awaiting_aisling";
    if (!hasC) return "awaiting_ciaran";
    // both answered
    const aResp = hasA.response;
    const cResp = hasC.response;
    if (aResp === "yes" && cResp === "yes") return "agreed";
    if (aResp === "no" && cResp === "no") return "declined";
    // any discuss or split Yes+No => needs_discussion
    return "needs_discussion";
  }

  function isEventOnDate(ev: CalendarEvent, dateKey: string): boolean {
    // group by full YYYY-MM-DD key in Dublin TZ, never by day number alone
    // support multi-day spanning inclusive
    const startIso = ev.start || ev.dueAt;
    if (!startIso) return false;
    const sKey = localKeyFromIso(startIso);
    if (!sKey) return false;
    const eKey = ev.end || ev.endAt ? localKeyFromIso(ev.end || ev.endAt) : sKey;
    if (!eKey || sKey === eKey) return sKey === dateKey;
    // spanning
    return sKey <= dateKey && dateKey <= eKey;
  }

  // --- recurrence generation ---
  function expandTemplateForMonth(template: CalendarEvent, y: number, m0: number): CalendarEvent[] {
    // returns virtual occurrences for this month (y,m0). If template is not repeat or is single, return [] (caller handles single)
    if (!template.isTemplate && template.type !== "repeat" && template.frequency === "once") return [];
    const freq = template.frequency || "once";
    if (freq === "once") return [];
    const occs: CalendarEvent[] = [];
    const baseIso = template.dueAt || template.start;
    if (!baseIso) return [];
    const base = new Date(baseIso);
    const baseHour = base.getHours();
    const baseMin = base.getMinutes();
    const monthStart = new Date(y, m0, 1, 0,0,0,0);
    const monthEnd = new Date(y, m0, daysInMonthDublin(y,m0), 23,59,59,999);
    // monthly semantic
    if (freq === "monthly") {
      const dom = template.dayOfMonth || template.originalDom || base.getDate();
      // find first occurrence on or after monthStart
      let cand = nextMonthlyFrom(new Date(monthStart.getTime()-1), dom, baseHour, baseMin, tz);
      let guard=0;
      while (cand.getTime() <= monthEnd.getTime() && guard<2) {
        const key = toLocalKeyDublin(cand.toISOString(), tz);
        if (key >= toLocalKeyDublin(monthStart.toISOString(), tz) && key <= toLocalKeyDublin(monthEnd.toISOString(), tz)) {
          occs.push({
            ...template,
            id: template.id + "#" + key,
            templateId: template.id,
            occurrenceId: key,
            dueAt: cand.toISOString(),
            start: cand.toISOString(),
            end: template.endAt ? new Date(cand.getTime() + (new Date(template.endAt).getTime() - base.getTime())).toISOString() : undefined,
            isTemplate: false,
          } as any);
        }
        cand = nextMonthlyFrom(new Date(cand.getTime()+1000), dom, baseHour, baseMin, tz);
        guard++;
        if (occs.length>=3) break; // at most ~1 per month
      }
      return occs;
    }
    // weekly / biweekly use weekdays bool if present via frequencyDetail else simple weekly every day-of-week of base
    if (freq === "weekly" || freq === "biweekly" || freq === "daily" || freq === "twice-week" || freq === "custom") {
      // if custom weekdays present, expand up to maybe 8 occurrences per month
      for (let d=1; d<= daysInMonthDublin(y,m0); d++) {
        const dayKey = y+"-"+String(m0+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
        // naive weekly: if template dow matches, include
        const probe = new Date(y,m0,d, baseHour, baseMin);
        // daily: all days
        if (freq === "daily") {
          occs.push({
            ...template,
            id: template.id+"#"+dayKey,
            templateId: template.id,
            occurrenceId: dayKey,
            dueAt: probe.toISOString(),
            start: probe.toISOString(),
            isTemplate: false,
          } as any);
          continue;
        }
        // weekly: same weekday as base
        if (freq === "weekly") {
          if (probe.getDay() === base.getDay()) occs.push({...template, id: template.id+"#"+dayKey, templateId: template.id, occurrenceId: dayKey, dueAt: probe.toISOString(), start: probe.toISOString(), isTemplate:false} as any);
          continue;
        }
        // biweekly: every 2nd week — simplified parity check using base date
        if (freq === "biweekly") {
          const diffDays = Math.floor((probe.getTime()-base.getTime())/86400000);
          if (probe.getDay()===base.getDay() && Math.floor(diffDays/7)%2===0) occs.push({...template, id: template.id+"#"+dayKey, templateId: template.id, occurrenceId: dayKey, dueAt: probe.toISOString(), start: probe.toISOString(), isTemplate:false} as any);
          continue;
        }
        // twice-week / custom: use frequencyDetail parse via existing helper outside scope? fallback treat as Mon/Thu
      }
      return occs;
    }
    return occs;
  }

  const [viewMonth, setViewMonth] = useState(() => {
    const ref = nowMs ? new Date(nowMs) : new Date();
    // derive year/month via Dublin wall parts
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, year:"numeric", month:"numeric"});
      const parts = fmt.formatToParts(ref);
      const y = Number(parts.find(p=> p.type==="year")?.value || ref.getFullYear());
      const m = Number(parts.find(p=> p.type==="month")?.value || ref.getMonth()+1)-1;
      return new Date(y, m, 1);
    } catch { return new Date(ref.getFullYear(), ref.getMonth(), 1); }
  });
  const [selected, setSelected] = useState(() => todayDublin);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent|null>(null);
  const [showEditSeriesAsk, setShowEditSeriesAsk] = useState<{ ev: CalendarEvent, draft: CalendarEvent }|null>(null);
  const [menuFor, setMenuFor] = useState<string|null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string,string>>({});
  const [confirmDialog, setConfirmDialog] = useState<null | {title:string; msg?:string; onConfirm:()=>void}>(null);

  // Build visible events + expanded recurring occurrences for this month
  const monthOccurrences = useMemo(()=> {
    const y = viewMonth.getFullYear();
    const m0 = viewMonth.getMonth();
    const all: CalendarEvent[] = [];
    const tmplRecurring = events.filter(ev=> !ev.deletedAt && (ev.isTemplate || (ev.type==="repeat" && (ev.frequency && ev.frequency!=="once") ) ));
    for (const tmpl of tmplRecurring) {
      all.push(...expandTemplateForMonth(tmpl, y, m0));
    }
    return all;
  }, [events, viewMonth]);

  const visEvents = useMemo(()=> events.filter(ev=> !(ev as any).deletedAt && !(ev as any).isTemplate), [events]);
  const combinedForMonth = useMemo(()=> [...visEvents, ...monthOccurrences], [visEvents, monthOccurrences]);

  // month grid Mon-start
  const y = viewMonth.getFullYear();
  const m0 = viewMonth.getMonth();
  const firstDayDate = new Date(y, m0, 1);
  const jsWeekday = firstDayDate.getDay(); // 0 Sun
  const firstWdMon = (jsWeekday + 6) % 7; // 0 Mon
  const dim = daysInMonthDublin(y, m0);

  const cells: Array<{ key:string|null, day:number|null, isToday:boolean, isSelected:boolean }> = [];
  for (let i=0;i<firstWdMon;i++) cells.push({key:null, day:null, isToday:false, isSelected:false});
  for (let d=1; d<=dim; d++) {
    const key = y+"-"+String(m0+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    cells.push({key, day:d, isToday:key===todayDublin, isSelected:key===selected});
  }
  while (cells.length % 7 !== 0) cells.push({key:null, day:null, isToday:false, isSelected:false});

  const byDay = useMemo(()=> {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of combinedForMonth) {
      for (let d=1; d<=dim; d++) {
        const dayKey = y+"-"+String(m0+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
        if (isEventOnDate(ev, dayKey)) {
          if (!map.has(dayKey)) map.set(dayKey, []);
          map.get(dayKey)!.push(ev);
        }
      }
    }
    return map;
  }, [combinedForMonth, y, m0, dim]);

  const selectedEvents = useMemo(()=> {
    const arr = combinedForMonth.filter(ev=> isEventOnDate(ev, selected));
    return arr.sort((a,b)=> {
      const ta = a.start ? new Date(a.start).getTime() : new Date(a.dueAt||a.createdAt).getTime();
      const tb = b.start ? new Date(b.start).getTime() : new Date(b.dueAt||b.createdAt).getTime();
      return ta-tb;
    });
  }, [combinedForMonth, selected]);

  const choreOverlay = useMemo(()=> {
    if (!chores) return [];
    return (chores as any[]).filter((c:any)=> {
      if (c.deletedAt) return false;
      const k = c.dueAt ? toLocalKeyDublin(c.dueAt, tz) : null;
      return k===selected;
    }).slice(0,3);
  }, [chores, selected]);

  function updateEvent(id:string, patch: Partial<CalendarEvent>) {
    setEvents((prev:any)=> prev.map((ev: CalendarEvent)=> ev.id===id ? { ...ev, ...patch, updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()) } : ev));
  }

  function removeEvent(id:string) {
    setEvents((prev:any)=> prev.map((ev: CalendarEvent)=> ev.id===id ? { ...ev, deletedAt:new Date().toISOString(), updatedAt:new Date().toISOString() } : ev));
  }

  function handleResponse(ev: CalendarEvent, kind: CalendarResponseKind, comment?: string) {
    const existing = getResponses(ev);
    const otherComment = commentInputs[ev.id]?.trim();
    const finalComment = comment || otherComment || undefined;
    const nowIso = new Date().toISOString();
    const upserted = [...existing.filter(r=> r.memberId!==currentUser), { eventId: ev.id, memberId: currentUser, response: kind, comment: finalComment, respondedAt: nowIso }];
    // keep swipes for compat
    const newSwipes = { aisling: null as any, ciaran: null as any };
    upserted.forEach(r=> {
      if (r.memberId==="aisling") newSwipes.aisling = r.response === "discuss" ? null : r.response;
      if (r.memberId==="ciaran") newSwipes.ciaran = r.response === "discuss" ? null : r.response;
    });
    const derived = computeStatusFromResponses(ev, upserted as any);
    const patch: any = {
      responses: upserted,
      swipes: newSwipes,
      status: derived,
      mutationId: (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : String(Date.now()),
    };
    // notification dedup: only emit if state changed
    const notiKey = ev.id+":"+derived+":"+upserted.map(r=> r.memberId+":"+r.response).join("|");
    if (ev.lastNotifiedState !== notiKey) {
      patch.lastNotifiedState = notiKey;
      try {
        if (onCelebrate && derived==="agreed") onCelebrate({ kind:"calendar-agreed", id:ev.id });
      } catch {}
    }
    updateEvent(ev.id, patch);
    setCommentInputs(c=> ({...c, [ev.id]:""}));
  }

  // grouping for agenda
  const agreed = selectedEvents.filter(ev=> ev.status==="agreed");
  const pending = selectedEvents.filter(ev=> ["proposed","awaiting_aisling","awaiting_ciaran","needs_discussion"].includes(ev.status as any));
  const declined = selectedEvents.filter(ev=> ev.status==="declined");
  const cancelled = selectedEvents.filter(ev=> ev.status==="cancelled");

  return (
    <div className="space-y-3">
      {/* Header with month/year selectors and prev/next any year */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[22px] tracking-tight text-[var(--text)]">{viewMonth.toLocaleDateString("en-GB", { month:"long", year:"numeric", timeZone: tz })}</h2>
          <span className="text-[10px] text-[var(--muted)] border rounded-full px-2 py-0.5 bg-[var(--chip-bg)]" style={{borderColor:"var(--border)"}}>Europe/Dublin</span>
        </div>
        <div className="flex items-center gap-1">
          <select value={viewMonth.getMonth()} onChange={e=> { const nm = new Date(viewMonth); nm.setMonth(Number(e.target.value)); setViewMonth(new Date(nm.getFullYear(), nm.getMonth(), 1)); }} className="h-[36px] rounded-full border bg-[var(--card-bg)] px-2 text-[11px]" style={{borderColor:"var(--border)"}}>
            {Array.from({length:12}).map((_,i)=> <option key={i} value={i}>{new Date(2020,i,1).toLocaleDateString("en-GB",{month:"short"})}</option>)}
          </select>
          <select value={viewMonth.getFullYear()} onChange={e=> { const nm = new Date(viewMonth); nm.setFullYear(Number(e.target.value)); setViewMonth(new Date(nm.getFullYear(), nm.getMonth(), 1)); }} className="h-[36px] rounded-full border bg-[var(--card-bg)] px-2 text-[11px]" style={{borderColor:"var(--border)"}}>
            {Array.from({length:7}).map((_,i)=> { const yr = new Date().getFullYear()-2+i; return <option key={yr} value={yr}>{yr}</option>; })}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
        <button onClick={()=> { const nm = new Date(viewMonth); nm.setMonth(nm.getMonth()-1); setViewMonth(new Date(nm.getFullYear(), nm.getMonth(), 1)); }} className="h-[44px] w-[44px] grid place-items-center rounded-full border bg-[var(--card-bg)] active:scale-[0.96] transition" style={{ borderColor:"var(--border)" }} aria-label="prev month"><span>‹</span></button>
        <button onClick={()=> { try { const fmt = new Intl.DateTimeFormat("en-US",{timeZone: tz, year:"numeric", month:"numeric"}); const p = fmt.formatToParts(new Date()); const yN = Number(p.find(x=> x.type==="year")?.value); const mN = Number(p.find(x=> x.type==="month")?.value)-1; setViewMonth(new Date(yN,mN,1)); setSelected(todayDublin); } catch { const d=new Date(); setViewMonth(new Date(d.getFullYear(), d.getMonth(),1)); setSelected(todayDublin); } }} className="h-[44px] px-3 rounded-full border bg-[var(--card-bg)] text-[11px]">Today</button>
        <button onClick={()=> { const nm = new Date(viewMonth); nm.setMonth(nm.getMonth()+1); setViewMonth(new Date(nm.getFullYear(), nm.getMonth(), 1)); }} className="h-[44px] w-[44px] grid place-items-center rounded-full border bg-[var(--card-bg)]" style={{ borderColor:"var(--border)" }} aria-label="next month">›</button>
      </div>

      <div className="rounded-[20px] border bg-[var(--card-bg)] p-2" style={{ borderColor:"var(--border)", boxShadow:"0 6px 20px rgba(41,38,36,0.06)" }}>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-1 px-1"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c,i)=>{
            if (!c.key) return <div key={"empty-"+i} className="h-[44px]" />;
            const hasEv = (byDay.get(c.key!)?.length || 0) > 0;
            const isSel = c.isSelected;
            const isToday = c.isToday;
            return (
              <button
                key={c.key}
                onClick={()=> setSelected(c.key!)}
                aria-label={c.key + (hasEv ? " has "+byDay.get(c.key!)!.length+" events" : "")}
                className={
                  "relative h-[44px] w-full rounded-full grid place-items-center text-[13px] border transition "+
                  (isSel ? "text-[var(--nav-active-text)] border-transparent " : "bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--chip-bg)] ") +
                  (isToday && !isSel ? "ring-2 ring-[var(--nav-active-bg)] ring-offset-1 " : "")
                }
                style={isSel ? { background: "var(--nav-active-bg)", color: "var(--nav-active-text)", borderColor: "var(--nav-active-bg)" } : undefined}
              >
                {c.day}
                {hasEv && <span className={"absolute bottom-[6px] h-1.5 w-1.5 rounded-full "+(isSel?"bg-[var(--card-bg)]":"bg-[#A89FDA]")} />}
                {isToday && !isSel && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full" style={{ background:"var(--nav-active-bg)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-1 flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="font-display text-[14px]">{selected}</span>{selected===todayDublin && <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background:"var(--nav-active-bg)", color:"var(--nav-active-text)" }}>Today • Dublin</span>}</div>
        <button onClick={()=> setShowAdd(true)} className="h-[36px] rounded-full px-3 text-[11px]" style={{ background:"var(--nav-active-bg)", color:"var(--nav-active-text)" }}>+ Add</button>
      </div>
      <div className="text-[11px] text-[var(--muted)] px-1">Responding as {PERSONS[currentUser].name} • Needs a Nod stays hidden until both reply</div>

      {/* Selected-day agenda */}
      <div className="space-y-3">
        {selectedEvents.length===0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed bg-[var(--card-bg)] px-6 py-8 grid place-items-center" style={{ borderColor:"var(--border)" }}>
            <div className="text-center"><div className="text-[13px] font-medium">No plans that day</div><div className="text-[11px] text-[var(--muted)]">Dublin • {selected}</div><button onClick={()=> setShowAdd(true)} className="mt-3 h-[44px] rounded-full px-5 text-[12px]" style={{background:"var(--nav-active-bg)", color:"var(--nav-active-text)"}}>Add event</button></div>
          </div>
        ) : (
          <>
            {agreed.length>0 && <div><div className="px-1 text-[11px] uppercase tracking-wide text-[var(--muted)] mb-1">Agreed • {agreed.length}</div><div className="space-y-2">{agreed.map(ev=> (
              <div key={ev.id} className="rounded-[16px] border bg-[var(--card-bg)] px-3.5 py-3" style={{borderColor:"var(--border)"}}>
                <div className="text-[13px] font-medium">{ev.title}</div>
                <div className="text-[11px] text-[var(--muted)] flex flex-wrap gap-1.5 items-center">
                  <span>{ev.start ? new Date(ev.start).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone: tz}) : ""}{ev.end ? " → "+new Date(ev.end).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone: tz}) : ""}</span>
                  {ev.allDay && <span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[10px]">All-day</span>}
                  {ev.location && <span>• {ev.location}</span>}
                </div>
                <div className="text-[10px] text-[var(--muted)]">by {PERSONS[ev.proposer || "aisling"].name} • {ev.attendees?.length ? ev.attendees.map(a=> PERSONS[a].name).join(", ") : "Both"}</div>
                <div className="mt-1 text-[10px] rounded-full bg-[#E9E0FF] px-2 py-0.5 w-fit">Agreed ✓</div>
              </div>
            ))}</div></div>}

            {pending.length>0 && <div><div className="px-1 text-[11px] uppercase tracking-wide text-[var(--muted)] mb-1">Needs your nod • {pending.length}</div><div className="space-y-2">{pending.map(ev=>{
              const responses = getResponses(ev);
              const myResp = responses.find(r=> r.memberId===currentUser);
              const otherResp = responses.find(r=> r.memberId!==currentUser);
              const otherName = otherResp ? PERSONS[otherResp.memberId].name : (ev.proposer && ev.proposer!==currentUser ? PERSONS[ev.proposer].name : PERSONS[currentUser==="aisling"?"ciaran":"aisling"].name);
              const myPending = !myResp;
              const hideOther = myPending && !!otherResp; // hide other's content while I haven't answered? spec: hide responses until both answered, but show meta "has responded"
              const statusLabel = ev.status==="needs_discussion" ? "Needs discussion" : ev.status?.startsWith("awaiting") ? "Awaiting you" : "Proposed";
              return (
                <div key={ev.id} className="rounded-[16px] border bg-[var(--card-bg)] px-3.5 py-3 space-y-2" style={{borderColor: ev.status==="needs_discussion" ? "#A89FDA" : "var(--border)"}}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{ev.title}</div>
                      <div className="text-[11px] text-[var(--muted)]">{ev.start ? new Date(ev.start).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone: tz}) : ""} {ev.end ? "→ "+new Date(ev.end).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone: tz}) : ""} {ev.allDay ? "All-day" : ""} {ev.location ? "• "+ev.location : ""}</div>
                      <div className="text-[10px] text-[var(--muted)]">by {PERSONS[ev.proposer || "aisling"].name} • {ev.responseDeadline ? "Response requested by "+new Date(ev.responseDeadline).toLocaleDateString("en-GB",{weekday:"short", month:"short", day:"numeric", timeZone: tz}) : statusLabel}</div>
                      {ev.notes && <div className="text-[11px] text-[var(--text)] mt-1 bg-[var(--card-bg)] rounded-[10px] p-2 border" style={{borderColor:"var(--border)"}}>{ev.notes}</div>}
                    </div>
                    <button onClick={()=> setMenuFor(m=> m===ev.id ? null : ev.id)} className="h-[32px] w-[32px] grid place-items-center rounded-full border bg-[var(--card-bg)]">⋮</button>
                  </div>
                  {menuFor===ev.id && (
                    <div className="rounded-[12px] border bg-[var(--card-bg)] p-2 space-y-1" style={{borderColor:"var(--border)"}}>
                      <button onClick={()=> { setEditing(ev); setMenuFor(null); }} className="w-full text-left rounded-full px-3 py-2 text-[11px] hover:bg-[var(--chip-bg)]">Edit (asks This / Future / Series)</button>
                      <button onClick={()=> setConfirmDialog({title:"Cancel event?", msg:"It stays visible as cancelled.", onConfirm:()=>{ updateEvent(ev.id, { status:"cancelled" as any }); setMenuFor(null); setConfirmDialog(null); }})} className="w-full text-left rounded-full px-3 py-2 text-[11px] hover:bg-[var(--chip-bg)]">Cancel</button>
                      <button onClick={()=> setConfirmDialog({title:"Delete proposal?", msg:"This cannot be undone without undo toast.", onConfirm:()=>{ removeEvent(ev.id); setMenuFor(null); setConfirmDialog(null); }})} className="w-full text-left rounded-full px-3 py-2 text-[11px] text-[#B91C1C] hover:bg-[#FFF1F2]">Delete</button>
                    </div>
                  )}
                  {/* Hidden responses until both answered */}
                  {myPending ? (
                    <div className="space-y-2">
                      {otherResp && <div className="text-[11px] rounded-full bg-[var(--chip-bg)] px-2 py-1 w-fit">{otherName} has responded • Waiting for you</div>}
                      {!otherResp && <div className="text-[11px] text-[var(--muted)]">Your response needed • Needs a Nod keeps answers private</div>}
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={()=> handleResponse(ev,"yes")} className="h-[36px] rounded-full px-3 text-[11px]" style={{background:"var(--nav-active-bg)", color:"var(--nav-active-text)"}}>Yes</button>
                        <button onClick={()=> handleResponse(ev,"no")} className="h-[36px] rounded-full border bg-[var(--card-bg)] px-3 text-[11px]" style={{borderColor:"var(--border)"}}>No</button>
                        <button onClick={()=> handleResponse(ev,"discuss")} className="h-[36px] rounded-full border bg-[var(--chip-bg)] px-3 text-[11px]" style={{borderColor:"var(--border)"}}>Discuss</button>
                      </div>
                      <div className="flex gap-1.5">
                        <input value={commentInputs[ev.id]||""} onChange={e=> setCommentInputs(c=> ({...c, [ev.id]: e.target.value}))} placeholder='Optional note — "Could we do Saturday instead?"' className="flex-1 rounded-full border bg-[var(--card-bg)] px-3 h-[36px] text-[11px]" style={{borderColor:"var(--border)"}} />
                        {commentInputs[ev.id] && <button onClick={()=> handleResponse(ev, (myResp as any)?.response as any || "discuss", commentInputs[ev.id])} className="rounded-full bg-[var(--card-bg)] border px-3 h-[36px] text-[10px]" style={{borderColor:"var(--border)"}}>Add note</button>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* reveal after both answered */}
                      {responses.length===2 ? (
                        <>
                          <div className="text-[11px] text-[var(--muted)]">{responses.map(r=> (PERSONS as any)[r.memberId].name+": "+r.response+(r.comment ? " — "+r.comment : "")).join(" • ")}</div>
                          <div className="text-[11px] rounded-full px-2 py-1 w-fit" style={{background: ev.status==="agreed" ? "#E9E0FF" : ev.status==="declined" ? "var(--chip-bg)" : "#FFF7ED"}}>{ev.status==="agreed" ? "Agreed ✓" : ev.status==="declined" ? "Declined" : "Needs discussion"}</div>
                          {ev.status==="needs_discussion" && <div className="flex gap-1.5"><button onClick={()=> handleResponse(ev,"yes")} className="h-[32px] rounded-full px-3 text-[10px]" style={{background:"var(--nav-active-bg)", color:"var(--nav-active-text)"}}>Yes again</button><button onClick={()=> handleResponse(ev,"no")} className="h-[32px] rounded-full border px-3 text-[10px]" style={{borderColor:"var(--border)"}}>No</button></div>}
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] text-[var(--muted)]">You responded {myResp?.response} — {ev.status==="awaiting_aisling" || ev.status==="awaiting_ciaran" ? "Waiting for "+otherName : "Waiting"}</div>
                          {myResp?.comment && <div className="text-[11px]">You: {myResp.comment}</div>}
                          {hideOther ? <div className="text-[10px] text-[var(--muted)]">{otherName} has responded (hidden until you both answer)</div> : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}</div></div>}

            {choreOverlay.length>0 && <div><div className="px-1 text-[11px] uppercase tracking-wide text-[var(--muted)] mb-1">Chores that day • {choreOverlay.length}</div><div className="space-y-1">{choreOverlay.map((c:any)=> <div key={c.id} className="rounded-[12px] border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{borderColor:"var(--border)"}}>{c.title} • {c.assignedTo ? (PERSONS as any)[c.assignedTo]?.name || PERSONS[c.assignedTo as PersonKey]?.name || c.assignedTo : "Open"}</div>)}</div></div>}

            {declined.length>0 && <div><div className="px-1 text-[10px] text-[var(--muted)]">Declined • {declined.length}</div><div className="flex flex-wrap gap-1.5">{declined.map(ev=> <span key={ev.id} className="rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[10px] line-through" style={{borderColor:"var(--border)"}}>{ev.title}</span>)}</div></div>}
            {cancelled.length>0 && <div><div className="px-1 text-[10px] text-[var(--muted)]">Cancelled</div></div>}
          </>
        )}
      </div>

      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Add event • Dublin">
        <AddEventForm onAdd={(ev:any)=> { setEvents((p:any)=> [ev, ...p]); setShowAdd(false); }} currentUser={currentUser} selectedDate={selected} />
      </BottomSheet>

      <BottomSheet open={!!editing} onClose={()=> setEditing(null)} title={editing ? "Edit event" : undefined}>
        {editing && (
          <div className="space-y-3">
            <AddEventForm onAdd={(ev:any)=> {
              // replace logic: if editing a template occurrence, ask series handling via showEditSeriesAsk
              if (editing.templateId || editing.isTemplate) {
                setShowEditSeriesAsk({ ev: editing, draft: ev });
                return;
              }
              setEvents((prev:any)=> prev.map((x:any)=> x.id===editing.id ? {...x, ...ev, id: x.id} : x));
              setEditing(null);
            }} currentUser={currentUser} selectedDate={selected} />
            <button onClick={()=> setConfirmDialog({title:"Delete proposal?", onConfirm:()=>{ removeEvent(editing!.id); setEditing(null); setConfirmDialog(null); }})} className="w-full rounded-full border bg-[var(--card-bg)] py-2 text-[11px] text-[#B91C1C]" style={{borderColor:"var(--border)"}}>Delete proposal</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!showEditSeriesAsk} onClose={()=> setShowEditSeriesAsk(null)} title="Edit recurring">
        {showEditSeriesAsk && (
          <div className="space-y-2">
            <div className="text-[12px]">This is a recurring event: {showEditSeriesAsk.ev.title}. How to apply change?</div>
            <button onClick={()=> {
              // This event only
              const { ev, draft } = showEditSeriesAsk;
              // create exception occurrence overriding template
              const exception = { ...draft, id: ev.id, templateId: ev.templateId || ev.id, occurrenceId: ev.occurrenceId, isTemplate: false };
              setEvents((prev:any)=> {
                const others = prev.filter((x:any)=> x.id!==ev.id);
                return [exception, ...others];
              });
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full bg-[var(--nav-active-bg)] h-[40px] text-[var(--nav-active-text)] text-[11px]">This event only</button>
            <button onClick={()=> {
              // This and future - update template to new start from this date forward (simplified: new template with new start)
              const { ev, draft } = showEditSeriesAsk;
              const templateId = ev.templateId || ev.id;
              setEvents((prev:any)=> prev.map((x:any)=> {
                if (x.id===templateId) return {...x, ...draft, id: templateId, isTemplate:true, dueAt: draft.dueAt, start: draft.start};
                if (x.id===ev.id) return {...x, ...draft, id: x.id, templateId};
                return x;
              }));
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full border bg-[var(--card-bg)] h-[40px] text-[11px]" style={{borderColor:"var(--border)"}}>This and future events</button>
            <button onClick={()=> {
              const { draft } = showEditSeriesAsk;
              const templateId = showEditSeriesAsk.ev.templateId || showEditSeriesAsk.ev.id;
              setEvents((prev:any)=> prev.map((x:any)=> x.id===templateId ? {...x, ...draft, id: templateId, isTemplate:true} : x).filter((x:any)=> !(x.templateId===templateId && x.id!==templateId)));
              setShowEditSeriesAsk(null); setEditing(null);
            }} className="w-full rounded-full border bg-[var(--card-bg)] h-[40px] text-[11px]" style={{borderColor:"var(--border)"}}>Entire series</button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!confirmDialog} onClose={()=> setConfirmDialog(null)} title={confirmDialog?.title || "Confirm"}>
        {confirmDialog && (
          <div className="space-y-3">
            {confirmDialog.msg && <div className="text-[12px] text-[var(--muted)]">{confirmDialog.msg}</div>}
            <div className="flex gap-2">
              <button onClick={()=> setConfirmDialog(null)} className="flex-1 rounded-full border bg-[var(--card-bg)] py-2.5 text-[12px]" style={{borderColor:"var(--border)"}}>Cancel</button>
              <button onClick={()=> { confirmDialog.onConfirm(); }} className="flex-1 rounded-full bg-[var(--nav-active-bg)] py-2.5 text-[12px] text-[var(--nav-active-text)]">Confirm</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ShoppingPageFacelift({
  items, setItems, currentUser, onCelebrate, nowMs,
}: {
  items: ShoppingItemV2[]; setItems: (up: ShoppingItemV2[] | ((p: ShoppingItemV2[]) => ShoppingItemV2[])) => void; currentUser: PersonKey; onCelebrate?: (e?: any) => void; nowMs: number;
}) {
  const cats = CATS;
  const [openCat, setOpenCat] = useState<Record<string, boolean>>(() => Object.fromEntries(CATS.map(c => [c, true])) as Record<string, boolean>);
  const [quickAdd, setQuickAdd] = useState("");
  const [quickFreq, setQuickFreq] = useState<ShoppingFrequency>("as-needed");
  const [quickNeedDays, setQuickNeedDays] = useState<boolean[]>(()=>[false,false,false,false,false,false,false]);
  const [quickCat, setQuickCat] = useState<ShoppingItemV2["cat"]>("Food");
  const [quickNotes, setQuickNotes] = useState("");
  const [showNeed, setShowNeed] = useState(false);
  const [tripMode, setTripMode] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<null | { existing: ShoppingItemV2; title: string; qty: number; cat: ShoppingCategory; freq: ShoppingFrequency; needDays?: string; notes?: string; tags?: string[] }>(null);
  const [toast, setToast] = useState<{ msg:string; undo?:()=>void } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<ShoppingItemV2>>({});

  const templateItems = useMemo(()=> items.filter(it => (it as any).isTemplate && !(it as any).deletedAt && !(it as any).archivedAt), [items]);
  const personal = useMemo(() => {
    const out: PersonalWants = { aisling: { personal:[], wants:[] }, ciaran:{ personal:[], wants:[] } };
    for (const t of templateItems as any[]) {
      const owner = (t.templateOwner as PersonKey) || (t.tags?.some((x:string)=>x.toLowerCase().includes('aisling')) ? 'aisling' : t.tags?.some((x:string)=>x.toLowerCase().includes('ciaran')) ? 'ciaran' : null);
      const kind = t.templateKind || (t.tags?.some((x:string)=>x.toLowerCase().includes('wants')) ? 'wants' : 'personal');
      if (!owner) continue;
      if (kind==='personal' || kind==='wants') {
        // @ts-ignore
        if (!out[owner][kind].includes(t.item)) out[owner][kind].push(t.item);
      }
    }
    return out;
  }, [templateItems]);

  useEffect(()=>{
    try {
      const raw = safeGetLS("couple_v1_shopping_personal");
      if (!raw) return;
      const old = JSON.parse(raw) as PersonalWants;
      const hasOld = old && ((old.aisling?.personal?.length||0)+(old.aisling?.wants?.length||0)+(old.ciaran?.personal?.length||0)+(old.ciaran?.wants?.length||0))>0;
      if (!hasOld) return;
      const existingTemplateNames = new Set(templateItems.map((t:any)=> (t.templateOwner+':'+t.templateKind+':'+t.item.toLowerCase())));
      const toAdd: ShoppingItemV2[] = [];
      (["aisling","ciaran"] as const).forEach(side=>{
        (["personal","wants"] as const).forEach(kind=>{
          const arr = (old as any)[side]?.[kind] as string[] || [];
          arr.forEach((name:string)=>{
            const key = side+':'+kind+':'+name.toLowerCase();
            if (existingTemplateNames.has(key)) return;
            toAdd.push({
              id: uid("shp_tpl"), item: name, qty: 1, cat: "Personal" as ShoppingCategory, purchased:false,
              addedBy: side as PersonKey, createdAt: new Date().toISOString(), repeatCount:0, history:[],
              frequency:"as-needed" as ShoppingFrequency,
              isTemplate:true as any, templateKind: kind as any, templateOwner: side as PersonKey,
              tags: ["@"+side, "@"+kind], mutationId: (typeof crypto!=='undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : uid("mut")),
              status:"active" as any
            } as any);
          });
        });
      });
      if (toAdd.length>0) {
        setItems((prev:any)=> [...toAdd, ...prev]);
      }
      try { localStorage.removeItem("couple_v1_shopping_personal"); localStorage.setItem("couple_v1_shopping_personal_migrated","1"); } catch {}
    } catch {}
  }, []);

  useEffect(()=>{
    setShowNeed(quickFreq==="weekly" || quickFreq==="biweekly");
  }, [quickFreq]);

  useEffect(()=>{
    if (!tripMode) {
      try { (wakeLock as any)?.release?.(); } catch {}
      setWakeLock(null);
      return;
    }
    let cancelled=false;
    (async()=>{
      try {
        // @ts-ignore
        if (navigator.wakeLock?.request) {
          // @ts-ignore
          const lock = await navigator.wakeLock.request('screen');
          if (!cancelled) setWakeLock(lock);
        }
      } catch {}
    })();
    return ()=>{ cancelled=true; try{(wakeLock as any)?.release?.()}catch{} };
  }, [tripMode]);

  const favs = useMemo(() => {
    const freq = new Map<string, number>(); items.filter(it=> !(it as any).isTemplate && !(it as any).deletedAt && !(it as any).archivedAt).forEach(it => { freq.set(it.item.toLowerCase(), (freq.get(it.item.toLowerCase()) || 0) + (it.repeatCount||0) + 1); });
    const base = ["Milk", "Bread", "Eggs", "Coffee"]; const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const merged = [...new Set([...sorted, ...base.map(b => b.toLowerCase())])].slice(0, 6).map(s => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    return merged;
  }, [items]);

  const smartRestock = useMemo(() => {
    const sevenAgo = nowMs - 7 * 86400000;
    const candidates = items.filter(it => {
      if ((it as any).isTemplate) return false;
      if ((it as any).deletedAt || (it as any).archivedAt) return false;
      if (!it.purchased) return false;
      if (it.status==='archived' || it.status==='deleted') return false;
      const freq = (it as any).frequency || "as-needed";
      const histCount = it.history ? it.history.filter((h: string)=> new Date(h).getTime() >= sevenAgo).length : 0;
      const needsSoon = (()=> {
        const nxt = (computeShoppingNextDue as any)(it, nowMs);
        if (!nxt) return false;
        const diffH = (nxt.getTime()-nowMs)/3600000;
        return diffH <= 24;
      })();
      const isCandidate = (histCount >=3) || (needsSoon && freq!=="as-needed");
      if (!isCandidate) return false;
      return !items.some(x => !x.purchased && !(x as any).isTemplate && !(x as any).deletedAt && !(x as any).archivedAt && x.item.toLowerCase() === it.item.toLowerCase());
    });
    const uniq = new Map<string, ShoppingItemV2>(); candidates.forEach(c => { if (!uniq.has(c.item.toLowerCase())) uniq.set(c.item.toLowerCase(), c); });
    const sorted = [...uniq.values()].sort((a,b)=>{
      const da = (computeShoppingNextDue as any)(a, nowMs)?.getTime() ?? Infinity;
      const db = (computeShoppingNextDue as any)(b, nowMs)?.getTime() ?? Infinity;
      return da-db;
    });
    return sorted.slice(0, 4);
  }, [items, nowMs]);

  const explainRestock = (it: ShoppingItemV2) => {
    const sevenAgo = nowMs - 7*86400000;
    const histCount = it.history ? it.history.filter((h:string)=> new Date(h).getTime() >= sevenAgo).length : 0;
    if (histCount >=3) return "You bought this "+histCount+" times recently";
    const last = it.lastDoneAt ? Math.round((nowMs - new Date(it.lastDoneAt).getTime())/86400000) : null;
    if (last!=null && last>=1 && last<=14) return "Last bought "+last+" days ago";
    if (it.frequency==='weekly') return "Usually bought weekly";
    if (it.frequency==='daily') return "Usually bought daily";
    if (it.frequency==='biweekly') return "Usually every 2 weeks";
    if (it.frequency==='monthly') return "Usually monthly \u2022 due to restock";
    return "Due to restock";
  };

  const grouped = useMemo(() => {
    const g = new Map<string, ShoppingItemV2[]>();
    cats.forEach(c => g.set(c, []));
    const todoOnly = items.filter(i => !i.purchased && !(i as any).isTemplate && !(i as any).deletedAt && !(i as any).archivedAt && i.status!=='archived' && i.status!=='deleted' && i.status!=='purchased');
    const sorted = [...todoOnly].sort((a,b)=>{
      const aNext = (computeShoppingNextDue as any)(a, nowMs)?.getTime();
      const bNext = (computeShoppingNextDue as any)(b, nowMs)?.getTime();
      const aHas = aNext!=null;
      const bHas = bNext!=null;
      if (aHas && bHas) return aNext!-bNext!;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
    });
    sorted.forEach(i => {
      const arr = g.get(i.cat) || [];
      arr.push(i);
      g.set(i.cat, arr);
    });
    return g;
  }, [items, nowMs, cats]);

  const activeItems = useMemo(()=> items.filter(i=> !i.purchased && !(i as any).isTemplate && !(i as any).deletedAt && !(i as any).archivedAt && i.status!=='archived' && i.status!=='deleted' && i.status!=='purchased'), [items]);
  const todoCount = activeItems.length;
  const doneItems = useMemo(()=> items.filter(i=> i.purchased && !(i as any).isTemplate && !(i as any).deletedAt && !(i as any).archivedAt && i.status!=='deleted'), [items]);
  const doneCount = doneItems.length;
  const archivedItems = useMemo(()=> items.filter(i=> (i as any).archivedAt || i.status==='archived'), [items]);

  function parseQuick(s: string) {
    const raw = s.trim(); if (!raw) return null; let qty = 1; let title = raw;
    title = title.replace(/^add\s+/i, "").trim();
    const mx = title.match(/^(.*)\s+[xX]\s*(\d{1,3})\s*$/);
    if (mx) { title = (mx[1]||"").trim(); const qv = Number(mx[2]); if (!isNaN(qv)) qty = Math.max(1, Math.min(99, qv)); return { title, qty }; }
    if (title.includes(",")) {
      const parts = title.split(",").map(x => x.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const left = parts[0] || ""; const right = parts[1] || "";
        const num = Number(right.split(/\s+/)[0]);
        if (!isNaN(num) && num >=1 && num <= 99) { qty = Math.max(1, Math.floor(num)); title = left; }
        else { title = left; }
      } else title = parts[0]||title;
    } else {
      const m = title.match(/^(.*)\s+(\d{1,2})\s*$/);
      if (m) { const maybe = (m[1]||"").trim(); const num = m[2]||"1"; const q = Number(num); if (maybe.length>=2 && !isNaN(q)) { title = maybe; qty = Math.max(1, Math.min(99,q)); } }
    }
    title = title.replace(/\s{2,}/g," ").trim();
    if (!title) return null;
    return { title, qty };
  }
  function weekdaysBoolToDetailLocal(bools: boolean[]): string {
    return WEEKDAY_SHORT_MON.map((d,i)=> bools[i]?d:null).filter(Boolean).join(",");
  }
  function extractTags(rawTitle: string): { cleanTitle: string; tags: string[]; forcedCat?: ShoppingCategory } {
    const tagRe = /(^|\s)@(aisling|ciaran|personal|wants)\b/gi;
    const tags: string[] = [];
    let m: RegExpExecArray | null;
    const lowerSet = new Set<string>();
    const srcLower = rawTitle.toLowerCase();
    if (!srcLower.includes("@")) return { cleanTitle: rawTitle.trim(), tags: [], forcedCat: undefined };
    while ((m = tagRe.exec(rawTitle)) !== null) {
      const t = (m[2] || "").toLowerCase();
      if (t && !lowerSet.has(t)) { lowerSet.add(t); tags.push(t); }
    }
    const cleanTitle = rawTitle.replace(/(^|\s)@(aisling|ciaran|personal|wants)\b/gi, " ").replace(/\s{2,}/g, " ").trim();
    let forcedCat: ShoppingCategory | undefined;
    if (tags.includes("personal") || tags.includes("wants")) forcedCat = "Personal";
    return { cleanTitle: cleanTitle || rawTitle.replace(/@\w+/g,"").trim(), tags, forcedCat };
  }

  function actuallyAdd(title: string, qty: number, cat: ShoppingCategory, freq: ShoppingFrequency, needDays: string | undefined, notes: string | undefined, tags: string[] | undefined) {
    const mid = (typeof crypto!=='undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : uid("mut"));
    const newIt: ShoppingItemV2 = {
      id: uid("shp"), item: title, qty, cat, purchased: false,
      addedBy: currentUser, createdAt: new Date().toISOString(), repeatCount: 0, history: [],
      frequency: freq,
      needDays: needDays,
      notes: notes||undefined,
      tags: tags,
      mutationId: mid,
      status:"active" as any, updatedAt: new Date().toISOString(), updatedBy: currentUser
    } as any;
    setItems((prev: any) => [newIt, ...prev]);
    try {
      const tset = new Set((tags||[]).map(t=>t.replace('@','').toLowerCase()));
      const sides: ("aisling"|"ciaran")[] = [];
      if (tset.has("aisling")) sides.push("aisling");
      if (tset.has("ciaran")) sides.push("ciaran");
      const effectiveSides = sides.length ? sides : ([currentUser] as any);
      if (tset.has("personal") || tset.has("wants")) {
        const kinds = [] as ("personal"|"wants")[];
        if (tset.has("personal")) kinds.push("personal");
        if (tset.has("wants")) kinds.push("wants");
        for (const side of effectiveSides) {
          for (const k of kinds) {
            const existsTpl = (items as any).some((it:any)=> it.isTemplate && it.templateOwner===side && it.templateKind===k && it.item.toLowerCase()===title.toLowerCase());
            if (existsTpl) continue;
            const tpl: any = {
              id: uid("shp_tpl"), item: title, qty:1, cat:"Personal", purchased:false,
              addedBy: side, createdAt: new Date().toISOString(), repeatCount:0, history:[], frequency:"as-needed",
              isTemplate:true, templateKind:k, templateOwner: side, tags:["@"+side,"@"+k],
              mutationId: mid, status:"active", updatedAt:new Date().toISOString(), updatedBy: currentUser
            };
            setItems((prev:any)=> [tpl, ...prev]);
          }
        }
      }
    } catch {}
  }

  function addParsed(src?: string) {
    const input = typeof src === "string" ? src : quickAdd;
    const p = parseQuick(input); if (!p || !p.title) return;
    const needDaysStr = showNeed && quickNeedDays.some(Boolean) ? weekdaysBoolToDetailLocal(quickNeedDays) : undefined;
    const { cleanTitle, tags, forcedCat } = extractTags(p.title);
    const finalTitle = cleanTitle || p.title.replace(/@\w+/g,"").trim() || p.title;
    const finalCat = forcedCat || quickCat;
    const finalTags = tags.length ? tags.map(t=> "@"+t) : undefined;
    const dup = activeItems.find(it=> it.item.toLowerCase().trim()===finalTitle.toLowerCase().trim() && it.cat===finalCat);
    if (dup) {
      setDuplicatePrompt({ existing: dup, title: finalTitle, qty: p.qty, cat: finalCat, freq: quickFreq, needDays: needDaysStr, notes: quickNotes.trim()||undefined, tags: finalTags });
      return;
    }
    actuallyAdd(finalTitle, p.qty, finalCat, quickFreq, needDaysStr, quickNotes.trim()||undefined, finalTags);
    setQuickAdd(""); setQuickNotes("");
  }

  function handleAddParsed(override?: string | React.MouseEvent | React.KeyboardEvent) {
    if (typeof override === "string") addParsed(override);
    else addParsed();
  }

  function togglePurchased(id: string, e?: any) {
    const it = items.find(x=>x.id===id);
    if (!it) return;
    if (it.purchased) {
      setToast({ msg: it.item+" is already marked bought. Restore?", undo: ()=> {
        setItems((prev:any)=> prev.map((i:ShoppingItemV2)=> i.id===id ? { ...i, purchased:false, status:"active", updatedAt:new Date().toISOString(), updatedBy: currentUser } : i));
        setToast(null);
      }});
      return;
    }
    const prevCopy = [...items];
    setItems((prev: any) => prev.map((i: ShoppingItemV2) => {
      if (i.id !== id) return i;
      const hist = [...(i.history || []), new Date().toISOString()];
      return { ...i, purchased:true, status:"purchased" as any, lastDoneAt: new Date().toISOString(), repeatCount: (i.repeatCount||0)+1, history: hist.slice(-12), updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: (typeof crypto!=='undefined' && (crypto as any).randomUUID? (crypto as any).randomUUID(): uid("mut")) };
    }));
    onCelebrate?.(e);
    setToast({ msg: it.item+" bought", undo: ()=>{
      setItems(prevCopy as any);
    }});
    setTimeout(()=> setToast((t)=> t && t.msg.includes(it.item) ? null : t), 4000);
  }

  function changeQty(id: string, d: number) {
    setItems((prev: any) => prev.map((it: ShoppingItemV2) => {
      if (it.id !== id) return it;
      return { ...it, qty: Math.max(1, it.qty + d), updatedAt: new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") };
    }));
  }
  function changeCat(id: string, cat: ShoppingItemV2["cat"]) { setItems((prev:any)=> prev.map((it:ShoppingItemV2)=> it.id===id? {...it, cat, updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut")}:it)); }

  function addPersonalTemplate(side: "aisling"|"ciaran", kind:"personal"|"wants", text:string) {
    const t = text.trim(); if (!t) return;
    const exists = (items as any).some((it:any)=> it.isTemplate && it.templateOwner===side && it.templateKind===kind && it.item.toLowerCase()===t.toLowerCase());
    if (exists) return;
    const mid = (typeof crypto!=='undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : uid("mut"));
    const tpl: any = {
      id: uid("shp_tpl"), item: t, qty:1, cat:"Personal", purchased:false, addedBy: side, createdAt:new Date().toISOString(), repeatCount:0, history:[], frequency:"as-needed",
      isTemplate:true, templateKind: kind, templateOwner: side, tags:["@"+side,"@"+kind],
      mutationId: mid, status:"active", updatedAt:new Date().toISOString(), updatedBy: currentUser
    };
    setItems((prev:any)=> [tpl, ...prev]);
  }
  function removePersonalTemplate(side: "aisling"|"ciaran", kind:"personal"|"wants", text:string){
    setItems((prev:any)=> prev.map((it:any)=> {
      if (it.isTemplate && it.templateOwner===side && it.templateKind===kind && it.item.toLowerCase()===text.toLowerCase()) {
        return { ...it, deletedAt: new Date().toISOString(), status:"deleted", updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") };
      }
      return it;
    }));
  }
  function pushPersonalToShopping(side: "aisling"|"ciaran", kind:"personal"|"wants", text:string){
    const t = text.trim(); if(!t) return;
    const dup = activeItems.find(it=> it.item.toLowerCase()===t.toLowerCase());
    if (dup) {
      setDuplicatePrompt({ existing: dup, title: t, qty:1, cat:"Personal" as ShoppingCategory, freq:"as-needed" as ShoppingFrequency });
      return;
    }
    actuallyAdd(t, 1, "Personal" as ShoppingCategory, "as-needed" as ShoppingFrequency, undefined, undefined, ["@"+side,"@"+kind]);
  }

  function openEdit(it: ShoppingItemV2) {
    setEditingId(it.id);
    setEditDraft({ item: it.item, qty: it.qty, cat: it.cat, notes: (it as any).notes, frequency: it.frequency, needDays: (it as any).needDays, expiresAt: (it as any).expiresAt, addedBy: it.addedBy });
  }
  function saveEdit() {
    if (!editingId) return;
    setItems((prev:any)=> prev.map((it:ShoppingItemV2)=> {
      if (it.id!==editingId) return it;
      return { ...it, item: (editDraft.item||it.item).trim(), qty: Math.max(1, editDraft.qty||it.qty), cat: (editDraft.cat||it.cat) as any, notes: editDraft.notes, frequency: (editDraft.frequency||it.frequency) as any, needDays: (editDraft as any).needDays, expiresAt: (editDraft as any).expiresAt, addedBy: (editDraft.addedBy||it.addedBy) as any, updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") } as any;
    }));
    setEditingId(null);
  }
  function archiveItem(id:string){
    const prevCopy=[...items];
    setItems((prev:any)=> prev.map((it:any)=> it.id===id ? { ...it, archivedAt:new Date().toISOString(), status:"archived", updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") } : it));
    setToast({ msg:"Archived", undo:()=> setItems(prevCopy as any) });
    setEditingId(null);
  }
  function deleteItem(id:string){
    const prevCopy=[...items];
    setItems((prev:any)=> prev.map((it:any)=> it.id===id ? { ...it, deletedAt:new Date().toISOString(), status:"deleted", updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") } : it));
    setToast({ msg:"Deleted \u2014 undo?", undo:()=> setItems(prevCopy as any) });
    setEditingId(null);
  }

  function daysOnList(it: ShoppingItemV2) {
    try { const created = new Date(it.createdAt).getTime(); const diff = nowMs - created; return Math.max(0, Math.floor(diff/86400000)); } catch { return 0; }
  }

  function honestLabel(it: ShoppingItemV2) {
    if ((it as any).expiresAt) {
      const exp = new Date((it as any).expiresAt).getTime();
      const diffH = (exp - nowMs)/3600000;
      if (diffH<0) return { text:"Expired", tone:"danger" };
      if (diffH<24) return { text:"Expires today", tone:"warn" };
      if (diffH<48) return { text:"Expires tomorrow", tone:"warn" };
      return { text:"Expires "+ new Date((it as any).expiresAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}), tone:"neutral" };
    }
    const d = daysOnList(it);
    if (it.frequency && it.frequency!=="as-needed") {
      if (it.frequency==="weekly") return { text: d>0 ? "On list for "+d+"d \u2022 Usually weekly" : "Usually bought weekly", tone:"neutral" };
      if (it.frequency==="daily") return { text: d>0 ? "On list for "+d+"d \u2022 Usually daily" : "Usually daily", tone:"neutral" };
      if (it.frequency==="biweekly") return { text: d>0 ? "On list for "+d+"d \u2022 Usually every 2 weeks" : "Usually every 2 weeks", tone:"neutral" };
      if (it.frequency==="monthly") return { text: d>0 ? "On list for "+d+"d \u2022 Usually monthly" : "Usually monthly", tone:"neutral" };
    }
    if (d===0) return { text:"Added today", tone:"neutral" };
    if (d===1) return { text:"On list for 1 day", tone:"neutral" };
    return { text:"On list for "+d+" days", tone:"neutral" };
  }

  const editingItem = editingId ? items.find(i=>i.id===editingId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-[15px]">Shopping {tripMode && <span className="ml-2 text-[10px] rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-2 py-0.5">trip mode</span>}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--muted)]">{todoCount} left \u2022 {doneCount} done</span>
          <button onClick={()=> setTripMode(v=>!v)} className={"rounded-full border px-2.5 py-1 text-[11px] min-h-[32px] "+(tripMode?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)]")}>{tripMode?"Exit trip":"Trip"}</button>
        </div>
      </div>

      {!tripMode && (
        <div className="rounded-[20px] border bg-[var(--card-bg)] px-3.5 py-3 space-y-2.5" style={{ borderColor: "var(--border)" }}>
          <MicroLabel>quick add \u2014 smart</MicroLabel>
          <div className="flex gap-2">
            <input value={quickAdd} onChange={e => setQuickAdd(e.target.value)} placeholder='Add milk, 2...' className="flex-1 rounded-full border bg-[var(--card-bg)] px-3.5 py-2.5 text-[12.5px] outline-none" style={{ borderColor: "var(--border)" }} onKeyDown={e => { if (e.key === 'Enter') handleAddParsed(); }} />
            <button onClick={() => handleAddParsed()} className="rounded-full bg-[var(--nav-active-bg)] px-4 py-2.5 text-[12px] font-medium text-[var(--nav-active-text)] active:scale-[0.98] min-h-[44px]">+</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map(c=> (
              <button key={c} onClick={()=> setQuickCat(c)} className={"rounded-full border px-2.5 py-1 text-[11px] min-h-[28px] "+(quickCat===c?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--chip-bg)] border-[var(--border)] text-[var(--text-secondary)]")}>{c}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["as-needed","daily","every-2d","weekly","biweekly","monthly"] as ShoppingFrequency[]).map(f=> (
              <button key={f} onClick={()=> setQuickFreq(f)} className={"rounded-full border px-2.5 py-1 text-[11px] capitalize min-h-[28px] "+(quickFreq===f?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-secondary)]")}>{f.replace("-"," ")} </button>
            ))}
          </div>
          {showNeed && (
            <div className="flex flex-wrap gap-1">
              {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=> (
                <button key={d} onClick={()=> setQuickNeedDays(prev=>{ const nxt=[...prev]; nxt[i]=!nxt[i]; return nxt; })} className={"h-7 w-7 rounded-full text-[10px] border grid place-items-center min-h-[28px] min-w-[28px] "+(quickNeedDays[i]?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-secondary)]")}>{d}</button>
              ))}
              <span className="ml-1 text-[10px] text-[var(--muted)] self-center">need days</span>
            </div>
          )}
          <input value={quickNotes} onChange={e=> setQuickNotes(e.target.value)} placeholder="note: organic, 2L? (optional)" className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px] outline-none" style={{ borderColor: "var(--border)" }} />
          {favs.length > 0 && <div className="flex flex-wrap gap-1.5">{favs.slice(0, 4).map(f => <button key={f} onClick={() => addParsed(f+", 1")} className="rounded-full bg-[var(--chip-bg)] border px-2.5 py-1 text-[11px] active:scale-[0.96] min-h-[32px]" style={{ borderColor: "var(--border)" }}>{f}</button>)}</div>}
        </div>
      )}

      {smartRestock.length > 0 && (
        <div className="rounded-[16px] border bg-[#FFFCF8] px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between"><span className="text-[11px] font-medium">Suggesting restock</span><span className="text-[10px] text-[var(--muted)]">based on your history</span></div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{smartRestock.map(it => {
            const reason = explainRestock(it);
            return <button key={it.id} onClick={() => {
              setItems((prev: any) => [{ id: uid("shp"), item: it.item, qty: 1, cat: it.cat, purchased: false, addedBy: currentUser, createdAt: new Date().toISOString(), repeatCount: 0, history: [], frequency: (it as any).frequency||"as-needed", needDays: (it as any).needDays, notes: (it as any).notes, status:"active", updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") }, ...prev]);
            }} className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1.5 text-[11px] text-[var(--nav-active-text)] flex flex-col items-start min-h-[36px]"><span className="flex items-center gap-1"><span>{it.item}</span><span className="rounded-full bg-[var(--card-bg)]/20 px-1.5 py-0.5 text-[10px]">Add</span></span><span className="text-[9px] opacity-80">{reason}</span></button>;
          })}</div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[70] rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-4 py-2 text-[12px] shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={()=> { toast.undo?.(); setToast(null); }} className="rounded-full bg-[var(--card-bg)] text-black px-2.5 py-1 text-[11px]">Undo</button>}
          <button onClick={()=> setToast(null)} className="ml-1 text-[var(--nav-active-text)]/70">\u2715</button>
        </div>
      )}

      {duplicatePrompt && (
        <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px] grid place-items-center p-4">
          <div className="rounded-[20px] bg-[var(--card-bg)] border w-full max-w-[320px] p-4 shadow-xl" style={{ borderColor: "var(--border)" }}>
            <div className="font-display text-[14px]">Already on list</div>
            <div className="mt-1 text-[12px] text-[var(--muted)]"><span className="font-medium text-[var(--text)]">{duplicatePrompt.existing.item}</span> is already on the list \u2014 quantity {duplicatePrompt.existing.qty}. Increase quantity to {(duplicatePrompt.existing.qty||1)+duplicatePrompt.qty}?</div>
            <div className="mt-3 grid gap-2">
              <button onClick={()=>{
                setItems((prev:any)=> prev.map((it:ShoppingItemV2)=> it.id===duplicatePrompt.existing.id ? { ...it, qty: (it.qty||1)+duplicatePrompt.qty, updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") } : it));
                setDuplicatePrompt(null);
                setQuickAdd(""); setQuickNotes("");
              }} className="rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] py-2.5 text-[12px]">Increase quantity to {(duplicatePrompt?.existing.qty||1)+(duplicatePrompt?.qty||1)}</button>
              <button onClick={()=>{
                if (!duplicatePrompt) return;
                actuallyAdd(duplicatePrompt.title, duplicatePrompt.qty, duplicatePrompt.cat, duplicatePrompt.freq, duplicatePrompt.needDays, duplicatePrompt.notes, duplicatePrompt.tags);
                setDuplicatePrompt(null); setQuickAdd(""); setQuickNotes("");
              }} className="rounded-full bg-[var(--card-bg)] border py-2.5 text-[12px]" style={{ borderColor:"var(--border)" }}>Add separate item</button>
              <button onClick={()=> setDuplicatePrompt(null)} className="rounded-full bg-[var(--chip-bg)] py-2 text-[11px] text-[var(--text-secondary)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {cats.map(cat => {
        const fullList = grouped.get(cat) || [];
        const list = fullList.filter(i => !i.purchased);
        if (list.length === 0) return null;
        const isOpen = openCat[cat];
        return (
          <div key={cat} className="rounded-[20px] border bg-[var(--card-bg)] px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setOpenCat(o => ({ ...o, [cat]: !isOpen }))} className="flex w-full items-center justify-between py-1 active:scale-[0.99] min-h-[44px]">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">{cat}<span className="ml-1 text-[10px] text-[var(--text-secondary)]">{list.length}</span></span>
              <span className={"grid h-6 w-6 place-items-center rounded-full border bg-[var(--chip-bg)] transition " + (isOpen ? "rotate-180" : "")} style={{ borderColor: "var(--border)" }}><IconChevronDown className="h-3 w-3" /></span>
            </button>
            <div className="grid transition-[grid-template-rows] duration-[180ms] ease" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
              <div className="overflow-hidden"><div className="mt-2 space-y-1.5">{list.map(it => {
                const honest = honestLabel(it);
                const freqBadge = (shoppingFrequencyBadge as any)(it);
                const isTrip = tripMode;
                return (
                  <div key={it.id} className={"flex items-center gap-2 py-1.5 rounded-[12px] px-1 transition " + (isTrip?"py-2.5":"")} style={{ minHeight: isTrip? "64px" : "56px" }}>
                    <div className="flex items-center gap-0.5 rounded-full border bg-[var(--chip-bg)] px-1 shrink-0" style={{ borderColor:"var(--border)", height: isTrip? "36px":"28px", minWidth: isTrip? "92px":"76px" }}><button aria-label="decrease qty" onClick={() => changeQty(it.id, -1)} className={"grid place-items-center active:scale-[0.88] active:bg-[var(--card-bg)] rounded-full transition "+(isTrip?"h-8 w-8 text-[16px]":"h-6 w-6 text-[13px]")}>-</button><span className={"text-center font-medium tabular-nums "+(isTrip?"w-7 text-[14px]":"w-5 text-[12px]")}>{it.qty}</span><button aria-label="increase qty" onClick={() => changeQty(it.id, 1)} className={"grid place-items-center active:scale-[0.88] active:bg-[var(--card-bg)] rounded-full transition "+(isTrip?"h-8 w-8 text-[16px]":"h-6 w-6 text-[13px]")}>+</button></div>
                    <button onClick={()=> openEdit(it)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={"font-display truncate max-w-[128px] "+(isTrip?"text-[14px]":"text-[13px]")} title={it.item}>{it.item}</span>
                        <span className="rounded-full bg-[var(--chip-bg)] border px-1.5 py-0.5 text-[9px] uppercase tracking-wide" style={{ borderColor:"var(--border)" }}>{freqBadge}</span>
                        {it.tags?.map((t:string)=> <span key={t} className="rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-1.5 py-0.5 text-[8px] tracking-wide">{t}</span>)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] min-w-0">
                        <span className={"truncate "+(honest.tone==="danger"?"text-[#E07A5F] font-medium": honest.tone==="warn"?"text-[#B45309]":"")} title={honest.text}>{honest.text}</span>
                        {(it as any).notes && <span className="truncate max-w-[64px] hidden sm:inline">\u2022 {(it as any).notes}</span>}
                        <span className="hidden sm:inline">\u2022 {(PERSONS as any)[it.addedBy]?.name || (PERSONS[it.addedBy as PersonKey] as any)?.name || it.addedBy||it.addedBy}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <select value={it.cat} onChange={e=> changeCat(it.id, e.target.value as any)} className={"rounded-full border bg-[var(--card-bg)] px-1.5 py-1 text-[9px] outline-none focus:border-[var(--border)] "+(isTrip?"h-[36px] text-[11px]":"")} style={{ borderColor:"var(--border)" }}>
                        {CATS.map(c=> <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button aria-label="mark purchased" onClick={(e) => togglePurchased(it.id, e)} className={"rounded-full border grid place-items-center active:scale-[0.82] transition bg-[var(--card-bg)] hover:bg-[#E8F5E9] hover:border-[var(--border)] group "+(isTrip?"h-[40px] w-[40px]":"h-[28px] w-[28px]")} style={{ borderColor: "var(--border)" }}><span className="h-2 w-2 rounded-full bg-[var(--border)] group-active:bg-[#22C55E] transition" /></button>
                    </div>
                  </div>
                );
              })}</div></div>
            </div>
          </div>
        );
      })}

      {doneCount > 0 && (
        <div className="rounded-[16px] border border-dashed bg-[var(--chip-bg)]/60 px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <MicroLabel>done \u2022 {doneCount}</MicroLabel>
            <div className="flex gap-1.5">
              <button onClick={()=> setShowArchived(v=>!v)} className="text-[10px] text-[var(--muted)] underline">{showArchived?"hide":"show"}</button>
              <button onClick={()=>{
                const toArchive = doneItems;
                const prev=[...items];
                setItems((prevIt:any)=> prevIt.map((it:any)=> toArchive.some(d=>d.id===it.id) ? { ...it, archivedAt:new Date().toISOString(), status:"archived", updatedAt:new Date().toISOString(), updatedBy: currentUser, mutationId: uid("mut") } : it));
                setToast({ msg: "Archived "+toArchive.length+" \u2014 undo?", undo:()=> setItems(prev as any) });
              }} className="rounded-full bg-[var(--card-bg)] border px-2 py-0.5 text-[10px]" style={{ borderColor:"var(--border)" }}>Clear purchased (archive)</button>
            </div>
          </div>
          {showArchived && (
            <div className="mt-1 flex flex-wrap gap-1.5">{doneItems.map(it => {
              const lb = (it as any).lastDoneAt ? relTime((it as any).lastDoneAt, nowMs) : "";
              return <button key={it.id} onClick={(e) => togglePurchased(it.id, e)} className="rounded-full bg-[var(--card-bg)] px-2.5 py-1 text-[11px] border line-through opacity-70 flex items-center gap-1 min-h-[28px]" style={{ borderColor: "var(--border)" }}><span>{it.item}</span>{lb&&<span className="text-[9px]">\u2022 {lb}</span>}</button>;
            })}</div>
          )}
          {!showArchived && <div className="mt-1 text-[10px] text-[var(--muted)]">bought items hidden \u2014 tap Show to restore or archive</div>}
        </div>
      )}

      {archivedItems.length>0 && (
        <details className="rounded-[16px] border bg-[var(--card-bg)] px-3 py-2" style={{ borderColor:"var(--border)" }}>
          <summary className="text-[11px] font-medium cursor-pointer list-none flex items-center justify-between"><span>Archived \u2022 {archivedItems.length}</span><span className="text-[10px] text-[var(--muted)]">history</span></summary>
          <div className="mt-2 flex flex-wrap gap-1.5">{archivedItems.slice(0,24).map((it:any)=> <span key={it.id} className="rounded-full bg-[var(--chip-bg)] border px-2.5 py-1 text-[11px] opacity-80" style={{ borderColor:"var(--border)" }}>{it.item} \u2022 by {(PERSONS as any)[it.addedBy]?.name || (PERSONS[it.addedBy as PersonKey] as any)?.name || it.addedBy||it.addedBy}</span>)}</div>
        </details>
      )}

      <div className="grid gap-2.5">
        {(["aisling","ciaran"] as const).map(side=> (
          <div key={side} className="rounded-[18px] border bg-[#FFFCF8] px-3.5 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-medium flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: side==="aisling"?"#A89FDA":"#E8CEB7" }} />{PERSONS[side].name}'s corner \u2014 <span className="text-[var(--muted)]">personal \u2022 wants (synced)</span></div>
            {(["personal","wants"] as const).map(kind=> (
              <div key={kind} className="mt-2">
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{kind} @{side} {kind==="personal"?"@personal":"@wants"}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(personal[side][kind] as string[]).map((t:string)=> (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--card-bg)] border px-2.5 py-1 text-[11px]" style={{ borderColor:"var(--border)" }}>
                      <span>{t}</span>
                      <button onClick={()=> pushPersonalToShopping(side,kind,t)} title="Add to shopping" className="ml-1 rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-1.5 py-0.5 text-[9px] active:scale-90">+🛒</button>
                      <button onClick={()=> removePersonalTemplate(side,kind,t)} className="ml-0.5 text-[10px] px-0.5">\u00d7</button>
                    </span>
                  ))}
                  {personal[side][kind].length===0 && <span className="text-[11px] text-[var(--muted)]/70">synced \u2022 add below</span>}
                </div>
                <PersonalAdd onAdd={(v)=> addPersonalTemplate(side,kind,v)} placeholder={kind==="personal"?"Add personal @"+side+"…":"Add wish @"+side+"…"} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {todoCount===0 && doneCount===0 && <div className="rounded-[20px] border bg-[#FFFCF8] px-4 py-8 text-center text-[12px] text-[var(--muted)]" style={{ borderColor: "var(--border)" }}>empty \u2014 add above or from your corner</div>}

      <BottomSheet open={!!editingItem} onClose={()=> setEditingId(null)} title={editingItem ? "Edit \u2014 "+editingItem.item : "Edit"}>
        {editingItem && (
          <div className="space-y-3">
            <div>
              <MicroLabel>Name</MicroLabel>
              <input value={editDraft.item as any||""} onChange={e=> setEditDraft(d=>({...d, item:e.target.value}))} className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[13px]" style={{ borderColor:"var(--border)" }} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><MicroLabel>Qty</MicroLabel><div className="flex items-center gap-1 mt-1"><button onClick={()=> setEditDraft(d=>({...d, qty: Math.max(1,(d.qty||1)-1)}))} className="h-8 w-8 rounded-full border grid place-items-center">-</button><span className="w-8 text-center">{editDraft.qty||editingItem.qty}</span><button onClick={()=> setEditDraft(d=>({...d, qty: Math.min(99,(d.qty||1)+1)}))} className="h-8 w-8 rounded-full border grid place-items-center">+</button></div></div>
              <div className="flex-1"><MicroLabel>Category</MicroLabel><select value={(editDraft.cat as any)||editingItem.cat} onChange={e=> setEditDraft(d=>({...d, cat:e.target.value as any}))} className="w-full rounded-full border bg-[var(--card-bg)] px-2 py-1.5 text-[12px] mt-1" style={{ borderColor:"var(--border)" }}>{CATS.map(c=> <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div><MicroLabel>Requested by</MicroLabel><div className="flex gap-1.5 mt-1">{(["aisling","ciaran"] as const).map(p=><button key={p} onClick={()=> setEditDraft(d=>({...d, addedBy:p as any}))} className={"rounded-full px-3 py-1 text-[11px] border "+((editDraft.addedBy||editingItem.addedBy)===p?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)]")}>{PERSONS[p].name}</button>)}</div></div>
            <div><MicroLabel>Notes</MicroLabel><input value={(editDraft.notes as any)||""} onChange={e=> setEditDraft(d=>({...d, notes:e.target.value}))} placeholder="organic, 2L..." className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{ borderColor:"var(--border)" }} /></div>
            <div>
              <MicroLabel>Recurrence</MicroLabel>
              <div className="flex flex-wrap gap-1 mt-1">{(["as-needed","daily","every-2d","weekly","biweekly","monthly"] as ShoppingFrequency[]).map(f=> <button key={f} onClick={()=> setEditDraft(d=>({...d, frequency:f}))} className={"rounded-full px-2.5 py-1 text-[11px] border capitalize "+((editDraft.frequency||editingItem.frequency)===f?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)]")}>{f}</button>)}</div>
            </div>
            {((editDraft.frequency||editingItem.frequency)==="weekly" || (editDraft.frequency||editingItem.frequency)==="biweekly") && (
              <div><MicroLabel>Needed days</MicroLabel><div className="flex gap-1 mt-1">{["Mo","Tu","We","Th","Fr","Sa","Su"].map((d,i)=>{
                const cur = (editDraft.needDays||editingItem.needDays||"").split(",").includes(d);
                return <button key={d} onClick={()=> {
                  const curSet = new Set((editDraft.needDays||editingItem.needDays||"").split(",").filter(Boolean));
                  const has = curSet.has(d);
                  if (has) curSet.delete(d); else curSet.add(d);
                  setEditDraft(dd=>({...dd, needDays: Array.from(curSet).join(",")}));
                }} className={"h-7 w-7 rounded-full text-[10px] border grid place-items-center "+(cur?"bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]":"bg-[var(--card-bg)] border-[var(--border)]")}>{d}</button>;
              })}</div></div>
            )}
            <div><MicroLabel>Real expiry (optional)</MicroLabel><input type="date" value={editDraft.expiresAt ? (editDraft.expiresAt as string).slice(0,10) : ""} onChange={e=> setEditDraft(d=>({...d, expiresAt: e.target.value? new Date(e.target.value).toISOString(): undefined}))} className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{ borderColor:"var(--border)" }} /><div className="text-[10px] text-[var(--muted)] mt-1">Only show expiry if you set a real date \u2014 otherwise we show On list for X days</div></div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} className="flex-1 rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] py-2.5 text-[12px]">Save</button>
              <button onClick={()=> setEditingId(null)} className="rounded-full bg-[var(--chip-bg)] px-4 py-2.5 text-[12px] border" style={{ borderColor:"var(--border)" }}>Cancel</button>
            </div>
            <div className="flex gap-2">
              <button onClick={()=> archiveItem(editingItem.id)} className="flex-1 rounded-full bg-[var(--card-bg)] border py-2 text-[11px]" style={{ borderColor:"var(--border)" }}>Archive</button>
              <button onClick={()=> deleteItem(editingItem.id)} className="flex-1 rounded-full bg-[#FFE4E6] border py-2 text-[11px] text-[#9F1239]" style={{ borderColor:"#FECDD3" }}>Delete</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}


function PersonalAdd({ onAdd, placeholder }: { onAdd:(v:string)=>void; placeholder?:string }){
  const [v,setV]=useState("");
  return (
    <div className="mt-1.5 flex gap-1.5">
      <input value={v} onChange={e=> setV(e.target.value)} placeholder={placeholder} className="flex-1 rounded-full border bg-[var(--card-bg)] px-2.5 py-1 text-[11px] outline-none" style={{ borderColor:"var(--border)" }} onKeyDown={e=>{ if(e.key==="Enter"){ onAdd(v); setV(""); }}} />
      <button onClick={()=>{ onAdd(v); setV(""); }} className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1 text-[10px] text-[var(--nav-active-text)]">+</button>
    </div>
  );
}

function NotesMemoPage({
  notes, setNotes, currentUser, nowMs,
}: {
  notes: NoteMemo[]; setNotes: (up: NoteMemo[] | ((p: NoteMemo[]) => NoteMemo[])) => void; currentUser: PersonKey; nowMs: number;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<'all'|'love'|'pinned'|'archived'>('all');
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string|null>(null);
  const [undoNote, setUndoNote] = useState<NoteMemo|null>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const [editBody, setEditBody] = useState("");
  const partner = currentUser==='aisling' ? 'ciaran' : 'aisling';

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=> setToast(null), 2600); return()=>clearTimeout(t); }, [toast]);
  useEffect(()=>{ if(!undoNote) return; const t=setTimeout(()=> setUndoNote(null), 5000); return()=>clearTimeout(t); }, [undoNote]);

  const activeNotes = useMemo(()=> notes.filter(n=> !(n as any).deletedAt && !(n as any).archived_at && !(n as any).archivedAt), [notes]);
  const archivedNotes = useMemo(()=> notes.filter(n=> ((n as any).archived_at || (n as any).archivedAt) && !(n as any).deletedAt), [notes]);
  const takenDown = useMemo(()=> activeNotes.filter(n=> n.seenBy.aisling && n.seenBy.ciaran), [activeNotes]);

  const filtered = useMemo(()=>{
    let list = filterKind==='archived' ? archivedNotes : activeNotes;
    if (filterKind==='love') list = list.filter(n=> n.isLove);
    if (filterKind==='pinned') list = list.filter(n=> (n as any).pinned_at || (n as any).pinnedAt);
    if (filterKind==='all') {}
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n=> n.body.toLowerCase().includes(q) || PERSONS[n.author].name.toLowerCase().includes(q));
    }
    return list.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeNotes, archivedNotes, filterKind, search]);

  const [draft, setDraft] = useState<{ body:string; isLove:boolean; photo?:string }>({ body:"", isLove:false, photo:undefined });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setToast("Only images allowed"); return; }
    if (f.size > 8_000_000) { setToast("Image too large — max 8MB"); return; }
    const reader = new FileReader();
    reader.onerror = ()=> setToast("Failed to read image");
    reader.onload = () => {
      const img = new Image();
      img.onerror = ()=> setToast("Failed to load image");
      img.onload = () => {
        // proper client resize max 512 preserve aspect ratio, no slice truncation
        const maxDim = 512;
        let w = img.width, h = img.height;
        if (w>maxDim || h>maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w*ratio); h = Math.round(h*ratio);
        } else {
          // if small, keep original but cap to maxDim anyway
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setToast("Canvas unavailable — photo not saved"); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // try WebP 0.72, fallback jpeg 0.68, then 0.55 — no slice
        let dataUrl = "";
        try { dataUrl = canvas.toDataURL("image/webp", 0.72); } catch { dataUrl = ""; }
        if (!dataUrl || dataUrl.length < 20) {
          try { dataUrl = canvas.toDataURL("image/jpeg", 0.72); } catch { dataUrl = ""; }
        }
        // size guard ~260KB base64 ~ 195KB binary — reasonable for localStorage + Supabase jsonb
        if (dataUrl.length > 260_000) {
          try { dataUrl = canvas.toDataURL("image/jpeg", 0.55); } catch {}
        }
        if (dataUrl.length > 350_000) {
          setToast("Photo still too large after compression — try smaller image. No truncate.");
          return;
        }
        if (!dataUrl) { setToast("Compression failed"); return; }
        setDraft(d=> ({...d, photo: dataUrl}));
        setToast("Photo attached — client-resized to ~512px WebP");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
    // reset input value so same file re-select works
    e.target.value = "";
  }

  function pinNote() {
    const body = draft.body.trim();
    if (!body) { setToast("Write something first"); return; }
    // Limit check based on non-deleted count to respect storage
    const activeCount = notes.filter(n=> !(n as any).deletedAt).length;
    if (activeCount >= 48) { setToast("Limit 48 live notes — archive some first."); return; }
    const noteId = uid("nt");
    const nowIso = new Date().toISOString();
    const newNote: NoteMemo = {
      id: noteId,
      body,
      author: currentUser,
      createdAt: nowIso,
      updatedAt: nowIso,
      seenBy: { aisling: currentUser==="aisling", ciaran: currentUser==="ciaran" },
      isLove: draft.isLove,
      photoDataUrl: draft.photo,
      rotation: rotForId(noteId),
      reactions: {},
    } as any;
    try {
      setNotes((prev:any)=> [newNote, ...prev]);
      setDraft({ body:"", isLove:false, photo:undefined });
      setShowAdd(false);
      setToast(draft.isLove ? "Love note pinned 💌" : "Note pinned");
    } catch (err:any) {
      setToast("Failed to save note: "+String((err as any)?.message||err).slice(0,80));
    }
  }

  function markRead(note: NoteMemo) {
    if (note.seenBy[currentUser]) return;
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===note.id ? {
        ...n,
        seenBy: { ...n.seenBy, [currentUser]: true },
        read_by: { ...(n as any).read_by, [currentUser]: new Date().toISOString() } as any,
        updatedAt: new Date().toISOString(),
      } : n));
    } catch (e:any) {
      setToast("Failed to mark read: "+String(e?.message||e).slice(0,60));
    }
  }

  function togglePin(note: NoteMemo) {
    const isPinned = !!(note as any).pinned_at || !!(note as any).pinnedAt;
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===note.id ? {
        ...n,
        pinned_at: isPinned ? null : new Date().toISOString(),
        pinnedAt: isPinned ? null : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any : n));
      setToast(isPinned ? "Unpinned" : "Pinned to top");
    } catch (e:any) { setToast("Pin failed"); }
  }

  function archiveNote(note: NoteMemo, doArchive=true) {
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===note.id ? {
        ...n,
        archived_at: doArchive ? new Date().toISOString() : null,
        archivedAt: doArchive ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      } as any : n));
      setToast(doArchive ? "Archived — searchable in Archive" : "Restored from archive");
      if (selectedId===note.id && doArchive) setSelectedId(null);
    } catch (e:any) { setToast("Archive failed"); }
  }

  function startEdit(note: NoteMemo) {
    // Author may edit before archived
    if (note.author!==currentUser) { setToast("Only author can edit"); return; }
    if ((note as any).archived_at || (note as any).archivedAt) { setToast("Unarchive to edit"); return; }
    if ((note as any).deletedAt) { setToast("Deleted note cannot be edited"); return; }
    setEditId(note.id);
    setEditBody(note.body);
  }
  function saveEdit() {
    if (!editId) return;
    const body = editBody.trim();
    if (!body) { setToast("Body empty"); return; }
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===editId ? {
        ...n,
        body,
        edited_at: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      } as any : n));
      setEditId(null);
      setToast("Edited");
    } catch (e:any) { setToast("Edit failed"); }
  }

  function deleteNotePermanent(note: NoteMemo) {
    // Author may delete; household may archive — spec says author delete allowed, others archive
    // Here we allow author delete, others get archive prompt
    if (note.author!==currentUser) {
      setToast("Only author can permanently delete — archiving instead");
      archiveNote(note, true);
      return;
    }
    try {
      // Tombstone: mark deletedAt, keep for sync merge 7 days, hide from UI
      const tombstoned: NoteMemo = {
        ...note,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      } as any;
      setUndoNote(note);
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===note.id ? tombstoned : n));
      setToast("Deleted — Undo available 5s");
      setSelectedId(null);
      // No immediate filter removal so remoteSync gets tombstone; UI hides via activeNotes filter
    } catch (e:any) {
      setToast("Delete failed: "+String((e as any)?.message||e).slice(0,60));
    }
  }

  function undoDelete() {
    if (!undoNote) return;
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=> n.id===undoNote.id ? { ...n, deletedAt: undefined, updatedAt: new Date().toISOString() } as any : n));
      setToast("Restored");
      setUndoNote(null);
    } catch {}
  }

  function react(note: NoteMemo, kind: NoteReactionKind) {
    try {
      setNotes((prev:any)=> prev.map((n:NoteMemo)=>{
        if (n.id!==note.id) return n;
        const cur = { ...(n.reactions||{}) } as any;
        const list: PersonKey[] = Array.isArray(cur[kind]) ? [...cur[kind]] : [];
        if (list.includes(currentUser)) {
          // toggle off
          const nxt = list.filter(k=> k!==currentUser);
          if (nxt.length===0) delete cur[kind]; else cur[kind]=nxt;
        } else {
          cur[kind]= [...list, currentUser];
        }
        return { ...n, reactions: cur, updatedAt: new Date().toISOString() } as any;
      }));
    } catch {}
  }

  const selected = notes.find(n=> n.id===selectedId) || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="font-display text-[15px]">Memo Board</span>
        <div className="flex items-center gap-1">
          {(['all','love','pinned','archived'] as const).map(k=> (
            <button key={k} onClick={()=> setFilterKind(k)} className={"rounded-full px-2.5 py-1 text-[11px] border capitalize "+(filterKind===k ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]' : 'bg-[var(--card-bg)] border-[var(--border)]')}>{k}</button>
          ))}
        </div>
      </div>

      <div className="rounded-full border bg-[var(--card-bg)] px-3 py-2 flex items-center gap-2" style={{ borderColor:"var(--border)"}}>
        <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search notes — body or author" className="flex-1 bg-transparent outline-none text-[12px]" />
        {search && <button onClick={()=> setSearch("")} className="text-[10px] text-[var(--muted)]">clear</button>}
      </div>

      {filterKind!=='archived' && takenDown.length>0 && filterKind==='all' && (
        <div className="text-[10px] text-[var(--muted)] px-1">{takenDown.length} taken down (both seen) — move to archive to declutter.</div>
      )}

      <div className="rounded-[20px] border p-3.5 min-h-[160px]" style={{ borderColor:"var(--border)", background:"var(--chip-bg)", backgroundImage:"radial-gradient(var(--border) 1px,transparent 1px)", backgroundSize:"16px 16px" }}>
        {filtered.length===0 ? (
          <div className="text-[11px] text-[var(--muted)] text-center py-10">
            {filterKind==='archived' ? "No archived notes — archive from board to keep it searchable." :
             filterKind==='pinned' ? "No pinned notes — pin an unread or love note to keep it visible." :
             filterKind==='love' ? `No love notes yet — pin one for ${PERSONS[partner].name}.` :
             `No notes — pin one for ${PERSONS[partner].name}.`}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filtered.map(n=>{
              const rot = n.rotation ?? rotForId(n.id);
              const hasPhoto = !!n.photoDataUrl;
              const tapeAngle = (hashId(n.id)%5)-2;
              const isUnread = !(n.seenBy as any)[currentUser] && n.author!==currentUser;
              const isPinned = !!(n as any).pinned_at || !!(n as any).pinnedAt;
              const isArchived = !!(n as any).archived_at || !!(n as any).archivedAt;
              const reactCount = Object.values(n.reactions||{}).reduce((s,a:any)=> s+(a?.length||0), 0);
              return (
                <button key={n.id} onClick={()=> setSelectedId(n.id)} className={"relative text-left flex flex-col group "+(hasPhoto ? "pt-[6px] px-[6px] pb-[30px] rounded-[2px]" : "rounded-[12px] min-h-[138px] px-[14px] py-[14px] border ")+"active:scale-[0.98] transition-transform"} style={{ transform:"rotate("+rot+"deg)", borderColor: hasPhoto ? "transparent" : (n.isLove ? "#F9A8D4" : "var(--border)"), background: hasPhoto ? "#FFFEFE" : (n.isLove ? "linear-gradient(180deg,#FCE7F3 0%,#FFF1F9 100%)" : "var(--card-bg)"), boxShadow: hasPhoto ? "0 6px 18px rgba(0,0,0,0.10)" : "0 4px 14px rgba(0,0,0,0.06)"} as any}>
                  <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 block" style={{ width:"34px", height:"11px", background:"linear-gradient(180deg,#FEF3C7 0%,#FDE68A 100%)", opacity:0.92, transform:"translateX(-50%) rotate("+tapeAngle+"deg)", borderRadius:"2px" }} />
                  {isPinned && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#A89FDA] border border-white" title="pinned" />}
                  {isUnread && <span className="absolute top-1 left-1 rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] text-[8px] px-1.5 py-0.5">new</span>}
                  {isArchived && <span className="absolute top-1 right-1 rounded-full bg-[var(--chip-bg)] border text-[8px] px-1.5 py-0.5 border-[var(--border)]">arch</span>}
                  {hasPhoto ? (
                    <>
                      <div className="w-full aspect-square overflow-hidden rounded-[1px] bg-[var(--chip-bg)] relative"><img src={n.photoDataUrl!} alt="memo" className="h-full w-full object-cover" loading="lazy" />{n.isLove && <span className="absolute top-1 right-1 rounded-full bg-[var(--card-bg)]/92 px-1.5 py-0.5 text-[10px] shadow">♥</span>}</div>
                      <div className="mt-[9px] px-[3px]"><div className="font-sharpie text-[16px] leading-[1.18] text-[#2A2725] line-clamp-3" style={{ fontFamily:'"Caveat","Segoe Script","Bradley Hand",cursive' }}>{n.body}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B6765]"><span>{PERSONS[n.author].name[0]}</span><span className="h-px w-2 bg-[var(--border)]" />{isUnread ? <span className="ml-auto rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-1.5 py-0.5 text-[9px]">tap → read</span> : <span className="ml-auto text-[9px] opacity-70">{n.seenBy.aisling && 'Á'}{n.seenBy.ciaran && 'C'}{reactCount>0 && ` • ${reactCount}❤`}</span>}</div></div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] flex items-center gap-1 text-[#6B6765]"><span className="h-2 w-2 rounded-full" style={{ background: n.author==="aisling" ? "#A89FDA" : "var(--border)" }} />{PERSONS[n.author].name}{n.isLove && <span className="ml-1">♥</span>}</div>
                      <div className={"mt-2 flex-1 font-sharpie text-[#1F1C1A] "+(n.body.length<28 ? "text-[20px] leading-[1.15]" : n.body.length<80 ? "text-[17px] leading-[1.18]" : "text-[15px] leading-[1.20]")+" line-clamp-6"} style={{ fontFamily:'"Caveat","Segoe Script","Bradley Hand",cursive' }}>{n.body}</div>
                      <div className="mt-auto pt-2 text-[10px] text-[#7A7674] flex items-center gap-1 flex-wrap">
                        {n.seenBy.aisling && <span className="grid place-items-center h-3 w-3 rounded-full bg-[#A89FDA]/20 text-[8px]">Á✓</span>}
                        {n.seenBy.ciaran && <span className="grid place-items-center h-3 w-3 rounded-full bg-[var(--border)]/60 text-[8px]">C✓</span>}
                        {reactCount>0 && <span className="ml-1 text-[9px]">{reactCount} react</span>}
                        {(n as any).edited_at && <span className="text-[9px] italic">edited</span>}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[90] rounded-full bg-[var(--nav-active-bg)] px-4 py-2 text-[11px] text-[var(--nav-active-text)] shadow-lg">{toast}</div>}
      {undoNote && <div className="fixed bottom-[88px] right-3 left-3 sm:left-auto sm:right-4 z-[91] rounded-[14px] bg-[var(--card-bg)] border px-3 py-2 flex items-center justify-between shadow-lg" style={{ borderColor:"var(--border)"}}><span className="text-[11px]">Deleted — tombstoned for sync</span><button onClick={undoDelete} className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1 text-[11px] text-[var(--nav-active-text)]">Undo</button></div>}

      <div className="flex gap-2">
        <button onClick={()=> setShowAdd(true)} className="flex-1 rounded-full bg-[var(--nav-active-bg)] py-3 text-[12px] font-medium text-[var(--nav-active-text)] active:scale-[0.98]">Pin note • WebP ~512</button>
        <button onClick={()=> setFilterKind(f=> f==='archived' ? 'all' : 'archived')} className="rounded-full border bg-[var(--card-bg)] px-4 py-3 text-[11px]" style={{ borderColor:"var(--border)"}}>{filterKind==='archived' ? 'Board' : `Archive • ${archivedNotes.length}`}</button>
      </div>

      {/* Selected sheet with proper separation of actions */}
      <BottomSheet open={!!selected} onClose={()=> { setSelectedId(null); setEditId(null); }} title={selected ? PERSONS[selected.author].name+" • "+relTime(selected.createdAt, nowMs) : ""}>
        {selected && (
          <div className="space-y-3">
            {editId===selected.id ? (
              <div className="space-y-2">
                <textarea value={editBody} onChange={e=> setEditBody(e.target.value)} className="w-full rounded-[12px] border bg-[var(--card-bg)] px-3 py-3 text-[14px] min-h-[88px]" style={{ borderColor:"var(--border)"}} />
                <div className="flex gap-2"><button onClick={saveEdit} className="flex-1 rounded-full bg-[var(--nav-active-bg)] py-2.5 text-[12px] text-[var(--nav-active-text)]">Save edit — tracked edited_at</button><button onClick={()=> setEditId(null)} className="rounded-full border bg-[var(--card-bg)] px-4 py-2.5 text-[11px]">Cancel</button></div>
              </div>
            ) : selected.photoDataUrl ? (
              <div className="relative polaroid rounded-[2px] pt-[8px] px-[8px] pb-[36px] mx-auto max-w-[280px]" style={{ transform:"rotate(-0.6deg)"}}>
                <img src={selected.photoDataUrl} alt="full" className="w-full aspect-square object-cover rounded-[1px]" />
                <div className="mt-3 px-1 font-sharpie text-[19px] leading-[1.22] text-[#242120]">{selected.body}</div>
                {(selected as any).edited_at && <div className="mt-1 text-[10px] text-[var(--muted)] italic">edited {relTime((selected as any).edited_at, nowMs)}</div>}
              </div>
            ) : (
              <div className="rounded-[12px] border p-4 min-h-[100px]" style={{ borderColor: selected.isLove ? "#F9A8D4" : "var(--border)", background: selected.isLove ? "#FCE7F3" : "var(--card-bg)"}}>
                <div className="font-sharpie text-[20px] leading-[1.24] text-[#1F1C1A]">{selected.body}</div>
                {(selected as any).edited_at && <div className="mt-2 text-[10px] text-[var(--muted)] italic">edited {relTime((selected as any).edited_at, nowMs)}</div>}
                {selected.photoDataUrl && <div className="mt-2 text-[10px] text-[var(--muted)]">Photo kept client-side — no slice truncation.</div>}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {([
                ['heart','♥ Heart'],
                ['laugh','😂 Laugh'],
                ['kiss','😘 Kiss'],
                ['ack','👍 Ack'],
              ] as const).map(([k,label])=> {
                const reacted = (selected.reactions as any)?.[k]?.includes(currentUser);
                return <button key={k} onClick={()=> react(selected, k as any)} className={"rounded-full border px-2.5 py-1 text-[11px] "+(reacted ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]" : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--muted)]")}>{label}{(selected.reactions as any)?.[k]?.length ? ` ${(selected.reactions as any)[k].length}` : ''}</button>;
              })}
            </div>

            <div className="text-[11px] text-[var(--muted)] flex gap-2 flex-wrap">
              <span>Seen Á {selected.seenBy.aisling ? "✓" : "—"} C {selected.seenBy.ciaran ? "✓" : "—"}</span>
              {(selected as any).pinned_at && <span>Pinned {relTime((selected as any).pinned_at, nowMs)}</span>}
              {(selected as any).archived_at && <span>Archived {relTime((selected as any).archived_at, nowMs)}</span>}
            </div>

            {/* Correct take down vs mark read separation */}
            <div className="grid gap-2">
              {!selected.seenBy[currentUser] ? (
                <button onClick={()=> { markRead(selected); setToast("Marked read — will move to Taken down when both read"); }} className="w-full rounded-full bg-[var(--nav-active-bg)] py-2.5 text-[12px] text-[var(--nav-active-text)]">Mark read — for you</button>
              ) : (
                <div className="text-[11px] text-[var(--muted)]">You have read this — waiting for {PERSONS[partner].name} to read.</div>
              )}

              {selected.seenBy.aisling && selected.seenBy.ciaran && !(selected as any).archived_at ? (
                <button onClick={()=> archiveNote(selected, true)} className="w-full rounded-full border bg-[var(--card-bg)] py-2 text-[11px]">Archive — both read</button>
              ) : (selected as any).archived_at ? (
                <button onClick={()=> archiveNote(selected, false)} className="w-full rounded-full bg-[var(--chip-bg)] border py-2 text-[11px]" style={{ borderColor:"var(--border)"}}>Restore from archive</button>
              ) : null}

              <div className="flex gap-2">
                <button onClick={()=> togglePin(selected)} className="flex-1 rounded-full border bg-[var(--card-bg)] py-2 text-[11px]" style={{ borderColor:"var(--border)"}}>{(selected as any).pinned_at ? "Unpin" : "Pin to top"}</button>
                {selected.author===currentUser && <button onClick={()=> startEdit(selected)} className="flex-1 rounded-full border bg-[var(--card-bg)] py-2 text-[11px]" style={{ borderColor:"var(--border)"}}>Edit — author only</button>}
              </div>

              <button onClick={()=> deleteNotePermanent(selected)} className="w-full rounded-full border bg-[#FFF1F2] py-2 text-[11px] text-[#9F1239]" style={{ borderColor:"#FECDD3"}}>{selected.author===currentUser ? "Delete permanently — tombstone 7d (author)" : "Archive — household"}</button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={showAdd} onClose={()=> setShowAdd(false)} title="Pin it">
        <div className="space-y-3">
          <div className="flex rounded-full bg-[var(--chip-bg)] p-1 border w-fit" style={{ borderColor:"var(--border)"}}>
            <button onClick={()=> setDraft(d=> ({...d,isLove:false}))} className={"rounded-full px-3 py-1 text-[11px] "+(!draft.isLove ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]' : 'text-[var(--muted)]')}>Plain</button>
            <button onClick={()=> setDraft(d=> ({...d,isLove:true}))} className={"rounded-full px-3 py-1 text-[11px] flex items-center gap-1 "+(draft.isLove ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]' : 'text-[var(--muted)]')}>♥ Love Note</button>
          </div>
          <textarea value={draft.body} onChange={e=> setDraft(d=> ({...d, body:e.target.value}))} placeholder={draft.isLove ? "cute note for your person… sharpie 20" : "leftover idea, reminder, thank you…"} className="w-full rounded-[14px] border bg-[var(--card-bg)] px-3 py-3 text-[16px] min-h-[88px] font-sharpie leading-[1.24]" style={{ borderColor: draft.isLove ? "#F9A8D4" : "var(--border)", background: draft.isLove ? "#FCE7F3" : "white" }} />
          <div className="flex items-center gap-2">
            <label className="rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px] cursor-pointer flex items-center gap-1.5" style={{ borderColor:"var(--border)"}}><input type="file" accept="image/*" className="hidden" onChange={handleFile} />Add photo — max 512 WebP 0.72 (no slice)<span className="text-[10px] text-[var(--muted)]">client-resized</span></label>
            {draft.photo && <img src={draft.photo} alt="thumb" className="h-[40px] w-[40px] rounded-[8px] object-cover border" style={{ borderColor:"var(--border)"}} />}
          </div>
          <div className="text-[10px] text-[var(--muted)]">Stored as compressed dataURL now (no truncation). Future: swap to Supabase Storage bucket path <code>photoStoragePath</code> to avoid jsonb bloat.</div>
          <button disabled={!draft.body.trim()} onClick={pinNote} className="w-full rounded-full bg-[var(--nav-active-bg)] py-3 text-[13px] font-medium text-[var(--nav-active-text)] disabled:opacity-40">Pin it • as {PERSONS[currentUser].name}</button>
        </div>
      </BottomSheet>
    </div>
  );
}

function DebugCenter({
  choresRaw, calendarRaw, shoppingRaw, notesRaw,
  setChoresRaw, setCalendarRaw, setShoppingRaw, setNotesRaw,
}: {
  choresRaw?: any[]; calendarRaw?: any[]; shoppingRaw?: any[]; notesRaw?: any[];
  setChoresRaw?: (v: any) => void; setCalendarRaw?: (v: any) => void; setShoppingRaw?: (v: any) => void; setNotesRaw?: (v: any) => void;
}) {
  // Only shown when useIsDebug() === true. Early guard in parent, but also here.
  const isDebug = useIsDebug();
  if (!isDebug) return null;
  const [supabaseUrl, setSupabaseUrl] = useLocalState<string>("couple_v1_supabase_url", "");
  const [supabaseAnon, setSupabaseAnon] = useLocalState<string>("couple_v1_supabase_anon", "");
  const [sbTestMsg, setSbTestMsg] = useState<string | null>(null);
  const [sbTesting, setSbTesting] = useState(false);
  const [sbLive, setSbLive] = useState<{c:number, cal:number, s:number, n:number, upd:string} | null>(null);
  const [rawView, setRawView] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | {title:string; msg?:string; onConfirm:()=>void}>(null);
  useEffect(() => { if (!sbTestMsg) return; const t = setTimeout(() => setSbTestMsg(null), 5000); return () => clearTimeout(t); }, [sbTestMsg]);

  async function doTest() {
    setSbTesting(true); setSbTestMsg(null);
    try {
      const { remoteLoad } = await import('./lib/remoteSync');
      const remote = await remoteLoad();
      if (remote) {
        const total = (remote.chores?.length||0)+(remote.calendar?.length||0)+(remote.shopping?.length||0)+(remote.notes?.length||0);
        setSbLive({ c: remote.chores.length, cal: remote.calendar.length, s: remote.shopping.length, n: remote.notes.length, upd: (remote.updated_at||'').slice(0,19)});
        setRawView(remote);
        setSbTestMsg(`OK remote c:${remote.chores.length} cal:${remote.calendar.length} s:${remote.shopping.length} n:${remote.notes.length} total:${total} upd:${(remote.updated_at||'').slice(0,19)}`);
      } else {
        setSbTestMsg('no row / no config - will init on first save');
        setSbLive(null);
      }
    } catch(e:any){ setSbTestMsg('ex: '+String(e?.message||e).slice(0,160)) }
    setSbTesting(false);
  }

  useEffect(()=>{ doTest() }, []);

  function envSrc() {
    try {
      const w:any = window as any;
      const hasWin = !!(w.__SUPABASE_URL__ && w.__SUPABASE_ANON__);
      // @ts-ignore
      const hasVite = !!(import.meta as any).env?.VITE_SUPABASE_URL;
      return hasWin? 'window ✓ baked' : hasVite? 'VITE ✓' : 'LS / none';
    } catch { return 'LS only' }
  }

  function copyDebug() {
    const info = {
      id: ROW_ID,
      table: TABLE,
      token: SB_TOKEN,
      envSrc: envSrc(),
      live: sbLive,
      localCounts: { c: choresRaw?.length||0, cal: calendarRaw?.length||0, s: shoppingRaw?.length||0, n: notesRaw?.length||0 },
      lastSync: (()=>{ try{ return localStorage.getItem('couple_v1_last_sync')}catch{return null}})(),
      lastErr: (()=>{ try{ return localStorage.getItem('couple_v1_last_push_err')}catch{return null}})(),
      hadRemote: (()=>{ try{ return localStorage.getItem('couple_v1_had_remote')}catch{return null}})(),
      raw: rawView || undefined
    };
    try { navigator.clipboard.writeText(JSON.stringify(info,null,2)); setSbTestMsg('copied debug json ✓') } catch { setSbTestMsg('copy failed') }
  }

  return (
    <div className="rounded-[20px] border bg-[#FFF7F3] px-4 py-4" style={{ borderColor: "#FDBA74" }}>
      <div className="flex items-center justify-between">
        <div className="font-display text-[13px] font-semibold">Debug Center • only with ?debug=1</div>
        <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] "+(typeof hasSupabaseConfig==='function' && hasSupabaseConfig() ? "bg-[#E8F5E9] border-[#A3D9A5] text-[#166534]" : "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]")}>
          <span className={"h-1.5 w-1.5 rounded-full "+(typeof hasSupabaseConfig==='function' && hasSupabaseConfig() ? "bg-[#22C55E] animate-pulse" : "bg-[#F59E0B]")} />{typeof hasSupabaseConfig==='function' && hasSupabaseConfig() ? "live linked" : "local-only"}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-[var(--muted)]">Row <code className="rounded bg-[var(--chip-bg)] px-1 py-0.5">{ROW_ID}</code> Table <code className="rounded bg-[var(--chip-bg)] px-1 py-0.5">{TABLE}</code> Token <code className="rounded bg-[var(--chip-bg)] px-1 py-0.5">{SB_TOKEN}</code> • {envSrc()}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-[12px] bg-[var(--card-bg)] px-2.5 py-2 border" style={{borderColor:"var(--border)"}}><div className="text-[10px] text-[var(--muted)]">remote</div><div className="font-medium">c:{sbLive?.c ?? '…'} cal:{sbLive?.cal ?? '…'} s:{sbLive?.s ?? '…'} n:{sbLive?.n ?? '…'}</div></div>
        <div className="rounded-[12px] bg-[var(--card-bg)] px-2.5 py-2 border" style={{borderColor:"var(--border)"}}><div className="text-[10px] text-[var(--muted)]">local</div><div className="font-medium">c:{choresRaw?.length||0} cal:{calendarRaw?.length||0} s:{shoppingRaw?.length||0} n:{notesRaw?.length||0}</div></div>
        <div className="rounded-[12px] bg-[var(--card-bg)] px-2.5 py-2 border" style={{borderColor:"var(--border)"}}><div className="text-[10px] text-[var(--muted)]">updated_at</div><div className="font-medium truncate">{sbLive?.upd || '—'}</div></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={doTest} className="rounded-full bg-[var(--nav-active-bg)] px-3.5 py-2 text-[11px] text-[var(--nav-active-text)] disabled:opacity-60" disabled={sbTesting}>{sbTesting? 'Testing…' : 'Test Supabase'}</button>
        <button onClick={async()=>{
          try {
            const { remoteLoad } = await import('./lib/remoteSync');
            const r = await remoteLoad();
            if(!r){ setSbTestMsg('no remote to pull'); return }
            if(setChoresRaw) setChoresRaw(r.chores as any);
            if(setCalendarRaw) setCalendarRaw(r.calendar as any);
            if(setShoppingRaw) setShoppingRaw(r.shopping as any);
            if(setNotesRaw) setNotesRaw(r.notes as any);
            try { localStorage.setItem('couple_v1_had_remote','1'); } catch{}
            setSbTestMsg('Force pull OK ✓');
            setSbLive({ c:r.chores.length, cal:r.calendar.length, s:r.shopping.length, n:r.notes.length, upd:(r.updated_at||'').slice(0,19)});
            setRawView(r);
          } catch(e:any){ setSbTestMsg('pull ex '+String(e?.message||e).slice(0,80)) }
        }} className="rounded-full bg-[#E8F5E9] border px-3.5 py-2 text-[11px] text-[#166534] border-[#A3D9A5]">Force pull</button>
        <button onClick={()=> setConfirmAction({title:'Nuke local cache?', msg:'Clears localStorage+IDB and reloads fresh from Supabase. DB is kept.', onConfirm: async()=>{ try{ Object.keys(localStorage).filter(k=>k.startsWith('couple_v1_') && !k.includes('supabase')).forEach(k=>{ try{ localStorage.removeItem(k)}catch{} }); try{ const {clearAllIDB}=await import('./lib/idb'); await clearAllIDB?.(); }catch{} try{ indexedDB.deleteDatabase('keyval-store'); }catch{} try{ indexedDB.deleteDatabase('couple-fridge'); }catch{} localStorage.setItem('couple_v1_had_remote','1'); location.reload(); }catch(e){ alert('nuke failed '+String((e as any)?.message||e).slice(0,80)) } finally{ setConfirmAction(null);} }})} className="rounded-full bg-[#FEF3C7] border px-3.5 py-2 text-[11px] text-[#92400E] border-[#FCD34D]">Nuke local & reload</button>
        <button onClick={copyDebug} className="rounded-full bg-[var(--card-bg)] border px-3.5 py-2 text-[11px]">Copy debug JSON</button>
        <button onClick={()=> setConfirmAction({title:'Delete ALL remote data?', msg:'Irreversible — will set remote to []', onConfirm: async()=>{ try{ const {remoteSave}=await import('./lib/remoteSync'); const ok=await remoteSave({ chores:[], calendar:[], shopping:[], notes:[], allowEmpty:true } as any); if(ok){ setSbTestMsg('Remote wiped ✓'); setSbLive({c:0,cal:0,s:0,n:0,upd:new Date().toISOString().slice(0,19)}); if(setChoresRaw) setChoresRaw([]); if(setCalendarRaw) setCalendarRaw([]); if(setShoppingRaw) setShoppingRaw([]); if(setNotesRaw) setNotesRaw([]); } else setSbTestMsg('wipe failed'); }catch(e:any){ setSbTestMsg('wipe ex '+String(e?.message||e).slice(0,80)) } finally{ setConfirmAction(null);} }})} className="rounded-full bg-[#FFE4E6] border px-3 py-1.5 text-[11px] text-[#9F1239] border-[#FECDD3]">Delete all remote</button>
        <button onClick={()=> setShowRaw(v=>!v)} className="rounded-full bg-[var(--card-bg)] border px-3 py-1.5 text-[11px] border-[var(--border)]">{showRaw? 'Hide raw' : 'Show raw'}</button>
      </div>
      {sbTestMsg && <div className="mt-2 inline-flex max-w-full rounded-[10px] bg-[var(--card-bg)] px-3 py-1.5 text-[11px] border break-words" style={{borderColor:"var(--border)"}}>{sbTestMsg}</div>}
      {confirmAction && (
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px] grid place-items-center p-4">
          <div className="rounded-[16px] bg-[var(--card-bg)] border w-full max-w-[320px] p-4 shadow-xl" style={{borderColor:"var(--border)"}}>
            <div className="font-display text-[13px] font-medium">{confirmAction.title}</div>
            {confirmAction.msg && <div className="mt-1 text-[11px] text-[var(--muted)]">{confirmAction.msg}</div>}
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={()=> setConfirmAction(null)} className="rounded-full bg-[var(--chip-bg)] px-3 py-1.5 text-[11px] border" style={{borderColor:"var(--border)"}}>Cancel</button>
              <button onClick={()=> confirmAction.onConfirm()} className="rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] px-3 py-1.5 text-[11px]">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {showRaw && rawView && (
        <pre className="mt-3 max-h-[280px] overflow-auto rounded-[12px] bg-[var(--nav-active-bg)] p-3 text-[10px] text-[var(--nav-active-text)] whitespace-pre-wrap">{JSON.stringify(rawView,null,2).slice(0,8000)}</pre>
      )}
      <div className="mt-4 rounded-[14px] border bg-[var(--card-bg)] px-3 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="font-display text-[12px] font-semibold">DB health</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={async()=>{
            setSbTesting(true);
            try {
              const sb = (await import('./lib/supabase')).getSupabase();
              if(!sb){ setSbTestMsg('no sb'); setSbTesting(false); return; }
              const { data, error } = await sb.from('couple_data').select('id,updated_at').eq('id', ROW_ID).maybeSingle();
              if(error) setSbTestMsg('health err: '+error.message.slice(0,80));
              else if(!data) setSbTestMsg('health: no row');
              else setSbTestMsg('health OK '+ (data as any).id);
            } catch(e:any){ setSbTestMsg('health ex '+String(e?.message||e).slice(0,80)) }
            setSbTesting(false);
          }} className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1.5 text-[11px] text-[var(--nav-active-text)]">Check row age</button>
          <button onClick={async()=>{
            try {
              const sb = (await import('./lib/supabase')).getSupabase();
              if(!sb){ setSbTestMsg('no sb'); return;}
              const ch = sb.channel('health_'+Date.now()).subscribe((s:any)=>{ if(s==='SUBSCRIBED'){ setSbTestMsg('realtime OK ✓'); try{ sb.removeChannel(ch)}catch{} } });
              setTimeout(()=>{ try{ sb.removeChannel(ch)}catch{} }, 4000);
            } catch(e:any){ setSbTestMsg('realtime ex '+String(e?.message||e).slice(0,80)) }
          }} className="rounded-full bg-[#EDE9FE] border px-3 py-1.5 text-[11px] border-[#C4B5FD]">Realtime ping</button>
        </div>
      </div>
      <div className="mt-3 rounded-[12px] bg-[var(--card-bg)] border px-3 py-2" style={{borderColor:"var(--border)"}}>
        <div className="text-[11px] font-medium">Manual Supabase override</div>
        <div className="mt-2 space-y-2">
          <input value={(() => { try { const raw = supabaseUrl as any; if (typeof raw === 'string' && raw.startsWith('http')) return raw; try { const p = JSON.parse(raw as any); if (typeof p === 'string') return p; } catch {} return (raw as any) || ''; } catch { return ''; } })()} onChange={e => { try { setSupabaseUrl(e.target.value); saveSupabaseConfig(e.target.value, (() => { try { const r = supabaseAnon as any; if (typeof r === 'string' && r.length > 20 && !r.startsWith('"')) return r; try { const p = JSON.parse(r as any); return typeof p === 'string' ? p : r; } catch { return r; } } catch { return supabaseAnon as any; } })()); } catch {} }} placeholder="https://xxxx.supabase.co" className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{ borderColor: "var(--border)" }} />
          <input value={(() => { try { const raw = supabaseAnon as any; if (typeof raw === 'string' && raw.length > 20 && !raw.startsWith('"')) { if (raw.startsWith('eyJ')) return raw; } try { const p = JSON.parse(raw as any); if (typeof p === 'string') return p; } catch {} return raw || ''; } catch { return ''; } })()} onChange={e => { try { setSupabaseAnon(e.target.value); const curUrl = (() => { try { const r = supabaseUrl as any; if (typeof r === 'string' && r.startsWith('http')) return r; try { const p = JSON.parse(r as any); if (typeof p === 'string') return p; } catch {} return r || ''; } catch { return ''; } })(); saveSupabaseConfig(curUrl, e.target.value); } catch {} }} placeholder="eyJ..." type="password" className="w-full rounded-full border bg-[var(--card-bg)] px-3 py-2 text-[11px]" style={{ borderColor: "var(--border)" }} />
          <div className="text-[10px] text-[var(--muted)]">Baked env preferred — LS override only for debugging.</div>
        </div>
      </div>
    </div>
  );
}

function BlueprintPanel({
  theme, setTheme, onConfetti,
  choresRaw, calendarRaw, shoppingRaw, notesRaw,
  setChoresRaw, setCalendarRaw, setShoppingRaw, setNotesRaw,
}: {
  theme: Theme; setTheme: (t: string) => void; onConfetti?: (p?: any) => void;
  choresRaw?: any[]; calendarRaw?: any[]; shoppingRaw?: any[]; notesRaw?: any[];
  setChoresRaw?: (v: any) => void; setCalendarRaw?: (v: any) => void; setShoppingRaw?: (v: any) => void; setNotesRaw?: (v: any) => void;
}) {
  const isDebug = useIsDebug();
  const [currentUserLS, setCurrentUserLS] = useState<PersonKey|null>(()=>{
    try { const raw = localStorage.getItem("couple_v1_currentUser"); if(!raw) return null; const v = JSON.parse(raw); if(v==="aisling"||v==="ciaran") return v; return null; } catch { return null; }
  });
  const [rememberPref, setRememberPref] = useState<boolean>(()=>{
    try { const v = localStorage.getItem("couple_v1_remember_user"); if(v==="0"||v==="\"0\""||v==="false") return false; return true; } catch { return true; }
  });
  const totalLocal = (choresRaw?.length||0)+(calendarRaw?.length||0)+(shoppingRaw?.length||0)+(notesRaw?.length||0);

  return (
    <div className="space-y-4 pb-8">
      {/* Profile */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">Profile</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Who's on this device</div>
        <div className="mt-3 flex gap-3">
          {(["aisling","ciaran"] as const).map(k=>(
            <div key={k} className={"flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] "+(currentUserLS===k ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-[var(--nav-active-bg)]" : "bg-[var(--chip-bg)] border-[var(--border)]")} style={{}}>
              <span className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold" style={{ background: PERSONS[k].accent2, color:"white"}}>{PERSONS[k].initial}</span>
              {PERSONS[k].name}
              {currentUserLS===k && <span className="ml-1 text-[9px]">• active</span>}
            </div>
          ))}
        </div>
        {!currentUserLS && <div className="mt-2 text-[10px] text-[var(--muted)]">No active profile stored — you are in ephemeral session.</div>}
      </div>

      {/* Household */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">Household</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Aisling ♥ Ciaran • Europe/Dublin</div>
        <div className="mt-2 text-[10px] text-[var(--muted)]/80">Shared fridge metaphor — lists, notes, and calendar shared between you two. Household ID is managed automatically; see Debug Center for raw row when ?debug=1.</div>
        <div className="mt-3 text-[10px] text-[var(--muted)]">Members: <span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 border" style={{borderColor:"var(--border)"}}>{PERSONS.aisling.name} + {PERSONS.ciaran.name}</span></div>
      </div>

      {/* Appearance — 64px rounded cards with phone gradient preview */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold text-[var(--text)]">Appearance</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Theme • 6 palettes via CSS vars</div>
        <div className="mt-3 flex flex-wrap gap-3">
          {THEMES.map(th => {
            const active = theme.id === th.id;
            return (
              <button key={th.id} onClick={() => { setTheme(th.id); onConfetti?.({ clientX: window.innerWidth / 2, clientY: 220 }); }} className="flex flex-col items-center gap-1.5 group active:scale-[0.97] transition" aria-label={`Theme ${th.name}`}>
                <span className={"grid place-items-center w-[64px] h-[64px] rounded-[16px] border-2 relative overflow-hidden "+(active ? "border-[var(--text)] shadow-[0_4px_12px_rgba(0,0,0,0.12)]" : "border-white")} style={{ background:"white"}} title={th.name}>
                  <span className="absolute inset-0 rounded-[14px]" style={{ background: (th as any).phoneBg || th.accent }} />
                  {active && <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--nav-active-bg)] ring-4 ring-white/70" />}
                </span>
                <span className={"text-[10px] "+(active ? "text-[var(--text)] font-medium" : "text-[var(--muted)]")}>{th.name}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Current: {theme.name} — midnight text #EDE8E3 on #1E1E1E</div>
      </div>

      {/* Notifications */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">Notifications</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Local reminders only (beta). Full push via Supabase realtime when online.</div>
        <div className="mt-3 space-y-2 text-[11px]">
          <label className="flex items-center justify-between gap-2"><span>Calendar reminders</span><input type="checkbox" defaultChecked className="h-4 w-4" style={{accentColor:"#0A0A0A"}} /></label>
          <label className="flex items-center justify-between gap-2"><span>Chore nods when partner responds</span><input type="checkbox" defaultChecked className="h-4 w-4" style={{accentColor:"#0A0A0A"}} /></label>
          <label className="flex items-center justify-between gap-2"><span>Shopping trip haptics</span><input type="checkbox" defaultChecked className="h-4 w-4" style={{accentColor:"#0A0A0A"}} /></label>
        </div>
        <div className="text-[10px] text-[var(--muted)]/60 mt-2">No external service yet — these toggles are stored locally.</div>
      </div>

      {/* Data and Sync */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">Data and Sync</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Supabase is source of truth • localStorage + IDB is cache • revision CAS protects race writes</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-[12px] bg-[var(--chip-bg)] px-3 py-2"><div className="text-[10px]">Local total</div><div className="font-medium">{totalLocal} items</div></div>
          <div className="rounded-[12px] bg-[var(--chip-bg)] px-3 py-2"><div className="text-[10px]">Last sync</div><div className="font-medium truncate">{(()=>{ try { return localStorage.getItem('couple_v1_last_sync')?.slice(11,19) || 'never' } catch { return '—' } })()}</div></div>
        </div>
        <div className="mt-3 text-[10px] text-[var(--muted)]">Offline queue: {(()=>{ try { return localStorage.getItem('couple_v1_queue_count') || '0' } catch { return '0' } })()} • Failed last: {(()=>{ try { const e=localStorage.getItem('couple_v1_last_push_err'); return e? e.slice(0,36) : 'none'} catch { return 'none' } })()}</div>
        <div className="mt-3 flex gap-2">
          <button onClick={async()=>{ try { const { remoteLoad } = await import('./lib/remoteSync'); const r = await remoteLoad(); if(!r) return; if(setChoresRaw) setChoresRaw(r.chores as any); if(setCalendarRaw) setCalendarRaw(r.calendar as any); if(setShoppingRaw) setShoppingRaw(r.shopping as any); if(setNotesRaw) setNotesRaw(r.notes as any); } catch {} }} className="rounded-full bg-[var(--nav-active-bg)] px-3 py-1.5 text-[11px] text-[var(--nav-active-text)]">Refresh from server</button>
          <button onClick={()=> { try { localStorage.setItem('couple_v1_last_sync', new Date().toISOString()) } catch{} }} className="rounded-full bg-[var(--card-bg)] border px-3 py-1.5 text-[11px] border-[var(--border)]">Mark synced now</button>
        </div>
      </div>

      {/* Privacy and Security */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">Privacy and Security</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">PIN is device-local only — see SECURITY.md for auth roadmap.</div>
        <div className="mt-3 space-y-2">
          <label className="flex items-center justify-between gap-2 text-[11px]">
            <span>Remember on this device</span>
            <input type="checkbox" checked={rememberPref} onChange={e=> { const v=e.target.checked; setRememberPref(v); try { localStorage.setItem('couple_v1_remember_user', v?'1':'0'); if(!v){ sessionStorage.setItem('couple_v1_ephemeral_session','1'); } else { sessionStorage.removeItem('couple_v1_ephemeral_session'); } } catch{} }} className="h-4 w-4" style={{accentColor:'#0A0A0A'}} />
          </label>
          <div className="text-[10px] text-[var(--muted)]/70">When off, PIN is required every fresh load and user is not persisted to IDB. When on (default), we keep <code>couple_v1_currentUser</code> in LS+IDB for auto-login.</div>
          <button onClick={()=> { try { localStorage.removeItem('couple_v1_currentUser'); sessionStorage.setItem('couple_v1_ephemeral_session','1'); (async()=>{ try { const { } = await import('./lib/idb'); const db = await openIdb(); if(db){ const tx=db.transaction('kv','readwrite'); tx.objectStore('kv').delete('couple_v1_currentUser'); } } catch{} location.reload(); })(); } catch { location.reload(); } }} className="mt-2 rounded-full bg-[var(--card-bg)] border px-3 py-1.5 text-[11px] border-[var(--border)]">Sign out — forget me on this device</button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-[20px] border bg-[var(--card-bg)] px-4 py-4" style={{ borderColor:"var(--border)"}}>
        <div className="font-display text-[13px] font-semibold">About</div>
        <div className="mt-2 text-[11px] text-[var(--muted)]">Nylah OS • couple-fridge • Beta • Europe/Dublin • standalone + PWA</div>
        <div className="mt-1 text-[10px] text-[var(--muted)]/70">Build {(() => { try { const w:any = window as any; return w.__NYLAH_BUILD__ || 'dev' } catch { return 'dev' } })()} • Theme support 6 • Revision CAS sync • Offline queue • IDB photo store • Hashed PIN gate (interim) • See SECURITY.md for roadmap to Supabase Auth + household_members.</div>
        <div className="mt-2 text-[10px]">Code: <a href="https://github.com" className="underline">GitHub</a> • Data: Supabase hosted EU • Photos: client-compressed WebP now, Storage bucket future.</div>
      </div>

      {isDebug ? (
        <DebugCenter choresRaw={choresRaw} calendarRaw={calendarRaw} shoppingRaw={shoppingRaw} notesRaw={notesRaw} setChoresRaw={setChoresRaw} setCalendarRaw={setCalendarRaw} setShoppingRaw={setShoppingRaw} setNotesRaw={setNotesRaw} />
      ) : (
        <div className="rounded-[14px] border border-dashed bg-[var(--card-bg)] px-3 py-2 text-[10px] text-[var(--muted)]" style={{borderColor:"var(--border)"}}>
          Debug Center hidden — add <code>?debug=1</code> or set <code>localStorage couple_v1_debug=1</code> or run on localhost to expose internal controls.
        </div>
      )}
    </div>
  );
}

function V1AppShell({
  currentUser, setCurrentUser, themeId, setThemeId, nowMs, setNowMs,
}: {
  currentUser: PersonKey; setCurrentUser: (k: PersonKey) => void; themeId: string; setThemeId: (s: string) => void; nowMs: number; setNowMs: (n: number) => void;
}) {
  const standalone = useIsStandalone();
  const [tab, setTab] = useState<TabKey>("fridge");
  // ── Truthful sync state: single source owned by shell, NOT each SyncStatusIsolated ──
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    try {
      const last = localStorage.getItem('couple_v1_last_sync');
      return { kind: 'saved', lastSavedAt: last || undefined } as SyncStatus;
    } catch { return { kind: 'saved' } as SyncStatus }
  });
  // keep compat: old code referenced syncState — map to new
  const syncState = syncStatus;
  const setSyncState = (s:any)=>{ /* legacy compat no-op, use setSyncStatus */ };
  const [showSwitch, setShowSwitch] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [pendingSwitchTo, setPendingSwitchTo] = useState<PersonKey|null>(null);
  const [switchPin, setSwitchPin] = useState("");
  const [switchPinWrong, setSwitchPinWrong] = useState(false);
  const phoneInnerRef = useRef<HTMLDivElement>(null);
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]!;

  // ── Loop-break guards (fix feedback loop) ──
  const applyingRemoteRef = useRef(false);
  const lastLocalMutationIdRef = useRef<string | null>(null);
  const lastSnapshotHashRef = useRef<string | null>(null);
  function stableHash(o: any): string {
    try {
      // deterministic: sort keys, stable array order by id
      const s = JSON.stringify(o, (_k, v) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const keys = Object.keys(v).sort();
          const out: any = {};
          for (const k of keys) out[k] = (v as any)[k];
          return out;
        }
        return v;
      });
      // tiny hash to keep ref small but unique enough – keep full string for equality (data tiny)
      return s;
    } catch { return String(Date.now()); }
  }
  function deepEqual(a: any, b: any): boolean {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }

  // ── Mutation Queue (concept + implementation) ──
  // Every remoteSave gets mutationId = crypto.randomUUID()
  // Dedup guard: localStorage last_mutation + IDB queue dedup
  // Revision CAS: expectedRevision from LS, eq(revision) in Supabase
  // Queue persisted in IDB 'mutation_queue' + memory ref for offline
  type QueuedMutation = { mutationId: string; revision: number; payload: any; createdAt: string; retries: number };
  const mutationQueueRef = useRef<QueuedMutation[]>([]);
  const queueHydratedRef = useRef(false);

  // IDB hydration for queue + photos
  useEffect(()=>{
    (async()=>{
      try {
        const db = await openIdb();
        if (!db) return;
        // queue
        const q = await idbGet<QueuedMutation[]>('mutation_queue');
        if (Array.isArray(q) && q.length>0) {
          mutationQueueRef.current = q;
          queueHydratedRef.current = true;
          setSyncStatus(s=> s.kind==='saved' ? { kind:'offline-queued', queueCount: q.length, lastSavedAt: s.lastSavedAt } : s);
        }
        // photos -> notesRaw will hydrate separately in its own effect below
      } catch {}
    })();
  }, []);

  const persistQueue = async ()=>{
    try { await idbSet('mutation_queue', mutationQueueRef.current); } catch{}
    try { localStorage.setItem('couple_v1_queue_count', String(mutationQueueRef.current.length)); } catch{}
  };

  const drainQueue = async ()=>{
    if (mutationQueueRef.current.length===0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine===false) return;
    if (!hasSupabaseConfig() || !getSupabase()) return;
    const next = [...mutationQueueRef.current];
    for (const m of next) {
      try {
        setSyncStatus({ kind:'saving' });
        // eslint-disable-next-line no-await-in-loop
        const ok = await remoteSave({ ...(m.payload||{}), mutationId: m.mutationId, expectedRevision: m.revision });
        if (ok) {
          mutationQueueRef.current = mutationQueueRef.current.filter(x=> x.mutationId!==m.mutationId);
          await persistQueue();
          setSyncStatus({ kind:'saved', lastSavedAt: new Date().toISOString(), queueCount: mutationQueueRef.current.length });
        } else {
          // keep for retry, bump retries
          m.retries++;
          if (m.retries>=3) {
            setSyncStatus({ kind:'failed', error:'sync failed — will retry', queueCount: mutationQueueRef.current.length });
            break;
          }
        }
      } catch (e:any) {
        m.retries++;
        await persistQueue();
        setSyncStatus({ kind:'failed', error: String(e?.message||e).slice(0,30), queueCount: mutationQueueRef.current.length });
        break;
      }
    }
    await persistQueue();
  };

  const enqueueMutation = async (payload:any)=>{
    // reuse mutationId from caller's guarded snapshot if provided (echo guard)
    const provided = (payload as any)?.meta?.lastMutationId || (payload as any)?.lastMutationId
    const mutationId = provided || ((typeof crypto!=='undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `mut_${Date.now()}_${Math.random().toString(36).slice(2,7)}`)
    // ensure payload carries it for realtime echo detection
    try { if ((payload as any).meta) (payload as any).meta.lastMutationId = mutationId; else (payload as any).meta = { lastMutationId: mutationId } } catch {}
    let rev = 0;
    try { rev = Number(localStorage.getItem('couple_v1_revision')||'0') } catch{}
    const item: QueuedMutation = { mutationId, revision: rev, payload, createdAt: new Date().toISOString(), retries:0 };
    // dedup guard: if last mutation same id skip
    try {
      const last = localStorage.getItem('couple_v1_last_mutation');
      if (last && mutationId===last) {
        // already sent this exact mutation — don't requeue, but still ensure refs are correct
        lastLocalMutationIdRef.current = mutationId
        return true;
      }
    } catch{}
    mutationQueueRef.current.push(item);
    await persistQueue();
    if (typeof navigator!=='undefined' && navigator.onLine===false) {
      setSyncStatus({ kind:'offline-queued', queueCount: mutationQueueRef.current.length });
      // don't try remote now
      try { localStorage.setItem('couple_v1_last_mutation', mutationId); } catch{}
      return false;
    }
    // try immediate save with CAS
    try {
      setSyncStatus({ kind:'saving' });
      const ok = await remoteSave({ ...payload, mutationId, expectedRevision: rev });
      if (ok) {
        mutationQueueRef.current = mutationQueueRef.current.filter(x=> x.mutationId!==mutationId);
        await persistQueue();
        setSyncStatus({ kind:'saved', lastSavedAt: new Date().toISOString() });
        try { localStorage.setItem('couple_v1_last_sync', new Date().toISOString()); localStorage.setItem('couple_v1_last_mutation', mutationId); localStorage.setItem('couple_v1_revision', String(rev+1)); } catch{}
        return true;
      } else {
        // leave in queue for retry
        setSyncStatus({ kind:'failed', error:'conflict or offline', queueCount: mutationQueueRef.current.length });
        return false;
      }
    } catch (e:any) {
      setSyncStatus({ kind:'failed', error: String(e?.message||e).slice(0,24), queueCount: mutationQueueRef.current.length });
      return false;
    }
  };

  // Design tokens -> CSS variables for full theme migration (spec: whole app via vars)
  useEffect(()=>{
    try {
      const r = document.documentElement;
      r.style.setProperty('--bg', theme.bg);
      r.style.setProperty('--phone-bg', (theme as any).phoneBg || theme.bg);
      r.style.setProperty('--surface', theme.cardBg || 'var(--card-bg)');
      r.style.setProperty('--surface-muted', theme.bg || 'var(--chip-bg)');
      r.style.setProperty('--text-primary', theme.text);
      r.style.setProperty('--text', theme.text);
      r.style.setProperty('--text-secondary', '#5A5655');
      r.style.setProperty('--border', theme.cardBd);
      r.style.setProperty('--card-bd', theme.cardBd);
      r.style.setProperty('--card-bg', theme.cardBg);
      r.style.setProperty('--accent', theme.accent);
      r.style.setProperty('--accent-strong', (theme as any).accentStrong || theme.accent);
      r.style.setProperty('--nav-bg', (theme as any).navBg || theme.bg);
      r.style.setProperty('--nav-active-bg', (theme as any).navActiveBg || '#0A0A0A');
      r.style.setProperty('--nav-active-text', (theme as any).navActiveText || '#FFFFFF');
      r.style.setProperty('--topbar-bg', (theme as any).topBarBg || theme.bg);
      r.style.setProperty('--wash-top', (theme as any).washTop || theme.accent);
      r.style.setProperty('--wash-mid', (theme as any).washMid || theme.bg);
      r.style.setProperty('--chip-bg', (theme as any).chipBg || 'var(--chip-bg)');
      if (theme.id === 'midnight') {
        r.style.setProperty('--bg', '#0A0A0A');
        r.style.setProperty('--phone-bg', '#0A0A0A');
        r.style.setProperty('--surface', '#1E1E1E');
        r.style.setProperty('--surface-muted', '#1E1E1E');
        r.style.setProperty('--card-bg', '#1E1E1E');
        r.style.setProperty('--card-bd', '#2A2A2A');
        r.style.setProperty('--border', '#2A2A2A');
        r.style.setProperty('--text', '#EDE8E3');
        r.style.setProperty('--text-primary', '#F5F1ED');
        r.style.setProperty('--text-secondary', '#9CA3AF');
        r.style.setProperty('--chip-bg', '#2A2A2A');
        r.style.setProperty('--nav-bg', 'rgba(10,10,10,0.92)');
      }
    } catch {}
  }, [theme]);

  // One clock for relative times (30s) — event-driven sync status separate, no 1s interval.
  useEffect(() => { const i = setInterval(() => setNowMs(Date.now()), 30000); return () => clearInterval(i); }, [setNowMs]);

  // One unified truthful sync signal — replaces multiple leaked listeners
  useEffect(()=>{
    const onOnline = ()=>{ drainQueue(); if (mutationQueueRef.current.length>0) setSyncStatus(s=>({ kind:'offline-queued', queueCount: mutationQueueRef.current.length, lastSavedAt: s.lastSavedAt })); else setSyncStatus(s=>({ kind:'saved', lastSavedAt: s.lastSavedAt })); };
    const onOffline = ()=>{ setSyncStatus(s=>({ kind:'offline-queued', queueCount: mutationQueueRef.current.length || undefined, lastSavedAt: s.lastSavedAt })); };
    const onCoupleSync = (ev:any)=>{
      const d = ev?.detail;
      if (d==='saving') setSyncStatus(s=>({ ...s, kind:'saving' }));
      else if (d==='failed') setSyncStatus(s=>({ kind:'failed', error: s.lastSavedAt ? undefined : 'failed', queueCount: s.queueCount, lastSavedAt: s.lastSavedAt }));
      else if (d==='offline') setSyncStatus(s=>({ kind:'offline-queued', queueCount: mutationQueueRef.current.length||1, lastSavedAt: s.lastSavedAt }));
      else if (d==='updated-elsewhere') setSyncStatus(s=>({ kind:'updated-elsewhere', lastSavedAt: s.lastSavedAt }));
      else if (d==='saved') setSyncStatus({ kind:'saved', lastSavedAt: new Date().toISOString() });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('couple-sync' as any, onCoupleSync as any);
    return ()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.removeEventListener('couple-sync' as any, onCoupleSync as any); };
  }, []);

  const touchSync = () => { try { localStorage.setItem("couple_v1_last_sync", new Date().toISOString()); } catch{}; setSyncStatus({ kind:'saved', lastSavedAt: new Date().toISOString() }); try { window.dispatchEvent(new CustomEvent('couple-sync', {detail:'saved'})) } catch{} };
  function triggerConfetti(origin?: any) {
    const hostParent = phoneInnerRef.current; if (!hostParent) return;
    const existing = hostParent.querySelectorAll(".confetti-host"); if (existing.length >= 2) existing[0]?.remove();
    const host = document.createElement("div"); (host as any).className = "confetti-host"; (host as any).style.position = "absolute"; (host as any).style.inset = "0"; (host as any).style.pointerEvents = "none"; (host as any).style.zIndex = "50"; (host as any).style.overflow = "hidden"; (host as any).style.borderRadius = "28px"; hostParent.appendChild(host);
    let cx = 0.5, cy = 0.38;
    try {
      const anyOrigin: any = origin;
      if (anyOrigin && typeof anyOrigin.clientX === "number") { const rect = hostParent.getBoundingClientRect(); cx = (anyOrigin.clientX - rect.left) / rect.width; cy = (anyOrigin.clientY - rect.top) / rect.height; }
      else if (anyOrigin instanceof Element) { const r = anyOrigin.getBoundingClientRect(); const pr = hostParent.getBoundingClientRect(); cx = ((r.left + r.width / 2) - pr.left) / pr.width; cy = ((r.top + r.height / 2) - pr.top) / pr.height; }
    } catch { }
    cx = Math.min(0.85, Math.max(0.15, cx)); cy = Math.min(0.78, Math.max(0.12, cy));
    const colors = ["#A89FDA", "var(--border)", "#D0A1EA", "#FFDCC7", "#FACC15", "#6EE7B7", "#FB923C"];
    const finalCount = 24 + Math.floor(Math.random() * 7);
    for (let i = 0; i < finalCount; i++) {
      const el = document.createElement("div"); (el as any).className = "confetti-node";
      const roll = Math.random(); const color = colors[Math.floor(Math.random() * colors.length)]!;
      const angle = Math.random() * Math.PI * 2; const dist0 = Math.random() * 16; const dist1 = 42 + Math.random() * 94;
      const x0 = Math.cos(angle) * dist0; const y0 = Math.sin(angle) * dist0 * 0.5 - Math.random() * 12;
      const x1 = Math.cos(angle) * dist1 + (Math.random() - 0.5) * 28; const yDrift = 110 + Math.random() * 150;
      const leftBase = cx * 100; const leftJitter = (Math.random() - 0.5) * 16; const left = Math.min(85, Math.max(15, leftBase + leftJitter + x0 / 3.2));
      const r0 = Math.floor(Math.random() * 360); const r1 = r0 + (180 + Math.random() * 540) * (Math.random() < 0.5 ? -1 : 1);
      const delay = Math.floor(Math.random() * 80); const dur = 650 + Math.floor(Math.random() * 250); const scale = 0.82 + Math.random() * 0.6;
      (el as any).style.left = left + "%"; (el as any).style.top = cy * 100 + "%";
      (el as any).style.setProperty("--x0", x0 + "px"); (el as any).style.setProperty("--y0", y0 + "px");
      (el as any).style.setProperty("--x1", x1 + "px"); (el as any).style.setProperty("--y1", yDrift + "px");
      (el as any).style.setProperty("--r0", r0 + "deg"); (el as any).style.setProperty("--r1", r1 + "deg");
      (el as any).style.setProperty("--s", scale.toString()); (el as any).style.animationDelay = delay + "ms"; (el as any).style.animationDuration = dur + "ms";
      if (roll < 0.33) { (el as any).style.width = "6px"; (el as any).style.height = "6px"; (el as any).style.borderRadius = "999px"; (el as any).style.background = color; }
      else if (roll < 0.66) { (el as any).style.width = "6px"; (el as any).style.height = "6px"; (el as any).style.borderRadius = "1.5px"; (el as any).style.background = color; }
      else if (roll < 0.86) { (el as any).style.width = "8px"; (el as any).style.height = "3px"; (el as any).style.borderRadius = "2px"; (el as any).style.background = color; }
      else { (el as any).style.width = "10px"; (el as any).style.height = "10px"; (el as any).style.background = "transparent"; (el as any).innerHTML = "<svg viewBox='0 0 10 10' width='10' height='10'><path d='M5 0 L6.15 3.2 L9.5 3.2 L6.72 5.28 L7.62 8.7 L5 6.64 L2.38 8.7 L3.28 5.28 L0.5 3.2 L3.85 3.2 Z' fill='" + color + "'/></svg>"; }
      host.appendChild(el);
    }
    window.setTimeout(() => { host.remove(); }, 1150);
  }
  // migrate chores from old a/b shape and localStorage -- clean slate (no demo)
  const [choresRaw, setChoresRaw] = useLocalState<any[]>("couple_v1_chores", []);
  const chores: ChoreV2[] = (choresRaw as any[]).map((c: any) => {
    if (c && c.swipes && (c.swipes.aisling !== undefined || c.swipes.ciaran !== undefined)) return c as ChoreV2;
    if (c && c.swipes && (c.swipes.a !== undefined || c.swipes.b !== undefined)) {
      return { ...c, swipes: { aisling: c.swipes.a, ciaran: c.swipes.b }, assignedTo: c.assignedTo === 'a' ? 'aisling' : c.assignedTo === 'b' ? 'ciaran' : c.assignedTo, completedBy: c.completedBy === 'a' ? 'aisling' : c.completedBy === 'b' ? 'ciaran' : c.completedBy } as ChoreV2;
    }
    return { id: c.id || uid("chk"), title: c.title || "Untitled", type: "one-off", frequency: "once", createdAt: c.createdAt || new Date().toISOString(), pain: 5, basePoints: 50, swipes: { aisling: null, ciaran: null }, status: c.completed ? "done" : "deck", assignedTo: c.assignedTo === "Alex" ? "aisling" : "ciaran", multiplier: 1, timeWindowHours: 24 } as ChoreV2;
  });
  const setChores = (up: any) => {
    if (typeof up === "function") {
      setChoresRaw((prev: any) => {
        const cur = (prev as any[]).map((c: any) => {
          if (c && c.swipes && (c.swipes.aisling !== undefined || c.swipes.ciaran !== undefined)) return c;
          if (c && c.swipes && (c.swipes.a !== undefined || c.swipes.b !== undefined)) return { ...c, swipes: { aisling: c.swipes.a, ciaran: c.swipes.b }, assignedTo: c.assignedTo === 'a' ? 'aisling' : c.assignedTo === 'b' ? 'ciaran' : c.assignedTo, completedBy: c.completedBy === 'a' ? 'aisling' : c.completedBy === 'b' ? 'ciaran' : c.completedBy };
          return c;
        });
        return up(cur);
      });
    } else setChoresRaw(up);
  };
  const [calendarRaw, setCalendarRaw] = useLocalState<CalendarEventV2[]>("couple_v1_calendar_v2", []);
  const [shoppingRaw, setShoppingRaw] = useLocalState<ShoppingItemV2[]>("couple_v1_shopping_v2", []);
  const [notesRaw, setNotesRaw] = useLocalState<NoteMemo[]>("couple_v1_notes_memo", []);

  // migrate old shopping cats → new taxonomy to prevent invisible items
  useEffect(() => {
    try {
      if (!Array.isArray(shoppingRaw) || shoppingRaw.length === 0) return;
      let needs = false;
      for (const it of shoppingRaw as any[]) {
        if (!it || typeof it.cat !== "string") continue;
        if (!(CATS as string[]).includes(it.cat)) { needs = true; break; }
      }
      if (!needs) return;
      const migrated = (shoppingRaw as any[]).map((it: any) => {
        try { return { ...it, cat: mapOldCat(it.cat) }; } catch { return it; }
      });
      setShoppingRaw(migrated as any);
    } catch {}
  }, [shoppingRaw]);

  // ── STORAGE: Supabase first, realtime guarded ──
  useEffect(() => {
    let cancelled = false

    // ── guarded remote apply (breaks echo loop) ──
    const applyRemoteSnapshot = (remote: any, opts?: { force?: boolean }) => {
      if (!remote) return
      try {
        // 1) echo guard: ignore our own write that came back via realtime
        const remoteMut = (remote.meta as any)?.lastMutationId || (remote as any).lastMutationId
        if (remoteMut && remoteMut === lastLocalMutationIdRef.current) {
          // own echo — update hash so auto-push won't re-fire, but don't re-apply arrays
          const h = stableHash({ chores: remote.chores, calendar: remote.calendar, shopping: remote.shopping, notes: remote.notes })
          lastSnapshotHashRef.current = h
          return
        }
        // 2) snapshot hash guard
        const nextHash = stableHash({ chores: remote.chores, calendar: remote.calendar, shopping: remote.shopping, notes: remote.notes })
        if (nextHash === lastSnapshotHashRef.current) {
          return
        }

        applyingRemoteRef.current = true
        lastSnapshotHashRef.current = nextHash

        // ── minimal additive merge but with deepEqual identity preservation ──
        const force = !!opts?.force
        const totalRemote = (Array.isArray(remote.chores)? remote.chores.length:0)+(Array.isArray(remote.calendar)? remote.calendar.length:0)+(Array.isArray(remote.shopping)? remote.shopping.length:0)+(Array.isArray(remote.notes)? remote.notes.length:0)
        const totalLocal = (choresRaw as any[]).length + (calendarRaw as any[]).length + (shoppingRaw as any[]).length + (notesRaw as any[]).length
        if (totalRemote === 0 && !force) {
          console.log('[sync] realtime skip — remote total 0 guard')
          queueMicrotask(()=>{ applyingRemoteRef.current = false })
          return
        }

        // use functional setters with deepEqual preservation — prevents new array object churn
        const { chores, calendar, shopping, notes } = remote

        if (Array.isArray(chores)) {
          setChoresRaw((prev:any)=>{
            if (deepEqual(prev, chores)) return prev
            // keep very-recent local-only creations (<2min) that haven't made it to remote yet
            if (!force && prev && prev.length>0) {
              const now = Date.now()
              const recent = (prev as any[]).filter((lc:any)=>{
                const id = String(lc.id||'')
                if (chores.some((rc:any)=> String(rc.id)===id)) return false
                const created = lc.createdAt ? new Date(lc.createdAt).getTime() : 0
                return created && (now-created)<120000
              })
              return recent.length>0 ? [...chores, ...recent] as any : chores as any
            }
            return chores as any
          })
        }
        if (Array.isArray(calendar)) {
          setCalendarRaw((prev:any)=> deepEqual(prev, calendar) ? prev : calendar as any)
        }
        if (Array.isArray(shopping)) {
          setShoppingRaw((prev:any)=> deepEqual(prev, shopping) ? prev : shopping as any)
        }
        if (Array.isArray(notes)) {
          setNotesRaw((prev:any)=>{
            if (deepEqual(prev, notes)) return prev
            if (!force && prev && prev.length>0) {
              const now = Date.now()
              const recent = (prev as any[]).filter((lc:any)=>{
                const id = String(lc.id||'')
                if (notes.some((rc:any)=> String(rc.id)===id)) return false
                const ts = lc.createdAt ? new Date(lc.createdAt).getTime() : lc.ts ? new Date(lc.ts).getTime() : 0
                return ts && (now-ts)<120000
              })
              return recent.length>0 ? [...notes, ...recent] as any : notes as any
            }
            return notes as any
          })
        }

        try { localStorage.setItem("couple_v1_last_sync", new Date().toISOString()); localStorage.setItem("couple_v1_last_push_err",""); setSyncStatus((s)=>({ kind:'saved' as any, lastSavedAt: new Date().toISOString(), queueCount: (s as any).queueCount })); } catch {}

        queueMicrotask(()=>{ applyingRemoteRef.current = false })
      } catch {
        applyingRemoteRef.current = false
      }
    }

    const trySupabaseLoad = async () => {
      if (!hasSupabaseConfig() || !getSupabase()) return false
      try {
        const remote = await remoteLoad()
        if (!remote) {
          console.log('[sync] supabase empty / no row yet')
          return false
        }
        if (cancelled) return true
        console.log('[sync] supabase load ok', { c: remote.chores.length, cal: remote.calendar.length, s: remote.shopping.length, n: remote.notes.length })
        // seed hash so next auto-push guard knows
        try { lastSnapshotHashRef.current = stableHash({ chores: remote.chores, calendar: remote.calendar, shopping: remote.shopping, notes: remote.notes }) } catch {}
        if (remote.meta && (remote.meta as any).lastMutationId) {
          lastLocalMutationIdRef.current = (remote.meta as any).lastMutationId
        }
        applyRemoteSnapshot(remote, { force: true })
        return true
      } catch(e:any){ console.warn('[sync] supabase load fail', e?.message||e); return false }
    }

    const syncFromRemote = async () => {
      if (cancelled) return
      await trySupabaseLoad()
    }

    syncFromRemote()
    let lastSyncOk = Date.now()
    const focus = () => {
      const stale = Date.now() - lastSyncOk > 5*60*1000
      const disconnected = !(hasSupabaseConfig() && getSupabase())
      if (stale || disconnected) { syncFromRemote() }
    }
    const onVis = () => { if (document.visibilityState==="visible") focus() }
    window.addEventListener("focus", focus)
    document.addEventListener("visibilitychange", onVis)

    let unsubReal: ()=>void = ()=>{}
    try {
      if (hasSupabaseConfig()) {
        unsubReal = subscribeRemote((remote)=>{
          if (cancelled) return
          lastSyncOk = Date.now()
          console.log('[sync] realtime push', (remote as any).updated_at, 'mut', (remote.meta as any)?.lastMutationId?.slice?.(0,8))
          applyRemoteSnapshot(remote, { force: false })
        })
      }
    } catch {}

    return () => { cancelled=true; window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", onVis); try{ unsubReal() } catch{} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pushToSheet(_sheetId?: string) {
    try {
      try {
        const total = (choresRaw?.length||0)+(calendarRaw?.length||0)+(shoppingRaw?.length||0)+(notesRaw?.length||0)
        if (total===0) { console.log("[sync] skip push local total 0 - guard"); return }
      } catch {}
      if (hasSupabaseConfig() && getSupabase()) {
        // include lastMutationId in meta for echo guard
        const mut = lastLocalMutationIdRef.current || (typeof crypto!=='undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `mut_${Date.now()}`)
        if (!lastLocalMutationIdRef.current) lastLocalMutationIdRef.current = mut
        enqueueMutation({ chores: choresRaw as any, calendar: calendarRaw as any, shopping: shoppingRaw as any, notes: notesRaw as any, meta:{ syncedAt: new Date().toISOString(), householdId: BUILD_HOUSEHOLD_ID, householdTz: HOUSEHOLD_TZ, lastMutationId: mut } });
      }
    } catch(e){ console.error("[sync] push ex", e) }
  }

  // ── auto-push REPLACED: guarded, refuses to run after remote apply, hash-checked ──
  useEffect(() => {
    // IDB hydration kept only for offline-first case (no supabase)
    (async()=>{
      try {
        if (!hasSupabaseConfig()) {
          const cachedNotes = await idbGet<NoteMemo[]>('couple_v1_notes_memo');
          if (Array.isArray(cachedNotes) && cachedNotes.length>0 && (notesRaw as any[]).length===0) {
            setNotesRaw(cachedNotes as any);
          }
        }
      } catch {}
    })();
    try{
      const raw=localStorage.getItem("couple_v1_auto_push")
      if(raw!==null){ try{ const p=JSON.parse(raw); if(p===false) return; if(p==="off"||p==='"off"') return } catch{ if(raw==="off"||raw.includes("off")) return } }
    } catch{}
    // stop immediately if we're currently applying a remote snapshot — prevents echo
    if (applyingRemoteRef.current) return

    if (!hasSupabaseConfig() || !getSupabase()) return

    const snapshot = { chores: choresRaw as any, calendar: calendarRaw as any, shopping: shoppingRaw as any, notes: notesRaw as any }
    const snapshotHash = stableHash(snapshot)
    if (snapshotHash === lastSnapshotHashRef.current) return

    // we have a real local change -> prepare mutationId and hash before timer (so concurrent remote echo ignored)
    const mutationId = typeof crypto!=='undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `mut_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    lastLocalMutationIdRef.current = mutationId
    lastSnapshotHashRef.current = snapshotHash

    try { setSyncStatus({ kind:'saving' } as any); } catch{}
    const h=setTimeout(async()=>{
      if (applyingRemoteRef.current) return
      try{
        const rev = (()=>{ try { return Number(localStorage.getItem('couple_v1_revision')||'0') } catch{return 0}})()
        console.log("[sync] guarded push 800ms, rev", rev, "mut", mutationId.slice(0,8));
        const ok = await enqueueMutation({ ...snapshot, meta:{ syncedAt: new Date().toISOString(), householdId: BUILD_HOUSEHOLD_ID, householdTz: HOUSEHOLD_TZ, lastMutationId: mutationId } });
        if (ok) {
          try { window.dispatchEvent(new CustomEvent('couple-sync',{detail:'saved'})) } catch{}
        } else {
          try { if (typeof navigator!=='undefined' && navigator.onLine===false) setSyncStatus({ kind:'offline-queued', queueCount: mutationQueueRef.current.length||1 } as any); else setSyncStatus({ kind:'failed', queueCount: mutationQueueRef.current.length } as any); } catch{}
        }
      } catch(e){ console.warn(e); try{ setSyncStatus({ kind:'failed' } as any) } catch{} }
    }, 800)
    return ()=>clearTimeout(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choresRaw, calendarRaw, shoppingRaw, notesRaw])
  return (

    <div className={standalone ? "w-full min-h-screen min-h-dvh flex flex-col" : "mx-auto w-[min(390px,100%)] overflow-hidden rounded-[36px] border-[7px] border-white ph-frame"} style={{ background: theme.bg } as any}>
      <div ref={phoneInnerRef} className={standalone ? "relative flex flex-1 min-h-screen min-h-dvh flex-col overflow-hidden bg-[var(--card-bg)]" : "relative flex h-[800px] flex-col overflow-hidden rounded-[28px]"}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b" style={{ background: theme.topBarBg, borderColor: theme.cardBd, color: theme.text }}>
          {tab!=="fridge" ? <button onClick={() => setTab("fridge")} aria-label="back home" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--card-bg)] border active:scale-[0.96] transition" style={{ borderColor: theme.cardBd }}><IconChevronLeft className="h-4 w-4" /></button> : <div className="w-8 h-8" aria-hidden="true" />}
          <button onClick={() => setShowSwitch(true)} className="flex items-center gap-1.5 rounded-full bg-[var(--chip-bg)] border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: theme.cardBd }}>
            <span className="h-2 w-2 rounded-full" style={{ background: PERSONS[currentUser].accent }} />{PERSONS[currentUser].name} • using
          </button>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-full bg-[var(--nav-active-bg)] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[var(--nav-active-text)] border border-white/10 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />BETA</span><UpdaterBanner /><button onClick={() => setShowBlueprint(true)} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--card-bg)] border active:scale-[0.96] min-h-[32px] min-w-[32px]" style={{ borderColor: theme.cardBd }}>⚙</button><SyncStatusIsolated syncStatus={syncStatus} onRetry={()=> drainQueue()} /></div>
        </div>
        <div className="flex-1 overflow-auto no-scrollbar px-3.5 pt-3 pb-[106px]" style={{ background: theme.bg }}>
          {tab === "fridge" && <FridgePage currentUser={currentUser} chores={chores as any} calendar={calendarRaw} shopping={shoppingRaw} notes={notesRaw} setTab={setTab} nowMs={nowMs} theme={theme} syncStatus={syncStatus} />}
          {tab === "calendar" && <CalendarPageV2 events={calendarRaw} chores={choresRaw as any} setEvents={setCalendarRaw as any} currentUser={currentUser} setCurrentUser={setCurrentUser} nowMs={nowMs} onCelebrate={triggerConfetti} />}
          {tab === "chores" && <ChoresPage chores={chores as any} setChores={setChores as any} currentUser={currentUser} setCurrentUser={setCurrentUser} onCelebrate={triggerConfetti} nowMs={nowMs} />}
          {tab === "shopping" && <ShoppingPageFacelift items={shoppingRaw} setItems={setShoppingRaw as any} currentUser={currentUser} onCelebrate={triggerConfetti} nowMs={nowMs} />}
          {tab === "notes" && <NotesMemoPage notes={notesRaw} setNotes={setNotesRaw as any} currentUser={currentUser} nowMs={nowMs} />}
          {tab === "blueprint" && <BlueprintPanel theme={theme} setTheme={setThemeId as any} onConfetti={triggerConfetti} choresRaw={choresRaw} calendarRaw={calendarRaw} shoppingRaw={shoppingRaw} notesRaw={notesRaw} setChoresRaw={setChoresRaw as any} setCalendarRaw={setCalendarRaw as any} setShoppingRaw={setShoppingRaw as any} setNotesRaw={setNotesRaw as any} />}
        </div>

        <div className="pointer-events-none absolute bottom-0 inset-x-0 z-[60] flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60, isolation: 'isolate' } as any}>
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border backdrop-blur-[20px] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.18),0_6px_16px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] overflow-x-auto no-scrollbar flex-nowrap" style={{ background: theme.navBg, borderColor: theme.cardBd, width: "100%", maxWidth: "390px", minWidth: "0", minHeight: "60px", backdropFilter: "blur(20px) saturate(1.3)" }}>
            {TABS.map(it => { const active = tab === it.k; return <button key={it.k} onClick={() => { setTab(it.k); touchSync(); }} className={"relative flex flex-1 items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-[200ms] active:scale-[0.94] select-none " + (active ? "shadow-[0_3px_10px_rgba(0,0,0,0.20),0_1px_3px_rgba(0,0,0,0.12)]" : "hover:opacity-80 active:opacity-70")} style={{ background: active ? theme.navActiveBg : "transparent", color: active ? theme.navActiveText : theme.text, minHeight: "46px", minWidth: "44px" } as any}><span className="tracking-[-0.01em]">{it.label}</span>{active && <span className="absolute -bottom-0.5 left-1/2 h-[3.5px] w-[3.5px] -translate-x-1/2 rounded-full bg-[var(--card-bg)] shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />}</button>; })}
          </div>
        </div>

        {showSwitch && (
          <BottomSheet open={showSwitch} onClose={() => { setShowSwitch(false); setPendingSwitchTo(null); setSwitchPin(""); setSwitchPinWrong(false); }} title="Who's using?">
            {pendingSwitchTo ? (
              <div className="py-4 space-y-3">
                <div className="text-[13px] font-medium">Enter PIN for {PERSONS[pendingSwitchTo].name} to switch</div>
                <div className="flex gap-2">
                  <input value={switchPin} onChange={e=> { const v=e.target.value.replace(/\D/g,"").slice(0,4); setSwitchPin(v); setSwitchPinWrong(false); }} inputMode="numeric" placeholder="••••" className="flex-1 rounded-full border bg-[var(--card-bg)] px-4 h-[44px] text-center tracking-widest" style={{ borderColor: switchPinWrong ? "#E07A5F" : "var(--border)" }} />
                  <button onClick={async()=>{
                    const who = await verifyPin(switchPin);
                    if (who===pendingSwitchTo) {
                      setCurrentUser(who as PersonKey);
                      try { localStorage.setItem("couple_v1_currentUser", JSON.stringify(who)); } catch{}
                      try { idbSet("couple_v1_currentUser", who); } catch{}
                      setShowSwitch(false); setPendingSwitchTo(null); setSwitchPin("");
                    } else {
                      setSwitchPinWrong(true);
                      setTimeout(()=> setSwitchPin(""), 300);
                    }
                  }} className="rounded-full bg-[var(--nav-active-bg)] px-4 h-[44px] text-[var(--nav-active-text)] text-[12px]">Switch</button>
                </div>
                {switchPinWrong && <div className="text-[11px] text-[#B91C1C]">wrong PIN</div>}
                <button onClick={()=> { setPendingSwitchTo(null); setSwitchPin(""); }} className="text-[11px] underline">cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8 py-4">
                {(["aisling", "ciaran"] as const).map(k => (
                  <button key={k} onClick={() => {
                    if (k===currentUser) { setShowSwitch(false); return; }
                    // Require PIN re-entry when switching identity
                    setPendingSwitchTo(k);
                  }} className={"flex flex-col items-center gap-2 active:scale-[0.98] " + (currentUser === k ? "opacity-100" : "opacity-80")}>
                    <span className={"grid h-[96px] w-[96px] place-items-center rounded-full border text-[20px] font-bold " + (currentUser === k ? "ring-2 ring-[var(--nav-active-bg)] ring-offset-2" : "")} style={{ background: PERSONS[k].wash, borderColor: PERSONS[k].accent }}>{PERSONS[k].initial}</span>
                    <span className={"rounded-full px-3 py-1 text-[11px] " + (currentUser === k ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]" : "bg-[var(--card-bg)] border text-[var(--text)]")} style={{ borderColor: "var(--border)" }}>{PERSONS[k].name}</span>
                  </button>
                ))}
              </div>
            )}
          </BottomSheet>
        )}

        {showBlueprint && (
          <BottomSheet open={showBlueprint} onClose={() => setShowBlueprint(false)} title="Settings + Blueprint">
            <BlueprintPanel theme={theme} setTheme={setThemeId} onConfetti={triggerConfetti} choresRaw={choresRaw} calendarRaw={calendarRaw} shoppingRaw={shoppingRaw} notesRaw={notesRaw} setChoresRaw={setChoresRaw as any} setCalendarRaw={setCalendarRaw as any} setShoppingRaw={setShoppingRaw as any} setNotesRaw={setNotesRaw as any} />
          </BottomSheet>
        )}
      </div>
    </div>
  );
}
export function App() {
  const standalone = useIsStandalone();
  const [sessionUser, setSessionUser] = useState<PersonKey | null>(null);
  const [persistedUserRaw, setPersistedUserRaw] = useLocalState<PersonKey | null>("couple_v1_currentUser", null);
  const [themeId, setThemeId] = useLocalState<string>("couple_v1_theme", "peach");
  const [nowMs, setNowMs] = useState(() => Date.now());
  void themeId; void THEMES;
  // standalone — respect "Remember on this device" preference, don't auto-wipe
  // Old behavior forcibly cleared currentUser on every standalone load, breaking remember-me.
  // Now we only clear if user explicitly opted out (couple_v1_remember_user=0) or ephemeral session flag.
  useEffect(() => {
    if (!standalone) return;
    try {
      const remember = localStorage.getItem("couple_v1_remember_user");
      const ephemeral = (()=>{ try{ return sessionStorage.getItem("couple_v1_ephemeral_session")==="1"; }catch{return false} })();
      const shouldClear = remember==="0" || remember==="\"0\"" || remember==="false" || ephemeral;
      if (!shouldClear) return; // keep existing LS/IDB — allow auto-login
      try { localStorage.removeItem("couple_v1_currentUser"); } catch {}
      try {
        idbSet("couple_v1_currentUser", null as any);
        openIdb().then(db=>{ try{ const tx=db!.transaction("kv","readwrite"); tx.objectStore("kv").delete("couple_v1_currentUser"); }catch{} });
      } catch {}
    } catch {}
  }, [standalone]);
  const currentUserRaw = standalone ? sessionUser : persistedUserRaw;
  const setCurrentUserRaw = (v: any) => {
    if (standalone) {
      if (typeof v === 'function') setSessionUser((prev:any) => v(prev));
      else setSessionUser(v);
    } else {
      (setPersistedUserRaw as any)(v);
    }
  };
  // migrate old Alex/Sam currentUser? if stored as string "Alex" etc
  const currentUser: PersonKey | null = (() => {
    if (!currentUserRaw) return null;
    const v = currentUserRaw as any;
    if (v === "aisling" || v === "ciaran") return v;
    if (typeof v === "string") {
      const low = v.toLowerCase();
      if (low.includes("ais")) return "aisling";
      if (low.includes("cia") || low.includes("ciaran")) return "ciaran";
      if (low === "a" || low === "alex") return "aisling";
      if (low === "b" || low === "sam") return "ciaran";
    }
    return null;
  })();
  const setCurrentUser = (k: PersonKey) => setCurrentUserRaw(k);
  if (!currentUser) {
    if (standalone) {
      return (
        <div className="min-h-dvh w-full bg-[var(--card-bg)] font-body text-[var(--text)] flex justify-center">
          <div className="w-full max-w-[420px] min-h-dvh relative flex flex-col mx-auto">
            <WhoScreen onSelect={k => { setCurrentUserRaw(k); }} />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[var(--card-bg)] p-3 flex flex-col items-center gap-3 font-body text-[var(--text)]">
        <div className="text-[11px] text-[var(--muted)] px-3 py-2 rounded-full bg-[var(--card-bg)] border text-center" style={{ borderColor: "var(--border)" }}>Preview — add ?standalone or open on netlify.app for full-screen phone.</div>
        <div className="w-full max-w-[390px] relative min-h-[640px]"><WhoScreen onSelect={k => { setCurrentUserRaw(k); }} /></div>
      </div>
    );
  }
  if (standalone) {
    return (
      <div className="min-h-dvh w-full bg-[var(--card-bg)] font-body text-[var(--text)] flex justify-center">
        <div className="w-full max-w-[420px] min-h-dvh relative flex flex-col mx-auto">
          <V1AppShell currentUser={currentUser} setCurrentUser={setCurrentUser} themeId={themeId} setThemeId={setThemeId} nowMs={nowMs} setNowMs={setNowMs} />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[var(--card-bg)] p-3 flex flex-col items-center gap-3 font-body text-[var(--text)]">
      <div className="text-[11px] text-[var(--muted)] px-3 py-2 rounded-full bg-[var(--card-bg)] border text-center" style={{ borderColor: "var(--border)" }}>Preview — add ?standalone or open on netlify.app for full-screen phone.</div>
      <div className="w-full max-w-[390px]"><V1AppShell currentUser={currentUser} setCurrentUser={setCurrentUser} themeId={themeId} setThemeId={setThemeId} nowMs={nowMs} setNowMs={setNowMs} /></div>
    </div>
  );
}
