-- Add return reminder fields to services
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS send_return_reminder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_reminder_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS return_reminder_message text;

-- Create email_logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email logs in their salon" ON public.email_logs FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert email logs in their salon" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));