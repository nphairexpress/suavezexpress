-- Create table for access level definitions (both default and custom)
CREATE TABLE public.access_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  system_key text, -- For system levels: admin, manager, receptionist, financial, professional
  color text DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(salon_id, name),
  UNIQUE(salon_id, system_key)
);

-- Create table for granular permissions
CREATE TABLE public.access_level_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_level_id uuid REFERENCES public.access_levels(id) ON DELETE CASCADE NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(access_level_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_level_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for access_levels
CREATE POLICY "Users can view access levels in their salon"
ON public.access_levels FOR SELECT
USING (salon_id = get_user_salon_id(auth.uid()) OR salon_id IS NULL);

CREATE POLICY "Admins can insert access levels in their salon"
ON public.access_levels FOR INSERT
WITH CHECK (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update access levels in their salon"
ON public.access_levels FOR UPDATE
USING (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin') AND is_system = false);

CREATE POLICY "Admins can delete custom access levels"
ON public.access_levels FOR DELETE
USING (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin') AND is_system = false);

-- RLS policies for access_level_permissions
CREATE POLICY "Users can view permissions"
ON public.access_level_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.access_levels al
  WHERE al.id = access_level_permissions.access_level_id
  AND (al.salon_id = get_user_salon_id(auth.uid()) OR al.salon_id IS NULL)
));

CREATE POLICY "Admins can manage permissions"
ON public.access_level_permissions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.access_levels al
  WHERE al.id = access_level_permissions.access_level_id
  AND al.salon_id = get_user_salon_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
));

-- Add access_level_id to user_roles table
ALTER TABLE public.user_roles ADD COLUMN access_level_id uuid REFERENCES public.access_levels(id);

-- Create trigger for updated_at
CREATE TRIGGER update_access_levels_updated_at
BEFORE UPDATE ON public.access_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();