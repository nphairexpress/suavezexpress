-- Add source_appointment_id column to comanda_items to track which appointment created each item
ALTER TABLE public.comanda_items 
ADD COLUMN source_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Create unique partial index to prevent duplicate items from the same appointment
CREATE UNIQUE INDEX idx_comanda_items_unique_appointment 
ON public.comanda_items (comanda_id, source_appointment_id) 
WHERE source_appointment_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.comanda_items.source_appointment_id IS 'Reference to the appointment that originated this item, used to prevent duplicates during sync';