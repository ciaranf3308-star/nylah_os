# Nylah OS — Couple Fridge Phone

Household OS for Aisling & Ciaran — shared fridge metaphor, warm paper/card, peach/lavender, Chore Duel flagship, Love notes, mobile-first. Single codebase PWA + Capacitor wrapper.

## Quick start

```bash
cd ts-spaces/couple-fridge-phone
bun install
# dev (vite)
bun run --cwd client dev
# build PWA (Hatch driver injects supabase-env.js before bundle)
HATCH_SPACES_BUILD_DRIVER=1 bun ./client/build.mjs
# tests
bun run --cwd client test:run
```

## Build / Deploy

- Build driver: `HATCH_SPACES_BUILD_DRIVER=1 bun ./client/build.mjs`
  - Bundles via @hatch/space-sdk (Bun.build)
  - Copies `client/public/` → `client/dist/`
  - Injects `<script src="./supabase-env.js"></script>` before module in both `index.html` & `404.html`
  - Creates `.nojekyll` for GitHub Pages SPA
  - Verifies dist contains `supabase-env.js` before bundle

- GitHub Pages: Publish `client/dist` as Pages artifact. Ensure `404.html` = `index.html` fallback. `.nojekyll` prevents Jekyll stripping `_assets`.

- Netlify: `netlify.toml` points to `client/dist`. Hosts `nylah-os.apk` at `./nylah-os.apk` (relative) for updater refresh path.

- Version/update flow (simplified, no blob pretense):
  - `client/version.json` and `client/public/version.json` must match: `{"version":"1.0.0-beta","apkUrl":"./nylah-os.apk","bundleUrl":""}`
  - `UpdaterBanner` fetches `./version.json` / `/version.json` / `https://nylah-os.netlify.app/version.json` with cache-bust `?t=Date.now()`
  - Compare semver local (`localStorage couple_v1_app_version`) vs remote
  - If newer, show "New version available — refresh to update"
  - On tap: set local version + `window.location.replace(url? _uv=ver&_t=...)` to bust cache and reload.
  - No Filesystem write, no pending_update.json, no Blob download deception.

- Icons/manifest:
  - `client/public/icon-192.png`, `icon-512.png`, `manifest.webmanifest`, `supabase-env.js`, `version.json` must exist (305B placeholder env ok for local-only).

## Database / Supabase

Single-row interim architecture: `public.couple_data` with row `id='ash-ciaran-2026'` holding `chores jsonb, calendar jsonb, shopping jsonb, notes jsonb, meta jsonb, updated_at timestamptz, revision bigint default 0`.

### Migration — revision + scoped RLS (idempotent)

```sql
-- 001_add_revision_scoped_rls.sql (already in supabase-migrations/)
ALTER TABLE public.couple_data ADD COLUMN IF NOT EXISTS revision bigint DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_couple_data_updated_at ON public.couple_data (updated_at);
CREATE INDEX IF NOT EXISTS idx_couple_data_revision ON public.couple_data (revision);

ALTER TABLE public.couple_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON public.couple_data;
DROP POLICY IF EXISTS "allow_ash_ciaran_2026" ON public.couple_data;
CREATE POLICY "allow_ash_ciaran_2026" FOR ALL TO anon
  USING (id = 'ash-ciaran-2026')
  WITH CHECK (id = 'ash-ciaran-2026');
```

Run via Supabase SQL editor. Verify:

```sql
SELECT id, updated_at, revision, jsonb_array_length(chores) c FROM public.couple_data WHERE id='ash-ciaran-2026';
```

### RLS, revision CAS, merge

- JS: `remoteSync.ts` does `eq('revision', expected)` CAS + `mergeById` + 7d tombstone purge.
- Only send `revision` when retrieved row actually had numeric revision (fallback bug fixed).
- `supabase-env.js` must load before bundle (build driver ensures).

### Backup / Rollback

- Backup JSON: `ts-spaces/couple-fridge-phone/backups/couple_data_2026-08-03.json` (live) + `your_files/couple_data_backup_2026-08-03.json`
- Rollback doc: `supabase-migrations/ROLLBACK.md` — `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` using backup JSON.

### Future normalized schema (not yet applied)

`households, members, devices, chore_occurrences (with unique constraint on (templateId, occurrenceKey)), votes, completions, templates, events, responses, shopping_items, note_reads, mutation_log` + Storage bucket photos. Still JSONB single-row with hardening interim.

## Architecture Notes

