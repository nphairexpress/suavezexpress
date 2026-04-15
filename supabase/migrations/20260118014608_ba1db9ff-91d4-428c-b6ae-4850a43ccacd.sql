-- Fix RLS to allow authenticated users to create a salon during setup

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert salons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salons'
      AND policyname = 'Authenticated can create salons'
  ) THEN
    CREATE POLICY "Authenticated can create salons"
    ON public.salons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;
