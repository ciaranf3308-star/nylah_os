import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TABLE = "couple_data"
export const ROW_ID_LEGACY = "ash-ciaran-2026" as const // kept for migration only, do not use as default
export const ROW_ID = ROW_ID_LEGACY // deprecated alias
export const TOKEN = ROW_ID_LEGACY

export const TABLES = {
  HOUSEHOLDS: 'households',
  INVITES: 'household_invites',
  PINS: 'household_pins',
  CAL: 'calendar_events',
  CHORES: 'chores',
  SHOP: 'shopping_items',
  NOTES: 'notes',
} as const

// Scalable: household id is dynamic, stored in localStorage
// Never fallback to hard-coded id for new users — return null to force onboarding / recovery

export function getEffectiveRowId(): string | null {
  try {
    const custom = localStorage.getItem("couple_v1_household_id")
    if (custom && custom.trim().length >= 3) return custom.trim()
    const legacyCode = localStorage.getItem("couple_v1_household_code")
    if (legacyCode && legacyCode.trim().length >= 3) {
      const c = legacyCode.trim().toLowerCase()
      // if stored code looks like a full hid already, respect it
      if (c.includes("-") && c.length >= 8) return c
      if (c.startsWith("nylah-")) return c
      return `nylah-${c}`
    }
    // Resilient recovery: scan any persons_ keys for hid
    try {
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (k.startsWith("couple_v1_household_persons_")) {
          const hid = k.replace("couple_v1_household_persons_","")
          if (hid && (hid.startsWith("nylah-") || hid==="ash-ciaran-2026") && hid.length>=8) return hid
        }
      }
    } catch {}
    // If we have any legacy app data, assume legacy production household ash-ciaran-2026
    // This rescues existing installs that lost their id due to the scalable null-force change
    // Fresh installs will have no keys, so will still correctly return null → onboarding
    try {
      const meaningful = ["couple_v1_chores","couple_v1_calendar_v2","couple_v1_shopping_v2","couple_v1_notes_memo","couple_v1_household_persons","couple_v1_currentUser"]
      for (let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i)
        if (!k) continue
        if (meaningful.some(p=>k===p || k.startsWith(p))) {
          // Check if stored recovery from v130 era — default is ash-ciaran-2026
          // Don't override nylah- houses that were created but id cleared – try to infer via name
          const name = localStorage.getItem("couple_v1_household_name") || ""
          if (name && name.length>=2) {
            // if name suggests Aisling/Ciaran legacy, return legacy
            const low = name.toLowerCase()
            if (low.includes("ais") || low.includes("cia") || low.includes("&")) {
              // legacy couple — safest is legacy row which is source of truth pre-v143
              return "ash-ciaran-2026"
            }
          }
          // If any chore/calendar data present, legacy is likely
          if (k.startsWith("couple_v1_chores") || k.startsWith("couple_v1_calendar") || k.startsWith("couple_v1_notes")) {
            return "ash-ciaran-2026"
          }
        }
      }
    } catch {}
  } catch {}
  return null
}

export function getEffectiveRowIdOrThrow(): string {
  const id = getEffectiveRowId()
  if (!id) throw new Error("No household_id — need onboarding/recover")
  return id
}

export function setEffectiveRowId(id: string) {
  try { localStorage.setItem("couple_v1_household_id", id) } catch {}
}

export function getEffectiveTable(): string {
  return TABLE
}

export function clearEffectiveRowId() {
  try { localStorage.removeItem("couple_v1_household_id"); localStorage.removeItem("couple_v1_household_code") } catch {}
}

export function getEffectiveHouseholdCode(): string | null {
  try { return localStorage.getItem("couple_v1_household_code") } catch { return null }
}

export async function clearAllLocalData(): Promise<void> {
  try {
    // Clear all couple_v1_* except supabase config (url/anon must survive wipe)
    const keep = new Set([
      "couple_v1_supabase_url",
      "couple_v1_supabase_anon",
      "couple_v1_supabase_anon_key",
    ])
    try {
      const del: string[] = []
      for (let i=0;i<localStorage.length;i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (k.startsWith("couple_v1_") && !keep.has(k)) del.push(k)
      }
      for (const k of del) try { localStorage.removeItem(k) } catch {}
      // also clear fallback idb_ prefix keys
      const idbDel: string[] = []
      for (let i=0;i<localStorage.length;i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith("idb_")) idbDel.push(k)
      }
      for (const k of idbDel) try { localStorage.removeItem(k) } catch {}
    } catch {}
    try {
      const mod = await import("./idb")
      if ((mod as any).clearAllIDB) await (mod as any).clearAllIDB().catch(()=>{})
      // explicit note_photos clean for old fallback
      try {
        const db = await (mod as any).openIdb?.()
        if (db) {
          try { await (mod as any).idbDel?.('note_photos') } catch {}
        }
      } catch {}
    } catch {
      try { indexedDB.deleteDatabase("couple_v1_idb") } catch {}
      try { indexedDB.deleteDatabase("note_photos") } catch {}
    }
  } catch {
    // must never throw in critical wipe path
  }
}

