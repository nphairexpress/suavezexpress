
-- Table for client loyalty credits (fidelidade)
CREATE TABLE public.client_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  credit_amount numeric NOT NULL DEFAULT 0,
  min_purchase_amount numeric NOT NULL DEFAULT 100,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  used_in_comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  is_used boolean NOT NULL DEFAULT false,
  is_expired boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for client_credits
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credits in their salon" ON public.client_credits
  FOR SELECT TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert credits in their salon" ON public.client_credits
  FOR INSERT TO authenticated
  WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update credits in their salon" ON public.client_credits
  FOR UPDATE TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

-- Table for client alerts/warnings (avisos)
CREATE TABLE public.client_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  alert_event text NOT NULL DEFAULT 'agenda_and_comanda',
  target_type text NOT NULL DEFAULT 'client',
  target_client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  target_tag text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for client_alerts
ALTER TABLE public.client_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts in their salon" ON public.client_alerts
  FOR SELECT TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert alerts in their salon" ON public.client_alerts
  FOR INSERT TO authenticated
  WITH CHECK (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update alerts in their salon" ON public.client_alerts
  FOR UPDATE TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete alerts in their salon" ON public.client_alerts
  FOR DELETE TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

-- Trigger for updated_at on client_alerts
CREATE TRIGGER update_client_alerts_updated_at
  BEFORE UPDATE ON public.client_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
