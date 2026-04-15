-- Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trade_name text,
  document text,
  responsible text,
  website text,
  phone text,
  mobile text,
  email text,
  cep text,
  state text,
  city text,
  address text,
  address_number text,
  neighborhood text,
  address_complement text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view suppliers in their salon"
ON public.suppliers FOR SELECT
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert suppliers in their salon"
ON public.suppliers FOR INSERT
WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update suppliers in their salon"
ON public.suppliers FOR UPDATE
USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete suppliers in their salon"
ON public.suppliers FOR DELETE
USING (salon_id = get_user_salon_id(auth.uid()));

-- Add supplier_id to products table
ALTER TABLE public.products ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- Create trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();