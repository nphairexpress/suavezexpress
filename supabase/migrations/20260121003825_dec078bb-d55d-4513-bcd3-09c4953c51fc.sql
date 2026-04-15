-- Add unit of measure fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit_of_measure text DEFAULT 'unidade',
ADD COLUMN IF NOT EXISTS unit_quantity numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_for_resale boolean DEFAULT true;

-- Create service_products table to link services with products they consume
CREATE TABLE public.service_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_per_use numeric NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_id, product_id)
);

-- Enable RLS on service_products
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_products (based on service's salon)
CREATE POLICY "Users can view service products in their salon"
ON public.service_products FOR SELECT
USING (EXISTS (
  SELECT 1 FROM services s 
  WHERE s.id = service_products.service_id 
  AND s.salon_id = get_user_salon_id(auth.uid())
));

CREATE POLICY "Users can insert service products in their salon"
ON public.service_products FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM services s 
  WHERE s.id = service_products.service_id 
  AND s.salon_id = get_user_salon_id(auth.uid())
));

CREATE POLICY "Users can update service products in their salon"
ON public.service_products FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM services s 
  WHERE s.id = service_products.service_id 
  AND s.salon_id = get_user_salon_id(auth.uid())
));

CREATE POLICY "Users can delete service products in their salon"
ON public.service_products FOR DELETE
USING (EXISTS (
  SELECT 1 FROM services s 
  WHERE s.id = service_products.service_id 
  AND s.salon_id = get_user_salon_id(auth.uid())
));

-- Add trigger for updated_at
CREATE TRIGGER update_service_products_updated_at
BEFORE UPDATE ON public.service_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add product_cost column to comanda_items to store calculated cost at time of service
ALTER TABLE public.comanda_items
ADD COLUMN IF NOT EXISTS product_cost numeric DEFAULT 0;