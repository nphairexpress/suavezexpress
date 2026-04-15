-- Add can_open_caixa permission column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS can_open_caixa boolean NOT NULL DEFAULT false;

-- Admin and manager roles should have this permission by default
UPDATE public.user_roles 
SET can_open_caixa = true 
WHERE role IN ('admin', 'manager');

-- Add comment for documentation
COMMENT ON COLUMN public.user_roles.can_open_caixa IS 'Determines if user can open their own cash register';