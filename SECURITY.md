# Security — Interim & Roadmap

This document explains the current household PIN mechanism, its limitations, and the intended production auth model.

## Current (Beta) — Device-local PIN gate

- The app is a shared-fridge PWA backed by a single Supabase row `couple_data.id='ash-ciaran-2026'`.
- Supabase is accessed with the anon key (public). RLS is currently scoped to that single row (`USING id='ash-ciaran-2026'`) as an interim hardening step, not true multi-tenant security.
- The PIN screen is **device-local UX only**: it selects which household member (`aisling` or `ciaran`) is acting on this device.
- To avoid trivial grep of plain PINs in the public JS bundle, we store only SHA-256 hashes in `client/src/lib/pins.ts`:

```
4463 (aisling) -> c91d793d0e481d8b90699fd4140826e2301f9937794ad30fb135b02404511d50
1958 (ciaran)  -> 522e6198a268c62c01c9944cc2c06902d8308d65e6444eb8ad10bbe98dc362b6
```

  Verification is done via `crypto.subtle.digest('SHA-256', ...)` async compare, not a plain string map.
- The PINs can be overridden for custom builds via `window.__HOUSEHOLD_PINS__` (a map of `hash -> PersonKey`) baked via `supabase-env.js` or injected before the bundle.

**What this does NOT provide:**

- No server-enforced identity: anyone with the anon key can read/write the row regardless of PIN.
- Possession of device = ability to act as either member if PIN is known/guessed.
- Switching between Aisling/Ciaran in the UI now re-prompts PIN (guard added), but still client-side only.
- No rate limiting, no lockout.

## Standalone / "Remember on this device"

- When "Remember on this device" is checked (default true), the selected member is stored in `localStorage couple_v1_currentUser` and in IDB `kv` as `couple_v1_currentUser`.
- In `?standalone` / PWA mode, we no longer auto-wipe this key on every load. A full sign-out clears it.
- The preference is per-device (`couple_v1_remember_user = 1|0`). In ephemeral/incognito mode, prefer not remembering.

## Future — Supabase Auth + household_members

The roadmap to real security (tracked separately) is:

1. **Supabase Auth** with email/password or magic link per household member.
2. **`households` table** (`id uuid pk`, `name`, `invite_code`, `created_at`).
3. **`household_members` table** (`household_id fk`, `user_id uuid fk auth.users`, `role`, `display_name`, `avatar`).
4. **RLS policies** such as:
   ```sql
   create policy "member can read own household row"
     on public.couple_data for select to authenticated
     using (exists (select 1 from household_members hm where hm.household_id = split_part(couple_data.id,'-',1) ... ));
   -- or, after normalized migration, scope all content tables by household_id = auth.jwt()->household_id
   ```
5. **PIN as second factor UX**: keep the 4-digit quick unlock for already-authenticated sessions on trusted devices, but require full Auth re-login every N days or when switching to the other member on a new device.
6. **Photos**: migrate from data URLs in JSONB to Supabase Storage bucket `household_photos` with RLS per household.
7. **Atomic chore race**: move race claim to `RPC claim_chore_occurrence(p_id, p_member)` with `WHERE completed_at IS NULL`.
8. **Audit**: `mutation_log` table recording `who/device/when/what/mutationId` for every write, not just client `meta`.

Until that is implemented, this PIN gate should be treated as **convenience, not security**. Do not use it to store sensitive data.

## Checklist for deployer

- [ ] Serve `supabase-env.js` before `index-*.js` in both `index.html` and `404.html` (build driver does this).
- [ ] Run `supabase-init.sql` in SQL Editor (idempotent).
- [ ] Verify RLS: `select * from pg_policies where tablename='couple_data'` should show `allow_ash_ciaran_2026` only, not `Allow all`.
- [ ] Rotate anon key if it was ever committed to repo (check git history).
- [ ] Tell testers: PIN is `4463` for Aisling, `1958` for Ciaran, but it's local-only.

## References

- `client/src/lib/pins.ts` — hashed verification
- `client/src/lib/supabase.ts` — config precedence `window.__SUPABASE_*` → `VITE_` → LS override
- `supabase-init.sql` / `supabase-migrations/001_add_revision_scoped_rls.sql` — interim RLS tightening
