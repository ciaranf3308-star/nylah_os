-- Nylah OS — Supabase migration 001
-- Date: 2026-08-03
-- Purpose: Safe interim hardening for Beta 2 production
-- - Adds revision column for CAS (compare-and-swap) in remoteSync.ts
-- - Adds scoped RLS: only allow id='ash-ciaran-2026' for anon, NOT public truth
-- - Idempotent: safe to re-run
-- Run in Supabase Dashboard > SQL Editor

-- 1) Tables (ensure exists)
CREATE TABLE IF NOT EXISTS couple_data (
  id text primary key,
  chores jsonb default '[]',
  calendar jsonb default '[]',
  shopping jsonb default '[]',
  notes jsonb default '[]',
  meta jsonb,
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.couple_data (
  id text primary key,
  chores jsonb default '[]',
  calendar jsonb default '[]',
  shopping jsonb default '[]',
  notes jsonb default '[]',
  meta jsonb,
  updated_at timestamptz default now()
);

-- 2) Add revision column if not exists (bigint, not null default 0)
ALTER TABLE couple_data ADD COLUMN IF NOT EXISTS revision bigint DEFAULT 0;
ALTER TABLE public.couple_data ADD COLUMN IF NOT EXISTS revision bigint DEFAULT 0;

-- Backfill nulls to 0 for pre-migration rows
DO $$
BEGIN
  BEGIN
    UPDATE couple_data SET revision = 0 WHERE revision IS NULL;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    UPDATE public.couple_data SET revision = 0 WHERE revision IS NULL;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

-- Ensure NOT NULL after backfill (allows insertion via default)
ALTER TABLE couple_data ALTER COLUMN revision SET DEFAULT 0;
ALTER TABLE public.couple_data ALTER COLUMN revision SET DEFAULT 0;
-- Make it NOT NULL if safe (coalesce existing nulls first)
DO $$
BEGIN
  BEGIN
    ALTER TABLE couple_data ALTER COLUMN revision SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.couple_data ALTER COLUMN revision SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 3) Indexes (reduce seq scans)
CREATE INDEX IF NOT EXISTS idx_couple_data_updated_at ON couple_data(updated_at);
CREATE INDEX IF NOT EXISTS idx_couple_data_revision ON couple_data(revision);
CREATE INDEX IF NOT EXISTS idx_public_couple_data_updated_at ON public.couple_data(updated_at);
CREATE INDEX IF NOT EXISTS idx_public_couple_data_revision ON public.couple_data(revision);

-- 4) Enable RLS
ALTER TABLE couple_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_data ENABLE ROW LEVEL SECURITY;

-- 5) Scoped anon policies — only row ash-ciaran-2026
-- Drop old broad policy if present
DROP POLICY IF EXISTS "Allow all for anon" ON couple_data;
DROP POLICY IF EXISTS "Scoped anon by row id" ON couple_data;
CREATE POLICY "Scoped anon by row id" ON couple_data FOR ALL USING (id = 'ash-ciaran-2026') WITH CHECK (id = 'ash-ciaran-2026');

DROP POLICY IF EXISTS "Allow all for anon" ON public.couple_data;
DROP POLICY IF EXISTS "Scoped anon by row id" ON public.couple_data;
CREATE POLICY "Scoped anon by row id" ON public.couple_data FOR ALL USING (id = 'ash-ciaran-2026') WITH CHECK (id = 'ash-ciaran-2026');

-- 6) Realtime (optional but for subscribeRemote)
-- Enable publication if not already
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE couple_data;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_data;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Verify:
-- SELECT id, revision, jsonb_array_length(chores), jsonb_array_length(calendar) FROM couple_data WHERE id='ash-ciaran-2026';
