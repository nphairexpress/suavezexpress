-- Add package_commission_percent per professional
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS package_commission_percent NUMERIC DEFAULT 0;
