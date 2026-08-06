-- Nylah OS - Interim hardening for Beta 2
-- Idempotent - safe to run twice

-- 1. Revision column for compare-and-swap sync
ALTER TABLE public.couple_data ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;

-- 2. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_couple_data_updated_at ON public.couple_data (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_couple_data_revision ON public.couple_data (revision);

-- 3. Tighten RLS: replace Allow all with scoped row only
-- First drop the old permissive policy if it exists
DROP POLICY IF EXISTS "Allow all for anon" ON public.couple_data;
DROP POLICY IF EXISTS "allow_ash_ciaran_2026" ON public.couple_data;

-- Enable RLS (idempotent)
ALTER TABLE public.couple_data ENABLE ROW LEVEL SECURITY;

-- Only ash-ciaran-2026 row accessible to anon (interim - before real auth)
CREATE POLICY "allow_ash_ciaran_2026" ON public.couple_data
  FOR ALL
  TO anon
  USING (id = 'ash-ciaran-2026')
  WITH CHECK (id = 'ash-ciaran-2026');

-- Optional: also allow service_role full access (default but explicit)
DROP POLICY IF EXISTS "service_role_all" ON public.couple_data;
CREATE POLICY "service_role_all" ON public.couple_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
