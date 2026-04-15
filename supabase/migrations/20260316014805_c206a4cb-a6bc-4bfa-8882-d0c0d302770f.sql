
-- Allow admins to update system access levels in their salon (for permission customization)
DROP POLICY IF EXISTS "Admins can update access levels in their salon" ON public.access_levels;
CREATE POLICY "Admins can update access levels in their salon"
  ON public.access_levels
  FOR UPDATE
  TO public
  USING (
    (salon_id = get_user_salon_id(auth.uid())) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );
