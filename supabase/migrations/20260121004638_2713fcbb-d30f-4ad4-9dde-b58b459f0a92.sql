-- Add new fields to products table based on AVEC system
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_for_consumption boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS product_line text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_stock_fractional numeric DEFAULT 0;