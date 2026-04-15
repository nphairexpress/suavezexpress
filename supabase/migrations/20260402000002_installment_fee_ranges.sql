-- Replace single installment_fee_percent with fee ranges matching maquininha structure
ALTER TABLE public.card_brands
  ADD COLUMN IF NOT EXISTS credit_2_6_fee_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_7_12_fee_percent NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_13_18_fee_percent NUMERIC NOT NULL DEFAULT 0;

-- Drop the old single installment field (no longer needed)
ALTER TABLE public.card_brands
  DROP COLUMN IF EXISTS installment_fee_percent;

-- Remove installment from payment_method enum is not possible in Postgres,
-- but we can just stop using it in the app. We'll use credit_card with installments field instead.

-- Add installments column to payments to track how many installments were used
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
