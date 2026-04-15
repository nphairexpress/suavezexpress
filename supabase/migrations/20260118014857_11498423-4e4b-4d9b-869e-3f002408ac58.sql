-- Allow users to view their own profile during onboarding (before get_user_salon_id works)
DROP POLICY IF EXISTS "Users can view profiles in their salon" ON public.profiles;

CREATE POLICY "Users can view profiles in their salon or own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR salon_id = get_user_salon_id(auth.uid())
);