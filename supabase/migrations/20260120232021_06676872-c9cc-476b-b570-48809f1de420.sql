-- Create bank_accounts table for PIX payment destinations
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view bank accounts in their salon"
ON public.bank_accounts FOR SELECT
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert bank accounts in their salon"
ON public.bank_accounts FOR INSERT
WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update bank accounts in their salon"
ON public.bank_accounts FOR UPDATE
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete bank accounts in their salon"
ON public.bank_accounts FOR DELETE
USING (salon_id = get_user_salon_id(auth.uid()));

-- Add bank_account_id to payments table for PIX payments
ALTER TABLE public.payments 
ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id);

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();