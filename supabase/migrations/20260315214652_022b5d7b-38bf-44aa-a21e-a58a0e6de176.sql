
-- 1. Add new columns to professionals table
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS agenda_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS agenda_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS twitter text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

-- 2. Create professional_work_schedules table
CREATE TABLE public.professional_work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '19:00',
  monday boolean NOT NULL DEFAULT false,
  tuesday boolean NOT NULL DEFAULT true,
  wednesday boolean NOT NULL DEFAULT true,
  thursday boolean NOT NULL DEFAULT true,
  friday boolean NOT NULL DEFAULT true,
  saturday boolean NOT NULL DEFAULT true,
  sunday boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work schedules in their salon" ON public.professional_work_schedules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_work_schedules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can insert work schedules in their salon" ON public.professional_work_schedules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_work_schedules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can update work schedules in their salon" ON public.professional_work_schedules
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_work_schedules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can delete work schedules in their salon" ON public.professional_work_schedules
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_work_schedules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

-- 3. Create professional_bank_details table
CREATE TABLE public.professional_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE UNIQUE,
  person_type text NOT NULL DEFAULT 'fisica',
  account_holder text,
  holder_cpf text,
  bank_name text,
  account_type text NOT NULL DEFAULT 'corrente',
  agency text,
  account_number text,
  account_digit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank details in their salon" ON public.professional_bank_details
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_bank_details.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can insert bank details in their salon" ON public.professional_bank_details
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_bank_details.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can update bank details in their salon" ON public.professional_bank_details
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_bank_details.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can delete bank details in their salon" ON public.professional_bank_details
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_bank_details.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

-- 4. Create professional_commission_rules table (per-professional overrides)
CREATE TABLE public.professional_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE UNIQUE,
  contract_type text DEFAULT 'parceiro',
  contract_start date,
  contract_end date,
  payment_frequency text DEFAULT 'mensal',
  card_payment_date text DEFAULT 'sale_date',
  deduct_anticipation boolean DEFAULT true,
  deduct_card_fee boolean DEFAULT true,
  deduct_admin_fee boolean DEFAULT true,
  deduct_service_cost boolean DEFAULT true,
  deduct_product_cost boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commission rules in their salon" ON public.professional_commission_rules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_commission_rules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can insert commission rules in their salon" ON public.professional_commission_rules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_commission_rules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can update commission rules in their salon" ON public.professional_commission_rules
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_commission_rules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));

CREATE POLICY "Users can delete commission rules in their salon" ON public.professional_commission_rules
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_commission_rules.professional_id AND p.salon_id = get_user_salon_id(auth.uid())));
