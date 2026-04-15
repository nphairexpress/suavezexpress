-- Create table to store comanda deletions for audit
CREATE TABLE public.comanda_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comanda_id UUID NOT NULL,
  client_id UUID NULL,
  client_name TEXT NULL,
  professional_id UUID NULL,
  professional_name TEXT NULL,
  comanda_total NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  deleted_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_created_at TIMESTAMP WITH TIME ZONE NULL,
  original_closed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable Row Level Security
ALTER TABLE public.comanda_deletions ENABLE ROW LEVEL SECURITY;

-- Policies for comanda_deletions
CREATE POLICY "Admins can view comanda deletions" 
ON public.comanda_deletions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.salon_id = (
    SELECT salon_id FROM profiles WHERE user_id = comanda_deletions.deleted_by LIMIT 1
  )
));

CREATE POLICY "Users can insert comanda deletions" 
ON public.comanda_deletions 
FOR INSERT 
WITH CHECK (deleted_by = auth.uid());

-- Create table to store client history (edits to comandas)
CREATE TABLE public.client_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'comanda_edit', 'comanda_payment_edit', etc.
  description TEXT NOT NULL,
  old_value JSONB NULL,
  new_value JSONB NULL,
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Policies for client_history
CREATE POLICY "Users can view client history in their salon" 
ON public.client_history 
FOR SELECT 
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert client history in their salon" 
ON public.client_history 
FOR INSERT 
WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

-- Add DELETE policy for comandas (was missing)
CREATE POLICY "Users can delete comandas in their salon" 
ON public.comandas 
FOR DELETE 
USING (salon_id = get_user_salon_id(auth.uid()));