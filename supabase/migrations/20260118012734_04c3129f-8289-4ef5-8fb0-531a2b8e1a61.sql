-- Add INSERT policy for user_roles (so users can create their admin role on signup)
CREATE POLICY "Users can create their own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add INSERT policy for profiles that allows authenticated users to create their first profile
-- (they can only create a profile with their own user_id)
-- The existing policy is correct, no change needed