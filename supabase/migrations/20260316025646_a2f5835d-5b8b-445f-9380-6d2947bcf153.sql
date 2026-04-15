
ALTER TABLE public.salons 
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS state_registration TEXT,
  ADD COLUMN IF NOT EXISTS city_registration TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT;
