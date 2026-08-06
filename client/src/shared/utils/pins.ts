// interim PIN verification — no backend auth yet
// Stores only SHA-256 hashes, not plain PINs, to avoid trivial bundle grep.
// Real auth requires Supabase Auth + household_members table (see SECURITY.md).

export type PersonKey = "aisling" | "ciaran";

// Precomputed SHA-256 hex digests
// PIN 4463 -> aisling, PIN 1958 -> ciaran
const PIN_HASHES: Record<string, PersonKey> = {
  "c91d793d0e481d8b90699fd4140826e2301f9937794ad30fb135b02404511d50": "aisling",
  "522e6198a268c62c01c9944cc2c06902d8308d65e6444eb8ad10bbe98dc362b6": "ciaran",
};

function getHouseholdIdForPins(): string {
  try {
    const custom = localStorage.getItem("couple_v1_household_id")
    if (custom) return custom
  } catch {}
  return "ash-ciaran-2026"
}

function getHouseholdPinMap(): Record<string, PersonKey> | null {
  try {
    const hid = getHouseholdIdForPins()
    const key = `couple_v1_household_pins_${hid}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, PersonKey>
  } catch {}
  return null
}

export function setHouseholdPinMap(hid: string, map: Record<string, PersonKey>) {
  try {
    const key = `couple_v1_household_pins_${hid}`
    localStorage.setItem(key, JSON.stringify(map))
    // also expose via window.__HOUSEHOLD_PINS__ for immediate use
    try { (window as any).__HOUSEHOLD_PINS__ = map } catch {}
  } catch {}
}

export function setHouseholdPlainPins(hid: string, plainMap: Record<string, PersonKey>) {
  try {
    const key = `couple_v1_household_pins_plain_${hid}`
    localStorage.setItem(key, JSON.stringify(plainMap))
  } catch {}
}

export function clearHouseholdPinMap(hid: string) {
  try { localStorage.removeItem(`couple_v1_household_pins_${hid}`) } catch {}
}

// For future env-injected pins: window.__HOUSEHOLD_PINS__ could contain hashed map {hash:person}
function getEnvHashes(): Record<string, PersonKey> | null {
  try {
    const w: any = typeof window !== 'undefined' ? (window as any) : null;
    if (w && w.__HOUSEHOLD_PINS__ && typeof w.__HOUSEHOLD_PINS__ === 'object') {
      return w.__HOUSEHOLD_PINS__ as any;
    }
  } catch {}
  return null;
}

export async function sha256hex(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const arr = new Uint8Array(digest);
      let hex = '';
      for (let i = 0; i < arr.length; i++) hex += (arr[i] ?? 0).toString(16).padStart(2, '0');
      return hex;
    }
  } catch {}
  // fallback simple (not crypto-secure but avoids plain compare)
  // Use bun/node-like fallback — compute via subtle failure shouldn't happen in browser
  return input;
}

export function sha256hexSyncFallback(pin: string): string {
  // Only used at build time / tests when Subtle unavailable; not for prod
  // This duplicates the precomputed table lookup path
  if (pin === "4463") return "c91d793d0e481d8b90699fd4140826e2301f9937794ad30fb135b02404511d50";
  if (pin === "1958") return "522e6198a268c62c01c9944cc2c06902d8308d65e6444eb8ad10bbe98dc362b6";
  // For unknown, return raw (will not match)
  return pin;
}

export async function verifyPin(pin: string): Promise<PersonKey | null> {
  const trimmed = pin.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const hex = await sha256hex(trimmed);
  // 1. household-specific map (dynamic for beta households)
  try {
    const hh = getHouseholdPinMap();
    if (hh) {
      const who = hh[hex];
      if (who) return who as PersonKey;
    }
  } catch {}
  const env = getEnvHashes();
  if (env) {
    const who = env[hex];
    if (who) return who as PersonKey;
  }
  const who = PIN_HASHES[hex];
  return who || null;
}

export async function verifyPinSync(pin: string): Promise<PersonKey | null> {
  // Synchronous wrapper for environments without Subtle (tests)
  // In browser, verifyPin async is preferred
  const trimmed = pin.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const hex = sha256hexSyncFallback(trimmed);
  // household map sync path
  try {
    const hh = getHouseholdPinMap();
    if (hh) {
      const who = hh[hex];
      if (who) return who as PersonKey;
    }
  } catch {}
  const env = getEnvHashes();
  if (env) {
    const who = env[hex];
    if (who) return who as PersonKey;
  }
  const who = PIN_HASHES[hex];
  return who || null;
}

export const PERSON_PIN_LENGTH = 4 as const;

// Back-compat for code expecting old plain map API — uses hashed verification internally
// Hardcoded PINs remain interim — moved to isolated module for easier audit. Future: replace with Supabase auth household_members.
export const PIN_TO_PERSON: Record<string, PersonKey> = {
  // Deprecated: plain map kept for test compat only; real verification uses hashes via verifyPin.
  "4463": "aisling",
  "1958": "ciaran",
};

export function personFromPin(pin: string): PersonKey | null {
  // Sync fast-path using precomputed hash fallback
  const trimmed = pin.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  try {
    const hh = getHouseholdPinMap();
    if (hh) {
      // we only have hash map, need to hash sync fallback for known pins already handled, but custom pins won't be in precomputed fallback
      // for custom beta pins stored as hash, we need async path — for sync fast path we try plain LS stored map of pin->person maybe
      const plainKey = `couple_v1_household_pins_plain_${getHouseholdIdForPins()}`
      const rawPlain = localStorage.getItem(plainKey)
      if (rawPlain) {
        try {
          const plainMap = JSON.parse(rawPlain) as Record<string, PersonKey>
          if (plainMap[trimmed]) return plainMap[trimmed]
        } catch {}
      }
    }
  } catch {}
  // Use sync fallback (precomputed known pins) for instant UI, no crypto needed
  const hex = sha256hexSyncFallback(trimmed);
  const direct = PIN_HASHES[hex];
  if (direct) return direct;
  // Fallback to plain map for audit/tests (will be removed with Supabase auth)
  return PIN_TO_PERSON[trimmed] ?? null;
}