- Household timezone: `Europe/Dublin` (`HOUSEHOLD_TZ`), `todayKey`, `toLocalKeyDublin`, `clampDayOfMonth`, `nextMonthlyFrom` (preserves DOM Jan31→Feb28→Mar31), `diffCalendarDays` (BST-safe), `BIWEEKLY_EPOCH_MONDAY_UTC`
- PINs interim: hashed SHA-256 in `client/src/lib/pins.ts` (`4463→aisling`, `1958→ciaran`). Future: Supabase Auth household_members, env-injected hashes via `window.__HOUSEHOLD_PINS__`.
- Sync: IDB v2 stores `kv, mutation_queue, photos`. MutationId dedup, revision CAS, offline queue, realtime subscription, empty-wipe guards.
- Fridge Home: Europe/Dublin today, 3 cards Today-for-you, hidden partner responses, single Open-chore preview, honest sync states Saved/Saving/Offline/Failed/Updated elsewhere via single shell-owned SyncStatus.
- Chore Duel: claim-only vs done separation needed (see audit). Race currently client CAS, needs Supabase RPC `update chore_occurrences set completed_by where completed_at is null`.
- Calendar: Mon-start, Dublin keys, any-year nav, spanning inclusive, no points, separate agreed/pending/declined/cancelled, Needs discussion, comments, hidden until both answered, recurrence options This/Future/Series.
- Shopping: normalized CATS, Personal/Wants @tags, duplicate qty bump, full edit sheet, requested-by, real optional expiry, honest “On list for X days”, purchase Undo, archive/history, Trip mode with wakelock.
- Memo: read/pinned/archived separate, tombstone delete, 5s Undo, author-only edit/permanent delete, partner delete → archive, reactions, searchable archive, client resize to WebP/JPEG, photo still data URL compressed interim — Storage future.

## Themes & a11y

- THEMES: peach, lavender, butter, mint, terracotta, midnight. CSS vars `--card-bg`, `--text`, `--muted`, `--border`, `--chip-bg`, `--nav-bg`, etc set via `document.documentElement.style.setProperty` in shell useEffect.
- All hardcoded `bg-white`, `text-[#0A0A0A]`, `text-[#5A5655]`, `border-[#E8CEB7]` swept to `var(--card-bg)`, `var(--text)`, `var(--muted)`, `var(--border)`.
- Theme previews: 64px rounded cards with name + phone gradient preview (not small circles).
- Sheets: `role="dialog"`, `aria-modal`, Escape closes, focus trap Tab, focus return to trigger, min-height 44px.
- Bottom nav: width 100%, max-width 390px, min-width 0, overflow-x-auto no-scrollbar, flex-nowrap, max-content on narrow.
- Top bar Back hidden on Home (fridge) to avoid confusion.
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` disables sheetIn, floatIn, confettiFall, rowPop, ticketTear, pulseRing, confetti, etc. Confetti respects `prefers-reduced-motion` guard.
- Native `confirm()` replaced with custom sheet confirm dialog (progressive disclosure).
- 44px targets: most interactive buttons min-h 44px, calendar arrows, chips, nav.

## Testing

```bash
bun run --cwd client test:run
```

- `client/src/lib/__tests__/dates.test.ts`: todayKey, toLocalKey Dublin, clampDayOfMonth, nextMonthlyFrom Jan31→Feb28→Mar31, diffCalendarDays BST, weekdayMon, biweekly parity.
- `client/src/lib/__tests__/sync.test.ts`: mergeById, tombstone 7d purge, revision fallback, duplicate qty.

Skipped tests should be 0 — vitest passes.

## Security / Trust

- PINs hashed, not plaintext in UI, but still in bundle as hashes interim — real Auth pending.
- Profile switching currently unverified — needs re-PIN on switch.
- Settings: normal user sees Profile/Household/Appearance/Notifications/Data&Sync/Privacy/About only; Supabase Debug Center behind `?debug=1` or localStorage `couple_v1_debug=1` or localhost.
- No double-points, no duplicate recurring (one occurrence), no fake expiry, no debug controls on normal users, no server-error → Debug Center instruction.
- Shared vs device: shared actions attributable who/device/when/what/mutationId/synced; distinct prefs; progressive disclosure.

## PWA / Offline

- `manifest.webmanifest` start_url `/?standalone`, display standalone, icons maskable.
- `supabase-env.js` 305B placeholder ensures build succeeds offline, replaced at deploy via env injection or Netlify function.
- IDB caches notes, photos separate, mutation queue.

## Known gaps to finish (55-60% → 85%+)

- Chore Duel Take it → Mark done split (claim-only branch currently only for Assigned without claimant, not Open).
- Server-atomic race via Supabase RPC.
- UI copy Open — 2x vs capped 1.5× inconsistency.
- Settings normal vs debug centre separation complete.
- Real auth household_members + scoped RLS (interim scoped RLS done).
- Normalized item-level rows + Storage photos.
- Real Undo after calendar delete, 7-year range selector (currently limited), 332px nav overflow fully verified narrow.

## License / Household

Private. Aisling & Ciaran household OS. Warm, playful, never Jira/Notion/Google Calendar/banking.
