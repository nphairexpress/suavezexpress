-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  target_type text NOT NULL DEFAULT 'all',
  target_tag text,
  target_client_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email campaigns in their salon" ON public.email_campaigns FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert email campaigns in their salon" ON public.email_campaigns FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update email campaigns in their salon" ON public.email_campaigns FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can delete email campaigns in their salon" ON public.email_campaigns FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- SMS campaigns table
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',
  target_tag text,
  target_client_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sms campaigns in their salon" ON public.sms_campaigns FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert sms campaigns in their salon" ON public.sms_campaigns FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update sms campaigns in their salon" ON public.sms_campaigns FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can delete sms campaigns in their salon" ON public.sms_campaigns FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- Promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  target_type text NOT NULL DEFAULT 'all',
  target_service_id uuid REFERENCES public.services(id),
  target_product_id uuid REFERENCES public.products(id),
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promotions in their salon" ON public.promotions FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert promotions in their salon" ON public.promotions FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update promotions in their salon" ON public.promotions FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can delete promotions in their salon" ON public.promotions FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_campaigns_updated_at BEFORE UPDATE ON public.sms_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();