-- Secure salons table: block direct client inserts (use backend function instead)

DROP POLICY IF EXISTS "Authenticated users can create salons" ON public.salons;
DROP POLICY IF EXISTS "Authenticated can create salons" ON public.salons;

-- Deny direct inserts for authenticated users (service role bypasses RLS)
CREATE POLICY "No direct salon inserts"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (false);
