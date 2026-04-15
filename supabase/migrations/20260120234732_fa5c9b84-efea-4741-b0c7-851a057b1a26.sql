-- Create system_config table for storing system-wide configuration
CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read config
CREATE POLICY "Authenticated users can view system config"
ON public.system_config
FOR SELECT
TO authenticated
USING (true);

-- Only allow updates via service role (edge functions)
-- No direct INSERT/UPDATE/DELETE policies for regular users

-- Insert the initial master user email
INSERT INTO public.system_config (key, value)
VALUES ('master_user_email', 'vanieri_2006@hotmail.com');