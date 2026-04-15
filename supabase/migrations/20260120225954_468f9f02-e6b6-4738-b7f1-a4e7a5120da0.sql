-- Create table for card brands/flags with their fees
CREATE TABLE public.card_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL,
  name text NOT NULL,
  credit_fee_percent numeric NOT NULL DEFAULT 0,
  debit_fee_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view card brands in their salon"
ON public.card_brands
FOR SELECT
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert card brands in their salon"
ON public.card_brands
FOR INSERT
WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update card brands in their salon"
ON public.card_brands
FOR UPDATE
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete card brands in their salon"
ON public.card_brands
FOR DELETE
USING (salon_id = get_user_salon_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_card_brands_updated_at
BEFORE UPDATE ON public.card_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add card_brand_id to payments table to track which brand was used
ALTER TABLE public.payments ADD COLUMN card_brand_id uuid REFERENCES public.card_brands(id);
ALTER TABLE public.payments ADD COLUMN fee_amount numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN net_amount numeric;