-- Add installment payment method to enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'installment';

-- Add installment fee to card_brands
ALTER TABLE public.card_brands
  ADD COLUMN IF NOT EXISTS installment_fee_percent NUMERIC NOT NULL DEFAULT 0;

-- Add PIX fee to commission_settings (global, not per brand)
ALTER TABLE public.commission_settings
  ADD COLUMN IF NOT EXISTS pix_fee_percent NUMERIC NOT NULL DEFAULT 0;
