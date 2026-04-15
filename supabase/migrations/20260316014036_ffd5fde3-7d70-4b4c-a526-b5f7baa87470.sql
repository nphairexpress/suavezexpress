
CREATE TABLE public.scheduling_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  opening_time time NOT NULL DEFAULT '08:00',
  closing_time time NOT NULL DEFAULT '20:00',
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  default_columns integer NOT NULL DEFAULT 6,
  monday boolean NOT NULL DEFAULT true,
  tuesday boolean NOT NULL DEFAULT true,
  wednesday boolean NOT NULL DEFAULT true,
  thursday boolean NOT NULL DEFAULT true,
  friday boolean NOT NULL DEFAULT true,
  saturday boolean NOT NULL DEFAULT true,
  sunday boolean NOT NULL DEFAULT false,
  min_advance_hours integer NOT NULL DEFAULT 0,
  max_advance_days integer NOT NULL DEFAULT 90,
  allow_simultaneous boolean NOT NULL DEFAULT true,
  auto_confirm boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id)
);

ALTER TABLE public.scheduling_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduling settings in their salon"
  ON public.scheduling_settings FOR SELECT
  TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));

CREATE POLICY "Admins can insert scheduling settings"
  ON public.scheduling_settings FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update scheduling settings"
  ON public.scheduling_settings FOR UPDATE
  TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_scheduling_settings_updated_at
  BEFORE UPDATE ON public.scheduling_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
