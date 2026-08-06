# Rollback — 001_add_revision_scoped_rls

This migration is idempotent and additive: adding revision column + tightening RLS to single row.

If you need to rollback:

1. **RLS only** — restore permissive policy:
```sql
DROP POLICY IF EXISTS "allow_ash_ciaran_2026" ON public.couple_data;
DROP POLICY IF EXISTS "service_role_all" ON public.couple_data;
CREATE POLICY "Allow all for anon" ON public.couple_data FOR ALL TO anon USING (true) WITH CHECK (true);
```

2. **Revision column** — keep it (harmless, code tolerates missing column via revisionSupported check). If you truly need to drop:
```sql
ALTER TABLE public.couple_data DROP COLUMN IF EXISTS revision;
```
Don't do this while both devices run newer app versions — sync uses eq(revision) CAS for safety.

3. Data restore — your backup is at:
- `backups/couple_data_2026-08-03.json`
- `your_files/couple_data_backup_2026-08-03.json`

Restore via Supabase dashboard Table Editor → Import or via curl:
```
curl -X PATCH 'https://zlllebsjtgihsxhcmcvb.supabase.co/rest/v1/couple_data?id=eq.ash-ciaran-2026' \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d @backups/couple_data_2026-08-03.json
```

Current live row before this migration: id ash-ciaran-2026, 2 chores, 1 calendar, 0 shopping, 1 love note, revision 0, updated_at 2026-08-03T12:43:56.687Z
