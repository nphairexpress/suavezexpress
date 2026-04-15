-- Allow authenticated users to insert salons during signup
CREATE POLICY "Authenticated users can create salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add new columns to professionals table
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS can_be_assistant boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_schedule boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS create_access boolean DEFAULT false;

-- Add assistant_commission_percent to professional_service_commissions
ALTER TABLE public.professional_service_commissions
ADD COLUMN IF NOT EXISTS assistant_commission_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_minutes integer;