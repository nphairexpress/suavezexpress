
ALTER TABLE public.professional_bank_details
  ADD COLUMN transfer_type text NOT NULL DEFAULT 'ted',
  ADD COLUMN pix_key text DEFAULT NULL;
