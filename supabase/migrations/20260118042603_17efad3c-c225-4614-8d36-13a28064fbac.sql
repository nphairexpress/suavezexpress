-- Add professional_id column to comanda_items to track which professional performed each service
ALTER TABLE public.comanda_items 
ADD COLUMN professional_id UUID REFERENCES public.professionals(id);

-- Create index for better performance
CREATE INDEX idx_comanda_items_professional_id ON public.comanda_items(professional_id);