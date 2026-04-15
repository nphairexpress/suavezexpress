-- Create caixas (cash registers) table
CREATE TABLE public.caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC,
  total_cash NUMERIC DEFAULT 0,
  total_pix NUMERIC DEFAULT 0,
  total_credit_card NUMERIC DEFAULT 0,
  total_debit_card NUMERIC DEFAULT 0,
  total_other NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;

-- RLS policies for caixas
CREATE POLICY "Users can view caixas in their salon"
ON public.caixas FOR SELECT
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert caixas in their salon"
ON public.caixas FOR INSERT
WITH CHECK (salon_id = get_user_salon_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own caixas"
ON public.caixas FOR UPDATE
USING (salon_id = get_user_salon_id(auth.uid()) AND user_id = auth.uid());

-- Add caixa_id to comandas table
ALTER TABLE public.comandas ADD COLUMN caixa_id UUID REFERENCES public.caixas(id);

-- Create trigger for updated_at
CREATE TRIGGER update_caixas_updated_at
BEFORE UPDATE ON public.caixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();