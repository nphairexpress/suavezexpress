-- Allow users to update any caixa in their salon (for managers/admin closing other users' registers)
DROP POLICY IF EXISTS "Users can update their own caixas" ON public.caixas;

CREATE POLICY "Users can update caixas in their salon" 
ON public.caixas 
FOR UPDATE 
USING (salon_id = get_user_salon_id(auth.uid()));

-- Allow delete payments for editing closed comandas
CREATE POLICY "Users can delete payments in their salon" 
ON public.payments 
FOR DELETE 
USING (salon_id = get_user_salon_id(auth.uid()));

-- Allow update payments
CREATE POLICY "Users can update payments in their salon" 
ON public.payments 
FOR UPDATE 
USING (salon_id = get_user_salon_id(auth.uid()));