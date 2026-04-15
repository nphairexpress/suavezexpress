-- Remove caixa_id from open (not closed) comandas.
-- Caixa should only be linked when the comanda is finalized.
UPDATE public.comandas
SET caixa_id = NULL
WHERE closed_at IS NULL
  AND caixa_id IS NOT NULL;
