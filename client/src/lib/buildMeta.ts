/**
 * Nylah OS — Build-time constants (Scalable V144)
 */
export const HOUSEHOLD_TZ = "Europe/Dublin" as const;
export const HOUSEHOLD_TOKEN_LEGACY = "ash-ciaran-2026" as const;
export type HouseholdMember = string;
export const BUILD_CHANNEL = "beta" as const;
export const BUILD_META = {
  tz: HOUSEHOLD_TZ,
  channel: BUILD_CHANNEL,
  build: "v217-allow-pull-refresh",
  code: 217,
} as const;
export const HOUSEHOLD_ID: string | null = null;
export const HOUSEHOLD_ROW_ID: string | null = null;
export const HOUSEHOLD_TABLE = "couple_data" as const;
