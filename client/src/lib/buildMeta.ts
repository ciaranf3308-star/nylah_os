/**
 * Nylah OS — Build-time household constants (Phase 1)
 * Do NOT store per-device prefs here (theme, currentUser) — those are device-local.
 * These are shared household truth that should be consistent across devices.
 */

export const HOUSEHOLD_ID = "ash-ciaran-2026" as const;
export const HOUSEHOLD_TABLE = "couple_data" as const;
export const HOUSEHOLD_ROW_ID = "ash-ciaran-2026" as const;

// Household timezone — single source of truth for all local-date logic
// Use Europe/Dublin for all "today", dueAt, recurrence calcs (never UTC slice)
export const HOUSEHOLD_TZ = "Europe/Dublin" as const;

// Legacy token kept for compatibility with old stored data; do not use for auth
export const HOUSEHOLD_TOKEN_LEGACY = "ash-ciaran-2026" as const;

// Members — stable identifiers
export const HOUSEHOLD_MEMBERS = ["aisling", "ciaran"] as const;
export type HouseholdMember = typeof HOUSEHOLD_MEMBERS[number];

// Beta build marker
export const BUILD_CHANNEL = "beta" as const;
export const BUILD_META = {
  id: HOUSEHOLD_ID,
  tz: HOUSEHOLD_TZ,
  table: HOUSEHOLD_TABLE,
  rowId: HOUSEHOLD_ROW_ID,
} as const;