export function clearLocalCacheOutsideLogin(): void {
  // sync wrapper for legacy call sites — fire and forget new async clear
  try { void clearAllLocalData() } catch {}
  try {
    const keysToRemove = [
      "couple_v1_household_id",
      "couple_v1_household_code",
      "couple_v1_chores",
      "couple_v1_calendar_v2",
      "couple_v1_shopping_v2",
      "couple_v1_notes_memo",
      "couple_v1_revision",
      "couple_v1_last_sync",
      "couple_v1_last_confirmed_at",
      "couple_v1_queue_count",
      "couple_v1_last_mutation",
      "couple_v1_had_remote",
      "couple_v1_last_push_err",
      "couple_v1_household_name",
      "couple_v1_household_persons",
      "couple_v1_currentUser",
      "couple_v1_last_local_write",
      "couple_v1_build",
      "couple_v1_theme",
      "couple_v1_force_resync",
    ];
    for (const k of keysToRemove) {
      try { localStorage.removeItem(k); } catch {}
    }
    // per-hid keys
    try {
      const toDelete: string[] = [];
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith("couple_v1_household_persons_") ||
          k.startsWith("couple_v1_household_pins_") ||
          k.startsWith("couple_v1_household_name") ||
          k.startsWith("couple_v1_persons_")
        ) toDelete.push(k);
      }
      for (const k of toDelete) try { localStorage.removeItem(k); } catch {}
    } catch {}
    // attempt IDB clear async (fire-and-forget, safe)
    try {
      // dynamic import to avoid circular deps
      import("./idb").then(m => {
        if (m && (m as any).clearAllIDB) (m as any).clearAllIDB().catch(()=>{});
      }).catch(()=>{});
    } catch {}
    // also clear idb_ prefix LS fallbacks
    try {
      const idbRemove: string[] = [];
      for (let i=0;i<localStorage.length;i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("idb_")) idbRemove.push(k);
      }
      for (const k of idbRemove) try { localStorage.removeItem(k); } catch {}
    } catch {}
  } catch {
    // must never throw outside login
  }
}

export async function handleWipeQueryParam(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || typeof location === 'undefined') return false
    const sp = new URLSearchParams(location.search)
    const wipe = sp.get("wipe")
    // Strict: only wipe=1 triggers full wipe. Empty ?wipe must not nuke (accidental link)
    // Prevents "app blank" after stray wipe param
    if (wipe === "1") {
      await clearAllLocalData().catch(()=>{})
      sp.delete("wipe")
      try {
        const base = location.pathname
        const qs = sp.toString()
        const next = qs ? `${base}?${qs}${location.hash || ""}` : `${base}${location.hash || ""}`
        history.replaceState(null, "", next)
      } catch {}
      return true
    }
  } catch {}
  return false
}

type Env = { url?: string; anon?: string }

function parseLS(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') return parsed
      if (parsed) return raw
    } catch {
      return raw
    }
    return raw
  } catch { return null }
}

function getEnv(): Env {
  try {
    // @ts-ignore
    const w: any = (typeof window !== 'undefined' ? (window as any) : null)
    if (w && w.__SUPABASE_URL__ && (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__)) {
      return { url: w.__SUPABASE_URL__, anon: (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__) as string }
    }
  } catch {}
  try {
    // @ts-ignore
    const u = (import.meta as any).env?.VITE_SUPABASE_URL
    const k = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
    if (u && k) return { url: u as string, anon: k as string }
  } catch {}
  try {
    const u = parseLS("couple_v1_supabase_url")
    const k1 = parseLS("couple_v1_supabase_anon")
    const k2 = parseLS("couple_v1_supabase_anon_key")
    const anon = k1 || k2
    if (u && anon) {
      if (u.startsWith("http") || u.includes("supabase")) {
        return { url: u, anon }
      }
    }
    const uRaw = localStorage.getItem("couple_v1_supabase_url")
    const kRaw1 = localStorage.getItem("couple_v1_supabase_anon")
    const kRaw2 = localStorage.getItem("couple_v1_supabase_anon_key")
    if (uRaw && (kRaw1 || kRaw2)) {
      try {
        const uu = JSON.parse(uRaw)
        const kk = JSON.parse((kRaw1 || kRaw2) as string)
        if (uu && kk) return { url: uu as string, anon: kk as string }
      } catch {
        if (uRaw && (kRaw1 || kRaw2) && uRaw.startsWith("http")) {
          return { url: uRaw, anon: (kRaw1 || kRaw2) as string }
        }
      }
    }
  } catch {}
  try {
    return {
      url: "https://zlllebsjtgihsxhcmcvb.supabase.co",
      anon: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGxlYnNqdGdpaHN4aGNtY3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDQxMjQsImV4cCI6MjEwMTMyMDEyNH0.Q6PuA6nvTI__DEB0i7akLusljjjeYu_0IxQICOc5oSQ"
    }
  } catch {}
  return {}
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client
  const { url, anon } = getEnv()
  if (!url || !anon) return null
  try {
    _client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return _client
  } catch {
    return null
  }
}

export function hasSupabaseConfig(): boolean {
  const { url, anon } = getEnv()
  return !!(url && anon)
}

export function saveSupabaseConfig(url: string, anon: string) {
  try {
    localStorage.setItem("couple_v1_supabase_url", JSON.stringify(url))
    localStorage.setItem("couple_v1_supabase_anon", JSON.stringify(anon))
    localStorage.setItem("couple_v1_supabase_anon_key", JSON.stringify(anon))
    _client = null
  } catch {}
}

// New scalable helpers for normalized tables
export function getHouseholdsTable() { return "households" }
export function getInvitesTable() { return "household_invites" }
export function getPinsTable() { return "household_pins" }
