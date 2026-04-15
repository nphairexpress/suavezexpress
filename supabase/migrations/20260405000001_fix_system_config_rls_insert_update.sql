-- Fix: allow authenticated users to insert/update system_config
-- This was missing from migrations (only existed in setupSchemaSQL.ts for fresh installs)
-- Needed for: generating API Gateway keys and Webhook keys from Settings UI

DROP POLICY IF EXISTS "Authenticated users can insert system config" ON public.system_config;
DROP POLICY IF EXISTS "Authenticated users can update system config" ON public.system_config;

CREATE POLICY "Authenticated users can insert system config"
ON public.system_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update system config"
ON public.system_config FOR UPDATE TO authenticated USING (true);
