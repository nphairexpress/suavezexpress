-- Create table for professional service commissions
CREATE TABLE public.professional_service_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, service_id)
);

-- Enable RLS
ALTER TABLE public.professional_service_commissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view commissions in their salon"
ON public.professional_service_commissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_service_commissions.professional_id
    AND p.salon_id = get_user_salon_id(auth.uid())
  )
);

CREATE POLICY "Users can insert commissions in their salon"
ON public.professional_service_commissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_service_commissions.professional_id
    AND p.salon_id = get_user_salon_id(auth.uid())
  )
);

CREATE POLICY "Users can update commissions in their salon"
ON public.professional_service_commissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_service_commissions.professional_id
    AND p.salon_id = get_user_salon_id(auth.uid())
  )
);

CREATE POLICY "Users can delete commissions in their salon"
ON public.professional_service_commissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_service_commissions.professional_id
    AND p.salon_id = get_user_salon_id(auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_professional_service_commissions_updated_at
BEFORE UPDATE ON public.professional_service_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();