
CREATE TABLE public.commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  
  -- Data de Recebimento
  card_payment_date text NOT NULL DEFAULT 'comanda_date',
  
  -- Descontos
  anticipation_fee_enabled boolean NOT NULL DEFAULT false,
  anticipation_fee_percent numeric NOT NULL DEFAULT 0,
  
  card_fee_mode text NOT NULL DEFAULT 'card_brands',
  custom_card_fee_percent numeric NOT NULL DEFAULT 0,
  
  admin_fee_enabled boolean NOT NULL DEFAULT false,
  admin_fee_percent numeric NOT NULL DEFAULT 0,
  admin_fee_scope text NOT NULL DEFAULT 'services_only',
  
  service_cost_enabled boolean NOT NULL DEFAULT true,
  
  product_cost_deduction text NOT NULL DEFAULT 'before_commission',
  
  -- Recibo de Comissão
  show_revenue_values boolean NOT NULL DEFAULT true,
  show_costs_values boolean NOT NULL DEFAULT true,
  admin_fee_display text NOT NULL DEFAULT 'summary',
  card_fee_display text NOT NULL DEFAULT 'summary',
  service_fee_display text NOT NULL DEFAULT 'summary',
  
  -- Comissão Avançada
  presale_commission_rule text NOT NULL DEFAULT 'discounted_value',
  presale_commission_percent numeric NOT NULL DEFAULT 0,
  gift_card_commission_percent numeric NOT NULL DEFAULT 0,
  package_commission_enabled boolean NOT NULL DEFAULT false,
  package_commission_percent numeric NOT NULL DEFAULT 0,
  dual_assistant_rule text NOT NULL DEFAULT 'full_value',
  receipt_footer_message text NOT NULL DEFAULT '',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(salon_id)
);

-- RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commission settings in their salon"
  ON public.commission_settings FOR SELECT TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Admins can insert commission settings"
  ON public.commission_settings FOR INSERT TO authenticated
  WITH CHECK (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commission settings"
  ON public.commission_settings FOR UPDATE TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_commission_settings_updated_at
  BEFORE UPDATE ON public.commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
