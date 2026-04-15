
CREATE TABLE public.client_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  comanda_id UUID REFERENCES public.comandas(id),
  debt_amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_in_comanda_id UUID REFERENCES public.comandas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.client_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view debts in their salon" ON public.client_debts FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert debts in their salon" ON public.client_debts FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update debts in their salon" ON public.client_debts FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can delete debts in their salon" ON public.client_debts FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
