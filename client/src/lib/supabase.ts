import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TOKEN = "ash-ciaran-2026"
export const TABLE = "couple_data"
export const ROW_ID = "ash-ciaran-2026"

const KNOWN_EMPTY_MIGRATIONS: Record<string,string> = {
  "nylah-98jylh": "ash-ciaran-2026",
  "nylah-fbkf2m": "ash-ciaran-2026",
  "98jylh": "ash-ciaran-2026",
  "fbkf2m": "ash-ciaran-2026",
}

export function getEffectiveRowId(): string {
  try {
    const custom = localStorage.getItem("couple_v1_household_id")
    if (custom && custom.trim().length >= 3) {
      const t = custom.trim()
      const low = t.toLowerCase()
      if (KNOWN_EMPTY_MIGRATIONS[low] || KNOWN_EMPTY_MIGRATIONS[t]) {
        const target = (KNOWN_EMPTY_MIGRATIONS[low] || KNOWN_EMPTY_MIGRATIONS[t]) as string
        console.warn(`[household] auto-migrating empty test house ${t} -> ${target}`)
        try { localStorage.setItem("couple_v1_household_id", target); localStorage.setItem("couple_v1_household_migrated_from", t); localStorage.setItem("couple_v1_household_migrated_at", new Date().toISOString()) } catch {}
        return target
      }
      if (low.startsWith("nylah-") && (low === "nylah-98jylh" || low === "nylah-fbkf2m")) {
        console.warn(`[household] migrating empty ${t} -> ${ROW_ID}`)
        try { localStorage.setItem("couple_v1_household_id", ROW_ID) } catch {}
        return ROW_ID
      }
      return t
    }
    const legacyCode = localStorage.getItem("couple_v1_household_code")
    if (legacyCode && legacyCode.trim().length >= 3) {
      const c = legacyCode.trim().toLowerCase()
      const asId = c.startsWith("nylah-") ? c : `nylah-${c}`
      if (KNOWN_EMPTY_MIGRATIONS[asId] || KNOWN_EMPTY_MIGRATIONS[c]) {
        const target = (KNOWN_EMPTY_MIGRATIONS[asId] || KNOWN_EMPTY_MIGRATIONS[c]) as string
        console.warn(`[household] auto-migrating legacy code ${c} -> ${target}`)
        try { localStorage.setItem("couple_v1_household_id", target); localStorage.removeItem("couple_v1_household_code") } catch {}
        return target
      }
      return asId
    }
  } catch {}
  return ROW_ID
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

type Env = { url?: string; anon?: string }

function parseLS(key: string): string | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    // JSON stringified string case
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') return parsed
      // if parsed is not string but truthy (e.g., object), ignore
      if (parsed) return raw
    } catch {
      // raw is plain string (not JSON) — use directly
      return raw
    }
    return raw
  } catch { return null }
}

function getEnv(): Env {
  // 0) window injection for baked builds (Cloudflare no VITE rebuild needed)
  try {
    // @ts-ignore
    const w: any = (typeof window !== 'undefined' ? (window as any) : null)
    if (w && w.__SUPABASE_URL__ && (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__)) {
      return { url: w.__SUPABASE_URL__, anon: (w.__SUPABASE_ANON__ || w.__SUPABASE_ANON_KEY__) as string }
    }
  } catch {}
  // Vite envs - primary
  try {
    // @ts-ignore
    const u = (import.meta as any).env?.VITE_SUPABASE_URL
    const k = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
    if (u && k) return { url: u as string, anon: k as string }
  } catch {}
  // Fallback: allow localStorage override for Netlify zip deploys without rebuild env
  // Support both _anon and _anon_key naming (task spec uses _anon_key, legacy code used _anon)
  try {
    const u = parseLS("couple_v1_supabase_url")
    const k1 = parseLS("couple_v1_supabase_anon")
    const k2 = parseLS("couple_v1_supabase_anon_key")
    const anon = k1 || k2
    if (u && anon) {
      // Validate url looks like https
      if (u.startsWith("http") || u.includes("supabase")) {
        return { url: u, anon }
      }
    }
    // Also handle raw JSON-encoded values still stored
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
  // Hard-coded household fallback - ensures Chrome works even if SW served stale supabase-env.js
  // Household: ciaranf3308@gmail.com project zlllebsjtgihsxhcmcvb
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

// For settings UI: save raw strings (JSON stringified like other settings)
// Saves both _anon and _anon_key for compatibility with task spec vs legacy code
export function saveSupabaseConfig(url: string, anon: string) {
  try {
    localStorage.setItem("couple_v1_supabase_url", JSON.stringify(url))
    localStorage.setItem("couple_v1_supabase_anon", JSON.stringify(anon))
    localStorage.setItem("couple_v1_supabase_anon_key", JSON.stringify(anon))
    _client = null
  } catch {}
}
